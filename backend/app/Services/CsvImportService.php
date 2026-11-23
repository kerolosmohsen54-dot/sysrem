<?php

namespace App\Services;

use App\Support\ExactMoney;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use InvalidArgumentException;

class CsvImportService
{
    private const HEADERS = [
        'products' => ['sku', 'name', 'unit_code', 'barcode', 'category_code', 'company_price', 'default_location_code', 'minimum_stock', 'description'],
        'customers' => ['name', 'phone', 'email', 'address', 'governorate', 'credit_limit', 'notes'],
        'opening-stock' => ['product_sku', 'warehouse_code', 'quantity', 'unit_cost_egp', 'movement_date', 'reason'],
        'customer-opening-balances' => ['customer_phone', 'direction', 'amount_egp', 'issue_date', 'notes'],
    ];

    public function __construct(
        private readonly MasterDataService $masterData,
        private readonly InventoryService $inventory,
        private readonly SalesService $sales,
    ) {}

    /**
     * @return array{row_count: int, imported: int, errors: array<int, string>}
     */
    public function run(string $type, string $path, bool $apply, ?int $actorId): array
    {
        if (! isset(self::HEADERS[$type])) {
            throw new InvalidArgumentException('Unknown CSV import type.');
        }

        $parsed = $this->readCsv($path, self::HEADERS[$type]);
        if ($parsed['errors'] !== []) {
            return ['row_count' => 0, 'imported' => 0, 'errors' => $parsed['errors']];
        }

        $rows = $parsed['rows'];
        $errors = [];
        $prepared = [];
        $seen = [];

        foreach ($rows as $row) {
            $line = $row['line'];
            $values = $row['values'];
            $validation = $this->validateRow($type, $values);
            if ($validation !== []) {
                foreach ($validation as $field) {
                    $errors[] = "Row {$line}: invalid or missing {$field}.";
                }

                continue;
            }

            try {
                $resolved = $this->resolveRow($type, $values, $line, $seen);
            } catch (InvalidArgumentException) {
                $errors[] = "Row {$line}: a money amount is outside the supported range.";

                continue;
            }
            if (isset($resolved['error'])) {
                $errors[] = $resolved['error'];

                continue;
            }
            $prepared[] = ['line' => $line, 'values' => $resolved['values']];
        }

        if ($rows === []) {
            $errors[] = 'The CSV contains no data rows.';
        }

        if ($errors !== []) {
            return ['row_count' => count($rows), 'imported' => 0, 'errors' => $errors];
        }

        if (! $apply) {
            return ['row_count' => count($prepared), 'imported' => 0, 'errors' => []];
        }

        $actor = $this->ownerActor($actorId);
        DB::transaction(function () use ($prepared, $type, $actor): void {
            foreach ($prepared as $row) {
                $request = Request::create('/console/import/'.$type, 'POST', $row['values']);
                $request->attributes->set('authenticated_user', $actor);

                match ($type) {
                    'products' => $this->masterData->createProduct($request, $row['values']),
                    'customers' => $this->masterData->createCustomer($request, $row['values']),
                    'opening-stock' => $this->importOpeningStock($request, $row['values'], $row['line']),
                    'customer-opening-balances' => $this->importCustomerOpeningBalance($request, $row['values'], $row['line']),
                };
            }
        }, 5);

        return ['row_count' => count($prepared), 'imported' => count($prepared), 'errors' => []];
    }

    /**
     * @param  array<int, string>  $expectedHeaders
     * @return array{rows: array<int, array{line: int, values: array<string, mixed>}>, errors: array<int, string>}
     */
    private function readCsv(string $path, array $expectedHeaders): array
    {
        $handle = fopen($path, 'rb');
        if ($handle === false) {
            return ['rows' => [], 'errors' => ['The CSV file could not be opened.']];
        }

        try {
            $headers = fgetcsv($handle, null, ',', '"', '\\');
            if (! is_array($headers)) {
                return ['rows' => [], 'errors' => ['The CSV file is empty or has no header row.']];
            }
            $headers[0] = preg_replace('/^\xEF\xBB\xBF/', '', (string) $headers[0]) ?? (string) $headers[0];
            $headers = array_map(static fn ($header): string => trim((string) $header), $headers);
            if ($headers !== $expectedHeaders) {
                return ['rows' => [], 'errors' => ['CSV headers do not match the documented column names and order.']];
            }

            $rows = [];
            $line = 1;
            while (($fields = fgetcsv($handle, null, ',', '"', '\\')) !== false) {
                $line++;
                if ($fields === [null] || $fields === []) {
                    continue;
                }
                if (count($fields) !== count($headers)) {
                    return ['rows' => [], 'errors' => ["Row {$line}: column count does not match the header."]];
                }
                $values = array_combine($headers, array_map(
                    static fn ($value): ?string => trim((string) $value) === '' ? null : trim((string) $value),
                    $fields,
                ));
                if ($values === false) {
                    return ['rows' => [], 'errors' => ["Row {$line}: columns could not be read."]];
                }
                $rows[] = ['line' => $line, 'values' => $values];
            }

            return ['rows' => $rows, 'errors' => []];
        } finally {
            fclose($handle);
        }
    }

