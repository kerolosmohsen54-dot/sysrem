<?php

namespace App\Http\Controllers;

use App\Services\AuditLogService;
use App\Services\MobileIdempotencyService;
use App\Support\ExactMoney;
use App\Support\ListQuery;
use Carbon\Carbon;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use InvalidArgumentException;

class MobileMessageController extends Controller
{
    public function __construct(
        private readonly AuditLogService $auditLog,
        private readonly MobileIdempotencyService $idempotency,
    ) {}

    public function ingest(Request $request): JsonResponse
    {
        $values = $request->validate([
            'messages' => ['required', 'array', 'min:1', 'max:100'],
            'messages.*.source_id' => ['required', 'integer', 'min:1'],
            'messages.*.type' => ['sometimes', 'in:deposit,withdrawal'],
            'messages.*.amount' => ['sometimes', 'nullable', 'string', 'regex:/\A(?:0|[1-9][0-9]{0,14})(?:\.[0-9]{1,2})?\z/'],
            'messages.*.sender' => ['required', 'string', 'max:200'],
            'messages.*.received_at' => ['required', 'date'],
            'messages.*.raw_text' => ['required', 'string', 'max:5000'],
        ]);
        $device = $request->attributes->get('mobile_device');
        abort_unless(is_object($device) && isset($device->id, $device->user_id), 401);

        return $this->idempotency->execute($request, 'mobile_message_batch', function () use ($request, $values, $device): JsonResponse {
            $results = [];
            $accepted = 0;
            $duplicates = 0;

            foreach ($values['messages'] as $index => $input) {
                $source = DB::table('mobile_sources as source')
                    ->join('mobile_channels as channel', 'channel.id', '=', 'source.channel_id')
                    ->leftJoin('mobile_device_sources as device_source', function ($join) use ($device): void {
                        $join->on('device_source.source_id', '=', 'source.id')
                            ->where('device_source.device_id', '=', $device->id);
                    })
                    ->where('source.id', $input['source_id'])
                    ->where('source.status', 'active')
                    ->whereNull('source.deleted_at')
                    ->where('channel.status', 'active')
                    ->whereNull('channel.deleted_at')
                    ->lockForUpdate()
                    ->first([
                        'source.id',
                        'source.channel_id',
                        'source.source_kind',
                        'source.sender_identifier',
                        'source.notification_package_names',
                        'source.default_read_deposits',
                        'source.default_read_withdrawals',
                        'source.deposit_keywords',
                        'source.withdrawal_keywords',
                        'device_source.is_enabled as device_is_enabled',
                        'device_source.read_deposits as device_read_deposits',
                        'device_source.read_withdrawals as device_read_withdrawals',
                    ]);
                if ($source === null || ! (bool) ($source->device_is_enabled ?? false)) {
                    throw ValidationException::withMessages([
                        "messages.{$index}.source_id" => ['The source is not enabled for this device and active channel.'],
                    ]);
                }
                if ($this->looksLikeVerificationMessage($input['raw_text'])) {
                    throw ValidationException::withMessages([
                        "messages.{$index}.raw_text" => ['Verification and one-time-code messages cannot be ingested.'],
                    ]);
                }
                $depositMatches = $this->matchesConfiguredKeywords($source->deposit_keywords, $input['raw_text']);
                $withdrawalMatches = $this->matchesConfiguredKeywords($source->withdrawal_keywords, $input['raw_text']);
                if (! $depositMatches && ! $withdrawalMatches) {
                    throw ValidationException::withMessages([
                        "messages.{$index}.raw_text" => ['The message does not match any configured source direction.'],
                    ]);
                }
                if (! $this->senderMatches($source, $input['sender'])) {
                    throw ValidationException::withMessages([
                        "messages.{$index}.sender" => ['The sender does not match this registered source.'],
                    ]);
                }
                if ($depositMatches && $withdrawalMatches) {
                    if (! (bool) $source->device_read_deposits && ! (bool) $source->device_read_withdrawals) {
                        throw ValidationException::withMessages([
                            "messages.{$index}.type" => ['This device has no enabled direction for this source.'],
                        ]);
                    }
                    $messageType = 'ambiguous';
                } elseif ($depositMatches) {
                    if (! (bool) $source->device_read_deposits) {
                        throw ValidationException::withMessages([
                            "messages.{$index}.type" => ['This device is not enabled to read deposits from this source.'],
                        ]);
                    }
                    $messageType = 'deposit';
                } else {
                    if (! (bool) $source->device_read_withdrawals) {
                        throw ValidationException::withMessages([
                            "messages.{$index}.type" => ['This device is not enabled to read withdrawals from this source.'],
                        ]);
                    }
                    $messageType = 'withdrawal';
                }
                if (isset($input['type']) && $messageType !== 'ambiguous' && $input['type'] !== $messageType) {
                    throw ValidationException::withMessages([
                        "messages.{$index}.type" => ['The submitted type does not match the configured source keywords.'],
                    ]);
                }

                $amount = null;
                if (isset($input['amount']) && $input['amount'] !== '') {
                    try {
                        $amountCents = ExactMoney::toCents($input['amount']);
                    } catch (InvalidArgumentException) {
                        throw ValidationException::withMessages([
                            "messages.{$index}.amount" => ['The amount is outside the supported EGP range.'],
                        ]);
                    }
                    if (ExactMoney::compare($amountCents, '0') <= 0) {
                        throw ValidationException::withMessages([
                            "messages.{$index}.amount" => ['A known message amount must be greater than zero.'],
                        ]);
                    }
                    $amount = ExactMoney::fromCents($amountCents);
                }

                $receivedAt = Carbon::parse($input['received_at'])->utc()->format('Y-m-d H:i:s');
                $textHash = hash('sha256', $input['raw_text']);
                $duplicateHash = hash('sha256', json_encode([
                    $this->normalizeSenderIdentifier($input['sender']),
                    $amount,
                    $receivedAt,
                    $textHash,
                ], JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE));
                $existing = DB::table('mobile_messages')
                    ->where('duplicate_hash', $duplicateHash)
                    ->first(['id']);
                if ($existing !== null) {
                    $duplicates++;
                    $this->auditDuplicate($request, $device, $source, (int) $existing->id, $amount, $receivedAt, $input['sender']);
                    $results[] = [
                        'index' => $index,
                        'type' => $messageType,
                        'status' => 'duplicate',
                        'existing_message_id' => (int) $existing->id,
                    ];

                    continue;
                }

                $status = $amount === null || $messageType === 'ambiguous' ? 'needs_review' : 'new';
                $now = now();
                try {
                    $messageId = (int) DB::table('mobile_messages')->insertGetId([
                        'device_id' => $device->id,
                        'source_id' => $source->id,
                        'channel_id' => $source->channel_id,
                        'message_type' => $messageType,
                        'amount' => $amount,
                        'sender_identifier' => $input['sender'],
                        'received_at' => $receivedAt,
                        'server_received_at' => $now,
                        'raw_text' => $input['raw_text'],
                        'text_hash' => $textHash,
                        'duplicate_hash' => $duplicateHash,
                        'status' => $status,
                        'created_at' => $now,
                        'updated_at' => $now,
                    ]);
                } catch (QueryException $exception) {
                    if (! $this->isDuplicateHashConflict($exception)) {
                        throw $exception;
                    }
                    $existing = DB::table('mobile_messages')->where('duplicate_hash', $duplicateHash)->first(['id']);
                    if ($existing === null) {
                        throw $exception;
                    }
                    $duplicates++;
                    $this->auditDuplicate($request, $device, $source, (int) $existing->id, $amount, $receivedAt, $input['sender']);
                    $results[] = [
                        'index' => $index,
                        'type' => $messageType,
                        'status' => 'duplicate',
                        'existing_message_id' => (int) $existing->id,
                    ];

                    continue;
                }

                $this->auditLog->record($request, 'mobile.message.ingested', 'mobile_message', $messageId, null, null, [
                    'device_id' => (int) $device->id,
                    'source_id' => (int) $source->id,
                    'channel_id' => (int) $source->channel_id,
                    'type' => $messageType,
                    'amount_egp' => $amount,
                    'received_at' => $receivedAt,
                    'status' => $status,
                ]);
                $this->syncEvent((int) $device->user_id, (int) $device->id, $messageId, 'created');
                $accepted++;
                $results[] = ['index' => $index, 'message_id' => $messageId, 'type' => $messageType, 'status' => $status];
            }

            return response()->json([
                'data' => [
                    'results' => $results,
                    'accepted_count' => $accepted,
                    'duplicate_count' => $duplicates,
                ],
            ], 201);
        });
    }

