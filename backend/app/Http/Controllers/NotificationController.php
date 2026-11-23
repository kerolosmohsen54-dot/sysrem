<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class NotificationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $actor = $this->actor($request);
        $permissions = $this->permissions((int) $actor->id);
        $activeKeys = [];

        if (in_array('inventory.view', $permissions, true)) {
            $lowStock = DB::table('product_location_minimum_stock as minimum')
                ->leftJoin('inventory_balances as balance', function ($join): void {
                    $join->on('balance.product_id', '=', 'minimum.product_id')->on('balance.location_id', '=', 'minimum.location_id');
                })
                ->join('products as product', 'product.id', '=', 'minimum.product_id')
                ->join('locations as location', 'location.id', '=', 'minimum.location_id')
                ->where('product.is_active', true)->where('location.is_active', true)->where('location.location_type', '<>', 'damaged')
                ->whereRaw('(COALESCE(balance.quantity_on_hand, 0) - COALESCE(balance.quantity_reserved, 0)) <= minimum.minimum_quantity')
                ->get(['product.id as product_id', 'product.name as product_name', 'balance.quantity_on_hand', 'balance.quantity_reserved', 'minimum.minimum_quantity', 'location.id as location_id', 'location.name as location_name']);
            foreach ($lowStock as $row) {
                $key = 'low-stock:'.$row->product_id.':'.$row->location_id;
                $activeKeys[] = $key;
                $this->upsert($actor->id, $key, 'low_stock', 'مخزون منخفض: '.$row->product_name,
                    'المتاح '.max(0, (int) ($row->quantity_on_hand ?? 0) - (int) ($row->quantity_reserved ?? 0)).' من الحد '.$row->minimum_quantity.' في '.$row->location_name,
                    '/inventory/minimum-stock');
            }
            $globalStock = DB::table('inventory_balances as balance')->join('locations as location', 'location.id', '=', 'balance.location_id')
                ->where('location.is_active', true)->where('location.location_type', '<>', 'damaged')
                ->select('balance.product_id')->selectRaw('SUM(balance.quantity_on_hand - balance.quantity_reserved) as available')->groupBy('balance.product_id');
            $global = DB::table('products as product')
                ->leftJoinSub($globalStock, 'stock', 'stock.product_id', '=', 'product.id')
                ->where('product.is_active', true)->where('product.minimum_stock', '>', 0)
                ->whereRaw('COALESCE(stock.available, 0) <= product.minimum_stock')
                ->get(['product.id', 'product.name', 'product.minimum_stock', DB::raw('COALESCE(stock.available, 0) AS available')]);
            foreach ($global as $row) {
                $key = 'low-stock:'.$row->id.':all';
                $activeKeys[] = $key;
                $this->upsert($actor->id, $key, 'low_stock', 'مخزون منخفض: '.$row->name,
                    'المتاح '.max(0, (int) $row->available).' من الحد '.$row->minimum_stock.' في كل المخازن', '/inventory/minimum-stock');
            }
            DB::table('user_notifications')->where('user_id', $actor->id)->where('notification_type', 'low_stock')->whereNull('resolved_at')
                ->when($activeKeys !== [], fn ($q) => $q->whereNotIn('source_key', $activeKeys))
                ->update(['resolved_at' => now(), 'updated_at' => now()]);
        }

        if (in_array('pending_funds.view', $permissions, true)) {
            $funds = DB::table('pending_funds as fund')->join('partners as partner', 'partner.id', '=', 'fund.partner_id')
                ->whereIn('fund.status', ['pending', 'partially_received'])->whereDate('fund.due_date', '<=', now()->addDays(7)->toDateString())
                ->orderBy('fund.due_date')->limit(50)->get(['fund.id', 'fund.description', 'fund.due_date', 'partner.name as partner_name']);
            $fundKeys = [];
            foreach ($funds as $fund) {
                $key = 'pending-fund:'.$fund->id;
                $fundKeys[] = $key;
                $this->upsert($actor->id, $key, 'pending_fund', 'مبلغ منتظر الاستحقاق', $fund->partner_name.' · '.$fund->description.' · '.$fund->due_date, '/finance/pending-funds');
            }
            DB::table('user_notifications')->where('user_id', $actor->id)->where('notification_type', 'pending_fund')->whereNull('resolved_at')
                ->when($fundKeys !== [], fn ($q) => $q->whereNotIn('source_key', $fundKeys))
                ->update(['resolved_at' => now(), 'updated_at' => now()]);
        }

        if (in_array('partner_installments.view', $permissions, true)) {
            $installments = DB::table('partner_installments as installment')
                ->join('partner_installment_plans as plan', 'plan.id', '=', 'installment.plan_id')
                ->join('container_partners as partner', 'partner.id', '=', 'plan.container_partner_id')
                ->where('plan.status', 'active')->where('plan.contribution_mode', 'scheduled')->whereColumn('installment.paid_amount', '<', 'installment.amount')
                ->whereDate('installment.due_date', '<=', now()->addDays(7)->toDateString())
                ->orderBy('installment.due_date')->limit(50)
                ->get(['installment.id', 'installment.due_date', 'installment.sequence_number', 'partner.name as partner_name']);
            $installmentKeys = [];
            foreach ($installments as $installment) {
                $key = 'partner-installment:'.$installment->id;
                $installmentKeys[] = $key;
                $this->upsert($actor->id, $key, 'partner_installment', 'قسط شريك مستحق',
                    $installment->partner_name.' · قسط '.$installment->sequence_number.' · '.$installment->due_date, '/finance/partner-installments');
            }
            DB::table('user_notifications')->where('user_id', $actor->id)->where('notification_type', 'partner_installment')->whereNull('resolved_at')
                ->when($installmentKeys !== [], fn ($q) => $q->whereNotIn('source_key', $installmentKeys))
                ->update(['resolved_at' => now(), 'updated_at' => now()]);
        }

        $allowedTypes = [];
        if (in_array('inventory.view', $permissions, true)) $allowedTypes[] = 'low_stock';
        if (in_array('pending_funds.view', $permissions, true)) $allowedTypes[] = 'pending_fund';
        if (in_array('partner_installments.view', $permissions, true)) $allowedTypes[] = 'partner_installment';
        $notifications = DB::table('user_notifications')->where('user_id', $actor->id)->whereNull('resolved_at')
            ->whereIn('notification_type', $allowedTypes)
            ->orderByRaw('read_at IS NULL DESC')->orderByDesc('created_at')->limit(30)
            ->get(['id', 'notification_type', 'title', 'message', 'target_path', 'read_at', 'created_at'])
            ->map(static fn (object $row): array => [
                'id' => (int) $row->id, 'type' => $row->notification_type, 'title' => $row->title,
                'message' => $row->message, 'target_path' => $row->target_path,
                'is_read' => $row->read_at !== null, 'created_at' => $row->created_at,
            ])->values();

        return response()->json(['data' => $notifications]);
    }

    public function markRead(Request $request, int $notificationId): JsonResponse
    {
        $actor = $this->actor($request);
        $updated = DB::table('user_notifications')->where('id', $notificationId)->where('user_id', $actor->id)->whereNull('read_at')
            ->update(['read_at' => now(), 'updated_at' => now()]);
        abort_if(! $updated && ! DB::table('user_notifications')->where('id', $notificationId)->where('user_id', $actor->id)->exists(), 404);

        return response()->json(['data' => ['id' => $notificationId, 'is_read' => true]]);
    }

    private function upsert(int $userId, string $key, string $type, string $title, string $message, string $target): void
    {
        $existing = DB::table('user_notifications')->where('user_id', $userId)->where('source_key', $key)->first(['id', 'resolved_at', 'read_at']);
        if ($existing === null) {
            DB::table('user_notifications')->insert([
                'user_id' => $userId, 'source_key' => $key, 'notification_type' => $type,
                'title' => $title, 'message' => mb_substr($message, 0, 500), 'target_path' => $target,
                'created_at' => now(), 'updated_at' => now(),
            ]);
            return;
        }
        DB::table('user_notifications')->where('id', $existing->id)->update([
            'title' => $title, 'message' => mb_substr($message, 0, 500), 'target_path' => $target,
            'read_at' => $existing->resolved_at !== null ? null : $existing->read_at,
            'resolved_at' => null, 'updated_at' => now(),
        ]);
    }

    private function permissions(int $userId): array
    {
        return DB::table('user_roles as ur')->join('role_permissions as rp', 'rp.role_id', '=', 'ur.role_id')
            ->join('permissions as permission', 'permission.id', '=', 'rp.permission_id')->join('roles as role', 'role.id', '=', 'ur.role_id')
            ->where('ur.user_id', $userId)->where('role.is_active', true)->pluck('permission.code')->unique()->all();
    }

    private function actor(Request $request): object
    {
        $actor = $request->attributes->get('authenticated_user');
        abort_unless(is_object($actor) && isset($actor->id), 401);
        return $actor;
    }
}