    /**
     * @param  array<string, mixed>  $values
     * @return array<int, string>
     */
    private function validateRow(string $type, array $values): array
    {
        $rules = match ($type) {
            'products' => [
                'sku' => ['required', 'string', 'max:100'],
                'name' => ['required', 'string', 'max:200'],
                'unit_code' => ['required', 'string', 'max:32'],
                'barcode' => ['nullable', 'string', 'max:100'],
                'category_code' => ['nullable', 'string', 'max:80'],
                'company_price' => ['nullable', 'string', 'regex:/\A(?:0|[1-9][0-9]{0,14})(?:\.[0-9]{1,4})?\z/'],
                'default_location_code' => ['nullable', 'string', 'max:80'],
                'minimum_stock' => ['nullable', 'integer', 'between:0,2147483647'],
                'description' => ['nullable', 'string'],
            ],
            'customers' => [
                'name' => ['required', 'string', 'max:200'],
                'phone' => ['required', 'string', 'max:32'],
                'email' => ['nullable', 'email', 'max:254'],
                'address' => ['nullable', 'string', 'max:500'],
                'governorate' => ['nullable', 'string', 'max:120'],
                'credit_limit' => ['nullable', 'string', 'regex:/\A(?:0|[1-9][0-9]{0,14})(?:\.[0-9]{1,4})?\z/'],
                'notes' => ['nullable', 'string'],
            ],
            'opening-stock' => [
                'product_sku' => ['required', 'string', 'max:100'],
                'warehouse_code' => ['required', 'string', 'max:80'],
                'quantity' => ['required', 'integer', 'between:1,2147483647'],
                'unit_cost_egp' => ['required', 'string', 'regex:/\A(?:0|[1-9][0-9]{0,14})(?:\.[0-9]{1,4})?\z/'],
                'movement_date' => ['required', 'date_format:Y-m-d'],
                'reason' => ['required', 'string', 'max:1000'],
            ],
            'customer-opening-balances' => [
                'customer_phone' => ['required', 'string', 'max:32'],
                'direction' => ['required', 'in:debit,credit'],
                'amount_egp' => ['required', 'string', 'regex:/\A(?:0|[1-9][0-9]{0,14})(?:\.[0-9]{1,2})?\z/'],
                'issue_date' => ['required', 'date_format:Y-m-d'],
                'notes' => ['nullable', 'string', 'max:2000'],
            ],
        };
        $validator = Validator::make($values, $rules);
        $errors = array_keys($validator->errors()->messages());
        if ($type === 'customer-opening-balances' && $errors === []
            && ExactMoney::toCents((string) $values['amount_egp']) === '0') {
            $errors[] = 'amount_egp';
        }

        return $errors;
    }

