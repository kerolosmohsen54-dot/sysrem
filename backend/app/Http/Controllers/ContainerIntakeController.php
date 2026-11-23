<?php

namespace App\Http\Controllers;

use App\Services\AuditLogService;
use App\Services\MasterDataService;
use App\Support\ExactMoney;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

final class ContainerIntakeController extends Controller
{
    public function __construct(
        private readonly AuditLogService $auditLog,
        private readonly MasterDataService $masterData,
        private readonly ContainerController $containers,
    ) {}

    public function store(Request $request): JsonResponse
    {
        $messages = [
            'required' => 'حقل :attribute مطلوب.',
            'required_with' => 'حقل :attribute مطلوب عند إدخال البيانات المرتبطة به.',
            'string' => 'يجب أن يكون :attribute نصًا.',
            'max' => 'الحد الأقصى لحقل :attribute هو :max.',
            'integer' => 'يجب أن يكون :attribute رقمًا صحيحًا.',
            'min' => 'قيمة :attribute يجب أن تكون أكبر من صفر.',
            'between' => 'قيمة :attribute خارج النطاق المسموح.',
            'exists' => ':attribute المحدد غير موجود.',
            'unique' => ':attribute مستخدم من قبل.',
            'in' => 'قيمة :attribute غير صالحة.',
            'regex' => 'صيغة :attribute غير صحيحة.',
            'date' => 'تاريخ :attribute غير صحيح.',
            'date_format' => 'صيغة :attribute غير صحيحة.',
            'array' => 'بيانات :attribute غير صحيحة.',
            'min.array' => 'أضف صنفًا واحدًا على الأقل.',
        ];
        $attributes = [
            'container_name' => 'اسم الحاوية',
            'container_number' => 'رقم الحاوية',
            'supplier_id' => 'المصنع أو المورد',
            'shipping_driver_id' => 'مندوب الشحن',
            'trip_reference' => 'مرجع الرحلة',
            'origin' => 'جهة القدوم',
            'estimated_departure' => 'تاريخ المغادرة المتوقع',
            'estimated_arrival' => 'تاريخ الوصول المتوقع',
            'warehouse_id' => 'مخزن الاستلام',
            'allocation_basis' => 'أساس توزيع المصروفات',
            'movement_date' => 'تاريخ الاستلام',
            'lines' => 'الأصناف',
            'lines.*.product_id' => 'المنتج',
            'lines.*.quantity' => 'الكمية',
            'lines.*.purchase_unit_cost_egp' => 'سعر شراء الوحدة',
            'lines.*.purchase_value_egp' => 'إجمالي شراء السطر',
            'lines.*.company_price_egp' => 'سعر الشركة',
            'lines.*.new_product.name' => 'اسم المنتج الجديد',
            'lines.*.new_product.sku' => 'كود المنتج',
            'lines.*.new_product.unit_code' => 'وحدة المنتج',
            'lines.*.new_product.category_id' => 'فئة المنتج',
            'lines.*.new_product.minimum_stock' => 'الحد الأدنى للمخزون',
            'lines.*.new_product.description' => 'وصف المنتج',
            'costs.*.cost_type' => 'نوع المصروف',
            'costs.*.amount_egp' => 'قيمة المصروف',
        ];

        $values = Validator::make($request->all(), [
            'container_name' => ['required', 'string', 'max:160'],
            'container_number' => ['required', 'string', 'max:100'],
            'supplier_id' => ['sometimes', 'nullable', 'integer', 'min:1', 'exists:suppliers,id'],
            'shipping_driver_id' => ['sometimes', 'nullable', 'integer', 'min:1', 'exists:shipping_drivers,id'],
            'trip_reference' => ['sometimes', 'nullable', 'string', 'max:100'],
            'origin' => ['required', 'string', 'max:160'],
            'destination' => ['nullable', 'string', 'max:160'],
            'notes' => ['nullable', 'string', 'max:2000'],
            'estimated_departure' => ['nullable', 'date_format:Y-m-d'],
            'estimated_arrival' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:estimated_departure'],
            'warehouse_id' => ['required', 'integer', 'min:1', 'exists:locations,id'],
            'allocation_basis' => ['required', Rule::in(['value', 'quantity'])],
            'movement_date' => ['required', 'date_format:Y-m-d'],
            'lines' => ['required', 'array', 'min:1'],
            'lines.*.product_id' => ['nullable', 'integer', 'min:1', 'exists:products,id'],
            'lines.*.new_product' => ['nullable', 'array'],
            'lines.*.new_product.name' => ['nullable', 'string', 'max:200'],
            'lines.*.new_product.sku' => ['nullable', 'string', 'max:100'],
            'lines.*.new_product.category_id' => ['nullable', 'integer', 'exists:product_categories,id'],
            'lines.*.new_product.unit_code' => ['nullable', 'string', 'max:32'],
            'lines.*.new_product.minimum_stock' => ['nullable', 'integer', 'min:0', 'max:2147483647'],
            'lines.*.new_product.description' => ['nullable', 'string', 'max:2000'],
            'lines.*.quantity' => ['required', 'integer', 'between:1,2147483647'],
            'lines.*.purchase_unit_cost_egp' => ['nullable', 'string', 'regex:/\A(?:0|[1-9][0-9]{0,14})(?:\.[0-9]{1,4})?\z/'],
            'lines.*.purchase_value_egp' => ['nullable', 'string', 'regex:/\A(?:0|[1-9][0-9]{0,14})(?:\.[0-9]{1,4})?\z/'],
            'lines.*.company_price_egp' => ['nullable', 'string', 'regex:/\A(?:0|[1-9][0-9]{0,14})(?:\.[0-9]{1,4})?\z/', 'gt:0'],
            'costs' => ['sometimes', 'array', 'max:40'],
            'costs.*.cost_type' => ['required_with:costs.*.amount_egp', 'nullable', 'string', 'max:80'],
            'costs.*.amount_egp' => ['nullable', 'string', 'regex:/\A(?:0|[1-9][0-9]{0,14})(?:\.[0-9]{1,4})?\z/'],
            'costs.*.description' => ['nullable', 'string', 'max:500'],
        ], $messages, $attributes)->validate();

        $preparedLines = [];
        $usedProductIds = [];
        $newProductNames = [];
        foreach ($values['lines'] as $index => $line) {
            $hasProduct = isset($line['product_id']);
            $newProduct = $line['new_product'] ?? null;
            if ($hasProduct === is_array($newProduct)) {
                throw ValidationException::withMessages(["lines.{$index}.product_id" => ['اختر منتجًا موجودًا أو أدخل بيانات منتج جديد.']]);
            }
            if (is_array($newProduct)) {
                $name = trim((string) ($newProduct['name'] ?? ''));
                if ($name === '') {
                    throw ValidationException::withMessages(["lines.{$index}.new_product.name" => ['اسم المنتج الجديد مطلوب.']]);
                }
                if (! isset($newProduct['unit_code']) || trim((string) $newProduct['unit_code']) === '') {
                    throw ValidationException::withMessages(["lines.{$index}.new_product.unit_code" => ['وحدة المنتج مطلوبة.']]);
                }
                $normalizedName = mb_strtolower($name);
                if (isset($newProductNames[$normalizedName])) {
                    throw ValidationException::withMessages(["lines.{$index}.new_product.name" => ['لا يمكن تكرار اسم المنتج في أكثر من سطر.']]);
                }
                $newProductNames[$normalizedName] = true;
            } else {
                $productId = (int) $line['product_id'];
                if (isset($usedProductIds[$productId])) {
                    throw ValidationException::withMessages(["lines.{$index}.product_id" => ['لا يمكن إضافة المنتج نفسه في أكثر من سطر.']]);
                }
                $usedProductIds[$productId] = true;
            }

            $hasUnitCost = isset($line['purchase_unit_cost_egp']) && $line['purchase_unit_cost_egp'] !== '';
            $hasLineValue = isset($line['purchase_value_egp']) && $line['purchase_value_egp'] !== '';
            if ($hasUnitCost === $hasLineValue) {
                throw ValidationException::withMessages(["lines.{$index}.purchase_value_egp" => ['أدخل سعر شراء الوحدة أو إجمالي السطر فقط.']]);
            }
            $quantity = (int) $line['quantity'];
            $amount = $hasUnitCost ? $line['purchase_unit_cost_egp'] : $line['purchase_value_egp'];
            $amountCents = $this->toCents((string) $amount, "lines.{$index}.purchase_value_egp");
            if (ExactMoney::compare($amountCents, '0') <= 0) {
                throw ValidationException::withMessages(["lines.{$index}.purchase_value_egp" => ['قيمة الشراء يجب أن تكون أكبر من صفر.']]);
            }
            $purchaseValueCents = $hasUnitCost ? ExactMoney::multiply($amountCents, $quantity) : $amountCents;
            $preparedLines[] = [
                'product_id' => $hasProduct ? (int) $line['product_id'] : null,
                'new_product' => $newProduct,
                'quantity' => $quantity,
                'purchase_value_egp' => ExactMoney::fromCents($purchaseValueCents),
                'purchase_unit_cost_egp' => ExactMoney::fromCents(ExactMoney::divideRounded($purchaseValueCents, $quantity)),
            ];
        }

        $actor = $request->attributes->get('authenticated_user');
        if (! is_object($actor) || ! isset($actor->id)) {
            abort(401);
        }
        $key = $request->header('Idempotency-Key');
        if (! is_string($key) || trim($key) === '' || mb_strlen($key) > 200) {
            throw ValidationException::withMessages(['Idempotency-Key' => ['مفتاح منع التكرار مطلوب.']]);
        }
        $requestHash = hash('sha256', json_encode(
            ['method' => $request->method(), 'path' => $request->path(), 'input' => $request->all()],
            JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE | JSON_PRESERVE_ZERO_FRACTION,
        ), true);

        return DB::transaction(function () use ($request, $values, $preparedLines, $usedProductIds, $actor, $key, $requestHash): JsonResponse {
            DB::table('users')->where('id', $actor->id)->lockForUpdate()->first(['id']);
            $record = DB::table('idempotency_records')
                ->where('user_id', $actor->id)
                ->where('idempotency_key', $key)
                ->lockForUpdate()
                ->first();
            if ($record !== null) {
                if (! hash_equals((string) $record->request_hash, $requestHash)) {
                    abort(409, 'مفتاح منع التكرار مستخدم مع بيانات مختلفة.');
                }
                if ($record->state !== 'completed' || $record->response_body === null) {
                    abort(409, 'الطلب السابق بهذا المفتاح لم يكتمل.');
                }

                return response()->json(json_decode((string) $record->response_body, true, 512, JSON_THROW_ON_ERROR), (int) $record->http_status);
            }
            if (DB::table('containers')->where('container_number', trim($values['container_number']))->exists()) {
                throw ValidationException::withMessages(['container_number' => ['رقم الحاوية مستخدم من قبل.']]);
            }
            foreach ($preparedLines as $index => $line) {
                if (! is_array($line['new_product'])) {
                    continue;
                }
                $name = trim((string) $line['new_product']['name']);
                if (DB::table('products')->whereRaw('LOWER(name) = ?', [mb_strtolower($name)])->exists()) {
                    throw ValidationException::withMessages(["lines.{$index}.new_product.name" => ['يوجد منتج بهذا الاسم؛ اختر المنتج الموجود من القائمة.']]);
                }
            }
            $recordId = (int) DB::table('idempotency_records')->insertGetId([
                'user_id' => $actor->id,
                'idempotency_key' => $key,
                'request_hash' => $requestHash,
                'resource_type' => 'container_intake',
                'state' => 'processing',
                'created_at' => now(),
            ]);

            if (! DB::table('locations')->where('id', $values['warehouse_id'])->where('is_active', true)->exists()) {
                throw ValidationException::withMessages(['warehouse_id' => ['مخزن الاستلام غير موجود أو غير نشط.']]);
            }

            $now = now();
            $containerId = (int) DB::table('containers')->insertGetId([
                'container_number' => trim($values['container_number']),
                'container_name' => trim($values['container_name']),
                'status' => 'draft',
                'supplier_id' => $values['supplier_id'] ?? null,
                'shipping_driver_id' => $values['shipping_driver_id'] ?? null,
                'trip_reference' => $values['trip_reference'] ?? null,
                'origin' => $values['origin'] ?? null,
                'destination' => $values['destination'] ?? null,
                'estimated_departure' => $values['estimated_departure'] ?? null,
                'estimated_arrival' => $values['estimated_arrival'] ?? null,
                'landed_cost_allocation_basis' => $values['allocation_basis'],
                'estimated_departure' => null,
                'estimated_arrival' => null,
                'notes' => $values['notes'] ?? null,
                'created_by_user_id' => $actor->id,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
            DB::table('container_status_history')->insert([
                'container_id' => $containerId,
                'old_status' => null,
                'new_status' => 'draft',
                'changed_by_user_id' => $actor->id,
                'reason' => 'إنشاء الحاوية من نموذج الاستلام المتكامل.',
                'changed_at' => now(),
                'created_at' => now(),
            ]);
            $this->auditLog->record($request, 'container.created', 'container', $containerId, null, null, [
                'container_name' => $values['container_name'],
                'container_number' => $values['container_number'],
                'origin' => $values['origin'] ?? null,
            ]);

            $lineInputs = [];
            $createdProducts = [];
            $totalQuantity = 0;
            $goodsValueCents = '0';
            foreach ($preparedLines as $index => $line) {
                $productId = $line['product_id'];
                if (is_array($line['new_product'])) {
                    $newProduct = $line['new_product'];
                    $sku = trim((string) ($newProduct['sku'] ?? ''));
                    if ($sku !== '' && DB::table('products')->where('sku', $sku)->exists()) {
                        throw ValidationException::withMessages(["lines.{$index}.new_product.sku" => ['كود المنتج مستخدم من قبل.']]);
                    }
                    if ($sku === '') {
                        do {
                            $sku = 'CNT-'.strtoupper(Str::random(14));
                        } while (DB::table('products')->where('sku', $sku)->exists());
                    }
                    $productId = $this->masterData->createProduct($request, [
                        'sku' => $sku,
                        'barcode' => null,
                        'name' => trim((string) $newProduct['name']),
                        'category_id' => $newProduct['category_id'] ?? null,
                        'unit_code' => trim((string) $newProduct['unit_code']),
                        'company_price' => null,
                        'default_location_id' => null,
                        'created_from_container_id' => $containerId,
                        'minimum_stock' => $newProduct['minimum_stock'] ?? null,
                        'description' => $newProduct['description'] ?? null,
                        'default_tax_rate' => null,
                        'is_active' => true,
                    ]);
                    $product = DB::table('products')->where('id', $productId)->first(['id', 'name', 'sku']);
                    $createdProducts[] = ['id' => (int) $product->id, 'name' => $product->name, 'sku' => $product->sku];
                } else {
                    $product = DB::table('products')->where('id', $productId)->where('is_active', true)->first(['id', 'name']);
                    if ($product === null) {
                        throw ValidationException::withMessages(["lines.{$index}.product_id" => ['المنتج غير موجود أو غير نشط.']]);
                    }
                }
                if (isset($line['company_price_egp']) && $line['company_price_egp'] !== '') {
                    DB::table('products')->where('id', $productId)->update([
                        'company_price' => ExactMoney::fromCents($this->toCents((string) $line['company_price_egp'], "lines.{$index}.company_price_egp")),
                        'updated_by_user_id' => $actor->id,
                        'updated_at' => now(),
                    ]);
                }
                if (isset($usedProductIds[$productId]) && $line['product_id'] === null) {
                    throw ValidationException::withMessages(["lines.{$index}.new_product.name" => ['لا يمكن تكرار الصنف نفسه في أكثر من سطر.']]);
                }
                $usedProductIds[$productId] = true;

                $lineNumber = $index + 1;
                $containerLineId = (int) DB::table('container_lines')->insertGetId([
                    'container_id' => $containerId,
                    'line_number' => $lineNumber,
                    'product_id' => $productId,
                    'expected_quantity' => $line['quantity'],
                    'received_quantity' => 0,
                    'purchase_value_egp' => $line['purchase_value_egp'],
                    'purchase_unit_cost_egp' => $line['purchase_unit_cost_egp'],
                    'notes' => null,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
                $lineInputs[] = [
                    'container_line_id' => $containerLineId,
                    'expected_quantity' => $line['quantity'],
                    'received_quantity' => $line['quantity'],
                ];
                $totalQuantity += $line['quantity'];
                $goodsValueCents = ExactMoney::add($goodsValueCents, ExactMoney::toCents($line['purchase_value_egp']));
            }

            $additionalCostsCents = '0';
            foreach ($values['costs'] ?? [] as $cost) {
                $rawAmount = trim((string) ($cost['amount_egp'] ?? ''));
                if ($rawAmount === '') {
                    continue;
                }
                $amountCents = $this->toCents($rawAmount, 'costs');
                if (ExactMoney::compare($amountCents, '0') <= 0) {
                    continue;
                }
                $costId = (int) DB::table('container_costs')->insertGetId([
                    'container_id' => $containerId,
                    'supplier_id' => null,
                    'cost_type' => trim((string) $cost['cost_type']),
                    'description' => trim((string) ($cost['description'] ?? '')) ?: null,
                    'amount_egp' => ExactMoney::fromCents($amountCents),
                    'include_in_inventory_cost' => true,
                    'original_amount_reference' => null,
                    'exchange_rate_reference' => null,
                    'original_currency_code_reference' => null,
                    'cost_date' => $values['movement_date'],
                    'status' => 'incurred',
                    'created_by_user_id' => $actor->id,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
                $additionalCostsCents = ExactMoney::add($additionalCostsCents, $amountCents);
                $this->auditLog->record($request, 'container.cost.created', 'container_cost', $costId, null, null, [
                    'container_id' => $containerId,
                    'cost_type' => $cost['cost_type'],
                    'amount_egp' => ExactMoney::fromCents($amountCents),
                    'include_in_inventory_cost' => true,
                ]);
            }

            $receiptRequest = clone $request;
            $receiptRequest->replace([
                'warehouse_id' => (int) $values['warehouse_id'],
                'received_at' => now()->toDateTimeString(),
                'movement_date' => $values['movement_date'],
                'reason' => 'استلام الحاوية رقم '.$values['container_number'],
                'lines' => $lineInputs,
            ]);
            $receiptRequest->headers->set('Idempotency-Key', hash('sha256', 'container-intake-receipt:'.$key));
            $receiptResponse = $this->containers->receive($receiptRequest, $containerId);
            if ($receiptResponse->getStatusCode() !== 201) {
                throw new \RuntimeException('تعذر إتمام استلام الحاوية.');
            }

            $totalCostCents = ExactMoney::add($goodsValueCents, $additionalCostsCents);
            $warehouse = DB::table('locations')->where('id', $values['warehouse_id'])->first(['id', 'name', 'location_type']);
            $body = ['data' => [
                'container' => DB::table('containers')->where('id', $containerId)->first(),
                'receipt_ids' => $receiptResponse->getData(true)['data']['receipt_ids'] ?? [],
                'created_products' => $createdProducts,
                'warehouse' => $warehouse,
                'total_quantity' => $totalQuantity,
                'goods_value_egp' => ExactMoney::fromCents($goodsValueCents),
                'additional_costs_egp' => ExactMoney::fromCents($additionalCostsCents),
                'total_landed_cost_egp' => ExactMoney::fromCents($totalCostCents),
                'average_unit_cost_egp' => ExactMoney::fromCents(ExactMoney::divideRounded($totalCostCents, $totalQuantity)),
            ]];
            DB::table('idempotency_records')->where('id', $recordId)->update([
                'http_status' => 201,
                'response_body' => json_encode($body, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE),
                'resource_type' => 'container_intake',
                'resource_id' => $containerId,
                'state' => 'completed',
                'completed_at' => now(),
            ]);

            return response()->json($body, 201);
        }, 5);
    }

    public function quickWarehouse(Request $request): JsonResponse
    {
        $values = Validator::make($request->all(), [
            'name' => ['required', 'string', 'max:160'],
            'location_type' => ['required', Rule::in(['main', 'sub', 'vehicle'])],
            'address' => ['nullable', 'string', 'max:500'],
        ], [
            'required' => 'حقل :attribute مطلوب.',
            'string' => 'يجب أن يكون :attribute نصًا.',
            'max' => 'الحد الأقصى لحقل :attribute هو :max.',
            'in' => 'نوع المخزن غير صحيح.',
        ], [
            'name' => 'اسم المخزن',
            'location_type' => 'نوع المخزن',
            'address' => 'العنوان',
        ])->validate();
        $actor = $request->attributes->get('authenticated_user');
        if (! is_object($actor) || ! isset($actor->id)) {
            abort(401);
        }

        $warehouse = DB::transaction(function () use ($request, $values, $actor): object {
            $code = 'CNT-WH-'.strtoupper(Str::random(12));
            $id = (int) DB::table('locations')->insertGetId([
                'parent_location_id' => null,
                'code' => $code,
                'name' => trim($values['name']),
                'address' => trim((string) ($values['address'] ?? '')) ?: null,
                'location_type' => $values['location_type'],
                'is_active' => true,
                'notes' => null,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
            $warehouse = DB::table('locations')->where('id', $id)->first();
            $this->auditLog->record($request, 'catalog.warehouse_created', 'location', $id, null, null, (array) $warehouse);

            return $warehouse;
        });

        return response()->json(['data' => $warehouse], 201);
    }

    private function toCents(string $amount, string $field): string
    {
        try {
            return ExactMoney::toCents($amount);
        } catch (\InvalidArgumentException) {
            throw ValidationException::withMessages([$field => ['قيمة مالية غير صحيحة.']]);
        }
    }
}
