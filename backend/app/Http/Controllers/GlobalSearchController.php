<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class GlobalSearchController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $values = $request->validate(['q' => ['required', 'string', 'min:2', 'max:100']]);
        $actor = $request->attributes->get('authenticated_user');
        abort_unless(is_object($actor) && isset($actor->id), 401);
        $permissions = DB::table('user_roles as ur')
            ->join('role_permissions as rp', 'rp.role_id', '=', 'ur.role_id')
            ->join('permissions as permission', 'permission.id', '=', 'rp.permission_id')
            ->join('roles as role', 'role.id', '=', 'ur.role_id')
            ->where('ur.user_id', $actor->id)->where('role.is_active', true)
            ->pluck('permission.code')->unique()->all();
        $has = static fn (string $permission): bool => in_array('*', $permissions, true) || in_array($permission, $permissions, true);
        $term = trim($values['q']);
        $like = '%'.$term.'%';
        $results = [];

        if ($has('customers.view')) {
            $results = [...$results, ...DB::table('customers')->where('is_active', true)
                ->where(fn ($q) => $q->where('name', 'like', $like)->orWhere('phone', 'like', $like))
                ->orderBy('name')->limit(8)->get(['id', 'name', 'phone'])->map(static fn (object $row): array => [
                    'id' => 'customer-'.$row->id, 'type' => 'customer', 'title' => $row->name,
                    'subtitle' => $row->phone, 'target' => '/customers/'.$row->id,
                ])->all()];
        }
        if ($has('products.view')) {
            $results = [...$results, ...DB::table('products')->where('is_active', true)
                ->where(fn ($q) => $q->where('name', 'like', $like)->orWhere('sku', 'like', $like)->orWhere('barcode', 'like', $like))
                ->orderBy('name')->limit(8)->get(['id', 'name', 'sku'])->map(static fn (object $row): array => [
                    'id' => 'product-'.$row->id, 'type' => 'product', 'title' => $row->name,
                    'subtitle' => $row->sku, 'target' => '/products?search='.rawurlencode((string) $row->sku),
                ])->all()];
        }
        if ($has('invoices.view')) {
            $results = [...$results, ...DB::table('sales_documents as document')
                ->leftJoin('customers as customer', 'customer.id', '=', 'document.customer_id')
                ->where('document.document_type', 'invoice')->where('document.status', '<>', 'cancelled')
                ->where(fn ($q) => $q->where('document.document_number', 'like', $like)->orWhere('customer.name', 'like', $like))
                ->orderByDesc('document.issue_date')->limit(8)->get(['document.id', 'document.document_number', 'document.issue_date', 'customer.name as customer_name'])
                ->map(static fn (object $row): array => [
                    'id' => 'invoice-'.$row->id, 'type' => 'invoice', 'title' => $row->document_number,
                    'subtitle' => trim(($row->customer_name ?? '').' '.$row->issue_date), 'target' => '/invoices/'.$row->id,
                ])->all()];
        }
        if ($has('orders.view')) {
            $results = [...$results, ...DB::table('sales_orders as sales_order')
                ->join('customers as customer', 'customer.id', '=', 'sales_order.customer_id')
                ->where(fn ($q) => $q->where('sales_order.order_number', 'like', $like)->orWhere('customer.name', 'like', $like))
                ->orderByDesc('sales_order.order_date')->limit(8)->get(['sales_order.id', 'sales_order.order_number', 'sales_order.order_date', 'customer.name as customer_name'])
                ->map(static fn (object $row): array => [
                    'id' => 'order-'.$row->id, 'type' => 'order', 'title' => $row->order_number,
                    'subtitle' => $row->customer_name.' · '.$row->order_date, 'target' => '/orders/'.$row->id,
                ])->all()];
        }
        if ($has('containers.view')) {
            $results = [...$results, ...DB::table('containers')
                ->where(fn ($q) => $q->where('container_number', 'like', $like)->orWhere('container_name', 'like', $like))
                ->orderByDesc('id')->limit(8)->get(['id', 'container_number', 'container_name', 'status'])->map(static fn (object $row): array => [
                    'id' => 'container-'.$row->id, 'type' => 'container', 'title' => $row->container_number,
                    'subtitle' => trim(($row->container_name ?? '').' '.$row->status), 'target' => '/containers/'.$row->id,
                ])->all()];
        }

        return response()->json(['data' => array_slice($results, 0, 25), 'meta' => ['query' => $term, 'as_of' => now()->toIso8601String()]]);
    }
}