    /**
     * @param  array<string, mixed>  $values
     * @param  array<string, array<string, true>>  $seen
     * @return array{values?: array<string, mixed>, error?: string}
     */
    private function resolveRow(string $type, array $values, int $line, array &$seen): array
    {
        if ($type === 'products') {
            foreach (['sku', 'barcode'] as $column) {
                if ($values[$column] === null) {
                    continue;
                }
                $key = mb_strtolower((string) $values[$column]);
                if (isset($seen[$column][$key]) || DB::table('products')->where($column, $values[$column])->exists()) {
                    return ['error' => "Row {$line}: duplicate product {$column}."];
                }
                $seen[$column][$key] = true;
            }

            $categoryId = null;
            if ($values['category_code'] !== null) {
                $categoryId = DB::table('product_categories')->where('code', $values['category_code'])->value('id');
                if ($categoryId === null) {
                    return ['error' => "Row {$line}: category_code does not identify a category."];
                }
            }
            $locationId = null;
            if ($values['default_location_code'] !== null) {
                $locationId = DB::table('locations')
                    ->where('code', $values['default_location_code'])
                    ->where('is_active', true)
                    ->value('id');
                if ($locationId === null) {
                    return ['error' => "Row {$line}: default_location_code does not identify an active warehouse."];
                }
            }
            if ($values['company_price'] !== null) {
                $values['company_price'] = ExactMoney::fromCents(ExactMoney::toCents($values['company_price']));
            }

            return ['values' => [
                'sku' => $values['sku'],
                'name' => $values['name'],
                'unit_code' => $values['unit_code'],
                'barcode' => $values['barcode'],
                'category_id' => $categoryId,
                'company_price' => $values['company_price'],
                'default_location_id' => $locationId,
                'minimum_stock' => $values['minimum_stock'],
                'description' => $values['description'],
            ]];
        }

        if ($type === 'customers') {
            $key = mb_strtolower((string) $values['phone']);
            if (isset($seen['phone'][$key]) || DB::table('customers')->where('phone', $values['phone'])->exists()) {
                return ['error' => "Row {$line}: duplicate customer phone."];
            }
            $seen['phone'][$key] = true;
            if ($values['credit_limit'] !== null) {
                $values['credit_limit'] = ExactMoney::fromCents(ExactMoney::toCents($values['credit_limit']));
            }

            return ['values' => array_intersect_key($values, array_flip([
                'name', 'phone', 'email', 'address', 'governorate', 'credit_limit', 'notes',
            ]))];
        }

        if ($type === 'opening-stock') {
            $product = DB::table('products')->where('sku', $values['product_sku'])->where('is_active', true)->first(['id']);
            $warehouse = DB::table('locations')->where('code', $values['warehouse_code'])->where('is_active', true)->first(['id']);
            if ($product === null || $warehouse === null) {
                return ['error' => "Row {$line}: product_sku and warehouse_code must identify active records."];
            }

            return ['values' => [
                'product_id' => (int) $product->id,
                'warehouse_id' => (int) $warehouse->id,
                'quantity' => (int) $values['quantity'],
                'unit_cost_egp' => $values['unit_cost_egp'],
                'movement_date' => $values['movement_date'],
                'reason' => $values['reason'],
            ]];
        }

        $customer = DB::table('customers')
            ->where('phone', $values['customer_phone'])
            ->where('is_active', true)
            ->first(['id']);
        if ($customer === null) {
            return ['error' => "Row {$line}: customer_phone must identify an active customer."];
        }

        return ['values' => [
            'customer_id' => (int) $customer->id,
            'direction' => $values['direction'],
            'amount_egp' => $values['amount_egp'],
            'issue_date' => $values['issue_date'],
            'notes' => $values['notes'],
        ]];
    }

    private function ownerActor(?int $actorId): object
    {
        if ($actorId === null || $actorId < 1) {
            throw new InvalidArgumentException('Applying an import requires --actor-id for an active owner account.');
        }
        $actor = DB::table('users as user')
            ->join('user_roles as user_role', 'user_role.user_id', '=', 'user.id')
            ->join('roles as role', 'role.id', '=', 'user_role.role_id')
            ->where('user.id', $actorId)
            ->where('user.is_active', true)
            ->where('role.code', 'owner')
            ->where('role.is_active', true)
            ->first(['user.id', 'user.display_name']);
        if ($actor === null) {
            throw new InvalidArgumentException('--actor-id must identify an active owner account.');
        }

        return $actor;
    }

    /**
     * @param  array<string, mixed>  $values
     */
    private function importOpeningStock(Request $request, array $values, int $line): void
    {
        $this->inventory->receive(
            $values['product_id'],
            $values['warehouse_id'],
            $values['quantity'],
            $values['unit_cost_egp'],
            [
                'movement_type' => 'opening',
                'movement_date' => $values['movement_date'],
                'reason' => $values['reason'],
            ],
            $request,
        );
    }

    /**
     * @param  array<string, mixed>  $values
     */
    private function importCustomerOpeningBalance(Request $request, array $values, int $line): void
    {
        $request->headers->set('Idempotency-Key', 'csv-opening-balance-'.bin2hex(random_bytes(16)).'-'.$line);
        $this->sales->createOpeningBalance($request, $values['customer_id'], [
            'direction' => $values['direction'],
            'amount_egp' => $values['amount_egp'],
            'issue_date' => $values['issue_date'],
            'notes' => $values['notes'],
        ]);
    }
}
