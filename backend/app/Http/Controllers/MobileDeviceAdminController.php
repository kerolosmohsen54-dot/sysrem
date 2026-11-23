<?php

namespace App\Http\Controllers;

use App\Services\AuditLogService;
use App\Support\ListQuery;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class MobileDeviceAdminController extends Controller
{
    public function __construct(private readonly AuditLogService $auditLog) {}

    public function index(Request $request): JsonResponse
    {
        $filters = ListQuery::validate($request, [
            'id' => 'device.id',
            'name' => 'device.name',
            'username' => 'users.username',
        ], [
            'status' => ['sometimes', 'in:active,revoked'],
        ]);

        $query = DB::table('mobile_devices as device')
            ->join('users', 'users.id', '=', 'device.user_id')
            ->select([
                'device.id',
                'device.user_id',
                'users.username',
                'users.display_name',
                'device.name',
                'device.model',
                'device.last_seen_at',
                'device.token_expires_at',
                'device.revoked_at',
                'device.created_at',
            ]);
        ListQuery::search($query, $filters, ['device.name', 'device.model', 'users.username', 'users.display_name']);
        if (($filters['status'] ?? null) === 'active') {
            $query->whereNull('device.revoked_at')->where('device.token_expires_at', '>', now());
        } elseif (($filters['status'] ?? null) === 'revoked') {
            $query->whereNotNull('device.revoked_at');
        }

        ListQuery::sort($query, $filters, [
            'id' => 'device.id',
            'name' => 'device.name',
            'username' => 'users.username',
        ], 'id', 'device.id', 'desc');
        $page = $query->paginate($filters['per_page'] ?? 50);
        $deviceIds = $page->getCollection()->pluck('id')->map(static fn ($id): int => (int) $id)->all();
        $sources = DB::table('mobile_sources as source')
            ->join('mobile_channels as channel', 'channel.id', '=', 'source.channel_id')
            ->join('treasury_accounts as account', 'account.id', '=', 'channel.treasury_account_id')
            ->whereIn('source.device_id', $deviceIds)
            ->whereNull('source.deleted_at')
            ->orderBy('source.id')
            ->get([
                'source.id',
                'source.device_id',
                'source.source_kind',
                'source.sender_identifier',
                'source.notification_package_names',
                'source.read_deposits',
                'source.read_withdrawals',
                'source.status',
                'channel.id as channel_id',
                'channel.channel_type',
                'channel.status as channel_status',
                'account.name as channel_name',
            ])
            ->groupBy('device_id');

        $page->getCollection()->transform(static function (object $device) use ($sources): array {
            return [
                ...(array) $device,
                'sources' => $sources->get($device->id, collect())->map(static fn (object $source): array => [
                    'id' => (int) $source->id,
                    'kind' => $source->source_kind,
                    'sender_identifier' => $source->sender_identifier,
                    'notification_package_names' => $source->notification_package_names === null
                        ? null
                        : json_decode($source->notification_package_names, true, 512, JSON_THROW_ON_ERROR),
                    'read_deposits' => (bool) $source->read_deposits,
                    'read_withdrawals' => (bool) $source->read_withdrawals,
                    'status' => $source->status,
                    'channel' => [
                        'id' => (int) $source->channel_id,
                        'name' => $source->channel_name,
                        'type' => $source->channel_type,
                        'status' => $source->channel_status,
                    ],
                ])->values(),
            ];
        });

        return response()->json(ListQuery::page($page));
    }

    public function rename(Request $request, int $deviceId): JsonResponse
    {
        $values = $request->validate(['name' => ['required', 'string', 'max:160']]);

        $device = DB::transaction(function () use ($request, $deviceId, $values): object {
            $before = DB::table('mobile_devices')->where('id', $deviceId)->lockForUpdate()->first();
            abort_if($before === null, 404);
            DB::table('mobile_devices')->where('id', $deviceId)->update([
                'name' => $values['name'],
                'updated_at' => now(),
            ]);
            $this->auditLog->record($request, 'mobile.device.renamed', 'mobile_device', $deviceId, null, [
                'name' => $before->name,
            ], [
                'name' => $values['name'],
            ]);

            return DB::table('mobile_devices')
                ->where('id', $deviceId)
                ->first(['id', 'user_id', 'name', 'model', 'last_seen_at', 'token_expires_at', 'revoked_at', 'created_at']);
        }, 5);

        return response()->json(['data' => $device]);
    }

    public function revoke(Request $request, int $deviceId): JsonResponse
    {
        DB::transaction(function () use ($request, $deviceId): void {
            $device = DB::table('mobile_devices')->where('id', $deviceId)->lockForUpdate()->first();
            abort_if($device === null, 404);
            if ($device->revoked_at !== null) {
                throw ValidationException::withMessages(['device' => ['The mobile device has already been revoked.']]);
            }

            $revokedAt = now();
            DB::table('mobile_devices')->where('id', $deviceId)->update([
                'token_hash' => null,
                'password_confirmed_at' => null,
                'revoked_at' => $revokedAt,
                'updated_at' => $revokedAt,
            ]);
            $this->auditLog->record($request, 'mobile.device.revoked', 'mobile_device', $deviceId, null, [
                'revoked_at' => null,
            ], [
                'revoked_at' => $revokedAt->toDateTimeString(),
            ]);
        }, 5);

        return response()->json(['data' => ['id' => $deviceId, 'status' => 'revoked']]);
    }
}