    public function index(Request $request): JsonResponse
    {
        $sortable = [
            'received_at' => 'message.received_at',
            'server_received_at' => 'message.server_received_at',
            'amount' => 'message.amount',
            'type' => 'message.message_type',
            'status' => 'message.status',
            'id' => 'message.id',
        ];
        $filters = ListQuery::validate($request, $sortable, [
            'type' => ['sometimes', 'in:deposit,withdrawal,ambiguous'],
            'status' => ['sometimes', 'in:new,registered,ignored,needs_review,archived'],
            'channel_id' => ['sometimes', 'integer', 'min:1'],
            'date_from' => ['sometimes', 'date_format:Y-m-d'],
            'date_to' => ['sometimes', 'date_format:Y-m-d'],
        ]);
        if (isset($filters['date_from'], $filters['date_to'])
            && $filters['date_from'] > $filters['date_to']) {
            throw ValidationException::withMessages(['date_to' => ['The end date must be on or after the start date.']]);
        }
        $user = $request->attributes->get('authenticated_user');
        abort_unless(is_object($user) && isset($user->id), 401);
        $canViewText = $this->hasPermission($request, 'mobile.messages.view');
        $query = DB::table('mobile_messages as message')
            ->join('mobile_devices as device', 'device.id', '=', 'message.device_id')
            ->join('mobile_channels as channel', 'channel.id', '=', 'message.channel_id')
            ->join('treasury_accounts as account', 'account.id', '=', 'channel.treasury_account_id')
            ->where('device.user_id', $user->id)
            ->select([
                'message.id',
                'message.source_id',
                'message.channel_id',
                'account.name as channel_name',
                'message.message_type as type',
                'message.amount',
                'message.sender_identifier',
                'message.received_at',
                'message.server_received_at',
                'message.status',
                'message.registered_source',
                'message.registered_document_type',
                'message.registered_document_id',
                'message.reviewed_at',
                'message.archived_at',
            ]);
        if ($canViewText) {
            $query->addSelect('message.raw_text');
        }
        if (isset($filters['type'])) {
            $query->where('message.message_type', $filters['type']);
        }
        if (isset($filters['status'])) {
            $query->where('message.status', $filters['status']);
        }
        if (isset($filters['channel_id'])) {
            $query->where('message.channel_id', $filters['channel_id']);
        }
        if (isset($filters['date_from'])) {
            $query->where('message.received_at', '>=', $filters['date_from'].' 00:00:00');
        }
        if (isset($filters['date_to'])) {
            $query->where('message.received_at', '<=', $filters['date_to'].' 23:59:59');
        }
        $searchable = ['message.sender_identifier', 'account.name'];
        if ($canViewText) {
            $searchable[] = 'message.raw_text';
        }
        ListQuery::search($query, $filters, $searchable);
        ListQuery::sort($query, $filters, $sortable, 'received_at', 'message.id', 'desc');
        $page = $query->paginate($filters['per_page'] ?? 50);
        $data = collect($page->items())->map(function (object $message): object {
            $message->amount_egp = $message->amount === null
                ? null
                : ExactMoney::fromCents(ExactMoney::toCents((string) $message->amount));
            unset($message->amount);

            return $message;
        })->all();

        return response()->json([
            'data' => $data,
            'meta' => [
                'current_page' => $page->currentPage(),
                'last_page' => $page->lastPage(),
                'per_page' => $page->perPage(),
                'total' => $page->total(),
            ],
        ]);
    }

