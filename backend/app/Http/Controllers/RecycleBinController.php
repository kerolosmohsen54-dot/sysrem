<?php

namespace App\Http\Controllers;

use App\Services\AuditLogService;
use App\Support\ListQuery;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Database\QueryException;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;

class RecycleBinController extends Controller
{
    public function __construct(private readonly AuditLogService $auditLog) {}

    public function index(Request $request): JsonResponse
    {
        $filters = ListQuery::validate($request, ['deleted_at' => 'deleted_at', 'id' => 'id'], [
            'entity_type' => ['sometimes', 'string', 'max:80'],
        ]);
        $query = DB::table('trash_items as trash')->leftJoin('users as deleter', 'deleter.id', '=', 'trash.deleted_by_user_id')
            ->whereNull('trash.restored_at')->whereNull('trash.permanently_deleted_at')
            ->when(isset($filters['entity_type']), fn ($q) => $q->where('trash.entity_type', $filters['entity_type']))
            ->select(['trash.*', 'deleter.display_name as deleted_by_name']);
        ListQuery::search($query, $filters, ['trash.label', 'trash.entity_type', 'deleter.display_name']);
        ListQuery::sort($query, $filters, ['deleted_at' => 'trash.deleted_at', 'id' => 'trash.id'], 'deleted_at', 'trash.id', 'desc');
        $page = $query->paginate($filters['per_page'] ?? 50);
        $page->getCollection()->transform(function (object $row): object {
            $row->snapshot = json_decode((string) $row->snapshot, true, flags: JSON_THROW_ON_ERROR);
            return $row;
        });

        return response()->json(ListQuery::page($page));
    }

    public function restore(Request $request, int $trashId): JsonResponse
    {
        $actor = $request->attributes->get('authenticated_user');
        abort_if(! is_object($actor) || ! isset($actor->id), 401);
        $item = DB::transaction(function () use ($request, $trashId, $actor): object {
            $trash = DB::table('trash_items')->where('id', $trashId)->lockForUpdate()->first();
            abort_if($trash === null, 404);
            abort_if($trash->restored_at !== null, 409, 'This archived record has already been restored.');
            $snapshot = is_array($trash->snapshot)
                ? $trash->snapshot
                : json_decode((string) $trash->snapshot, true, flags: JSON_THROW_ON_ERROR);
            $target = match ($trash->entity_type) {
                'customer' => ['customers', [
                    'is_active' => (bool) ($snapshot['is_active'] ?? true),
                    'status' => (string) ($snapshot['status'] ?? (($snapshot['is_active'] ?? true) ? 'active' : 'paused')),
                    'updated_by_user_id' => $actor->id,
                ]],
                'product' => ['products', ['is_active' => true, 'updated_by_user_id' => $actor->id]],
                'category' => ['product_categories', ['is_active' => true]],
                'warehouse' => ['locations', ['is_active' => true]],
                'governorate' => ['governorates', ['is_active' => true, 'updated_by_user_id' => $actor->id]],
                'shipping_driver' => ['shipping_drivers', ['is_active' => true, 'updated_by_user_id' => $actor->id]],
                'container' => ['containers', ['status' => (string) (($snapshot['status'] ?? null) ?: 'draft')]],
                default => abort(409, 'This record type cannot be restored through the recycle bin.'),
            };
            [$table, $changes] = $target;
            $record = DB::table($table)->where('id', $trash->entity_id)->lockForUpdate()->first();
            abort_if($record === null, 404);
            if ($trash->entity_type === 'container') {
                abort_if($record->status !== 'cancelled', 409, 'This container is not archived.');
            } else {
                abort_if((bool) $record->is_active, 409, 'This record is already active.');
            }
            $before = (array) $record;
            $changes['updated_at'] = now();
            DB::table($table)->where('id', $trash->entity_id)->update($changes);
            DB::table('trash_items')->where('id', $trashId)->update(['restored_by_user_id' => $actor->id, 'restored_at' => now()]);
            $after = (array) DB::table($table)->where('id', $trash->entity_id)->first();
            $this->auditLog->record($request, 'trash.record_restored', (string) $trash->entity_type, (int) $trash->entity_id, null, $before, $after);

            return (object) ['id' => (int) $trash->id, 'entity_type' => $trash->entity_type, 'entity_id' => (int) $trash->entity_id, 'status' => 'restored'];
        }, 5);

        return response()->json(['data' => $item]);
    }

