<?php

namespace App\Http\Controllers;

use App\Services\AuditLogService;
use App\Services\MasterDataService;
use App\Services\TrashService;
use App\Support\ExactMoney;
use App\Support\ListQuery;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class CatalogController extends Controller
{
    public function __construct(
        private readonly AuditLogService $auditLog,
        private readonly MasterDataService $masterData,
        private readonly TrashService $trash,
    ) {}

    public function categories(Request $request): JsonResponse
    {
        $sortable = ['name' => 'name', 'code' => 'code', 'id' => 'id'];
        $filters = ListQuery::validate($request, $sortable);
        $query = ListQuery::search(DB::table('product_categories'), $filters, ['name', 'code']);
        ListQuery::sort($query, $filters, $sortable, 'name');

        $page = $query->paginate($filters['per_page'] ?? 50);

        return response()->json(ListQuery::page($page));
    }

    public function createCategory(Request $request): JsonResponse
    {
        $values = $request->validate([
            'parent_category_id' => ['nullable', 'integer', 'exists:product_categories,id'],
            'code' => ['nullable', 'string', 'max:80', 'unique:product_categories,code'],
            'name' => ['required', 'string', 'max:160'],
            'is_active' => ['sometimes', 'boolean'],
        ]);
        $now = now();
        $values['is_active'] = $values['is_active'] ?? true;
        $values['created_at'] = $now;
        $values['updated_at'] = $now;

        $categoryId = DB::transaction(function () use ($request, $values): int {
            $categoryId = (int) DB::table('product_categories')->insertGetId($values);
            $this->auditLog->record($request, 'catalog.category_created', 'product_category', $categoryId, null, null, $values);

            return $categoryId;
        });

        return response()->json(['data' => DB::table('product_categories')->where('id', $categoryId)->first()], 201);
    }

    public function updateCategory(Request $request, int $categoryId): JsonResponse
    {
        $values = $request->validate([
            'parent_category_id' => ['sometimes', 'nullable', 'integer', 'exists:product_categories,id'],
            'code' => ['sometimes', 'nullable', 'string', 'max:80', Rule::unique('product_categories', 'code')->ignore($categoryId)],
            'name' => ['sometimes', 'required', 'string', 'max:160'],
            'is_active' => ['sometimes', 'boolean'],
        ]);
        $this->assertChangesProvided($values);

        $category = DB::transaction(function () use ($request, $values, $categoryId): object {
            $before = DB::table('product_categories')->where('id', $categoryId)->lockForUpdate()->first();

            if ($before === null) {
                abort(404);
            }

            if (array_key_exists('parent_category_id', $values)) {
                $this->assertCategoryParentIsAllowed(
                    $categoryId,
                    $values['parent_category_id'] === null ? null : (int) $values['parent_category_id'],
                );
            }

            $values['updated_at'] = now();
            DB::table('product_categories')->where('id', $categoryId)->update($values);
            $after = DB::table('product_categories')->where('id', $categoryId)->first();
            $this->auditLog->record($request, 'catalog.category_updated', 'product_category', $categoryId, null, (array) $before, (array) $after);

            return $after;
        });

        return response()->json(['data' => $category]);
    }

    public function deleteCategory(Request $request, int $categoryId): JsonResponse
    {
        DB::transaction(function () use ($request, $categoryId): void {
            $before = DB::table('product_categories')->where('id', $categoryId)->lockForUpdate()->first();

            if ($before === null) {
                abort(404);
            }

            DB::table('product_categories')->where('id', $categoryId)->update([
                'is_active' => false,
                'updated_at' => now(),
            ]);
            $after = DB::table('product_categories')->where('id', $categoryId)->first();
            $this->trash->record($request, 'category', $categoryId, (string) $before->name, (array) $before);
            $this->auditLog->record($request, 'catalog.category_deactivated', 'product_category', $categoryId, null, (array) $before, (array) $after);
        });

        return response()->json(['data' => ['status' => 'deactivated']]);
    }

    public function products(Request $request): JsonResponse
    {
        $sortable = [
            'name' => 'products.name', 'code' => 'products.sku', 'sku' => 'products.sku',
            'category_name' => 'category.name', 'quantity_on_hand' => 'stock.quantity_on_hand',
            'reserved_quantity' => 'stock.quantity_reserved', 'available_quantity' => 'available_quantity',
            'company_price' => 'products.company_price', 'is_active' => 'products.is_active', 'id' => 'products.id',
        ];
        $filters = ListQuery::validate($request, $sortable, [
            'category_id' => ['sometimes', 'integer', 'min:1', 'exists:product_categories,id'],
            'is_active' => ['sometimes', 'boolean'],
        ]);
        $canViewCosts = $this->canViewCosts($request);
        $canViewCompanyPrice = $this->canViewCompanyPrice($request);
        $stock = DB::table('inventory_balances as balance')
            ->join('locations as stock_location', 'stock_location.id', '=', 'balance.location_id')
            ->select('balance.product_id')
            ->selectRaw('COALESCE(SUM(balance.quantity_on_hand), 0) as quantity_on_hand')
            ->selectRaw('COALESCE(SUM(balance.quantity_reserved), 0) as quantity_reserved')
            ->selectRaw("COALESCE(SUM(CASE WHEN stock_location.location_type <> 'damaged' AND stock_location.is_active = 1 THEN balance.quantity_on_hand - balance.quantity_reserved ELSE 0 END), 0) as available_quantity")
            ->groupBy('balance.product_id');
        $query = DB::table('products')
            ->leftJoin('product_categories as category', 'category.id', '=', 'products.category_id')
            ->leftJoinSub($stock, 'stock', 'stock.product_id', '=', 'products.id')
            ->select('products.*', 'category.name as category_name')
            ->selectRaw('COALESCE(stock.quantity_on_hand, 0) as quantity_on_hand')
            ->selectRaw('COALESCE(stock.quantity_reserved, 0) as reserved_quantity')
            ->selectRaw('COALESCE(stock.available_quantity, 0) as available_quantity')
            ->when(isset($filters['category_id']), fn ($builder) => $builder->where('products.category_id', $filters['category_id']))
            ->when(array_key_exists('is_active', $filters), fn ($builder) => $builder->where('products.is_active', $filters['is_active']));
        $query = ListQuery::search($query, $filters, ['products.name', 'products.sku', 'products.barcode', 'category.name']);
        ListQuery::sort($query, $filters, $sortable, 'name');
        $products = $query->paginate($filters['per_page'] ?? 50);
        $products->getCollection()->transform(fn (object $product): array => $this->productResource($product, $canViewCosts, $canViewCompanyPrice));

        return response()->json(ListQuery::page($products));
    }

    public function product(Request $request, int $productId): JsonResponse
    {
        $product = DB::table('products')->where('id', $productId)->first();

        if ($product === null) {
            abort(404);
        }

        return response()->json(['data' => $this->productResource($product, $this->canViewCosts($request), $this->canViewCompanyPrice($request))]);
    }

    public function productCostHistory(Request $request, int $productId): JsonResponse
    {
        abort_unless(DB::table('products')->where('id', $productId)->exists(), 404);
        $sortable = [
            'movement_date' => 'movement.movement_date',
            'movement_type' => 'movement.movement_type',
            'movement_number' => 'movement.movement_number',
            'quantity' => 'line.quantity',
            'id' => 'movement.id',
        ];
        $filters = ListQuery::validate($request, $sortable, [
            'warehouse_id' => ['sometimes', 'integer', 'min:1'],
            'from_date' => ['sometimes', 'date_format:Y-m-d'],
            'to_date' => ['sometimes', 'date_format:Y-m-d', 'after_or_equal:from_date'],
        ]);
        $query = DB::table('inventory_movement_lines as line')
            ->join('inventory_movements as movement', 'movement.id', '=', 'line.inventory_movement_id')
            ->join('products as product', 'product.id', '=', 'line.product_id')
            ->leftJoin('locations as source', 'source.id', '=', 'line.from_location_id')
            ->leftJoin('locations as destination', 'destination.id', '=', 'line.to_location_id')
            ->leftJoin('sales_documents as source_sales', function ($join): void {
                $join->on('source_sales.id', '=', 'movement.source_id')->where('movement.source_type', '=', 'sales_document');
            })
            ->leftJoin('sales_documents as source_original_sales', 'source_original_sales.id', '=', 'source_sales.original_document_id')
            ->leftJoin('purchase_invoices as source_purchase', function ($join): void {
                $join->on('source_purchase.id', '=', 'movement.source_id')->where('movement.source_type', '=', 'purchase_invoice');
            })
            ->leftJoin('inventory_count_lines as source_count_line', function ($join): void {
                $join->on('source_count_line.id', '=', 'movement.source_id')->where('movement.source_type', '=', 'inventory_count_line');
            })
            ->leftJoin('inventory_counts as source_count', 'source_count.id', '=', 'source_count_line.inventory_count_id')
            ->leftJoin('container_receipts as source_receipt', function ($join): void {
                $join->on('source_receipt.id', '=', 'movement.source_id')->where('movement.source_type', '=', 'container_receipt');
            })
            ->leftJoin('containers as source_container', 'source_container.id', '=', 'source_receipt.container_id')
            ->leftJoin('warehouse_returns as source_return', function ($join): void {
                $join->on('source_return.id', '=', 'movement.source_id')->where('movement.source_type', '=', 'warehouse_return');
            })
            ->where('line.product_id', $productId)
            ->where('movement.status', 'posted')
            ->whereNotNull('line.to_location_id')
            ->when(isset($filters['warehouse_id']), fn ($builder) => $builder->where(function ($locations) use ($filters): void {
                $locations->where('line.from_location_id', $filters['warehouse_id'])
                    ->orWhere('line.to_location_id', $filters['warehouse_id']);
            }))
            ->when(isset($filters['from_date']), fn ($builder) => $builder->where('movement.movement_date', '>=', $filters['from_date']))
            ->when(isset($filters['to_date']), fn ($builder) => $builder->where('movement.movement_date', '<=', $filters['to_date']))
            ->select([
                'line.id',
                'product.name as product_name',
                'product.sku',
                'movement.id as movement_id',
                'movement.movement_number',
                'movement.source_type',
                'movement.source_id',
                DB::raw("COALESCE(CASE WHEN source_sales.document_type = 'credit_note' AND source_original_sales.document_number IS NOT NULL THEN CONCAT(source_sales.document_number, ' ← ', source_original_sales.document_number) ELSE source_sales.document_number END, source_purchase.invoice_number, source_count.count_number, source_container.container_number, CONCAT('RET-', source_return.id), movement.movement_number) as source_reference"),
                'movement.movement_type',
                'movement.status',
                'movement.movement_date',
                'line.quantity',
                'line.unit_cost_egp_snapshot',
                'line.unit_cost_egp_snapshot as unit_cost_egp',
                'line.line_cost_egp_snapshot',
                'line.from_location_id as source_warehouse_id',
                'source.name as source_warehouse_name',
                'line.to_location_id as destination_warehouse_id',
                'destination.name as destination_warehouse_name',
                'destination.name as warehouse_name',
            ]);
        ListQuery::search($query, $filters, [
            'movement.movement_number', 'movement.movement_type', 'movement.reason', 'source.name', 'destination.name',
            'source_sales.document_number', 'source_original_sales.document_number', 'source_purchase.invoice_number', 'source_count.count_number', 'source_container.container_number',
        ]);
        ListQuery::sort($query, $filters, $sortable, 'movement_date', 'movement.id', 'desc');
        $history = $query->paginate($filters['per_page'] ?? 50);
        $history->getCollection()->transform(function (object $movement): object {
            foreach (['unit_cost_egp_snapshot', 'unit_cost_egp', 'line_cost_egp_snapshot'] as $field) {
                if ($movement->{$field} !== null) {
                    $movement->{$field} = ExactMoney::fromCents(ExactMoney::toCents((string) $movement->{$field}));
                }
            }

            return $movement;
        });

        return response()->json(ListQuery::page($history));
    }

    public function createProduct(Request $request): JsonResponse
    {
        $values = $request->validate([
            'sku' => ['required', 'string', 'max:100', 'unique:products,sku'],
            'barcode' => ['nullable', 'string', 'max:100', 'unique:products,barcode'],
            'name' => ['required', 'string', 'max:200'],
            'category_id' => ['nullable', 'integer', 'exists:product_categories,id'],
            'unit_code' => ['required', 'string', 'max:32'],
            'company_price' => ['nullable', 'string', 'regex:/\A(?:0|[1-9][0-9]{0,14})(?:\.[0-9]{1,4})?\z/'],
            'default_location_id' => ['nullable', 'integer', 'exists:locations,id'],
            'minimum_stock' => ['nullable', 'integer', 'min:0', 'max:2147483647'],
            'description' => ['nullable', 'string'],
            'default_tax_rate' => ['sometimes', 'nullable', 'string', 'regex:/\A(?:0|[1-9][0-9]{0,2})(?:\.[0-9]{1,6})?\z/'],
            'last_purchase_price_reference' => ['sometimes', 'nullable', 'string', 'regex:/\A(?:0|[1-9][0-9]{0,14})(?:\.[0-9]{1,4})?\z/'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        $this->assertReferencePricePermission($request, $values);
        $values = $this->normalizeProductMoney($values);
        if (isset($values['last_purchase_price_reference'])) {
            $values['last_purchase_price_reference'] = ExactMoney::fromCents(ExactMoney::toCents($values['last_purchase_price_reference']));
        }
        $productId = $this->masterData->createProduct($request, $values);

        $product = DB::table('products')->where('id', $productId)->first();

        return response()->json(['data' => $this->productResource($product, $this->canViewCosts($request), $this->canViewCompanyPrice($request))], 201);
    }

    public function updateProduct(Request $request, int $productId): JsonResponse
    {
        $values = $request->validate([
            'sku' => ['sometimes', 'required', 'string', 'max:100', Rule::unique('products', 'sku')->ignore($productId)],
            'barcode' => ['sometimes', 'nullable', 'string', 'max:100', Rule::unique('products', 'barcode')->ignore($productId)],
            'name' => ['sometimes', 'required', 'string', 'max:200'],
            'category_id' => ['sometimes', 'nullable', 'integer', 'exists:product_categories,id'],
            'unit_code' => ['sometimes', 'required', 'string', 'max:32'],
            'company_price' => ['sometimes', 'nullable', 'string', 'regex:/\A(?:0|[1-9][0-9]{0,14})(?:\.[0-9]{1,4})?\z/'],
            'default_location_id' => ['sometimes', 'nullable', 'integer', 'exists:locations,id'],
            'minimum_stock' => ['sometimes', 'nullable', 'integer', 'min:0', 'max:2147483647'],
            'description' => ['sometimes', 'nullable', 'string'],
            'default_tax_rate' => ['sometimes', 'nullable', 'string', 'regex:/\A(?:0|[1-9][0-9]{0,2})(?:\.[0-9]{1,6})?\z/'],
            'last_purchase_price_reference' => ['sometimes', 'nullable', 'string', 'regex:/\A(?:0|[1-9][0-9]{0,14})(?:\.[0-9]{1,4})?\z/'],
            'is_active' => ['sometimes', 'boolean'],
        ]);
        $this->assertChangesProvided($values);
        $this->assertReferencePricePermission($request, $values);
        $values = $this->normalizeProductMoney($values);
        if (isset($values['last_purchase_price_reference'])) {
            $values['last_purchase_price_reference'] = ExactMoney::fromCents(ExactMoney::toCents($values['last_purchase_price_reference']));
        }
        $values['updated_by_user_id'] = $this->actorId($request);
        $values['updated_at'] = now();

        $product = DB::transaction(function () use ($request, $values, $productId): object {
            $before = DB::table('products')->where('id', $productId)->lockForUpdate()->first();

            if ($before === null) {
                abort(404);
            }

            if (($values['is_active'] ?? null) === false) {
                $this->assertProductHasNoStock($productId);
            }

            DB::table('products')->where('id', $productId)->update($values);
            $after = DB::table('products')->where('id', $productId)->first();
            $this->auditLog->record($request, 'catalog.product_updated', 'product', $productId, null, (array) $before, (array) $after);

            return $after;
        });

        return response()->json(['data' => $this->productResource($product, $this->canViewCosts($request), $this->canViewCompanyPrice($request))]);
    }

    public function deleteProduct(Request $request, int $productId): JsonResponse
    {
        DB::transaction(function () use ($request, $productId): void {
            $before = DB::table('products')->where('id', $productId)->lockForUpdate()->first();

            if ($before === null) {
                abort(404);
            }

            $this->assertProductHasNoStock($productId);

            DB::table('products')->where('id', $productId)->update([
                'is_active' => false,
                'updated_by_user_id' => $this->actorId($request),
                'updated_at' => now(),
            ]);
            $after = DB::table('products')->where('id', $productId)->first();
            $this->trash->record($request, 'product', $productId, (string) $before->name, (array) $before);
            $this->auditLog->record($request, 'catalog.product_deactivated', 'product', $productId, null, (array) $before, (array) $after);
        });

        return response()->json(['data' => ['status' => 'deactivated']]);
    }

    public function warehouses(Request $request): JsonResponse
    {
        $sortable = ['name' => 'location.name', 'code' => 'location.code', 'location_type' => 'location.location_type', 'id' => 'location.id'];
        $filters = ListQuery::validate($request, $sortable, [
            'location_type' => ['sometimes', Rule::in(['main', 'sub', 'vehicle', 'damaged', 'other'])],
            'is_active' => ['sometimes', 'boolean'],
        ]);
        $query = DB::table('locations as location')
            ->leftJoinSub(DB::table('inventory_balances')->select('location_id')
                ->selectRaw('COUNT(DISTINCT CASE WHEN quantity_on_hand > 0 THEN product_id END) as item_count')
                ->selectRaw('COALESCE(SUM(quantity_on_hand), 0) as on_hand_units')->groupBy('location_id'),
                'stock', 'stock.location_id', '=', 'location.id')
            ->select('location.*')
            ->selectRaw('COALESCE(stock.item_count, 0) as item_count')
            ->selectRaw('COALESCE(stock.on_hand_units, 0) as on_hand_units')
            ->selectRaw('CASE WHEN location.capacity_units > 0 THEN ROUND(COALESCE(stock.on_hand_units, 0) * 100 / location.capacity_units, 1) ELSE NULL END as occupancy_percentage');
        $query->when(isset($filters['location_type']), fn ($builder) => $builder->where('location.location_type', $filters['location_type']))
            ->when(array_key_exists('is_active', $filters), fn ($builder) => $builder->where('location.is_active', $filters['is_active']));
        $query = ListQuery::search($query, $filters, ['location.name', 'location.code', 'location.address', 'location.manager_name']);
        ListQuery::sort($query, $filters, $sortable, 'name');

        $page = $query->paginate($filters['per_page'] ?? 50);

        return response()->json(ListQuery::page($page));
    }

    public function createWarehouse(Request $request): JsonResponse
    {
        $values = $request->validate([
            'parent_location_id' => ['nullable', 'integer', 'exists:locations,id'],
            'code' => ['required', 'string', 'max:80', 'unique:locations,code'],
            'name' => ['required', 'string', 'max:160'],
            'location_type' => ['required', Rule::in(['main', 'sub', 'vehicle', 'damaged', 'other'])],
            'is_active' => ['sometimes', 'boolean'],
            'notes' => ['nullable', 'string', 'max:500'],
            'address' => ['nullable', 'string', 'max:500'],
            'manager_name' => ['nullable', 'string', 'max:160'],
            'capacity_units' => ['nullable', 'integer', 'min:1', 'max:2147483647'],
        ]);
        $now = now();
        $values['is_active'] = $values['is_active'] ?? true;
        $values['created_at'] = $now;
        $values['updated_at'] = $now;

        $warehouseId = DB::transaction(function () use ($request, $values): int {
            $warehouseId = (int) DB::table('locations')->insertGetId($values);
            $this->auditLog->record($request, 'catalog.warehouse_created', 'location', $warehouseId, null, null, $values);

            return $warehouseId;
        });

        return response()->json(['data' => DB::table('locations')->where('id', $warehouseId)->first()], 201);
    }

    public function updateWarehouse(Request $request, int $warehouseId): JsonResponse
    {
        $values = $request->validate([
            'parent_location_id' => ['sometimes', 'nullable', 'integer', 'exists:locations,id'],
            'code' => ['sometimes', 'required', 'string', 'max:80', Rule::unique('locations', 'code')->ignore($warehouseId)],
            'name' => ['sometimes', 'required', 'string', 'max:160'],
            'location_type' => ['sometimes', 'required', Rule::in(['main', 'sub', 'vehicle', 'damaged', 'other'])],
            'is_active' => ['sometimes', 'boolean'],
            'notes' => ['sometimes', 'nullable', 'string', 'max:500'],
            'address' => ['sometimes', 'nullable', 'string', 'max:500'],
            'manager_name' => ['sometimes', 'nullable', 'string', 'max:160'],
            'capacity_units' => ['sometimes', 'nullable', 'integer', 'min:1', 'max:2147483647'],
        ]);
        $this->assertChangesProvided($values);
        $values['updated_at'] = now();

        $warehouse = DB::transaction(function () use ($request, $values, $warehouseId): object {
            $before = DB::table('locations')->where('id', $warehouseId)->lockForUpdate()->first();

            if ($before === null) {
                abort(404);
            }

            if (array_key_exists('parent_location_id', $values)) {
                $this->assertWarehouseParentIsAllowed(
                    $warehouseId,
                    $values['parent_location_id'] === null ? null : (int) $values['parent_location_id'],
                );
            }

            if (($values['is_active'] ?? null) === false) {
                $this->assertWarehouseHasNoStock($warehouseId);
            }

            DB::table('locations')->where('id', $warehouseId)->update($values);
            $after = DB::table('locations')->where('id', $warehouseId)->first();
            $this->auditLog->record($request, 'catalog.warehouse_updated', 'location', $warehouseId, null, (array) $before, (array) $after);

            return $after;
        });

        return response()->json(['data' => $warehouse]);
    }

    public function deleteWarehouse(Request $request, int $warehouseId): JsonResponse
    {
        DB::transaction(function () use ($request, $warehouseId): void {
            $before = DB::table('locations')->where('id', $warehouseId)->lockForUpdate()->first();

            if ($before === null) {
                abort(404);
            }

            $this->assertWarehouseHasNoStock($warehouseId);

            DB::table('locations')->where('id', $warehouseId)->update([
                'is_active' => false,
                'updated_at' => now(),
            ]);
            $after = DB::table('locations')->where('id', $warehouseId)->first();
            $this->trash->record($request, 'warehouse', $warehouseId, (string) $before->name, (array) $before);
            $this->auditLog->record($request, 'catalog.warehouse_deactivated', 'location', $warehouseId, null, (array) $before, (array) $after);
        });

        return response()->json(['data' => ['status' => 'deactivated']]);
    }

    private function normalizeProductMoney(array $values): array
    {
        if (array_key_exists('company_price', $values) && $values['company_price'] !== null) {
            try {
                $values['company_price'] = ExactMoney::fromCents(ExactMoney::toCents($values['company_price']));
            } catch (\InvalidArgumentException $exception) {
                throw ValidationException::withMessages(['company_price' => [$exception->getMessage()]]);
            }
        }

        return $values;
    }

    private function productResource(object $product, bool $canViewCosts, bool $canViewCompanyPrice): array
    {
        $resource = (array) $product;
        if (! empty($product->created_from_container_id)) {
            $resource['created_from_container_number'] = DB::table('containers')
                ->where('id', $product->created_from_container_id)
                ->value('container_number');
        } else {
            $resource['created_from_container_number'] = null;
        }

        if ($canViewCompanyPrice && $product->company_price !== null) {
            $resource['company_price'] = ExactMoney::fromCents(ExactMoney::toCents((string) $product->company_price));
        } elseif (! $canViewCompanyPrice) {
            unset($resource['company_price']);
        }
        if ($canViewCosts && $product->purchase_cost_egp !== null) {
            $resource['purchase_cost_egp'] = ExactMoney::fromCents(ExactMoney::toCents((string) $product->purchase_cost_egp));
        }
        if ($canViewCosts && array_key_exists('last_purchase_price_reference', $resource) && $product->last_purchase_price_reference !== null) {
            $resource['last_purchase_price_reference'] = ExactMoney::fromCents(ExactMoney::toCents((string) $product->last_purchase_price_reference));
        } elseif (! $canViewCosts) {
            unset($resource['purchase_cost_egp'], $resource['last_purchase_price_reference']);
        }

        return $resource;
    }

    /**
     * @param  array<string, mixed>  $values
     */
    private function assertReferencePricePermission(Request $request, array $values): void
    {
        if (array_key_exists('last_purchase_price_reference', $values) && ! $this->canViewCosts($request)) {
            abort(403, 'The costs.view permission is required to set a reference purchase price.');
        }
    }

    private function canViewCosts(Request $request): bool
    {
        $actor = $request->attributes->get('authenticated_user');
        if (! is_object($actor) || $this->isDriver($actor->id)) {
            return false;
        }

        return DB::table('role_permissions as rp')
            ->join('permissions as p', 'p.id', '=', 'rp.permission_id')
            ->join('user_roles as ur', 'ur.role_id', '=', 'rp.role_id')
            ->join('roles as r', 'r.id', '=', 'ur.role_id')
            ->where('ur.user_id', $actor->id)
            ->where('r.is_active', true)
            ->where('p.code', 'costs.view')
            ->exists();
    }

    private function canViewCompanyPrice(Request $request): bool
    {
        $actor = $request->attributes->get('authenticated_user');
        if (! is_object($actor)) {
            return false;
        }
        if ($this->canViewCosts($request)) {
            return true;
        }

        return DB::table('role_permissions as rp')
            ->join('permissions as p', 'p.id', '=', 'rp.permission_id')
            ->join('user_roles as ur', 'ur.role_id', '=', 'rp.role_id')
            ->join('roles as r', 'r.id', '=', 'ur.role_id')
            ->where('ur.user_id', $actor->id)
            ->where('r.is_active', true)
            ->whereIn('p.code', ['invoices.create', 'purchases.manage'])
            ->exists();
    }

    private function isDriver(int $userId): bool
    {
        return DB::table('user_roles as user_role')
            ->join('roles as role', 'role.id', '=', 'user_role.role_id')
            ->where('user_role.user_id', $userId)
            ->where('role.code', 'driver')
            ->where('role.is_active', true)
            ->exists();
    }

    private function actorId(Request $request): int
    {
        $actor = $request->attributes->get('authenticated_user');

        if (! is_object($actor) || ! isset($actor->id)) {
            throw new \RuntimeException('An authenticated actor is required for catalog changes.');
        }

        return (int) $actor->id;
    }

    private function assertProductHasNoStock(int $productId): void
    {
        $hasStock = DB::table('inventory_balances')
            ->where('product_id', $productId)
            ->where(function ($query): void {
                $query->where('quantity_on_hand', '<>', 0)
                    ->orWhere('quantity_reserved', '<>', 0);
            })
            ->exists();

        if ($hasStock) {
            throw ValidationException::withMessages(['product_id' => ['A product with on-hand or reserved stock cannot be deactivated.']]);
        }
    }

    private function assertWarehouseHasNoStock(int $warehouseId): void
    {
        $hasStock = DB::table('inventory_balances')
            ->where('location_id', $warehouseId)
            ->where(function ($query): void {
                $query->where('quantity_on_hand', '<>', 0)
                    ->orWhere('quantity_reserved', '<>', 0);
            })
            ->exists();

        if ($hasStock) {
            throw ValidationException::withMessages(['warehouse_id' => ['A warehouse with on-hand or reserved stock cannot be deactivated.']]);
        }
    }

    private function assertCategoryParentIsAllowed(int $categoryId, ?int $parentId): void
    {
        $visited = [];
        while ($parentId !== null) {
            if ($parentId === $categoryId || isset($visited[$parentId])) {
                throw ValidationException::withMessages(['parent_category_id' => ['Category hierarchy cannot contain a cycle.']]);
            }
            $visited[$parentId] = true;
            $nextParentId = DB::table('product_categories')->where('id', $parentId)->value('parent_category_id');
            $parentId = $nextParentId === null ? null : (int) $nextParentId;
        }
    }

    private function assertWarehouseParentIsAllowed(int $warehouseId, ?int $parentId): void
    {
        $visited = [];
        while ($parentId !== null) {
            if ($parentId === $warehouseId || isset($visited[$parentId])) {
                throw ValidationException::withMessages(['parent_location_id' => ['Warehouse hierarchy cannot contain a cycle.']]);
            }
            $visited[$parentId] = true;
            $nextParentId = DB::table('locations')->where('id', $parentId)->value('parent_location_id');
            $parentId = $nextParentId === null ? null : (int) $nextParentId;
        }
    }

    private function assertChangesProvided(array $values): void
    {
        if ($values === []) {
            throw ValidationException::withMessages(['request' => ['At least one field must be provided.']]);
        }
    }
}
