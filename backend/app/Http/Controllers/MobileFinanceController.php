<?php

namespace App\Http\Controllers;

use App\Services\AuditLogService;
use App\Services\MobileIdempotencyService;
use App\Services\SalesService;
use App\Services\TreasuryService;
use App\Support\ExactMoney;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class MobileFinanceController extends Controller
{
    public function __construct(
        private readonly AuditLogService $auditLog,
        private readonly MobileIdempotencyService $idempotency,
        private readonly SalesService $sales,
        private readonly TreasuryService $treasury,
    ) {}

    public function registerDeposit(Request $request, int $messageId): JsonResponse
    {
        $values = $request->validate([
            'customer_id' => ['required', 'integer', 'min:1'],
            'notes' => ['sometimes', 'nullable', 'string', 'max:1000'],
        ]);

        return $this->idempotency->execute($request, 'mobile_message_deposit', function () use ($request, $messageId, $values): JsonResponse {
            $user = $this->user($request);
            $device = $this->device($request);
            $message = $this->lockOwnedMessage($messageId, (int) $user->id);
            $this->assertMessageCanBeRegistered($message, 'deposit');
            $source = DB::table('mobile_sources')->where('id', $message->source_id)->first(['source_kind']);
            abort_if($source === null, 409, 'The message source is no longer available.');
            $channel = DB::table('mobile_channels')->where('id', $message->channel_id)->first([
                'id',
                'treasury_account_id',
            ]);
            abort_if($channel === null, 409, 'The message channel is no longer available.');
            $amount = ExactMoney::fromCents(ExactMoney::toCents((string) $message->amount));
            $originalKey = (string) $request->header('Idempotency-Key');
            $collection = $this->recordCollection($request, (int) $device->id, $originalKey, [
                'customer_id' => (int) $values['customer_id'],
                'treasury_account_id' => (int) $channel->treasury_account_id,
                'receipt_date' => Carbon::parse($message->received_at)->toDateString(),
                'amount_egp' => $amount,
                'payment_method' => $source->source_kind,
                'external_reference' => 'mobile-message:'.$messageId,
                'notes' => $values['notes'] ?? null,
                'allocations' => [],
            ]);
            $receiptId = (int) $collection['data']['receipt']->id;
            $now = now();
            DB::table('sales_receipts')->where('id', $receiptId)->update([
                'recording_source' => $source->source_kind,
                'is_unverified_payment' => true,
                'updated_at' => $now,
            ]);
            DB::table('mobile_messages')->where('id', $messageId)->update([
                'status' => 'registered',
                'registered_source' => $source->source_kind,
                'registered_document_type' => 'sales_receipt',
                'registered_document_id' => $receiptId,
                'updated_at' => $now,
            ]);
            $this->auditLog->record($request, 'mobile.message.deposit_registered', 'mobile_message', $messageId, null, [
                'status' => $message->status,
                'registered_document_id' => $message->registered_document_id,
            ], [
                'status' => 'registered',
                'recording_source' => $source->source_kind,
                'registered_document_type' => 'sales_receipt',
                'registered_document_id' => $receiptId,
                'amount_egp' => $amount,
                'is_unverified_payment' => true,
                'device_id' => (int) $device->id,
            ]);
            $this->syncEvent((int) $user->id, (int) $device->id, $messageId, 'updated');

            return response()->json([
                'data' => [
                    'id' => $receiptId,
                    'message_id' => $messageId,
                    'customer_id' => (int) $values['customer_id'],
                    'channel_id' => (int) $channel->id,
                    'amount_egp' => $amount,
                    'recording_source' => $source->source_kind,
                    'is_unverified_payment' => true,
                    'receipt' => DB::table('sales_receipts')->where('id', $receiptId)->first(),
                ],
            ], 201);
        });
    }

    public function manualDeposit(Request $request): JsonResponse
    {
        $values = $request->validate([
            'channel_id' => ['required', 'integer', 'min:1'],
            'customer_id' => ['required', 'integer', 'min:1'],
            'amount_egp' => ['required', 'string', 'regex:/\A(?:0|[1-9][0-9]{0,14})(?:\.[0-9]{1,2})?\z/'],
            'receipt_date' => ['required', 'date_format:Y-m-d'],
            'notes' => ['sometimes', 'nullable', 'string', 'max:1000'],
        ]);

        return $this->idempotency->execute($request, 'mobile_manual_deposit', function () use ($request, $values): JsonResponse {
            $user = $this->user($request);
            $device = $this->device($request);
            $channel = DB::table('mobile_channels as channel')
                ->join('treasury_accounts as account', 'account.id', '=', 'channel.treasury_account_id')
                ->where('channel.id', $values['channel_id'])
                ->where('channel.channel_type', 'post_office')
                ->where('channel.status', 'active')
                ->whereNull('channel.deleted_at')
                ->where('account.is_active', true)
                ->lockForUpdate()
                ->first(['channel.id', 'channel.treasury_account_id']);
            if ($channel === null) {
                throw ValidationException::withMessages([
                    'channel_id' => ['Manual deposits require an active post-office channel.'],
                ]);
            }
            $amountCents = ExactMoney::toCents($values['amount_egp']);
            if (ExactMoney::compare($amountCents, '0') <= 0) {
                throw ValidationException::withMessages(['amount_egp' => ['The deposit amount must be greater than zero.']]);
            }
            $amount = ExactMoney::fromCents($amountCents);
            $originalKey = (string) $request->header('Idempotency-Key');
            $collection = $this->recordCollection($request, (int) $device->id, $originalKey, [
                'customer_id' => (int) $values['customer_id'],
                'treasury_account_id' => (int) $channel->treasury_account_id,
                'receipt_date' => $values['receipt_date'],
                'amount_egp' => $amount,
                'payment_method' => 'manual',
                'external_reference' => 'mobile-manual-deposit:'.$originalKey,
                'notes' => $values['notes'] ?? null,
                'allocations' => [],
            ]);
            $receiptId = (int) $collection['data']['receipt']->id;
            $now = now();
            DB::table('sales_receipts')->where('id', $receiptId)->update([
                'recording_source' => 'manual',
                'is_unverified_payment' => false,
                'updated_at' => $now,
            ]);
            $this->auditLog->record($request, 'mobile.deposit.manual_registered', 'sales_receipt', $receiptId, null, null, [
                'channel_id' => (int) $channel->id,
                'customer_id' => (int) $values['customer_id'],
                'amount_egp' => $amount,
                'recording_source' => 'manual',
                'is_unverified_payment' => false,
                'device_id' => (int) $device->id,
            ]);
            $this->syncEvent((int) $user->id, (int) $device->id, $receiptId, 'created');

            return response()->json([
                'data' => [
                    'id' => $receiptId,
                    'customer_id' => (int) $values['customer_id'],
                    'channel_id' => (int) $channel->id,
                    'amount_egp' => $amount,
                    'recording_source' => 'manual',
                    'is_unverified_payment' => false,
                    'receipt' => DB::table('sales_receipts')->where('id', $receiptId)->first(),
                ],
            ], 201);
        });
    }

    public function registerWithdrawal(Request $request, int $messageId): JsonResponse
    {
        $values = $request->validate([
            'category_id' => ['required', 'integer', 'min:1'],
            'notes' => ['sometimes', 'nullable', 'string', 'max:1000'],
        ]);

        return $this->idempotency->execute($request, 'mobile_message_withdrawal', function () use ($request, $messageId, $values): JsonResponse {
            $user = $this->user($request);
            $device = $this->device($request);
            $message = $this->lockOwnedMessage($messageId, (int) $user->id);
            $this->assertMessageCanBeRegistered($message, 'withdrawal');
            $category = DB::table('mobile_categories')->where('id', $values['category_id'])
                ->where('is_active', true)->lockForUpdate()->first();
            if ($category === null) {
                throw ValidationException::withMessages(['category_id' => ['The selected category does not exist or is inactive.']]);
            }
            $notes = trim((string) ($values['notes'] ?? ''));
            if ($category->requires_notes && $notes === '') {
                throw ValidationException::withMessages(['notes' => ['Notes are required for this withdrawal category.']]);
            }
            $source = DB::table('mobile_sources')->where('id', $message->source_id)->first(['source_kind']);
            abort_if($source === null, 409, 'The message source is no longer available.');
            $channel = DB::table('mobile_channels')->where('id', $message->channel_id)
                ->first(['id', 'treasury_account_id']);
            abort_if($channel === null, 409, 'The message channel is no longer available.');
            $amount = ExactMoney::fromCents(ExactMoney::toCents((string) $message->amount));
            $date = Carbon::parse($message->received_at)->toDateString();
            $description = $notes !== '' ? $notes : 'Mobile withdrawal - '.$category->name;

            if ($category->category_kind === 'transfer') {
                if ($category->target_treasury_account_id === null) {
                    throw ValidationException::withMessages(['category_id' => ['The transfer category has no target treasury account.']]);
                }
                $documentId = $this->treasury->postTransfer($request, [
                    'transfer_date' => $date,
                    'from_treasury_account_id' => (int) $channel->treasury_account_id,
                    'to_treasury_account_id' => (int) $category->target_treasury_account_id,
                    'amount_egp' => $amount,
                    'notes' => $notes !== '' ? $notes : $category->name,
                ]);
                $documentType = 'treasury_transfer';
            } else {
                if ($category->expense_category_id === null) {
                    throw ValidationException::withMessages(['category_id' => ['The expense category has no linked expense category.']]);
                }
                $documentId = $this->treasury->postExpense($request, [
                    'expense_date' => $date,
                    'treasury_account_id' => (int) $channel->treasury_account_id,
                    'expense_category_id' => (int) $category->expense_category_id,
                    'amount_egp' => $amount,
                    'description' => $description,
                    'reference' => 'mobile-message:'.$messageId,
                ]);
                $documentType = 'expense';
            }

            $now = now();
            DB::table('mobile_messages')->where('id', $messageId)->update([
                'status' => 'registered',
                'registered_source' => $source->source_kind,
                'registered_document_type' => $documentType,
                'registered_document_id' => $documentId,
                'updated_at' => $now,
            ]);
            $this->auditLog->record($request, 'mobile.message.withdrawal_registered', 'mobile_message', $messageId, null, [
                'status' => $message->status,
                'registered_document_id' => $message->registered_document_id,
            ], [
                'status' => 'registered',
                'recording_source' => $source->source_kind,
                'registered_document_type' => $documentType,
                'registered_document_id' => $documentId,
                'category_id' => (int) $category->id,
                'channel_id' => (int) $channel->id,
                'amount_egp' => $amount,
                'notes' => $notes !== '' ? $notes : null,
                'device_id' => (int) $device->id,
            ]);
            $this->syncEvent((int) $user->id, (int) $device->id, $messageId, 'updated');

            return response()->json([
                'data' => [
                    'id' => $documentId,
                    'message_id' => $messageId,
                    'channel_id' => (int) $channel->id,
                    'category_id' => (int) $category->id,
                    'amount_egp' => $amount,
                    'recording_source' => $source->source_kind,
                    'document_type' => $documentType,
                    'notes' => $notes !== '' ? $notes : null,
                ],
            ], 201);
        });
    }

    private function recordCollection(Request $request, int $deviceId, string $clientKey, array $values): array
    {
        $originalKey = $request->header('Idempotency-Key');
        $request->headers->set('Idempotency-Key', hash('sha256', 'mobile-collection:'.$deviceId.':'.$clientKey));
        try {
            return $this->sales->recordCollection($request, $values);
        } finally {
            $request->headers->set('Idempotency-Key', $originalKey);
        }
    }

    private function lockOwnedMessage(int $messageId, int $userId): object
    {
        $message = DB::table('mobile_messages as message')
            ->join('mobile_devices as device', 'device.id', '=', 'message.device_id')
            ->where('message.id', $messageId)
            ->where('device.user_id', $userId)
            ->lockForUpdate()
            ->first(['message.*']);
        abort_if($message === null, 404);

        return $message;
    }

    private function assertMessageCanBeRegistered(object $message, string $type): void
    {
        if ($message->message_type !== $type) {
            throw ValidationException::withMessages(['message' => ['The message does not match the requested financial operation.']]);
        }
        if ($message->amount === null || ExactMoney::compare(ExactMoney::toCents((string) $message->amount), '0') <= 0) {
            throw ValidationException::withMessages(['message' => ['A reviewed positive amount is required before registration.']]);
        }
        $reviewedArchive = $message->status === 'archived' && $message->reviewed_at !== null;
        if ($message->status !== 'new' && ! $reviewedArchive) {
            throw ValidationException::withMessages(['message' => ['Only new messages or explicitly reviewed archived messages can be registered.']]);
        }
    }

    private function user(Request $request): object
    {
        $user = $request->attributes->get('authenticated_user');
        abort_unless(is_object($user) && isset($user->id), 401);

        return $user;
    }

    private function device(Request $request): object
    {
        $device = $request->attributes->get('mobile_device');
        abort_unless(is_object($device) && isset($device->id), 401);

        return $device;
    }

    private function syncEvent(int $userId, int $deviceId, int $entityId, string $eventType): void
    {
        DB::table('mobile_sync_events')->insert([
            'actor_user_id' => $userId,
            'device_id' => $deviceId,
            'entity_type' => 'message',
            'entity_id' => $entityId,
            'event_type' => $eventType,
            'created_at' => now(),
        ]);
    }
}
