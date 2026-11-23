# CSV import commands

All four commands validate the complete file before writing. They run in
dry-run mode by default; invalid rows and duplicate keys prevent the entire
file from being applied. `--apply` writes the whole validated batch in one
database transaction and requires `--actor-id` to identify an active user
with the `owner` role. That owner is recorded as the actor for audit logs.
Do not run an import against any database except `erp_scratch` or `erp_test`.

Headers must match the names and order below. UTF-8 CSV with a comma
delimiter is expected; quoted fields may contain commas. Empty optional
fields are treated as NULL. Dates use `YYYY-MM-DD`; quantities are positive
integers; currency values are EGP decimal strings, never floating-point
calculations.

## Products

Command:

```powershell
php artisan imports:products products.csv
php artisan imports:products products.csv --apply --actor-id=1
```

Columns:

```csv
sku,name,unit_code,barcode,category_code,company_price,default_location_code,minimum_stock,description
SKU-001,Example item,each,,,12.50,,0,Opening catalog row
```

`sku` must be unique. A non-empty `barcode` must also be unique.
`category_code` must match an existing product category. A non-empty
`default_location_code` must match an active warehouse. `company_price` is
optional; ordinary users still do not receive this cost-bearing field in API
responses.

## Customers

Command:

```powershell
php artisan imports:customers customers.csv
php artisan imports:customers customers.csv --apply --actor-id=1
```

Columns:

```csv
name,phone,email,address,governorate,credit_limit,notes
Example Customer,+201000000001,,,,250.00,Imported customer
```

Phone is required by this import format and must be unique. Names need not be
unique. The optional credit limit remains a warning threshold, not a sales
block.

## Dated opening stock

Command:

```powershell
php artisan imports:opening-stock opening-stock.csv
php artisan imports:opening-stock opening-stock.csv --apply --actor-id=1
```

Columns:

```csv
product_sku,warehouse_code,quantity,unit_cost_egp,movement_date,reason
SKU-001,MAIN,10,12.50,2026-01-01,Opening inventory at cutover
```

Each accepted row posts a dated `opening` movement through `InventoryService`;
no fixed balance value is imported. Product SKU and warehouse code must
identify active records.

## Dated customer opening balances

Command:

```powershell
php artisan imports:customer-opening-balances customer-opening-balances.csv
php artisan imports:customer-opening-balances customer-opening-balances.csv --apply --actor-id=1
```

Columns:

```csv
customer_phone,direction,amount_egp,issue_date,notes
+201000000001,debit,250.00,2026-01-01,Receivable at cutover
```

`direction` is `debit` or `credit`; `amount_egp` must be positive. Each row
posts a dated opening-receivable document through `SalesService`. Customer
phone must identify an active customer.

## Safety and results

The preview reports the number of valid rows and does not mutate data. Apply
mode first validates every row, verifies the active owner, then commits all
records together or rolls back the whole batch on an error. Every write uses
the same master-data, inventory, or sales services as the application, so
service audit events and ledger/document behavior are preserved.
