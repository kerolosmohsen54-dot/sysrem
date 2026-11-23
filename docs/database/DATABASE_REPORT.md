# Database report

## Source and verification

Laravel migrations remain in `backend/database/migrations/`; the 32-file inventory was obtained with `Get-ChildItem backend/database/migrations -File`. The non-Laravel SQL and schema proposals are under `database/schema/`. The v4.1 baseline was copied, not moved: `backend/database/schema/precision_slate_v4_1.sql` remains the source and `database/schema/precision_slate_v4_1.sql` is the documentation copy. Copy identity is NOT VERIFIED by hash yet.

No migration or database command was run during cleanup. All current database state and per-engine migration statuses are therefore **NOT VERIFIED**. Historical reports include `docs/backend/BACKEND_COMPLETE.md`, `docs/integration/BACKEND_COMPLETION_PROGRESS.md`, and `docs/integration/FINAL_SYSTEM_REPORT.md`; use their dated evidence rather than treating this cleanup as a database validation.

## Tables by domain

The v4.1 snapshot statically defines the following baseline tables (verified with `rg -n -i 'CREATE TABLE' backend/database/schema/precision_slate_v4_1.sql`). Later migrations add tables and columns.

- Identity and authorization: `users`, `roles`, `permissions`, `user_roles`, `role_permissions`, `auth_sessions`, `password_reset_tokens`.
- Customers and catalog: `customers`, `suppliers`, `product_categories`, `products`, `locations`, `document_sequences`, `app_settings`.
- Sales and receivables: `sales_documents`, `sales_document_lines`, `sales_document_postings`, `sales_receipts`, `sales_receipt_allocations`, `sales_receipt_postings`, `sales_receipt_allocation_reversals`, `sales_orders`, `sales_order_lines`, `sales_order_invoice_allocations`, `deliveries`, `delivery_lines`.
- Accounting and treasury: `treasury_accounts`, `treasury_entries`, `treasury_transfers`, `treasury_transfer_entries`, `expenses`, `chart_of_accounts`, `journal_entries`, `journal_lines`.
- Inventory and containers: `inventory_movements`, `inventory_movement_lines`, `inventory_balances`, `containers`, `container_lines`, `container_costs`, `container_cost_allocations`, `container_receipts`, `container_receipt_lines`, `container_cost_payments`.
- Cross-cutting controls: `idempotency_records`, `audit_logs`, `attachment_metadata`.
- Later domain tables are introduced in migrations for mobile devices/channels/sources/messages/sync/idempotency, purchase invoices, warehouse returns, damaged stock, partners/payments, governorates/drivers/trash, container transfers/funds, minimum stock, inventory counts, mobile capture, and currency references. VERIFIED as migration source names; current live schemas NOT VERIFIED.

## Migrations and engines

All 32 migration filenames are present in `backend/database/migrations/`. Both `mysql_test` and `mariadb_test` on `erp_test`: **NOT VERIFIED during cleanup for every migration**. The most recent current source includes `2026_10_14_000003_create_currency_reference_catalog.php` and `2026_10_15_000001_allow_read_only_mobile_viewing.php`; no evidence was gathered here that these two have been applied on either engine. No migrations were duplicated into `database/`.

Historical checks: `docs/backend/BACKEND_COMPLETE.md` records an earlier fresh install and full test pass; later dated integration reports record 187 tests / 2,631 assertions per engine. Those reports do not establish status of every current migration. Minimum supported MySQL 8.0 / MariaDB 10.6 compatibility is NOT VERIFIED in the existing changelog.

## Migration inventory by engine

Each source file is present (static inventory VERIFIED). Applied state on MySQL mysql_test / erp_test and MariaDB mariadb_test / erp_test was not queried during this cleanup, so each status is NOT VERIFIED.

