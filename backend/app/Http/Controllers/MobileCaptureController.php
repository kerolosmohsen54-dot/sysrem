<?php

namespace App\Http\Controllers;

use App\Services\AuditLogService;
use App\Services\MobileCaptureCollectionService;
use App\Services\MobileCaptureWithdrawalService;
use App\Services\MobileCapturedMessageArchiveService;
use App\Services\MobileIdempotencyService;
use App\Services\TreasuryService;
use App\Support\ExactMoney;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class MobileCaptureController extends Controller
{
    public function __construct(
        private readonly AuditLogService $audit,
        private readonly MobileIdempotencyService $idempotency,
        private readonly MobileCaptureCollectionService $collections,
        private readonly MobileCaptureWithdrawalService $withdrawals,
        private readonly MobileCapturedMessageArchiveService $messageArchive,
        private readonly TreasuryService $treasury,
    ) {}

    public function channels(Request $request): JsonResponse
    {
        $this->authorize($request, 'mobile.channels.view');
        $values = $request->validate([
            'type' => ['sometimes', 'in:wallet,bank,instapay,postal,other'],
            'paused' => ['sometimes', 'boolean'],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:100'],
            'page' => ['sometimes', 'integer', 'min:1'],
        ]);
        $query = DB::table('mobile_payment_channels')->orderBy('name')->orderBy('id');
        foreach (['type', 'paused'] as $filter) {
            if (array_key_exists($filter, $values)) {
                $query->where($filter, $values[$filter]);
            }
        }
        $page = $query->paginate($values['per_page'] ?? 50);
        $page->getCollection()->transform(fn (object $channel): array => $this->channelData($channel));

        return response()->json(['data' => $page->items(), 'meta' => [
            'current_page' => $page->currentPage(), 'last_page' => $page->lastPage(),
            'per_page' => $page->perPage(), 'total' => $page->total(),
        ]]);
    }

    public function showChannel(Request $request, int $channelId): JsonResponse
    {
        $this->authorize($request, 'mobile.channels.view');
        $channel = DB::table('mobile_payment_channels')->where('id', $channelId)->first();
        abort_if($channel === null, 404);

        return response()->json(['data' => $this->channelData($channel)]);
    }

    public function createChannel(Request $request): JsonResponse
    {
        $this->authorize($request, 'mobile.channels.manage');
        $values = $request->validate([
            'name' => ['required', 'string', 'max:160'],
            'type' => ['required', 'in:wallet,bank,instapay,postal,other'],
            'number' => ['required', 'string', 'max:160'],
            'sender_filter' => ['required', 'string', 'max:200'],
            'notification_package_names' => ['sometimes', 'array', 'max:20'],
            'notification_package_names.*' => ['string', 'max:255'],
            'deposit_keywords' => ['sometimes', 'array'],
            'deposit_keywords.*' => ['string', 'max:100'],
            'withdrawal_keywords' => ['sometimes', 'array'],
            'withdrawal_keywords.*' => ['string', 'max:100'],
            'deposit_enabled' => ['sometimes', 'boolean'],
            'withdrawal_enabled' => ['sometimes', 'boolean'],
        ]);
        return $this->idempotency->execute($request, 'mobile_payment_channel', function () use ($request, $values): JsonResponse {
            return DB::transaction(function () use ($request, $values): JsonResponse {
                $accountType = match ($values['type']) {
                    'bank' => 'bank', 'wallet', 'postal' => 'cash', default => 'other',
                };
                $accountId = $this->treasury->createAccount($request, [
                    'code' => 'MPC-'.Str::upper(Str::random(20)), 'name' => $values['name'],
                    'account_type' => $accountType, 'notes' => 'Mobile payment channel.',
                ]);
                $now = now();
                $id = (int) DB::table('mobile_payment_channels')->insertGetId([
                    'treasury_account_id' => $accountId, 'name' => $values['name'], 'type' => $values['type'],
                    'number' => $values['number'], 'sender_filter' => $values['sender_filter'],
                    'notification_package_names' => isset($values['notification_package_names'])
                        ? json_encode($values['notification_package_names'], JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE)
                        : null,
                    'deposit_keywords' => isset($values['deposit_keywords']) ? json_encode($values['deposit_keywords'], JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE) : null,
                    'withdrawal_keywords' => isset($values['withdrawal_keywords']) ? json_encode($values['withdrawal_keywords'], JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE) : null,
                    'deposit_enabled' => $values['deposit_enabled'] ?? true,
                    'withdrawal_enabled' => $values['withdrawal_enabled'] ?? true,
                    'paused' => false, 'created_by' => $this->actorId($request), 'created_at' => $now, 'updated_at' => $now,
                ]);
                $this->audit->record($request, 'mobile.payment_channel.created', 'mobile_payment_channel', $id, null, null, $values);

                return response()->json(['data' => $this->channelData(DB::table('mobile_payment_channels')->where('id', $id)->first())], 201);
            }, 5);
        });
    }

    public function updateChannel(Request $request, int $channelId): JsonResponse
    {
        $this->authorize($request, 'mobile.channels.manage');
        $values = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:160'],
            'type' => ['sometimes', 'required', 'in:wallet,bank,instapay,postal,other'],
            'number' => ['sometimes', 'required', 'string', 'max:160'],
            'sender_filter' => ['sometimes', 'required', 'string', 'max:200'],
            'notification_package_names' => ['sometimes', 'nullable', 'array', 'max:20'],
            'notification_package_names.*' => ['string', 'max:255'],
            'deposit_keywords' => ['sometimes', 'nullable', 'array'],
            'deposit_keywords.*' => ['string', 'max:100'],
            'withdrawal_keywords' => ['sometimes', 'nullable', 'array'],
            'withdrawal_keywords.*' => ['string', 'max:100'],
            'deposit_enabled' => ['sometimes', 'boolean'],
            'withdrawal_enabled' => ['sometimes', 'boolean'],
            'paused' => ['sometimes', 'boolean'],
        ]);
        abort_if($values === [], 422);
        return $this->idempotency->execute($request, 'mobile_payment_channel', function () use ($request, $channelId, $values): JsonResponse {
            return DB::transaction(function () use ($request, $channelId, $values): JsonResponse {
                $channel = DB::table('mobile_payment_channels')->where('id', $channelId)->lockForUpdate()->first();
                abort_if($channel === null, 404);
                $accountFields = [];
                if (isset($values['name'])) $accountFields['name'] = $values['name'];
                if (isset($values['type'])) $accountFields['account_type'] = match ($values['type']) { 'bank' => 'bank', 'wallet', 'postal' => 'cash', default => 'other' };
                if ($accountFields !== []) $this->treasury->updateAccount($request, (int) $channel->treasury_account_id, $accountFields);
                foreach (['notification_package_names', 'deposit_keywords', 'withdrawal_keywords'] as $jsonField) {
                    if (array_key_exists($jsonField, $values)) $values[$jsonField] = $values[$jsonField] === null ? null : json_encode($values[$jsonField], JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE);
                }
                DB::table('mobile_payment_channels')->where('id', $channelId)->update([...$values, 'updated_at' => now()]);
                $this->audit->record($request, 'mobile.payment_channel.updated', 'mobile_payment_channel', $channelId, null, (array) $channel, $values);
                return response()->json(['data' => $this->channelData(DB::table('mobile_payment_channels')->where('id', $channelId)->first())]);
            }, 5);
        });
    }

    public function capture(Request $request): JsonResponse
    {
        $this->authorize($request, 'mobile.messages.capture');
        $values = $request->validate([
            'channel_id' => ['required', 'integer', 'min:1'], 'amount' => ['nullable', 'string', 'regex:/\A(?:0|[1-9][0-9]{0,14})(?:\.[0-9]{1,4})?\z/'],
            'raw_text' => ['required', 'string', 'max:10000'], 'sender' => ['required', 'string', 'max:200'],
            'received_at' => ['required', 'date'], 'dedupe_key' => ['required', 'string', 'size:64'],
        ]);
        $key = $request->header('Idempotency-Key');
        if (! is_string($key) || trim($key) === '') {
            throw ValidationException::withMessages(['Idempotency-Key' => ['A unique Idempotency-Key is required.']]);
        }
        $preexistingChannel = DB::table('mobile_payment_channels')->where('id', $values['channel_id'])->first();
        if ($preexistingChannel === null || $preexistingChannel->paused) {
            throw ValidationException::withMessages(['channel_id' => ['The selected channel is missing or disabled.']]);
        }
        if (! $this->senderMatchesCaptureSource($preexistingChannel, $values['sender'])) {
            throw ValidationException::withMessages(['channel_id' => ['The sender does not match the selected channel.']]);
        }
        $preHash = hash('sha256', $values['raw_text']);
        $preAt = Carbon::parse($values['received_at'])->utc();
        $preKey = hash('sha256', implode('|', [$values['sender'], $values['amount'] ?? '', $preAt->copy()->startOfMinute()->format('Y-m-d H:i'), $preHash]));
        if (! hash_equals($preKey, strtolower($values['dedupe_key']))) {
            throw ValidationException::withMessages(['dedupe_key' => ['The dedupe key does not match this message.']]);
        }
        $prior = DB::table('mobile_captured_messages')->where('dedupe_key', $preKey)->first();
        if ($prior !== null) return response()->json(['data' => [...$this->messageData($prior), 'duplicate' => true]]);
        return $this->idempotency->execute($request, 'mobile_captured_message', function () use ($request, $values): JsonResponse {
            $channel = DB::table('mobile_payment_channels')->where('id', $values['channel_id'])->first();
            if ($channel === null || $channel->paused) throw ValidationException::withMessages(['channel_id' => ['The selected channel is missing or disabled.']]);
            if (! $this->senderMatchesCaptureSource($channel, $values['sender'])) {
                throw ValidationException::withMessages(['channel_id' => ['The sender does not match the selected channel.']]);
            }
            $amount = $values['amount'] ?? null;
            // SMS direction is chosen by the operator after opening the inbox message.
            $direction = 'NEEDS_REVIEW';
            $textHash = hash('sha256', $values['raw_text']);
            $receivedAt = Carbon::parse($values['received_at'])->utc();
            $expectedKey = hash('sha256', implode('|', [$values['sender'], $amount ?? '', $receivedAt->copy()->startOfMinute()->format('Y-m-d H:i'), $textHash]));
            if (! hash_equals($expectedKey, strtolower($values['dedupe_key']))) {
                throw ValidationException::withMessages(['dedupe_key' => ['The dedupe key does not match this message.']]);
            }
            $existing = DB::table('mobile_captured_messages')->where('dedupe_key', $expectedKey)->first();
            if ($existing !== null) return response()->json(['data' => [...$this->messageData($existing), 'duplicate' => true]]);
            try {
                $id = (int) DB::table('mobile_captured_messages')->insertGetId([
                    'channel_id' => $channel->id, 'direction' => $direction, 'amount' => $amount,
                    'raw_text' => $values['raw_text'], 'sender' => $values['sender'], 'received_at' => $receivedAt,
                    'text_hash' => $textHash, 'dedupe_key' => $expectedKey,
                    'status' => $direction === 'NEEDS_REVIEW' ? 'NEEDS_REVIEW' : 'NEW', 'created_at' => now(), 'updated_at' => now(),
                ]);
            } catch (\Illuminate\Database\QueryException $exception) {
                $existing = DB::table('mobile_captured_messages')->where('dedupe_key', $expectedKey)->first();
                if ($existing === null) throw $exception;
                return response()->json(['data' => [...$this->messageData($existing), 'duplicate' => true]]);
            }
            $this->audit->record($request, 'mobile.message.captured', 'mobile_captured_message', $id, null, null, ['channel_id' => (int) $channel->id, 'direction' => $direction, 'amount' => $amount]);
            return response()->json(['data' => [...$this->messageData(DB::table('mobile_captured_messages')->where('id', $id)->first()), 'duplicate' => false]], 201);
        });
    }

    public function messages(Request $request): JsonResponse
    {
        $this->authorize($request, 'mobile.messages.view');
        $filters = $request->validate([
            'direction' => ['sometimes', 'in:DEPOSIT,WITHDRAWAL,NEEDS_REVIEW'], 'status' => ['sometimes', 'in:NEW,RECORDED,NEEDS_REVIEW,IGNORED'],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:100'], 'page' => ['sometimes', 'integer', 'min:1'],
            'include_archived' => ['sometimes', 'boolean'], 'archived_only' => ['sometimes', 'boolean'],
        ]);
        $query = DB::table('mobile_captured_messages')->orderByDesc('received_at')->orderByDesc('id');
        foreach (['direction', 'status'] as $field) if (isset($filters[$field])) $query->where($field, $filters[$field]);
        if ($filters['archived_only'] ?? false) $query->whereNotNull('archived_at');
        elseif (! ($filters['include_archived'] ?? false)) $query->whereNull('archived_at');
        $page = $query->paginate($filters['per_page'] ?? 50);
        return response()->json(['data' => array_map(fn ($message) => $this->messageData($message), $page->items()), 'meta' => [
            'current_page' => $page->currentPage(), 'last_page' => $page->lastPage(), 'per_page' => $page->perPage(), 'total' => $page->total(),
        ]]);
    }

    public function archiveAllMessages(Request $request): JsonResponse
    {
        $this->authorize($request, 'mobile.channels.manage');
        $count = $this->messageArchive->archiveAll($request);

        return response()->json(['data' => ['archived_count' => $count, 'financial_history_preserved' => true]]);
    }

    public function archiveMessage(Request $request, int $messageId): JsonResponse
    {
        $this->authorize($request, 'mobile.channels.manage');
        $archived = $this->messageArchive->archiveOne($request, $messageId);

        return response()->json(['data' => ['id' => $messageId, 'archived' => $archived, 'financial_history_preserved' => true]]);
    }

    public function restoreMessage(Request $request, int $messageId): JsonResponse
    {
        $this->authorize($request, 'mobile.channels.manage');
        $restored = $this->messageArchive->restoreOne($request, $messageId);

        return response()->json(['data' => ['id' => $messageId, 'restored' => $restored]]);
    }

    public function resolveDirection(Request $request, int $messageId): JsonResponse
    {
        $this->authorize($request, 'mobile.messages.record');
        $values = $request->validate([
            'direction' => ['required', 'in:DEPOSIT,WITHDRAWAL'],
            'amount' => ['sometimes', 'nullable', 'string', 'regex:/\A(?:0|[1-9][0-9]{0,14})(?:\.[0-9]{1,4})?\z/'],
        ]);

        return $this->idempotency->execute($request, 'mobile_captured_message_direction', function () use ($request, $messageId, $values): JsonResponse {
            return DB::transaction(function () use ($request, $messageId, $values): JsonResponse {
                $message = DB::table('mobile_captured_messages')->where('id', $messageId)->lockForUpdate()->first();
                abort_if($message === null, 404);
                if ($message->status !== 'NEEDS_REVIEW') {
                    if ($message->status === 'NEW' && $message->direction === $values['direction']) {
                        return response()->json(['data' => $this->messageData($message)]);
                    }
                    throw ValidationException::withMessages(['status' => ['Only messages needing review can have their direction resolved.']]);
                }

                $channel = DB::table('mobile_payment_channels')->where('id', $message->channel_id)->where('paused', false)->first();
                if ($channel === null) {
                    throw ValidationException::withMessages(['channel_id' => ['The selected channel is missing or disabled.']]);
                }

                $direction = $values['direction'];
                $amount = $values['amount'] ?? $message->amount;
                if ($amount === null || ExactMoney::compare(ExactMoney::toCents((string) $amount), '0') <= 0) {
                    throw ValidationException::withMessages(['amount' => ['Enter a positive amount before recording this message.']]);
                }

                DB::table('mobile_captured_messages')->where('id', $messageId)->update([
                    'direction' => $direction,
                    'amount' => $amount,
                    'status' => 'NEW',
                    'updated_at' => now(),
                ]);
                $resolved = DB::table('mobile_captured_messages')->where('id', $messageId)->first();
                $this->audit->record(
                    $request,
                    'mobile.message.direction_resolved',
                    'mobile_captured_message',
                    $messageId,
                    'Operator confirmed the direction of an ambiguous phone message.',
                    ['direction' => $message->direction, 'status' => $message->status, 'amount' => $message->amount],
                    ['direction' => $direction, 'status' => 'NEW', 'amount' => $amount],
                );

                return response()->json(['data' => $this->messageData($resolved)]);
            });
        });
    }

    public function recordDeposit(Request $request, int $messageId): JsonResponse
    {
        $this->authorize($request, 'mobile.messages.record');
        $values = $request->validate(['customer_id' => ['required', 'integer', 'min:1']]);
        return $this->recordMessage($request, $messageId, 'DEPOSIT', function ($message, $channel) use ($request, $values): array {
            $key = (string) $request->header('Idempotency-Key');
            $result = $this->collections->record($request, $key, [
                'customer_id' => (int) $values['customer_id'], 'treasury_account_id' => (int) $channel->treasury_account_id,
                'receipt_date' => Carbon::parse($message->received_at)->toDateString(),
                'amount_egp' => ExactMoney::fromCents(ExactMoney::toCents((string) $message->amount)),
                'payment_method' => 'mobile', 'external_reference' => 'mobile-captured:'.$message->id,
                'notes' => null, 'allocations' => [],
            ]);
            return ['CUSTOMER_COLLECTION', (int) $result['data']['receipt']->id];
        });
    }

    public function recordWithdrawal(Request $request, int $messageId): JsonResponse
    {
        $this->authorize($request, 'mobile.messages.record');
        $values = $request->validate([
            'category_id' => ['required_without:new_category_name', 'nullable', 'integer', 'min:1'],
            'new_category_name' => ['required_without:category_id', 'nullable', 'string', 'max:160'],
            'notes' => ['sometimes', 'nullable', 'string', 'max:1000'],
        ]);
        return $this->recordMessage($request, $messageId, 'WITHDRAWAL', function ($message, $channel) use ($request, $values): array {
            $isNewCategory = isset($values['new_category_name']);
            $category = ! $isNewCategory
                ? DB::table('mobile_categories')->where('id', $values['category_id'])->where('is_active', true)->first()
                : $this->createExpenseCategory($request, trim($values['new_category_name']));
            if ($category === null) throw ValidationException::withMessages(['category_id' => ['The selected category is unavailable.']]);
            $notes = trim((string) ($values['notes'] ?? ''));
            if ($notes === '' && ($isNewCategory || ($category->requires_notes ?? false) || mb_strtolower((string) $category->name) === 'other')) {
                throw ValidationException::withMessages(['notes' => ['Notes are required for this category.']]);
            }
            $id = $this->withdrawals->post($request, $message, $channel, $category, $notes);
            return [$this->withdrawals->recordedAs($category), $id];
        });
    }

    public function manualDeposit(Request $request): JsonResponse
    {
        $this->authorize($request, 'mobile.messages.record');
        $values = $request->validate([
            'channel_id' => ['sometimes', 'integer', 'min:1'], 'customer_id' => ['required', 'integer', 'min:1'],
            'amount' => ['required', 'string', 'regex:/\A(?:0|[1-9][0-9]{0,14})(?:\.[0-9]{1,2})?\z/'],
            'date' => ['required', 'date_format:Y-m-d'], 'note' => ['sometimes', 'nullable', 'string', 'max:1000'],
        ]);
        return $this->idempotency->execute($request, 'mobile_manual_deposit', function () use ($request, $values): JsonResponse {
            $query = DB::table('mobile_payment_channels')->where('type', 'postal')->where('paused', false);
            if (isset($values['channel_id'])) $query->where('id', $values['channel_id']);
            $channels = $query->get();
            if ($channels->count() !== 1) throw ValidationException::withMessages(['channel_id' => ['Choose one active postal channel.']]);
            $channel = $channels->first();
            $result = $this->collections->record($request, (string) $request->header('Idempotency-Key'), [
                'customer_id' => (int) $values['customer_id'], 'treasury_account_id' => (int) $channel->treasury_account_id,
                'receipt_date' => $values['date'], 'amount_egp' => $values['amount'], 'payment_method' => 'manual',
                'external_reference' => 'mobile-manual:'.(string) $request->header('Idempotency-Key'),
                'notes' => $values['note'] ?? null, 'allocations' => [],
            ]);
            $receipt = $result['data']['receipt'];
            DB::table('sales_receipts')->where('id', $receipt->id)->update(['recording_source' => 'manual', 'is_unverified_payment' => false]);
            $this->audit->record($request, 'mobile.deposit.manual_registered', 'sales_receipt', (int) $receipt->id, null, null, ['channel_id' => (int) $channel->id, 'customer_id' => (int) $values['customer_id'], 'amount' => $values['amount']]);
            return response()->json(['data' => [
                'id' => (int) $receipt->id, 'channel_id' => (int) $channel->id, 'amount' => ExactMoney::fromCents(ExactMoney::toCents($values['amount'])),
                'source' => 'MANUAL', 'recorded_as' => 'CUSTOMER_COLLECTION', 'receipt' => $receipt,
            ]], 201);
        });
    }

    public function categories(Request $request): JsonResponse
    {
        $categories = DB::table('mobile_categories')->where('is_active', true)->orderBy('name')->get();
        $categories->transform(fn (object $category): object => $this->withdrawals->presentCategory($category));

        return response()->json(['data' => $categories]);
    }

    public function createCategory(Request $request): JsonResponse
    {
        $this->authorize($request, 'mobile.channels.manage');
        $values = $request->validate(['name' => ['required', 'string', 'max:160', 'unique:mobile_categories,name']]);
        return $this->idempotency->execute($request, 'mobile_withdrawal_category', function () use ($request, $values): JsonResponse {
            $category = $this->createExpenseCategory($request, $values['name']);
            $this->audit->record($request, 'mobile.category.created', 'mobile_category', (int) $category->id, null, null, ['name' => $category->name]);
            return response()->json(['data' => $category], 201);
        });
    }

    private function recordMessage(Request $request, int $messageId, string $direction, callable $post): JsonResponse
    {
        return $this->idempotency->execute($request, 'mobile_captured_message_record', function () use ($request, $messageId, $direction, $post): JsonResponse {
            $message = DB::table('mobile_captured_messages')->where('id', $messageId)->lockForUpdate()->first();
            abort_if($message === null, 404);
            if ($message->status !== 'NEW') throw ValidationException::withMessages(['status' => ['This message has already been processed.']]);
            if ($message->direction !== $direction || $message->amount === null || ExactMoney::compare(ExactMoney::toCents((string) $message->amount), '0') <= 0) {
                throw ValidationException::withMessages(['direction' => ['The message is not eligible for this operation.']]);
            }
            $channel = DB::table('mobile_payment_channels')->where('id', $message->channel_id)->where('paused', false)->first();
            if ($channel === null) throw ValidationException::withMessages(['channel_id' => ['The channel is disabled.']]);
            [$recordedAs, $referenceId] = $post($message, $channel);
            DB::table('mobile_captured_messages')->where('id', $messageId)->update([
                'status' => 'RECORDED', 'recorded_as' => $recordedAs, 'recorded_ref_id' => $referenceId, 'updated_at' => now(),
            ]);
            $this->audit->record($request, 'mobile.message.recorded', 'mobile_captured_message', $messageId, null, ['status' => 'NEW'], ['status' => 'RECORDED', 'recorded_as' => $recordedAs, 'recorded_ref_id' => $referenceId]);
            return response()->json(['data' => ['id' => $messageId, 'status' => 'RECORDED', 'recorded_as' => $recordedAs, 'recorded_ref_id' => $referenceId]], 201);
        });
    }

    private function createExpenseCategory(Request $request, string $name): object
    {
        $existing = DB::table('mobile_categories')->where('name', $name)->first();
        if ($existing !== null) return $existing;
        $expenseId = DB::table('expense_categories')->insertGetId(['name' => $name, 'is_active' => true, 'created_at' => now(), 'updated_at' => now()]);
        $id = DB::table('mobile_categories')->insertGetId([
            'name' => $name, 'category_kind' => 'expense', 'expense_category_id' => $expenseId,
            'requires_notes' => mb_strtolower($name) === 'other', 'is_system' => false, 'is_active' => true,
            'created_by_user_id' => $this->actorId($request), 'created_at' => now(), 'updated_at' => now(),
        ]);
        return DB::table('mobile_categories')->where('id', $id)->first();
    }

    private function channelData(object $channel): array
    {
        $totals = DB::table('treasury_entries')->where('treasury_account_id', $channel->treasury_account_id)
            ->selectRaw("COALESCE(SUM(CASE WHEN direction = 'in' THEN amount ELSE 0 END), 0) AS total_in")
            ->selectRaw("COALESCE(SUM(CASE WHEN direction = 'out' THEN amount ELSE 0 END), 0) AS total_out")->first();
        $in = ExactMoney::toCents((string) $totals->total_in); $out = ExactMoney::toCents((string) $totals->total_out);
        $negative = ExactMoney::compare($in, $out) < 0; $balance = $negative ? ExactMoney::subtract($out, $in) : ExactMoney::subtract($in, $out);
        return [
            'id' => (int) $channel->id, 'name' => $channel->name, 'type' => $channel->type, 'number' => $channel->number,
            'sender_filter' => $channel->sender_filter, 'deposit_keywords' => $channel->deposit_keywords ? json_decode($channel->deposit_keywords, true) : [],
            'notification_package_names' => $channel->notification_package_names ? json_decode($channel->notification_package_names, true) : [],
            'withdrawal_keywords' => $channel->withdrawal_keywords ? json_decode($channel->withdrawal_keywords, true) : [],
            'deposit_enabled' => (bool) $channel->deposit_enabled, 'withdrawal_enabled' => (bool) $channel->withdrawal_enabled,
            'paused' => (bool) $channel->paused, 'balance' => ($negative && $balance !== '0' ? '-' : '').ExactMoney::fromCents($balance),
            'created_by' => $channel->created_by === null ? null : (int) $channel->created_by, 'created_at' => $channel->created_at, 'updated_at' => $channel->updated_at,
        ];
    }

    private function messageData(object $message): array
    {
        return ['id' => (int) $message->id, 'channel_id' => (int) $message->channel_id, 'direction' => $message->direction,
            'amount' => $message->amount === null ? null : (string) $message->amount, 'raw_text' => $message->raw_text, 'sender' => $message->sender,
            'received_at' => Carbon::parse($message->received_at)->utc()->toIso8601String(), 'text_hash' => $message->text_hash,
            'dedupe_key' => $message->dedupe_key, 'status' => $message->status, 'recorded_as' => $message->recorded_as,
            'recorded_ref_id' => $message->recorded_ref_id === null ? null : (int) $message->recorded_ref_id,
            'archived_at' => $message->archived_at === null ? null : Carbon::parse($message->archived_at)->utc()->toIso8601String()];
    }

    private function matchesKeywords(string $json, string $text): bool
    {
        $keywords = json_decode($json, true) ?: [];
        foreach ($keywords as $keyword) if ($keyword !== '' && mb_stripos($text, $keyword) !== false) return true;
        return false;
    }

    private function looksLikeVerificationMessage(string $text): bool
    {
        $normalized = mb_strtolower($text, 'UTF-8');
        $normalized = strtr($normalized, [
            '٠' => '0', '١' => '1', '٢' => '2', '٣' => '3', '٤' => '4', '٥' => '5', '٦' => '6', '٧' => '7', '٨' => '8', '٩' => '9',
            '۰' => '0', '۱' => '1', '۲' => '2', '۳' => '3', '۴' => '4', '۵' => '5', '۶' => '6', '۷' => '7', '۸' => '8', '۹' => '9',
        ]);
        if (preg_match('/\b(?:otp|one[\s-]?time\s+(?:password|passcode|code)|verification\s+(?:code|passcode|password)|security\s+(?:code|passcode)|login\s+(?:code|passcode)|reset\s+code|password\s+reset|forgot\s+password|passcode)\b/iu', $normalized) === 1) {
            return true;
        }
        if (preg_match('/(?:\b(?:code|pin|passcode)\b|رمز|كود|رقم\s+(?:التحقق|التفعيل|الدخول))[^0-9]{0,24}\d{4,8}\b|\b\d{4,8}\b[^a-z0-9]{0,24}(?:\b(?:code|pin|passcode)\b|رمز|كود)/iu', $normalized) === 1) {
            return true;
        }

        foreach ([
            'رمز التحقق', 'كود التحقق', 'رمز التأكيد', 'كود التأكيد', 'رمز التاكيد', 'كود التاكيد',
            'رمز التفعيل', 'كود التفعيل', 'رمز الدخول', 'كود الدخول', 'رمز الأمان', 'كود الأمان',
            'رمز لمرة واحدة', 'كود لمرة واحدة', 'كلمة المرور المؤقتة', 'كلمة السر المؤقتة',
            'إعادة تعيين كلمة المرور', 'اعادة تعيين كلمة المرور', 'استعادة كلمة المرور',
            'نسيت كلمة المرور', 'رمزك هو', 'كودك هو',
        ] as $phrase) {
            if (str_contains($normalized, $phrase)) {
                return true;
            }
        }

        return false;
    }

    private function senderMatchesCaptureSource(object $channel, string $sender): bool
    {
        $notificationPackages = json_decode((string) ($channel->notification_package_names ?? '[]'), true);
        $notificationPackages = is_array($notificationPackages)
            ? array_map(static fn (mixed $package): string => trim((string) $package), $notificationPackages)
            : [];

        if (in_array(trim($sender), $notificationPackages, true)) {
            return true;
        }

        $sender = trim($sender);
        $filter = trim((string) $channel->sender_filter);
        if ($sender === '' || $filter === '') {
            return false;
        }

        return str_contains(mb_strtolower($sender), mb_strtolower($filter));
    }

    private function actorId(Request $request): ?int
    {
        $user = $request->attributes->get('authenticated_user');
        return is_object($user) && isset($user->id) ? (int) $user->id : null;
    }

    private function authorize(Request $request, string $permission): void
    {
        $user = $request->attributes->get('authenticated_user');
        abort_unless(is_object($user) && DB::table('role_permissions as rp')
            ->join('permissions as p', 'p.id', '=', 'rp.permission_id')
            ->join('user_roles as ur', 'ur.role_id', '=', 'rp.role_id')
            ->where('ur.user_id', $user->id)->where('p.code', $permission)->exists(), 403);
    }
}
