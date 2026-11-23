<?php

namespace App\Http\Controllers;

use App\Support\ExactMoney;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class MobileSyncController extends Controller
{
    public function ping(Request $request): JsonResponse
    {
        return response()->json([
            'data' => [
                'cursor' => (int) (DB::table('mobile_sync_events')->max('id') ?? 0),
                'server_time' => now()->toIso8601String(),
            ],
        ]);
    }

    public function sync(Request $request): JsonResponse
    {
        $values = $request->validate([
            'cursor' => ['sometimes', 'integer', 'min:0'],
            'limit' => ['sometimes', 'integer', 'min:1', 'max:500'],
        ]);
        $device = $request->attributes->get('mobile_device');
        $user = $request->attributes->get('authenticated_user');
        abort_unless(is_object($device) && is_object($user), 401);

        $requestedCursor = (int) ($values['cursor'] ?? 0);
        $highWater = (int) (DB::table('mobile_sync_events')->max('id') ?? 0);
        $snapshot = $requestedCursor === 0 || $requestedCursor > $highWater;
        $cursor = $requestedCursor > $highWater ? 0 : $requestedCursor;
        $limit = (int) ($values['limit'] ?? 200);
        $events = DB::table('mobile_sync_events')
            ->where('id', '>', $cursor)
            ->where('id', '<=', $highWater)
            ->orderBy('id')
            ->limit($limit + 1)
            ->get(['id', 'device_id', 'entity_type', 'entity_id']);
        $hasMore = $events->count() > $limit;
        $events = $events->take($limit);
        $nextCursor = $hasMore
            ? (int) $events->last()->id
            : $highWater;

        $entityIds = fn (string $type): array => $events
            ->where('entity_type', $type)
            ->pluck('entity_id')
            ->map(static fn ($id): int => (int) $id)
            ->unique()
            ->values()
            ->all();

        $customerIds = $entityIds('customer');
        $channelIds = $entityIds('channel');
        $categoryIds = $entityIds('category');
        $sourceIds = $events
            ->filter(static fn (object $event): bool => ($event->entity_type === 'source' && $event->device_id === null)
                || ($event->entity_type === 'source_setting' && (int) $event->device_id === (int) $device->id))
            ->pluck('entity_id')
            ->map(static fn ($id): int => (int) $id)
            ->unique()
            ->values()
            ->all();
        $messageIds = $entityIds('message');

        if ($snapshot) {
            $channelIds = DB::table('mobile_channels')->whereNull('deleted_at')->pluck('id')
                ->map(static fn ($id): int => (int) $id)->all();
            $categoryIds = DB::table('mobile_categories')->where('is_active', true)->pluck('id')
                ->map(static fn ($id): int => (int) $id)->all();
            $sourceIds = DB::table('mobile_sources')->where('status', 'active')->whereNull('deleted_at')->pluck('id')
                ->map(static fn ($id): int => (int) $id)->all();
        }

        return response()->json([
            'data' => [
                'cursor' => $nextCursor,
                'has_more' => $hasMore,
                'customers' => $this->customers($customerIds),
                'channels' => $this->channels($channelIds, $this->hasPermission((int) $user->id, 'mobile.balances.view')),
                'categories' => $this->categories($categoryIds),
                'sources' => $this->sources($sourceIds, (int) $device->id),
                'messages' => $this->messages($messageIds, (int) $user->id),
                'server_time' => now()->toIso8601String(),
            ],
        ]);
    }

    private function customers(array $ids): array
    {
        if ($ids === []) {
            return [];
        }

        return DB::table('customers')->whereIn('id', $ids)->orderBy('id')->get()->all();
    }

    private function channels(array $ids, bool $canViewBalances): array
    {
        if ($ids === []) {
            return [];
        }

        $channels = DB::table('mobile_channels as channel')
            ->join('treasury_accounts as account', 'account.id', '=', 'channel.treasury_account_id')
            ->whereIn('channel.id', $ids)
            ->orderBy('channel.id')
            ->get([
                'channel.id',
                'channel.treasury_account_id',
                'account.name',
                'channel.channel_type',
                'channel.identifier',
                'channel.status',
                'channel.deleted_at',
            ]);
        if (! $canViewBalances || $channels->isEmpty()) {
            return $channels->all();
        }

        $totals = DB::table('treasury_entries')
            ->whereIn('treasury_account_id', $channels->pluck('treasury_account_id')->all())
            ->select('treasury_account_id')
            ->selectRaw("COALESCE(SUM(CASE WHEN direction = 'in' THEN amount ELSE 0 END), 0) AS total_in")
            ->selectRaw("COALESCE(SUM(CASE WHEN direction = 'out' THEN amount ELSE 0 END), 0) AS total_out")
            ->groupBy('treasury_account_id')
            ->get()
            ->keyBy('treasury_account_id');

        return $channels->map(function (object $channel) use ($totals): object {
            $total = $totals->get($channel->treasury_account_id);
            $in = ExactMoney::toCents((string) ($total->total_in ?? '0'));
            $out = ExactMoney::toCents((string) ($total->total_out ?? '0'));
            $negative = ExactMoney::compare($in, $out) < 0;
            $balance = $negative ? ExactMoney::subtract($out, $in) : ExactMoney::subtract($in, $out);
            $channel->balance_egp = ($negative && $balance !== '0' ? '-' : '').ExactMoney::fromCents($balance);

            return $channel;
        })->all();
    }

    private function categories(array $ids): array
    {
        if ($ids === []) {
            return [];
        }

        return DB::table('mobile_categories')->whereIn('id', $ids)->orderBy('id')
            ->get()->map(static function (object $category): object {
                $category->requires_notes = (bool) $category->requires_notes;
                $category->is_system = (bool) $category->is_system;
                $category->is_active = (bool) $category->is_active;

                return $category;
            })->all();
    }

    private function sources(array $ids, int $deviceId): array
    {
        if ($ids === []) {
            return [];
        }

        return DB::table('mobile_sources as source')
            ->leftJoin('mobile_device_sources as device_source', function ($join) use ($deviceId): void {
                $join->on('device_source.source_id', '=', 'source.id')
                    ->where('device_source.device_id', '=', $deviceId);
            })
            ->whereIn('source.id', $ids)
            ->orderBy('source.id')
            ->get([
                'source.*',
                'device_source.is_enabled as device_is_enabled',
                'device_source.read_deposits as device_read_deposits',
                'device_source.read_withdrawals as device_read_withdrawals',
            ])->map(static function (object $source): object {
                foreach (['notification_package_names', 'deposit_keywords', 'withdrawal_keywords', 'parser_rule'] as $field) {
                    $source->{$field} = $source->{$field} === null
                        ? null
                        : json_decode((string) $source->{$field}, true, 512, JSON_THROW_ON_ERROR);
                }
                $source->default_read_deposits = (bool) $source->default_read_deposits;
                $source->default_read_withdrawals = (bool) $source->default_read_withdrawals;
                $source->is_enabled = (bool) ($source->device_is_enabled ?? false);
                $source->read_deposits = (bool) ($source->device_read_deposits ?? false);
                $source->read_withdrawals = (bool) ($source->device_read_withdrawals ?? false);
                unset($source->device_is_enabled, $source->device_read_deposits, $source->device_read_withdrawals);

                return $source;
            })->all();
    }

    private function messages(array $ids, int $userId): array
    {
        if ($ids === []) {
            return [];
        }

        return DB::table('mobile_messages as message')
            ->join('mobile_devices as device', 'device.id', '=', 'message.device_id')
            ->where('device.user_id', $userId)
            ->whereIn('message.id', $ids)
            ->orderBy('message.id')
            ->get([
                'message.id',
                'message.message_type',
                'message.channel_id',
                'message.amount',
                'message.received_at',
                'message.status',
                'message.registered_source',
                'message.registered_document_type',
                'message.registered_document_id',
            ])->map(static function (object $message): object {
                $message->amount_egp = $message->amount === null
                    ? null
                    : ExactMoney::fromCents(ExactMoney::toCents((string) $message->amount));
                unset($message->amount);

                return $message;
            })->all();
    }

    private function hasPermission(int $userId, string $permission): bool
    {
        return DB::table('role_permissions as role_permission')
            ->join('permissions', 'permissions.id', '=', 'role_permission.permission_id')
            ->join('user_roles as user_role', 'user_role.role_id', '=', 'role_permission.role_id')
            ->join('roles as role', 'role.id', '=', 'user_role.role_id')
            ->where('user_role.user_id', $userId)
            ->where('role.is_active', true)
            ->where('permissions.code', $permission)
            ->exists();
    }
}