    public function reviewAmount(Request $request, int $messageId): JsonResponse
    {
        $values = $request->validate([
            'amount_egp' => ['required', 'string', 'regex:/\A(?:0|[1-9][0-9]{0,14})(?:\.[0-9]{1,2})?\z/'],
        ]);
        try {
            $amountCents = ExactMoney::toCents($values['amount_egp']);
        } catch (InvalidArgumentException) {
            throw ValidationException::withMessages(['amount_egp' => ['The amount is outside the supported EGP range.']]);
        }
        if (ExactMoney::compare($amountCents, '0') <= 0) {
            throw ValidationException::withMessages(['amount_egp' => ['The reviewed amount must be greater than zero.']]);
        }
        $amount = ExactMoney::fromCents($amountCents);

        return $this->idempotency->execute($request, 'mobile_message_review', function () use ($request, $messageId, $amount): JsonResponse {
            $user = $request->attributes->get('authenticated_user');
            abort_unless(is_object($user) && isset($user->id), 401);
            $message = DB::table('mobile_messages as message')
                ->join('mobile_devices as device', 'device.id', '=', 'message.device_id')
                ->where('message.id', $messageId)
                ->where('device.user_id', $user->id)
                ->lockForUpdate()
                ->first(['message.*']);
            abort_if($message === null, 404);
            if (! in_array($message->status, ['needs_review', 'archived'], true)) {
                throw ValidationException::withMessages(['message' => ['Only messages needing review or archived messages can be reviewed.']]);
            }
            $now = now();
            $nextStatus = $message->status === 'archived' ? 'archived' : 'new';
            DB::table('mobile_messages')->where('id', $messageId)->update([
                'amount' => $amount,
                'status' => $nextStatus,
                'reviewed_by_user_id' => $user->id,
                'reviewed_at' => $now,
                'updated_at' => $now,
            ]);
            $this->auditLog->record($request, 'mobile.message.amount_reviewed', 'mobile_message', $messageId, null, [
                'amount_egp' => $message->amount === null
                    ? null
                    : ExactMoney::fromCents(ExactMoney::toCents((string) $message->amount)),
                'status' => $message->status,
            ], [
                'amount_egp' => $amount,
                'status' => $nextStatus,
                'reviewed_at' => $now->toDateTimeString(),
            ]);
            $device = $request->attributes->get('mobile_device');
            $this->syncEvent((int) $user->id, (int) $device->id, $messageId, 'updated');

            return response()->json([
                'data' => [
                    'id' => $messageId,
                    'amount_egp' => $amount,
                    'status' => $nextStatus,
                    'reviewed_at' => $now->toDateTimeString(),
                ],
            ]);
        });
    }

