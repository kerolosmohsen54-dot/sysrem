<?php

namespace App\Http\Controllers;

use App\Services\AuditLogService;
use App\Services\MobileCaptureWithdrawalService;
use App\Services\MobileIdempotencyService;
use App\Services\TreasuryService;
use App\Support\ExactMoney;
use App\Support\ListQuery;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class MobileAdministrationController extends Controller
{
    public function __construct(
        private readonly AuditLogService $auditLog,
        private readonly MobileIdempotencyService $idempotency,
        private readonly TreasuryService $treasury,
        private readonly MobileCaptureWithdrawalService $withdrawals,
    ) {}

    public function channels(Request $request): JsonResponse
    {
        $sortable = [
            'name' => 'account.name',
            'channel_type' => 'channel.channel_type',
            'status' => 'channel.status',
            'id' => 'channel.id',
        ];
        $filters = ListQuery::validate($request, $sortable, [
            'channel_type' => ['sometimes', 'in:bank,instapay,wallet,post_office,other'],
            'status' => ['sometimes', 'in:active,paused'],
        ]);
        $query = DB::table('mobile_channels as channel')
            ->join('treasury_accounts as account', 'account.id', '=', 'channel.treasury_account_id')
            ->whereNull('channel.deleted_at')
            ->select([
                'channel.id',
                'channel.treasury_account_id',
                'account.name',
                'channel.channel_type',
                'channel.identifier',
                'channel.status',
            ]);
        ListQuery::search($query, $filters, ['account.name', 'channel.identifier']);
        foreach (['channel_type', 'status'] as $field) {
            if (isset($filters[$field])) {
                $query->where('channel.'.$field, $filters[$field]);
            }
        }
        ListQuery::sort($query, $filters, $sortable, 'name', 'channel.id');
        $page = $query->paginate($filters['per_page'] ?? 50);
        $channels = $page->getCollection();

        if ($this->hasPermission($request, 'mobile.balances.view') && $channels->isNotEmpty()) {
            $accountIds = $channels->pluck('treasury_account_id')->all();
            $totals = DB::table('treasury_entries')
                ->whereIn('treasury_account_id', $accountIds)
                ->select('treasury_account_id')
                ->selectRaw("COALESCE(SUM(CASE WHEN direction = 'in' THEN amount ELSE 0 END), 0) AS total_in")
                ->selectRaw("COALESCE(SUM(CASE WHEN direction = 'out' THEN amount ELSE 0 END), 0) AS total_out")
                ->groupBy('treasury_account_id')
                ->get()
                ->keyBy('treasury_account_id');
            $channels->transform(function (object $channel) use ($totals): object {
                $total = $totals->get($channel->treasury_account_id);
                $in = ExactMoney::toCents((string) ($total->total_in ?? '0'));
                $out = ExactMoney::toCents((string) ($total->total_out ?? '0'));
                $negative = ExactMoney::compare($in, $out) < 0;
                $balance = $negative ? ExactMoney::subtract($out, $in) : ExactMoney::subtract($in, $out);
                $channel->balance_egp = ($negative && $balance !== '0' ? '-' : '').ExactMoney::fromCents($balance);

                return $channel;
            });
        }

        return response()->json([
            'data' => $channels->values(),
            'meta' => [
                'current_page' => $page->currentPage(),
                'last_page' => $page->lastPage(),
                'per_page' => $page->perPage(),
                'total' => $page->total(),
            ],
        ]);
    }

    public function createChannel(Request $request): JsonResponse
    {
        $values = $request->validate([
            'name' => ['required', 'string', 'max:160'],
            'channel_type' => ['required', 'in:bank,instapay,wallet,post_office,other'],
            'identifier' => ['sometimes', 'nullable', 'string', 'max:160'],
            'opening_balance_egp' => ['sometimes', 'required_with:opening_date', 'string', 'regex:/\A(?:0|[1-9][0-9]{0,14})(?:\.[0-9]{1,2})?\z/'],
            'opening_date' => ['sometimes', 'required_with:opening_balance_egp', 'date_format:Y-m-d'],
        ]);

        return $this->idempotency->execute($request, 'mobile_channel', function () use ($request, $values): JsonResponse {
            return DB::transaction(function () use ($request, $values): JsonResponse {
                $accountType = match ($values['channel_type']) {
                    'bank' => 'bank',
                    'wallet', 'post_office' => 'cash',
                    default => 'other',
                };
                $accountId = $this->treasury->createAccount($request, [
                    'code' => 'MOB-'.Str::upper(Str::random(20)),
                    'name' => $values['name'],
                    'account_type' => $accountType,
                    'notes' => 'Mobile payment channel.',
                ]);
                $now = now();
                $channelId = (int) DB::table('mobile_channels')->insertGetId([
                    'treasury_account_id' => $accountId,
                    'channel_type' => $values['channel_type'],
                    'identifier' => $values['identifier'] ?? null,
                    'status' => 'active',
                    'created_by_user_id' => $this->actorId($request),
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);

                if (isset($values['opening_balance_egp'])) {
                    $this->treasury->postCashEntry($request, [
                        'treasury_account_id' => $accountId,
                        'direction' => 'in',
                        'entry_date' => $values['opening_date'],
                        'amount_egp' => $values['opening_balance_egp'],
                        'description' => 'Mobile channel opening balance.',
                        'entry_type' => 'opening',
                    ]);
                }

                $data = $this->channelData($channelId);
                $this->auditLog->record($request, 'mobile.channel.created', 'mobile_channel', $channelId, null, null, [
                    'treasury_account_id' => $accountId,
                    'name' => $values['name'],
                    'channel_type' => $values['channel_type'],
                    'identifier' => $values['identifier'] ?? null,
                    'opening_balance_egp' => $values['opening_balance_egp'] ?? null,
                    'opening_date' => $values['opening_date'] ?? null,
                ]);
                $this->syncEvent($request, 'channel', $channelId, 'created');

                return response()->json(['data' => $data], 201);
            }, 5);
        });
    }

    public function updateChannel(Request $request, int $channelId): JsonResponse
    {
        $values = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:160'],
            'channel_type' => ['sometimes', 'required', 'in:bank,instapay,wallet,post_office,other'],
            'identifier' => ['sometimes', 'nullable', 'string', 'max:160'],
            'status' => ['sometimes', 'required', 'in:active,paused'],
        ]);
        abort_if($values === [], 422);

        return $this->idempotency->execute($request, 'mobile_channel', function () use ($request, $channelId, $values): JsonResponse {
            return DB::transaction(function () use ($request, $channelId, $values): JsonResponse {
                $channel = DB::table('mobile_channels')->where('id', $channelId)->whereNull('deleted_at')->lockForUpdate()->first();
                abort_if($channel === null, 404);
                $account = DB::table('treasury_accounts')->where('id', $channel->treasury_account_id)->first();
                $before = [
                    'name' => $account->name,
                    'channel_type' => $channel->channel_type,
                    'identifier' => $channel->identifier,
                    'status' => $channel->status,
                ];
                $accountChanges = [];
                if (array_key_exists('name', $values)) {
                    $accountChanges['name'] = $values['name'];
                }
                if (isset($values['channel_type'])) {
                    $accountChanges['account_type'] = match ($values['channel_type']) {
                        'bank' => 'bank',
                        'wallet', 'post_office' => 'cash',
                        default => 'other',
                    };
                }
                if ($accountChanges !== []) {
                    $this->treasury->updateAccount($request, (int) $account->id, $accountChanges);
                }
                $channelChanges = array_intersect_key($values, array_flip(['channel_type', 'identifier', 'status']));
                if ($channelChanges !== []) {
                    DB::table('mobile_channels')->where('id', $channelId)->update([...$channelChanges, 'updated_at' => now()]);
                }
                $after = [...$before, ...$values];
                $this->auditLog->record($request, 'mobile.channel.updated', 'mobile_channel', $channelId, null, $before, $after);
                $this->syncEvent($request, 'channel', $channelId, 'updated');

                return response()->json(['data' => $this->channelData($channelId)]);
            }, 5);
        });
    }

    public function archiveChannel(Request $request, int $channelId): JsonResponse
    {
        return $this->idempotency->execute($request, 'mobile_channel', function () use ($request, $channelId): JsonResponse {
            return DB::transaction(function () use ($request, $channelId): JsonResponse {
                $channel = DB::table('mobile_channels')->where('id', $channelId)->whereNull('deleted_at')->lockForUpdate()->first();
                abort_if($channel === null, 404);
                $now = now();
                DB::table('mobile_channels')->where('id', $channelId)->update([
                    'status' => 'archived',
                    'deleted_at' => $now,
                    'updated_at' => $now,
                ]);
                $sources = DB::table('mobile_sources')->where('channel_id', $channelId)
                    ->whereNull('deleted_at')->lockForUpdate()->get(['id', 'status']);
                foreach ($sources as $source) {
                    DB::table('mobile_sources')->where('id', $source->id)->update([
                        'status' => 'archived',
                        'deleted_at' => $now,
                        'updated_at' => $now,
                    ]);
                    $this->auditLog->record($request, 'mobile.source.archived', 'mobile_source', (int) $source->id,
                        null, ['status' => $source->status], ['status' => 'archived']);
                    $this->syncEvent($request, 'source', (int) $source->id, 'archived');
                }
                $messages = DB::table('mobile_messages')->where('channel_id', $channelId)
                    ->whereIn('status', ['new', 'needs_review'])
                    ->lockForUpdate()->get(['id', 'status']);
                foreach ($messages as $message) {
                    DB::table('mobile_messages')->where('id', $message->id)->update([
                        'status' => 'archived',
                        'archived_at' => $now,
                        'updated_at' => $now,
                    ]);
                    $this->auditLog->record($request, 'mobile.message.archived', 'mobile_message', (int) $message->id,
                        null, ['status' => $message->status], ['status' => 'archived']);
                    $this->syncEvent($request, 'message', (int) $message->id, 'archived');
                }
                $this->auditLog->record($request, 'mobile.channel.archived', 'mobile_channel', $channelId, null, [
                    'status' => $channel->status,
                ], ['status' => 'archived']);
                $this->syncEvent($request, 'channel', $channelId, 'archived');

                return response()->json(['data' => ['id' => $channelId, 'status' => 'archived']]);
            }, 5);
        });
    }

    public function sources(Request $request): JsonResponse
    {
        $device = $request->attributes->get('mobile_device');
        abort_unless(is_object($device) && isset($device->id), 401);
        $filters = ListQuery::validate($request, ['id' => 'source.id']);
        $query = DB::table('mobile_sources as source')
            ->join('mobile_channels as channel', 'channel.id', '=', 'source.channel_id')
            ->join('treasury_accounts as account', 'account.id', '=', 'channel.treasury_account_id')
            ->leftJoin('mobile_device_sources as device_source', function ($join) use ($device): void {
                $join->on('device_source.source_id', '=', 'source.id')
                    ->where('device_source.device_id', '=', $device->id);
            })
            ->whereNull('source.deleted_at')
            ->select([
                'source.id', 'source.channel_id', 'account.name as channel_name', 'channel.status as channel_status', 'source.source_kind',
                'source.sender_identifier', 'source.notification_package_names',
                'source.default_read_deposits', 'source.default_read_withdrawals',
                'device_source.is_enabled as device_is_enabled',
                'device_source.read_deposits as device_read_deposits',
                'device_source.read_withdrawals as device_read_withdrawals',
                'source.deposit_keywords', 'source.withdrawal_keywords',
                'source.parser_rule_version', 'source.parser_rule', 'source.redacted_sample_message', 'source.status',
            ])
            ->orderBy('source.id');
        ListQuery::search($query, $filters, ['source.sender_identifier', 'account.name']);
        ListQuery::sort($query, $filters, ['id' => 'source.id'], 'id');
        $rows = $query->paginate($filters['per_page'] ?? 50);
        $rows->getCollection()->transform(fn (object $row): object => $this->decodeSourceJson($row));

        return response()->json([
            'data' => $rows->items(),
            'meta' => [
                'current_page' => $rows->currentPage(),
                'last_page' => $rows->lastPage(),
                'per_page' => $rows->perPage(),
                'total' => $rows->total(),
            ],
        ]);
    }

    public function createSource(Request $request): JsonResponse
    {
        $values = $this->validateSource($request);
        $values['default_read_deposits'] ??= $values['read_deposits'];
        $values['default_read_withdrawals'] ??= $values['read_withdrawals'];
        $values['is_enabled'] ??= true;
        if (! $values['default_read_deposits'] && ! $values['default_read_withdrawals']) {
            throw ValidationException::withMessages(['default_read_deposits' => ['At least one default source direction must be enabled.']]);
        }
        if ($values['is_enabled'] && ! $values['read_deposits'] && ! $values['read_withdrawals']) {
            throw ValidationException::withMessages(['read_deposits' => ['An enabled source must read at least one direction.']]);
        }
        $device = $request->attributes->get('mobile_device');

        return $this->idempotency->execute($request, 'mobile_source', function () use ($request, $values, $device): JsonResponse {
            return DB::transaction(function () use ($request, $values, $device): JsonResponse {
                $channel = DB::table('mobile_channels')->where('id', $values['channel_id'])
                    ->where('status', 'active')->whereNull('deleted_at')->first();
                abort_if($channel === null, 404);
                $now = now();
                $sourceId = (int) DB::table('mobile_sources')->insertGetId([
                    ...$this->sourceColumns($values),
                    'device_id' => $device->id,
                    'channel_id' => $channel->id,
                    'source_kind' => $values['source_kind'],
                    'sender_identifier' => $values['sender_identifier'] ?? null,
                    'notification_package_names' => isset($values['notification_package_names'])
                        ? json_encode($values['notification_package_names'], JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE)
                        : null,
                    'deposit_keywords' => isset($values['deposit_keywords'])
                        ? json_encode($values['deposit_keywords'], JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE)
                        : null,
                    'withdrawal_keywords' => isset($values['withdrawal_keywords'])
                        ? json_encode($values['withdrawal_keywords'], JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE)
                        : null,
                    'parser_rule' => isset($values['parser_rule'])
                        ? json_encode($values['parser_rule'], JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE)
                        : null,
                    'status' => 'active',
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
                DB::table('mobile_device_sources')->insert([
                    'device_id' => $device->id,
                    'source_id' => $sourceId,
                    'is_enabled' => $values['is_enabled'],
                    'read_deposits' => $values['read_deposits'],
                    'read_withdrawals' => $values['read_withdrawals'],
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
                $after = $this->sourceAuditData($values);
                $this->auditLog->record($request, 'mobile.source.created', 'mobile_source', $sourceId, null, null, $after);
                $this->auditLog->record($request, 'mobile.source.device_settings_created', 'mobile_device_source', $sourceId,
                    null, null, [
                        'device_id' => (int) $device->id,
                        'is_enabled' => (bool) $values['is_enabled'],
                        'read_deposits' => (bool) $values['read_deposits'],
                        'read_withdrawals' => (bool) $values['read_withdrawals'],
                    ]);
                $this->syncEvent($request, 'source', $sourceId, 'created', shared: true);
                $this->syncEvent($request, 'source_setting', $sourceId, 'created');

                return response()->json(['data' => $this->sourceData($sourceId, (int) $device->id)], 201);
            }, 5);
        });
    }

    public function updateSource(Request $request, int $sourceId): JsonResponse
    {
        $values = $this->validateSource($request, false);
        $device = $request->attributes->get('mobile_device');

        return $this->idempotency->execute($request, 'mobile_source', function () use ($request, $sourceId, $values, $device): JsonResponse {
            return DB::transaction(function () use ($request, $sourceId, $values, $device): JsonResponse {
                $source = DB::table('mobile_sources')->where('id', $sourceId)
                    ->whereNull('deleted_at')->lockForUpdate()->first();
                abort_if($source === null, 404);
                $effectiveKind = $values['source_kind'] ?? $source->source_kind;
                if ($effectiveKind === 'sms' && empty($values['sender_identifier'] ?? $source->sender_identifier)) {
                    throw ValidationException::withMessages(['sender_identifier' => ['An SMS source requires a sender identifier.']]);
                }
                if ($effectiveKind === 'notification') {
                    $packages = $values['notification_package_names'] ?? json_decode((string) $source->notification_package_names, true);
                    if (empty($packages)) {
                        throw ValidationException::withMessages(['notification_package_names' => ['A notification source requires at least one package name.']]);
                    }
                }
                $parserRule = array_key_exists('parser_rule', $values)
                    ? $values['parser_rule']
                    : ($source->parser_rule === null ? null : json_decode((string) $source->parser_rule, true, 512, JSON_THROW_ON_ERROR));
                $parserVersion = array_key_exists('parser_rule_version', $values)
                    ? $values['parser_rule_version']
                    : $source->parser_rule_version;
                if ($parserRule !== null && $parserVersion === null) {
                    throw ValidationException::withMessages(['parser_rule_version' => ['A parser rule version is required with a parser rule.']]);
                }
                $defaultDeposits = (bool) ($values['default_read_deposits'] ?? $source->default_read_deposits);
                $defaultWithdrawals = (bool) ($values['default_read_withdrawals'] ?? $source->default_read_withdrawals);
                if (! $defaultDeposits && ! $defaultWithdrawals) {
                    throw ValidationException::withMessages(['default_read_deposits' => ['At least one default source direction must be enabled.']]);
                }
                if (isset($values['channel_id'])) {
                    abort_unless(DB::table('mobile_channels')->where('id', $values['channel_id'])
                        ->where('status', 'active')->whereNull('deleted_at')->exists(), 404);
                }
                $before = $this->sourceAuditData((array) $source);
                $definitionChanges = [];
                foreach ([
                    'channel_id', 'source_kind', 'sender_identifier', 'default_read_deposits',
                    'default_read_withdrawals', 'parser_rule_version', 'redacted_sample_message', 'status',
                ] as $field) {
                    if (array_key_exists($field, $values)) {
                        $definitionChanges[$field] = $values[$field];
                    }
                }
                foreach (['notification_package_names', 'deposit_keywords', 'withdrawal_keywords', 'parser_rule'] as $field) {
                    if (array_key_exists($field, $values)) {
                        $definitionChanges[$field] = $values[$field] === null
                            ? null
                            : json_encode($values[$field], JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE);
                    }
                }
                $settings = DB::table('mobile_device_sources')->where('device_id', $device->id)
                    ->where('source_id', $sourceId)->lockForUpdate()->first();
                $beforeSettings = [
                    'is_enabled' => (bool) ($settings->is_enabled ?? false),
                    'read_deposits' => (bool) ($settings->read_deposits ?? false),
                    'read_withdrawals' => (bool) ($settings->read_withdrawals ?? false),
                ];
                $afterSettings = [
                    'is_enabled' => (bool) ($values['is_enabled'] ?? $beforeSettings['is_enabled']),
                    'read_deposits' => (bool) ($values['read_deposits'] ?? $beforeSettings['read_deposits']),
                    'read_withdrawals' => (bool) ($values['read_withdrawals'] ?? $beforeSettings['read_withdrawals']),
                ];
                if ($afterSettings['is_enabled'] && ! $afterSettings['read_deposits'] && ! $afterSettings['read_withdrawals']) {
                    throw ValidationException::withMessages(['read_deposits' => ['An enabled source must read at least one direction.']]);
                }
                $settingsChanged = $afterSettings !== $beforeSettings;
                abort_if($definitionChanges === [] && ! $settingsChanged, 422);
                $now = now();
                if ($definitionChanges !== []) {
                    DB::table('mobile_sources')->where('id', $sourceId)->update([...$definitionChanges, 'updated_at' => $now]);
                    $after = $this->sourceAuditData([...((array) $source), ...$values]);
                    $this->auditLog->record($request, 'mobile.source.updated', 'mobile_source', $sourceId, null, $before, $after);
                    $this->syncEvent($request, 'source', $sourceId, 'updated', shared: true);
                }
                if ($settingsChanged) {
                    DB::table('mobile_device_sources')->updateOrInsert(
                        ['device_id' => $device->id, 'source_id' => $sourceId],
                        [...$afterSettings, 'updated_at' => $now, 'created_at' => $settings->created_at ?? $now],
                    );
                    $this->auditLog->record($request, 'mobile.source.device_settings_updated', 'mobile_device_source', $sourceId,
                        null, ['device_id' => (int) $device->id, ...$beforeSettings],
                        ['device_id' => (int) $device->id, ...$afterSettings]);
                    $this->syncEvent($request, 'source_setting', $sourceId, 'updated');
                }

                return response()->json(['data' => $this->sourceData($sourceId, (int) $device->id)]);
            }, 5);
        });
    }

    public function archiveSource(Request $request, int $sourceId): JsonResponse
    {
        $device = $request->attributes->get('mobile_device');

        return $this->idempotency->execute($request, 'mobile_source', function () use ($request, $sourceId): JsonResponse {
            return DB::transaction(function () use ($request, $sourceId): JsonResponse {
                $source = DB::table('mobile_sources')->where('id', $sourceId)
                    ->whereNull('deleted_at')->lockForUpdate()->first();
                abort_if($source === null, 404);
                $now = now();
                DB::table('mobile_sources')->where('id', $sourceId)->update([
                    'status' => 'archived', 'deleted_at' => $now, 'updated_at' => $now,
                ]);
                $messages = DB::table('mobile_messages')->where('source_id', $sourceId)
                    ->whereIn('status', ['new', 'needs_review'])
                    ->lockForUpdate()->get(['id', 'status', 'device_id']);
                foreach ($messages as $message) {
                    DB::table('mobile_messages')->where('id', $message->id)->update([
                        'status' => 'archived',
                        'archived_at' => $now,
                        'updated_at' => $now,
                    ]);
                    $this->auditLog->record($request, 'mobile.message.archived', 'mobile_message', (int) $message->id,
                        null, ['status' => $message->status], ['status' => 'archived']);
                    $this->syncEvent($request, 'message', (int) $message->id, 'archived', deviceId: (int) $message->device_id);
                }
                $this->auditLog->record($request, 'mobile.source.archived', 'mobile_source', $sourceId, null,
                    ['status' => $source->status], ['status' => 'archived']);
                $this->syncEvent($request, 'source', $sourceId, 'archived', shared: true);

                return response()->json(['data' => ['id' => $sourceId, 'status' => 'archived']]);
            }, 5);
        });
    }

    public function categories(Request $request): JsonResponse
    {
        abort_unless(
            $this->hasPermission($request, 'mobile.categories.manage')
                || $this->hasPermission($request, 'mobile.withdrawals.register'),
            403,
        );
        $sortable = ['name' => 'category.name', 'category_kind' => 'category.category_kind', 'id' => 'category.id'];
        $filters = ListQuery::validate($request, $sortable, [
            'category_kind' => ['sometimes', 'in:expense,transfer'],
        ]);
        $query = DB::table('mobile_categories as category')
            ->leftJoin('expense_categories as expense_category', 'expense_category.id', '=', 'category.expense_category_id')
            ->leftJoin('treasury_accounts as target', 'target.id', '=', 'category.target_treasury_account_id')
            ->where('category.is_active', true)
            ->select([
                'category.id', 'category.name', 'category.category_kind', 'category.expense_category_id',
                'category.target_treasury_account_id', 'category.requires_notes', 'category.is_system', 'category.is_active',
                'expense_category.name as expense_category_name', 'target.name as target_account_name',
            ]);
        $otherNames = $this->withdrawals->otherWithdrawalCategoryNames();
        foreach (['category_kind'] as $field) {
            if (isset($filters[$field])) {
                if ($filters[$field] === 'transfer') {
                    $query->where(function ($query) use ($otherNames): void {
                        $query->where('category.category_kind', 'transfer')
                            ->orWhereIn(DB::raw('LOWER(category.name)'), $otherNames);
                    });
                } else {
                    $query->where('category.category_kind', 'expense')
                        ->whereNotIn(DB::raw('LOWER(category.name)'), $otherNames);
                }
            }
        }
        ListQuery::search($query, $filters, ['category.name']);
        ListQuery::sort($query, $filters, $sortable, 'name', 'category.id');
        $page = $query->paginate($filters['per_page'] ?? 100);
        $page->getCollection()->transform(function (object $category): object {
            $category = $this->withdrawals->presentCategory($category);
            $category->requires_notes = (bool) $category->requires_notes;
            $category->is_system = (bool) $category->is_system;
            $category->is_active = (bool) $category->is_active;

            return $category;
        });

        return response()->json([
            'data' => $page->items(),
            'meta' => [
                'current_page' => $page->currentPage(),
                'last_page' => $page->lastPage(),
                'per_page' => $page->perPage(),
                'total' => $page->total(),
            ],
        ]);
    }

    public function createCategory(Request $request): JsonResponse
    {
        $values = $request->validate([
            'name' => ['required', 'string', 'max:160', 'unique:mobile_categories,name'],
            'category_kind' => ['required', 'in:expense,transfer'],
            'target_treasury_account_id' => ['required_if:category_kind,transfer', 'prohibited_if:category_kind,expense', 'nullable', 'integer', 'exists:treasury_accounts,id'],
            'requires_notes' => ['sometimes', 'boolean'],
        ]);

        return $this->idempotency->execute($request, 'mobile_category', function () use ($request, $values): JsonResponse {
            return DB::transaction(function () use ($request, $values): JsonResponse {
                $expenseCategoryId = null;
                $targetId = null;
                if ($values['category_kind'] === 'transfer') {
                    $target = DB::table('treasury_accounts')->where('id', $values['target_treasury_account_id'])
                        ->where('is_active', true)->first();
                    abort_if($target === null, 422);
                    $targetId = $target->id;
                } else {
                    $expenseCategoryId = $this->expenseCategoryId($request, $values['name']);
                }
                $now = now();
                $categoryId = (int) DB::table('mobile_categories')->insertGetId([
                    'name' => $values['name'],
                    'category_kind' => $values['category_kind'],
                    'expense_category_id' => $expenseCategoryId,
                    'target_treasury_account_id' => $targetId,
                    'requires_notes' => $values['requires_notes'] ?? false,
                    'is_system' => false,
                    'is_active' => true,
                    'created_by_user_id' => $this->actorId($request),
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
                $this->auditLog->record($request, 'mobile.category.created', 'mobile_category', $categoryId, null, null, $values);
                $this->syncEvent($request, 'category', $categoryId, 'created');

                return response()->json(['data' => $this->categoryData($categoryId)], 201);
            }, 5);
        });
    }

    public function updateCategory(Request $request, int $categoryId): JsonResponse
    {
        $values = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:160', 'unique:mobile_categories,name,'.$categoryId],
            'target_treasury_account_id' => ['sometimes', 'required', 'integer', 'exists:treasury_accounts,id'],
            'requires_notes' => ['sometimes', 'boolean'],
            'is_active' => ['sometimes', 'boolean'],
        ]);
        abort_if($values === [], 422);

        return $this->idempotency->execute($request, 'mobile_category', function () use ($request, $categoryId, $values): JsonResponse {
            return DB::transaction(function () use ($request, $categoryId, $values): JsonResponse {
                $category = DB::table('mobile_categories')->where('id', $categoryId)->lockForUpdate()->first();
                abort_if($category === null, 404);
                if (($category->name === 'مصاريف أخرى' || ($values['name'] ?? null) === 'مصاريف أخرى')
                    && array_key_exists('requires_notes', $values) && ! (bool) $values['requires_notes']) {
                    throw ValidationException::withMessages(['requires_notes' => ['مصاريف أخرى requires notes.']]);
                }
                $before = $this->categoryAuditData($category);
                $changes = $values;
                if ($category->category_kind === 'transfer' && isset($values['target_treasury_account_id'])) {
                    abort_unless(DB::table('treasury_accounts')->where('id', $values['target_treasury_account_id'])
                        ->where('is_active', true)->exists(), 422);
                }
                if ($category->category_kind === 'expense' && isset($values['name']) && $category->expense_category_id !== null) {
                    $duplicateExpenseName = DB::table('expense_categories')
                        ->where('name', $values['name'])
                        ->where('id', '!=', $category->expense_category_id)
                        ->exists();
                    if ($duplicateExpenseName) {
                        throw ValidationException::withMessages(['name' => ['The expense category name has already been taken.']]);
                    }
                    $expenseBefore = DB::table('expense_categories')->where('id', $category->expense_category_id)->first();
                    DB::table('expense_categories')->where('id', $category->expense_category_id)->update([
                        'name' => $values['name'], 'updated_at' => now(),
                    ]);
                    $this->auditLog->record($request, 'expense_category.updated', 'expense_category',
                        (int) $category->expense_category_id, null, (array) $expenseBefore, ['name' => $values['name']]);
                }
                DB::table('mobile_categories')->where('id', $categoryId)->update([...$changes, 'updated_at' => now()]);
                $this->auditLog->record($request, 'mobile.category.updated', 'mobile_category', $categoryId, null, $before, $changes);
                $this->syncEvent($request, 'category', $categoryId, 'updated');

                return response()->json(['data' => $this->categoryData($categoryId)]);
            }, 5);
        });
    }

    public function archiveCategory(Request $request, int $categoryId): JsonResponse
    {
        return $this->idempotency->execute($request, 'mobile_category', function () use ($request, $categoryId): JsonResponse {
            return DB::transaction(function () use ($request, $categoryId): JsonResponse {
                $category = DB::table('mobile_categories')->where('id', $categoryId)->lockForUpdate()->first();
                abort_if($category === null, 404);
                DB::table('mobile_categories')->where('id', $categoryId)->update(['is_active' => false, 'updated_at' => now()]);
                $this->auditLog->record($request, 'mobile.category.archived', 'mobile_category', $categoryId, null,
                    ['is_active' => (bool) $category->is_active], ['is_active' => false]);
                $this->syncEvent($request, 'category', $categoryId, 'archived');

                return response()->json(['data' => ['id' => $categoryId, 'is_active' => false]]);
            }, 5);
        });
    }

    private function validateSource(Request $request, bool $creating = true): array
    {
        $values = $request->validate([
            'channel_id' => [$creating ? 'required' : 'sometimes', 'integer', 'min:1'],
            'source_kind' => [$creating ? 'required' : 'sometimes', 'in:sms,notification'],
            'sender_identifier' => ['sometimes', 'nullable', 'string', 'max:200'],
            'notification_package_names' => ['sometimes', 'array', 'min:1', 'max:20'],
            'notification_package_names.*' => ['string', 'max:255'],
            'read_deposits' => [$creating ? 'required' : 'sometimes', 'boolean'],
            'read_withdrawals' => [$creating ? 'required' : 'sometimes', 'boolean'],
            'is_enabled' => ['sometimes', 'boolean'],
            'default_read_deposits' => ['sometimes', 'boolean'],
            'default_read_withdrawals' => ['sometimes', 'boolean'],
            'deposit_keywords' => ['sometimes', 'nullable', 'array', 'max:50'],
            'deposit_keywords.*' => ['string', 'max:160'],
            'withdrawal_keywords' => ['sometimes', 'nullable', 'array', 'max:50'],
            'withdrawal_keywords.*' => ['string', 'max:160'],
            'parser_rule_version' => ['sometimes', 'nullable', 'integer', 'min:1', 'max:65535'],
            'parser_rule' => ['sometimes', 'nullable', 'array'],
            'redacted_sample_message' => ['sometimes', 'nullable', 'string', 'max:4000'],
            'status' => ['sometimes', 'in:active,paused'],
        ]);

        $kind = $values['source_kind'] ?? null;
        if ($kind === 'sms' && $creating && empty($values['sender_identifier'])) {
            throw ValidationException::withMessages(['sender_identifier' => ['An SMS source requires a sender identifier.']]);
        }
        if ($kind === 'notification' && $creating && empty($values['notification_package_names'])) {
            throw ValidationException::withMessages(['notification_package_names' => ['A notification source requires at least one package name.']]);
        }
        if (isset($values['parser_rule']) && ! isset($values['parser_rule_version']) && $creating) {
            throw ValidationException::withMessages(['parser_rule_version' => ['A parser rule version is required with a parser rule.']]);
        }

        return $values;
    }

    private function sourceColumns(array $values): array
    {
        return [
            'default_read_deposits' => $values['default_read_deposits'],
            'default_read_withdrawals' => $values['default_read_withdrawals'],
            'parser_rule_version' => $values['parser_rule_version'] ?? null,
            'redacted_sample_message' => $values['redacted_sample_message'] ?? null,
        ];
    }

    private function sourceData(int $sourceId, int $deviceId): object
    {
        $source = DB::table('mobile_sources as source')
            ->leftJoin('mobile_device_sources as device_source', function ($join) use ($deviceId): void {
                $join->on('device_source.source_id', '=', 'source.id')
                    ->where('device_source.device_id', '=', $deviceId);
            })
            ->where('source.id', $sourceId)
            ->select([
                'source.*',
                'device_source.is_enabled as device_is_enabled',
                'device_source.read_deposits as device_read_deposits',
                'device_source.read_withdrawals as device_read_withdrawals',
            ])->first();
        abort_if($source === null, 404);

        return $this->decodeSourceJson($source);
    }

    private function decodeSourceJson(object $source): object
    {
        foreach (['notification_package_names', 'deposit_keywords', 'withdrawal_keywords', 'parser_rule'] as $field) {
            $source->{$field} = $source->{$field} === null ? null : json_decode((string) $source->{$field}, true, 512, JSON_THROW_ON_ERROR);
        }
        $source->default_read_deposits = (bool) $source->default_read_deposits;
        $source->default_read_withdrawals = (bool) $source->default_read_withdrawals;
        $source->is_enabled = (bool) ($source->device_is_enabled ?? false);
        $source->read_deposits = (bool) ($source->device_read_deposits ?? false);
        $source->read_withdrawals = (bool) ($source->device_read_withdrawals ?? false);
        unset($source->device_is_enabled, $source->device_read_deposits, $source->device_read_withdrawals);

        return $source;
    }

    private function sourceAuditData(array|object $source): array
    {
        $values = (array) $source;
        $parserRule = $values['parser_rule'] ?? null;
        if (is_string($parserRule)) {
            $parserRule = $parserRule === '' ? null : json_decode($parserRule, true, 512, JSON_THROW_ON_ERROR);
        }
        $sample = $values['redacted_sample_message'] ?? null;
        unset($values['redacted_sample_message'], $values['parser_rule']);
        $audit = array_intersect_key($values, array_flip([
            'channel_id', 'source_kind', 'sender_identifier', 'notification_package_names',
            'default_read_deposits', 'default_read_withdrawals', 'deposit_keywords', 'withdrawal_keywords',
            'parser_rule_version', 'status',
        ]));
        $audit['parser_rule_fingerprint'] = $parserRule === null
            ? null
            : hash('sha256', json_encode($parserRule, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE));
        $audit['redacted_sample_fingerprint'] = $sample === null
            ? null
            : hash('sha256', (string) $sample);

        return $audit;
    }

    private function channelData(int $channelId): array
    {
        $channel = DB::table('mobile_channels as channel')
            ->join('treasury_accounts as account', 'account.id', '=', 'channel.treasury_account_id')
            ->where('channel.id', $channelId)
            ->first([
                'channel.id', 'channel.treasury_account_id', 'account.name', 'channel.channel_type',
                'channel.identifier', 'channel.status',
            ]);
        abort_if($channel === null, 404);

        return (array) $channel;
    }

    private function categoryData(int $categoryId): object
    {
        $category = DB::table('mobile_categories as category')
            ->leftJoin('expense_categories as expense_category', 'expense_category.id', '=', 'category.expense_category_id')
            ->leftJoin('treasury_accounts as target', 'target.id', '=', 'category.target_treasury_account_id')
            ->where('category.id', $categoryId)
            ->first([
                'category.id', 'category.name', 'category.category_kind', 'category.expense_category_id',
                'category.target_treasury_account_id', 'category.requires_notes', 'category.is_system',
                'category.is_active', 'expense_category.name as expense_category_name', 'target.name as target_account_name',
            ]);
        abort_if($category === null, 404);
        $category->requires_notes = (bool) $category->requires_notes;
        $category->is_system = (bool) $category->is_system;
        $category->is_active = (bool) $category->is_active;

        return $category;
    }

    private function categoryAuditData(object $category): array
    {
        return [
            'name' => $category->name,
            'category_kind' => $category->category_kind,
            'expense_category_id' => $category->expense_category_id,
            'target_treasury_account_id' => $category->target_treasury_account_id,
            'requires_notes' => (bool) $category->requires_notes,
            'is_active' => (bool) $category->is_active,
        ];
    }

    private function expenseCategoryId(Request $request, string $name): int
    {
        $category = DB::table('expense_categories')->where('name', $name)->first();
        if ($category !== null) {
            if (! (bool) $category->is_active) {
                throw ValidationException::withMessages(['name' => ['The matching expense category is inactive; reactivate it before using it for mobile withdrawals.']]);
            }

            return (int) $category->id;
        }
        $now = now();
        $id = (int) DB::table('expense_categories')->insertGetId([
            'name' => $name,
            'is_active' => true,
            'created_at' => $now,
            'updated_at' => $now,
        ]);
        $this->auditLog->record($request, 'expense_category.created', 'expense_category', $id, null, null, ['name' => $name]);

        return $id;
    }

    private function hasPermission(Request $request, string $permission): bool
    {
        $user = $request->attributes->get('authenticated_user');

        return is_object($user) && DB::table('role_permissions as role_permission')
            ->join('permissions as permission', 'permission.id', '=', 'role_permission.permission_id')
            ->join('user_roles as user_role', 'user_role.role_id', '=', 'role_permission.role_id')
            ->join('roles as role', 'role.id', '=', 'user_role.role_id')
            ->where('user_role.user_id', $user->id)
            ->where('role.is_active', true)
            ->where('permission.code', $permission)
            ->exists();
    }

    private function actorId(Request $request): int
    {
        $actor = $request->attributes->get('authenticated_user');
        abort_unless(is_object($actor) && isset($actor->id), 401);

        return (int) $actor->id;
    }

    private function syncEvent(
        Request $request,
        string $entityType,
        int $entityId,
        string $eventType,
        bool $shared = false,
        ?int $deviceId = null,
    ): void {
        $device = $request->attributes->get('mobile_device');
        DB::table('mobile_sync_events')->insert([
            'actor_user_id' => $this->actorId($request),
            'device_id' => $shared ? null : ($deviceId ?? (is_object($device) ? $device->id : null)),
            'entity_type' => $entityType,
            'entity_id' => $entityId,
            'event_type' => $eventType,
            'created_at' => now(),
        ]);
    }
}