| Migration | MySQL | MariaDB |
|---|---|---|
| `2026_10_10_000000_create_approved_v4_1_schema.php` | NOT VERIFIED | NOT VERIFIED |
| `2026_10_10_000001_add_v4_2_email_verification_to_users.php` | NOT VERIFIED | NOT VERIFIED |
| `2026_10_10_000002_add_step_up_authentication_to_sessions.php` | NOT VERIFIED | NOT VERIFIED |
| `2026_10_11_000003_add_container_cost_controls_and_status_history.php` | NOT VERIFIED | NOT VERIFIED |
| `2026_10_11_000004_add_container_line_purchase_value.php` | NOT VERIFIED | NOT VERIFIED |
| `2026_10_11_000005_add_sales_workflow_cost_and_tax_snapshots.php` | NOT VERIFIED | NOT VERIFIED |
| `2026_10_11_000006_add_sales_receipt_unapplied_amount.php` | NOT VERIFIED | NOT VERIFIED |
| `2026_10_11_000007_enforce_delivery_source.php` | NOT VERIFIED | NOT VERIFIED |
| `2026_10_11_000008_add_financial_outbox_and_expense_categories.php` | NOT VERIFIED | NOT VERIFIED |
| `2026_10_12_000009_add_optional_master_data_reference_fields.php` | NOT VERIFIED | NOT VERIFIED |
| `2026_10_12_000010_create_mobile_companion_schema.php` | NOT VERIFIED | NOT VERIFIED |
| `2026_10_12_000011_add_mobile_password_confirmation.php` | NOT VERIFIED | NOT VERIFIED |
| `2026_10_12_000012_add_mobile_collection_provenance.php` | NOT VERIFIED | NOT VERIFIED |
| `2026_10_12_000012_share_mobile_source_definitions.php` | NOT VERIFIED | NOT VERIFIED |
| `2026_10_12_000013_allow_ambiguous_mobile_message_type.php` | NOT VERIFIED | NOT VERIFIED |
| `2026_10_13_000014_create_purchase_invoices.php` | NOT VERIFIED | NOT VERIFIED |
| `2026_10_13_000015_add_purchase_permissions.php` | NOT VERIFIED | NOT VERIFIED |
| `2026_10_13_000016_create_warehouse_returns.php` | NOT VERIFIED | NOT VERIFIED |
| `2026_10_13_000017_create_approved_damaged_stock.php` | NOT VERIFIED | NOT VERIFIED |
| `2026_10_13_000018_add_warehouse_return_permissions.php` | NOT VERIFIED | NOT VERIFIED |
| `2026_10_13_000019_create_partners.php` | NOT VERIFIED | NOT VERIFIED |
| `2026_10_13_000020_add_partner_permissions.php` | NOT VERIFIED | NOT VERIFIED |
| `2026_10_13_000021_create_governorates_drivers_and_trash.php` | NOT VERIFIED | NOT VERIFIED |
| `2026_10_13_000022_add_governorate_driver_trash_permissions.php` | NOT VERIFIED | NOT VERIFIED |
| `2026_10_13_000023_create_container_transfer_and_fund_ledger.php` | NOT VERIFIED | NOT VERIFIED |
| `2026_10_13_000024_create_product_location_minimum_stock.php` | NOT VERIFIED | NOT VERIFIED |
| `2026_10_13_000025_create_inventory_counts_and_count_movement.php` | NOT VERIFIED | NOT VERIFIED |
| `2026_10_13_000026_add_inventory_count_permissions.php` | NOT VERIFIED | NOT VERIFIED |
| `2026_10_14_000001_create_mobile_capture_tables.php` | NOT VERIFIED | NOT VERIFIED |
| `2026_10_14_000002_add_mobile_capture_permissions.php` | NOT VERIFIED | NOT VERIFIED |
| `2026_10_14_000003_create_currency_reference_catalog.php` | NOT VERIFIED | NOT VERIFIED |
| `2026_10_15_000001_allow_read_only_mobile_viewing.php` | NOT VERIFIED | NOT VERIFIED |

## Seeders and permissions

Four seeder files are present: `AppSettingsSeeder.php`, `DatabaseSeeder.php`, `MobileCategorySeeder.php`, and `RolePermissionMatrixSeeder.php` (VERIFIED by file inventory). The permission seeder defines owner, admin, accountant, designated invoice issuer, read-only, and driver roles. Owner receives all seeded permission codes; admin is broad access excluding selected owner-only operations; accountant and limited roles use explicit allowlists; driver grants include order/delivery capabilities. Summary VERIFIED from source, actual grants in either database NOT VERIFIED.

## Constraints and open verification

Migration and schema sources use foreign keys, unique/idempotency keys, decimal amounts (`DECIMAL(19,4)` in the baseline and later migrations), status checks, and transactional posting/ledger tables. Static presence VERIFIED by source inspection. Historical constraint suite evidence states 21 cases passed per engine; current suite NOT RUN. Current migration application, live schema/table counts, seed contents, rollback behavior, and fresh-from-zero state are NOT VERIFIED.

Connection names documented for isolated test use are `mysql_test` and `mariadb_test`, both restricted to database `erp_test`; the cleanup did not inspect any `.env` file or print credentials. See [connection notes](CONNECTION_NOTES.md).