    public function destroy(Request $request, int $trashId): JsonResponse
    {
        $actor = $this->actor($request);
        try {
            $result = DB::transaction(fn (): array => $this->deleteOne($request, $trashId, $actor), 5);
        } catch (QueryException) {
            return response()->json(['message' => 'السجل مرتبط ببيانات مستخدمة ولا يمكن حذفه نهائياً.'], 409);
        }

        return response()->json(['data' => $result]);
    }

    public function empty(Request $request): JsonResponse
    {
        $actor = $this->actor($request);
        $ids = DB::table('trash_items')->whereNull('restored_at')->whereNull('permanently_deleted_at')->orderBy('id')->pluck('id');
        $deleted = 0;
        $blocked = 0;
        foreach ($ids as $id) {
            try {
                DB::transaction(fn () => $this->deleteOne($request, (int) $id, $actor), 5);
                $deleted++;
            } catch (QueryException) {
                $blocked++;
            } catch (HttpExceptionInterface $exception) {
                if ($exception->getStatusCode() !== 409) throw $exception;
                $blocked++;
            }
        }
        $this->auditLog->record($request, 'trash.bin_emptied', 'trash', null, null, null, [
            'deleted_count' => $deleted, 'blocked_count' => $blocked,
        ]);

        return response()->json(['data' => ['deleted_count' => $deleted, 'blocked_count' => $blocked]]);
    }

    private function deleteOne(Request $request, int $trashId, object $actor): array
    {
        $trash = DB::table('trash_items')->where('id', $trashId)->lockForUpdate()->first();
        abort_if($trash === null, 404);
        abort_if($trash->restored_at !== null || $trash->permanently_deleted_at !== null, 409, 'This archived record is no longer available.');
        $table = match ($trash->entity_type) {
            'customer' => 'customers',
            'product' => 'products',
            'category' => 'product_categories',
            'warehouse' => 'locations',
            'governorate' => 'governorates',
            'shipping_driver' => 'shipping_drivers',
            'container' => 'containers',
            default => abort(409, 'This record type cannot be permanently deleted through the recycle bin.'),
        };
        $record = DB::table($table)->where('id', $trash->entity_id)->lockForUpdate()->first();
        if ($record !== null) {
            if ($trash->entity_type === 'container') {
                abort_if($record->status !== 'cancelled', 409, 'Restore the container before deleting it permanently.');
                $hasReceipts = DB::table('container_receipts')->where('container_id', $trash->entity_id)->exists();
                $hasTransfers = DB::table('container_location_transfers')->where('container_id', $trash->entity_id)->exists();
                $hasFunds = DB::table('container_fund_movements')->where('container_id', $trash->entity_id)->exists();
                $hasPayments = DB::table('container_cost_payments')
                    ->join('container_costs', 'container_costs.id', '=', 'container_cost_payments.container_cost_id')
                    ->where('container_costs.container_id', $trash->entity_id)->exists();
                abort_if($hasReceipts || $hasTransfers || $hasFunds || $hasPayments, 409,
                    'This container has inventory or financial history. It can remain archived, but cannot be permanently deleted.');
                DB::table('container_costs')->where('container_id', $trash->entity_id)->delete();
                DB::table('container_lines')->where('container_id', $trash->entity_id)->delete();
                DB::table('container_tracking_events')->where('container_id', $trash->entity_id)->delete();
                DB::table('container_status_history')->where('container_id', $trash->entity_id)->delete();
            } else {
                abort_if((bool) $record->is_active, 409, 'Restore the record before deleting it permanently.');
            }
            DB::table($table)->where('id', $trash->entity_id)->delete();
        }
        DB::table('trash_items')->where('id', $trashId)->update([
            'permanently_deleted_by_user_id' => $actor->id,
            'permanently_deleted_at' => now(),
        ]);
        $this->auditLog->record($request, 'trash.record_permanently_deleted', (string) $trash->entity_type, (int) $trash->entity_id, null,
            (array) $trash, ['entity_deleted' => $record !== null]);

        return ['id' => $trashId, 'status' => 'permanently_deleted'];
    }

    private function actor(Request $request): object
    {
        $actor = $request->attributes->get('authenticated_user');
        abort_unless(is_object($actor) && isset($actor->id), 401);
        return $actor;
    }
}