    public function ignore(Request $request, int $messageId): JsonResponse
    {
        return $this->idempotency->execute($request, 'mobile_message_ignore', function () use ($request, $messageId): JsonResponse {
            $user = $request->attributes->get('authenticated_user');
            $device = $request->attributes->get('mobile_device');
            abort_unless(is_object($user) && is_object($device), 401);

            $message = DB::table('mobile_messages as message')
                ->join('mobile_devices as device', 'device.id', '=', 'message.device_id')
                ->where('message.id', $messageId)
                ->where('device.user_id', $user->id)
                ->lockForUpdate()
                ->first(['message.status']);
            abort_if($message === null, 404);
            if ($message->status === 'ignored') {
                return response()->json(['data' => ['id' => $messageId, 'status' => 'ignored']]);
            }
            if (! in_array($message->status, ['new', 'needs_review'], true)) {
                abort(409, 'Only new or needs-review messages can be ignored.');
            }

            DB::table('mobile_messages')->where('id', $messageId)->update([
                'status' => 'ignored',
                'updated_at' => now(),
            ]);
            $this->auditLog->record($request, 'mobile.message.ignored', 'mobile_message', $messageId, null, [
                'status' => $message->status,
            ], [
                'status' => 'ignored',
            ]);
            $this->syncEvent((int) $user->id, (int) $device->id, $messageId, 'updated');

            return response()->json(['data' => ['id' => $messageId, 'status' => 'ignored']]);
        });
    }

