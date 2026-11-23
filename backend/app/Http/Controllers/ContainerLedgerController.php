<?php

namespace App\Http\Controllers;

use App\Services\AuditLogService;
use App\Services\InventoryService;
use App\Support\ExactMoney;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class ContainerLedgerController extends Controller
{
    public function __construct(private readonly InventoryService $inventory, private readonly AuditLogService $auditLog) {}

    public function transfers(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'page' => ['sometimes', 'integer', 'min:1'],
            'per_page' => ['sometimes', 'integer', 'between:1,100'],
        ]);
        $rows = DB::table('container_location_transfers as transfer')
            ->join('products', 'products.id', '=', 'transfer.product_id')
            ->join('locations as source', 'source.id', '=', 'transfer.source_location_id')
            ->join('locations as destination', 'destination.id', '=', 'transfer.destination_location_id')
            ->leftJoin('containers', 'containers.id', '=', 'transfer.container_id')
            ->orderByDesc('transfer.id')
            ->select([
                'transfer.id', 'transfer.transfer_number', 'transfer.product_id', 'products.name as product_name',
                'transfer.source_location_id', 'source.name as source_location_name',
                'transfer.destination_location_id', 'destination.name as destination_location_name',
                'transfer.quantity', 'transfer.transfer_date', 'transfer.reason', 'transfer.inventory_movement_id',
                'transfer.container_id', 'containers.container_number', 'transfer.created_at',
            ])->paginate($filters['per_page'] ?? 50);

        return response()->json(['data' => $rows->items(), 'meta' => [
            'current_page' => $rows->currentPage(), 'last_page' => $rows->lastPage(),
            'per_page' => $rows->perPage(), 'total' => $rows->total(),
        ]]);
    }

    public function createTransfer(Request $request): JsonResponse
    {
        $values = $request->validate([
            'product_id' => ['required', 'integer', 'min:1'],
            'container_id' => ['sometimes', 'nullable', 'integer', 'min:1', 'exists:containers,id'],
            'source_location_id' => ['required', 'integer', 'min:1'],
            'destination_location_id' => ['required', 'integer', 'min:1', 'different:source_location_id'],
            'quantity' => ['required', 'integer', 'between:1,2147483647'],
            'transfer_date' => ['required', 'date_format:Y-m-d'],
            'reason' => ['required', 'string', 'max:1000'],
            'idempotency_key' => ['required', 'string', 'max:200'],
        ]);
        if (! hash_equals($values['idempotency_key'], trim((string) $request->header('Idempotency-Key', '')))) {
            throw ValidationException::withMessages(['Idempotency-Key' => ['The body and header idempotency keys must match.']]);
        }
        $transfer = DB::transaction(function () use ($values, $request): object {
            $actorId = (int) $request->attributes->get('authenticated_user')->id;
            DB::table('users')->where('id', $actorId)->lockForUpdate()->first(['id']);
            $existing = DB::table('container_location_transfers')->where('idempotency_key', $values['idempotency_key'])->lockForUpdate()->first();
            if ($existing !== null) {
                $same = (int) $existing->product_id === (int) $values['product_id']
                    && (int) $existing->source_location_id === (int) $values['source_location_id']
                    && (int) $existing->destination_location_id === (int) $values['destination_location_id']
                    && (int) $existing->quantity === (int) $values['quantity']
                    && (string) $existing->transfer_date === (string) $values['transfer_date']
                    && (string) $existing->reason === (string) $values['reason']
                    && (int) ($existing->container_id ?? 0) === (int) ($values['container_id'] ?? 0)
                    && (int) ($existing->created_by_user_id ?? 0) === $actorId;
                if (! $same) abort(409, 'The idempotency key was already used with a different transfer.');
                $existing->was_existing = true;
                return $existing;
            }
            $movement = $this->inventory->transfer(
                (int) $values['product_id'], (int) $values['source_location_id'],
                (int) $values['destination_location_id'], (int) $values['quantity'],
                $values['transfer_date'], $values['reason'], $request,
            );
            $id = (int) DB::table('container_location_transfers')->insertGetId([
                'transfer_number' => 'TRF-'.Str::upper(Str::random(12)),
                'product_id' => $values['product_id'],
                'source_location_id' => $values['source_location_id'],
                'destination_location_id' => $values['destination_location_id'],
                'container_id' => $values['container_id'] ?? null,
                'quantity' => $values['quantity'], 'transfer_date' => $values['transfer_date'],
                'reason' => $values['reason'], 'inventory_movement_id' => $movement['movement_id'],
                'created_by_user_id' => $request->attributes->get('authenticated_user')->id,
                'idempotency_key' => $values['idempotency_key'], 'created_at' => now(), 'updated_at' => now(),
            ]);
            if (! empty($values['container_id'])) {
                DB::table('container_tracking_events')->insert([
                    'container_id' => (int) $values['container_id'],
                    'event_type' => 'transfer',
                    'occurred_at' => $values['transfer_date'].' 00:00:00',
                    'reference_number' => DB::table('container_location_transfers')->where('id', $id)->value('transfer_number'),
                    'details' => $values['reason'],
                    'from_location_id' => (int) $values['source_location_id'],
                    'to_location_id' => (int) $values['destination_location_id'],
                    'quantity' => (int) $values['quantity'],
                    'amount_egp' => null,
                    'source_id' => $id,
                    'created_by_user_id' => $request->attributes->get('authenticated_user')->id,
                    'created_at' => now(),
                ]);
            }
            $created = DB::table('container_location_transfers')->where('id', $id)->first();
            $created->was_existing = false;
            return $created;
        }, 5);

        return response()->json(['data' => ['id' => $transfer->id, 'transfer_number' => $transfer->transfer_number,
            'inventory_movement_id' => $transfer->inventory_movement_id]], $transfer->was_existing ? 200 : 201);
    }

    public function funds(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'container_id' => ['required', 'integer', 'min:1', 'exists:containers,id'],
            'page' => ['sometimes', 'integer', 'min:1'], 'per_page' => ['sometimes', 'integer', 'between:1,100'],
        ]);
        $rows = DB::table('container_fund_movements as fund')
            ->leftJoin('container_costs as cost', 'cost.id', '=', 'fund.container_cost_id')
            ->where('fund.container_id', $filters['container_id'])
            ->orderByDesc('fund.id')
            ->select(['fund.*', 'cost.cost_type as container_cost_type'])
            ->paginate($filters['per_page'] ?? 50);
        $rows->getCollection()->transform(function (object $row): object {
            $row->amount_egp = ExactMoney::fromCents(ExactMoney::toCents((string) $row->amount_egp));
            $row->balance_after_egp = ExactMoney::fromCents(ExactMoney::toCents((string) $row->balance_after_egp));
            return $row;
        });
        $balance = ExactMoney::fromCents(ExactMoney::toCents((string) (DB::table('container_fund_movements')->where('container_id', $filters['container_id'])->orderByDesc('id')->value('balance_after_egp') ?? '0.00')));

        return response()->json(['data' => $rows->items(), 'meta' => [
            'current_page' => $rows->currentPage(), 'last_page' => $rows->lastPage(),
            'per_page' => $rows->perPage(), 'total' => $rows->total(), 'balance_egp' => $balance,
        ]]);
    }

    public function createFundMovement(Request $request): JsonResponse
    {
        $values = $request->validate([
            'container_id' => ['required', 'integer', 'min:1', 'exists:containers,id'],
            'container_cost_id' => ['sometimes', 'nullable', 'integer', 'min:1'],
            'movement_type' => ['required', 'in:add,withdraw'],
            'amount_egp' => ['required', 'string', 'regex:/\A(?:0|[1-9][0-9]{0,14})(?:\.[0-9]{1,2})?\z/'],
            'department' => ['required', 'string', 'max:160'], 'reason' => ['required', 'string', 'max:500'],
            'reference' => ['nullable', 'string', 'max:160'], 'notes' => ['nullable', 'string', 'max:2000'],
            'movement_date' => ['required', 'date_format:Y-m-d'], 'idempotency_key' => ['required', 'string', 'max:200'],
        ]);
        if (! hash_equals($values['idempotency_key'], trim((string) $request->header('Idempotency-Key', '')))) {
            throw ValidationException::withMessages(['Idempotency-Key' => ['The body and header idempotency keys must match.']]);
        }
        try { $amount = ExactMoney::toCents($values['amount_egp']); }
        catch (\InvalidArgumentException $exception) { throw ValidationException::withMessages(['amount_egp' => [$exception->getMessage()]]); }
        if ($amount === '0') throw ValidationException::withMessages(['amount_egp' => ['The amount must be positive.']]);
        if (! empty($values['container_cost_id']) && ! DB::table('container_costs')->where('id', $values['container_cost_id'])->where('container_id', $values['container_id'])->exists()) {
            throw ValidationException::withMessages(['container_cost_id' => ['The selected cost does not belong to this container.']]);
        }
        if (! empty($values['reference']) && ! DB::table('sales_documents')->where('document_number', $values['reference'])->exists()
            && ! DB::table('containers')->where('container_number', $values['reference'])->exists()) {
            throw ValidationException::withMessages(['reference' => ['The linked invoice or container does not exist.']]);
        }
        $created = DB::transaction(function () use ($values, $amount, $request): array {
            $actorId = (int) $request->attributes->get('authenticated_user')->id;
            DB::table('users')->where('id', $actorId)->lockForUpdate()->first(['id']);
            $existing = DB::table('container_fund_movements')->where('idempotency_key', $values['idempotency_key'])->first();
            if ($existing !== null) {
                $same = (int) $existing->container_id === (int) $values['container_id']
                    && (string) $existing->movement_type === (string) $values['movement_type']
                    && ExactMoney::toCents((string) $existing->amount_egp) === $amount
                    && (string) $existing->department === (string) $values['department']
                    && (string) $existing->reason === (string) $values['reason']
                    && (string) ($existing->reference ?? '') === (string) ($values['reference'] ?? '')
                    && (string) ($existing->notes ?? '') === (string) ($values['notes'] ?? '')
                    && (string) $existing->movement_date === (string) $values['movement_date']
                    && (int) ($existing->container_cost_id ?? 0) === (int) ($values['container_cost_id'] ?? 0)
                    && (int) ($existing->created_by_user_id ?? 0) === $actorId;
                if (! $same) abort(409, 'The idempotency key was already used with a different fund movement.');
                return ['row' => $existing, 'created' => false];
            }
            DB::table('containers')->where('id', $values['container_id'])->lockForUpdate()->first(['id']);
            $last = DB::table('container_fund_movements')->where('container_id', $values['container_id'])->orderByDesc('id')->value('balance_after_egp');
            $balance = ExactMoney::toCents((string) ($last ?? '0.00'));
            if ($values['movement_type'] === 'withdraw' && ExactMoney::compare($amount, $balance) > 0) {
                throw ValidationException::withMessages(['amount_egp' => ['The withdrawal exceeds the container fund balance.']]);
            }
            $after = $values['movement_type'] === 'add' ? ExactMoney::add($balance, $amount) : ExactMoney::subtract($balance, $amount);
            $id = (int) DB::table('container_fund_movements')->insertGetId([
                'container_id' => $values['container_id'], 'container_cost_id' => $values['container_cost_id'] ?? null, 'movement_type' => $values['movement_type'],
                'amount_egp' => ExactMoney::fromCents($amount), 'department' => $values['department'],
                'reason' => $values['reason'], 'reference' => $values['reference'] ?? null,
                'notes' => $values['notes'] ?? null, 'movement_date' => $values['movement_date'],
                'balance_after_egp' => ExactMoney::fromCents($after),
                'created_by_user_id' => $request->attributes->get('authenticated_user')->id,
                'idempotency_key' => $values['idempotency_key'], 'created_at' => now(), 'updated_at' => now(),
            ]);
            $this->auditLog->record($request, 'container_fund.movement_created', 'container_fund_movement', $id,
                $values['reason'], null, ['container_id' => (int) $values['container_id'], 'movement_type' => $values['movement_type'],
                    'amount_egp' => ExactMoney::fromCents($amount), 'balance_after_egp' => ExactMoney::fromCents($after)]);
            return ['row' => DB::table('container_fund_movements')->where('id', $id)->first(), 'created' => true];
        }, 5);
        $created['row']->amount_egp = ExactMoney::fromCents(ExactMoney::toCents((string) $created['row']->amount_egp));
        $created['row']->balance_after_egp = ExactMoney::fromCents(ExactMoney::toCents((string) $created['row']->balance_after_egp));
        return response()->json(['data' => $created['row'], 'meta' => ['balance_egp' => $created['row']->balance_after_egp]], $created['created'] ? 201 : 200);
    }
}
