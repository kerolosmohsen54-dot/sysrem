<?php

namespace App\Http\Controllers;

use App\Services\ReportsService;
use App\Support\ListQuery;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ReportsController extends Controller
{
    public function __construct(private readonly ReportsService $reports) {}

    public function customerBalances(Request $request): JsonResponse
    {
        $this->denyDriverFinancialAccess($request);
        $filters = ListQuery::validate($request, [
            'name' => 'name',
            'phone' => 'phone',
            'id' => 'id',
        ]);

        return response()->json($this->reports->customerBalances($filters));
    }

    public function customerStatement(Request $request, int $customerId): JsonResponse
    {
        $this->denyDriverFinancialAccess($request);
        $filters = ListQuery::validate($request, [
            'activity_date' => 'activity_date',
            'document_number' => 'document_number',
            'entry_type' => 'entry_type',
            'id' => 'entry_id',
        ], [
            'from_date' => ['sometimes', 'date_format:Y-m-d'],
            'to_date' => ['sometimes', 'date_format:Y-m-d', 'after_or_equal:from_date'],
        ]);

        return response()->json($this->reports->customerStatement($customerId, $filters));
    }

    public function stock(Request $request): JsonResponse
    {
        $filters = ListQuery::validate($request, [
            'product_name' => 'product.name',
            'product_code' => 'product.sku',
            'warehouse_name' => 'location.name',
            'warehouse_code' => 'location.code',
            'quantity' => 'balance.quantity_on_hand',
            'id' => 'balance.product_id',
        ], [
            'product_id' => ['sometimes', 'integer', 'min:1'],
            'warehouse_id' => ['sometimes', 'integer', 'min:1'],
            'category_id' => ['sometimes', 'integer', 'min:1'],
        ]);

        return response()->json($this->reports->stock(
            $filters,
            ! $this->isDriver($request) && $this->hasPermission($request, 'costs.view'),
        ));
    }

    public function stockMovements(Request $request): JsonResponse
    {
        $filters = ListQuery::validate($request, [
            'movement_date' => 'movement.movement_date',
            'movement_number' => 'movement.movement_number',
            'movement_type' => 'movement.movement_type',
            'product_name' => 'product.name',
            'product_code' => 'product.sku',
            'quantity' => 'line.quantity',
            'id' => 'movement.id',
        ], [
            'product_id' => ['sometimes', 'integer', 'min:1'],
            'warehouse_id' => ['sometimes', 'integer', 'min:1'],
            'movement_type' => ['sometimes', 'string', 'in:opening,receipt,sale,return,transfer,adjustment,damage,container_receipt,reversal'],
            'from_date' => ['sometimes', 'date_format:Y-m-d'],
            'to_date' => ['sometimes', 'date_format:Y-m-d', 'after_or_equal:from_date'],
        ]);

        return response()->json($this->reports->stockMovements(
            $filters,
            ! $this->isDriver($request) && $this->hasPermission($request, 'costs.view'),
        ));
    }

    public function sales(Request $request): JsonResponse
    {
        $this->denyDriverFinancialAccess($request);
        $filters = ListQuery::validate($request, [
            'issue_date' => 'document.issue_date',
            'document_number' => 'document.document_number',
            'customer' => 'customer.name',
            'total_amount' => 'document.total_amount',
            'id' => 'document.id',
        ], [
            'customer_id' => ['sometimes', 'integer', 'min:1'],
            'salesperson_id' => ['sometimes', 'integer', 'min:1'],
            'group_by' => ['sometimes', 'in:month,week,employee,customer,discounts'],
            'document_number' => ['sometimes', 'string', 'max:80'],
            'from_date' => ['sometimes', 'date_format:Y-m-d'],
            'to_date' => ['sometimes', 'date_format:Y-m-d', 'after_or_equal:from_date'],
        ]);

        return response()->json($this->reports->sales($filters));
    }

    public function containerCosts(Request $request): JsonResponse
    {
        $this->denyDriverFinancialAccess($request);
        $filters = ListQuery::validate($request, [
            'container_number' => 'container.container_number',
            'status' => 'container.status',
            'origin' => 'container.origin',
            'destination' => 'container.destination',
            'id' => 'container.id',
        ], [
            'container_id' => ['sometimes', 'integer', 'min:1'],
            'status' => ['sometimes', 'in:estimated,incurred,paid,cancelled'],
            'from_date' => ['sometimes', 'date_format:Y-m-d'],
            'to_date' => ['sometimes', 'date_format:Y-m-d', 'after_or_equal:from_date'],
        ]);

        return response()->json($this->reports->containerCosts($filters));
    }

    public function invoiceProfit(Request $request): JsonResponse
    {
        $this->denyDriverFinancialAccess($request);
        $filters = ListQuery::validate($request, [
            'issue_date' => 'document.issue_date',
            'document_number' => 'document.document_number',
            'customer' => 'customer.name',
            'revenue' => 'document.total_amount',
            'id' => 'document.id',
        ], [
            'customer_id' => ['sometimes', 'integer', 'min:1'],
            'from_date' => ['sometimes', 'date_format:Y-m-d'],
            'to_date' => ['sometimes', 'date_format:Y-m-d', 'after_or_equal:from_date'],
        ]);

        return response()->json($this->reports->invoiceProfit($filters));
    }

    public function profitDistribution(Request $request): JsonResponse
    {
        $this->denyDriverFinancialAccess($request);
        abort_unless($this->hasPermission($request, 'costs.view'), 403);
        $filters = ListQuery::validate($request, ['issue_date' => 'document.issue_date', 'id' => 'document.id'], [
            'from_date' => ['sometimes', 'date_format:Y-m-d'],
            'to_date' => ['sometimes', 'date_format:Y-m-d', 'after_or_equal:from_date'],
        ]);

        return response()->json($this->reports->profitDistribution($filters));
    }

    public function dashboard(Request $request): JsonResponse
    {
        $values = $request->validate(['period' => ['sometimes', 'in:week,month,year']]);
        $actor = $request->attributes->get('authenticated_user');
        $permissionCodes = [
            'invoices.view',
            'inventory.view',
            'reports.customer_balances.view',
            'treasury.view',
            'costs.view',
            'collections.view',
            'expenses.view',
            'orders.view',
            'accounting.reports.view',
        ];
        $permissions = DB::table('role_permissions as role_permission')
            ->join('permissions as permission', 'permission.id', '=', 'role_permission.permission_id')
            ->join('user_roles as user_role', 'user_role.role_id', '=', 'role_permission.role_id')
            ->join('roles as role', 'role.id', '=', 'user_role.role_id')
            ->where('user_role.user_id', $actor->id)
            ->where('role.is_active', true)
            ->whereIn('permission.code', $permissionCodes)
            ->pluck('permission.code')
            ->all();
        if ($this->isDriver($request)) {
            $permissions = array_values(array_diff($permissions, [
                'invoices.view',
                'reports.customer_balances.view',
                'treasury.view',
                'collections.view',
                'expenses.view',
                'accounting.reports.view',
                'costs.view',
            ]));
        }

        return response()->json($this->reports->dashboard($permissions, $values['period'] ?? 'month'));
    }

    private function hasPermission(Request $request, string $permission): bool
    {
        $actor = $request->attributes->get('authenticated_user');

        return is_object($actor) && DB::table('role_permissions as role_permission')
            ->join('permissions as permission', 'permission.id', '=', 'role_permission.permission_id')
            ->join('user_roles as user_role', 'user_role.role_id', '=', 'role_permission.role_id')
            ->join('roles as role', 'role.id', '=', 'user_role.role_id')
            ->where('user_role.user_id', $actor->id)
            ->where('role.is_active', true)
            ->where('permission.code', $permission)
            ->exists();
    }

    private function denyDriverFinancialAccess(Request $request): void
    {
        abort_if($this->isDriver($request), 403);
    }

    private function isDriver(Request $request): bool
    {
        $actor = $request->attributes->get('authenticated_user');

        return is_object($actor) && DB::table('user_roles as user_role')
            ->join('roles as role', 'role.id', '=', 'user_role.role_id')
            ->where('user_role.user_id', $actor->id)
            ->where('role.code', 'driver')
            ->where('role.is_active', true)
            ->exists();
    }
}