    private function senderMatches(object $source, string $sender): bool
    {
        if ($source->source_kind === 'sms') {
            return is_string($source->sender_identifier)
                && hash_equals(
                    $this->normalizeSenderIdentifier($source->sender_identifier),
                    $this->normalizeSenderIdentifier($sender),
                );
        }
        $packages = $source->notification_package_names === null
            ? []
            : json_decode((string) $source->notification_package_names, true, 512, JSON_THROW_ON_ERROR);

        return is_array($packages) && in_array($sender, $packages, true);
    }

    private function looksLikeVerificationMessage(string $text): bool
    {
        $normalized = mb_strtolower($text, 'UTF-8');
        foreach (['رمز التحقق', 'كود', 'otp', 'verification'] as $blockedPhrase) {
            if (str_contains($normalized, $blockedPhrase)) {
                return true;
            }
        }

        return false;
    }

    private function matchesConfiguredKeywords(mixed $jsonKeywords, string $text): bool
    {
        if ($jsonKeywords === null) {
            return false;
        }
        $keywords = json_decode((string) $jsonKeywords, true, 512, JSON_THROW_ON_ERROR);
        if (! is_array($keywords) || $keywords === []) {
            return false;
        }
        $normalizedText = mb_strtolower($text, 'UTF-8');
        foreach ($keywords as $keyword) {
            if (is_string($keyword) && $keyword !== ''
                && str_contains($normalizedText, mb_strtolower($keyword, 'UTF-8'))) {
                return true;
            }
        }

        return false;
    }

    private function normalizeSenderIdentifier(string $sender): string
    {
        $trimmed = trim($sender);
        if (preg_match('/\A[+\d\s().-]+\z/u', $trimmed) === 1) {
            $digits = preg_replace('/\D+/u', '', $trimmed) ?? '';
            if (str_starts_with($digits, '00')) {
                $digits = substr($digits, 2);
            }
            if (str_starts_with($digits, '20')) {
                return $digits;
            }
            if (str_starts_with($digits, '0') && strlen($digits) >= 9) {
                return '20'.substr($digits, 1);
            }

            return $digits;
        }

        return mb_strtolower($trimmed, 'UTF-8');
    }

    private function auditDuplicate(
        Request $request,
        object $device,
        object $source,
        int $existingMessageId,
        ?string $amount,
        string $receivedAt,
        string $sender,
    ): void {
        $this->auditLog->record($request, 'mobile.message.duplicate_ignored', 'mobile_message', $existingMessageId,
            null, null, [
                'device_id' => (int) $device->id,
                'source_id' => (int) $source->id,
                'channel_id' => (int) $source->channel_id,
                'sender_fingerprint' => hash('sha256', $this->normalizeSenderIdentifier($sender)),
                'amount_egp' => $amount,
                'received_at' => $receivedAt,
            ]);
    }

    private function isDuplicateHashConflict(QueryException $exception): bool
    {
        $errorInfo = $exception->errorInfo ?? [];

        return (string) ($errorInfo[0] ?? '') === '23000'
            && (int) ($errorInfo[1] ?? 0) === 1062
            && str_contains($exception->getMessage(), 'uq_mobile_messages_duplicate_hash');
    }

    private function hasPermission(Request $request, string $permission): bool
    {
        $user = $request->attributes->get('authenticated_user');

        return is_object($user) && DB::table('role_permissions as role_permission')
            ->join('permissions', 'permissions.id', '=', 'role_permission.permission_id')
            ->join('user_roles', 'user_roles.role_id', '=', 'role_permission.role_id')
            ->join('roles', 'roles.id', '=', 'user_roles.role_id')
            ->where('user_roles.user_id', $user->id)
            ->where('roles.is_active', true)
            ->where('permissions.code', $permission)
            ->exists();
    }

    private function syncEvent(int $userId, int $deviceId, int $messageId, string $eventType): void
    {
        DB::table('mobile_sync_events')->insert([
            'actor_user_id' => $userId,
            'device_id' => $deviceId,
            'entity_type' => 'message',
            'entity_id' => $messageId,
            'event_type' => $eventType,
            'created_at' => now(),
        ]);
    }
}
