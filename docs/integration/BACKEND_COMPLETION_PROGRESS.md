# Backend Completion Progress

Date: 2026-10-13

## Current checkpoint

Parts 1, 2, C, and D have later closure/verification entries below; earlier partial or blocked entries are retained as historical facts and are superseded by the later entries. Phase 0 is now verified. The latest full backend suite after Phase E3 is MySQL 169/169 and MariaDB 169/169, each with 2,313 assertions and no skips. Phase D is committed as `ae43da8`; Phase E items 1-3 are complete in `67de3ee`, `7fb34f8`, and `2ebca2a`; Phase E item 4 (treasury inbox, withdrawals, movements) is next. Phase D's React integration is not yet verified.

## Part A — Finish autoloader
Status: **done (Composer scripts enabled)**

- Exact successful command: `"C:\laragon\bin\php\php-8.3.33-Win32-vs16-x64\php.exe" "C:\laragon\bin\composer\composer.phar" dump-autoload --no-interaction -o`.
- Output: optimized files generated; Laravel `postAutoloadDump` and `artisan package:discover --ansi` completed; 6,926 classes; exit code 0. The standalone package-discovery command also completed and listed all six packages as DONE.
- PSR-4 verification, no DB: `ReferenceCatalogController`, `RecycleBinController`, and `CustomerLiquidationController` each returned `bool(true)`.
- The earlier attempt with Composer scripts enabled stalled. The later scripts-enabled retry succeeded after the optimized no-scripts generation and separate package-discovery run.

What was run: optimized autoload generation with scripts enabled and direct class loading checks. No remaining autoload item is blocked.
Next: Phase E item 1, container transfer and container funds.

## Part B — suppliers and purchase invoices
Status: **blocked / no feature tests present**

- Target printed: `TARGET DB = erp_test`.
- PHPUnit command with MySQL command-line overrides and `--filter Supplier` completed with exit 1: `No tests executed!` (`tests=0`, `passed=0`, `assertions=0`). The requested supplier/purchase-invoice feature test files are not present, so approval criteria cannot be marked passed.
- No seeder was run and no test files were changed.

What was run: filtered PHPUnit on erp_test. NOT VERIFIED: endpoint CRUD, permissions, CSRF, step-up, validation and decimal totals through feature tests. Next: add the requested in-test fixture feature coverage, then rerun Part B.

## Part C — full PHPUnit on real test connections
Status: **completed with skips; no failures**

- MySQL run: printed `TARGET DB = erp_test`; `DB_CONNECTION=mysql_test`, `DB_DATABASE=erp_test`. Result: **115 tests, 29 passed, 0 failed, 0 errors, 86 skipped, 665 assertions**, exit 0.
- MariaDB availability: Windows service `MariaDB` was Running.
- MariaDB run: printed `TARGET DB = erp_test`; `DB_CONNECTION=mariadb_test`, `DB_DATABASE=erp_test`. Result: **115 tests, 29 passed, 0 failed, 0 errors, 86 skipped, 665 assertions**, exit 0.
- Skips are the existing engine groups gated by `AUTH_TEST_CONNECTION=mysql_test|mariadb_test`; grouped counts: AuditHistory 3, Authentication 11, BackendAcceptance 2, CsvImport 4, DeliverySourceConstraint 1, InventoryConcurrency 1, Inventory 14, MobileAdministration 4, MobileAuthentication 6, MobileCustomerSync 2, MobileFinance 3, MobileMessage 5, MobileSchema 1, Reports 7, SalesWorkflow 17, Treasury 5.

NOT VERIFIED: Part B endpoint feature tests (files absent), Part D domains. Next unfinished item remains Part B feature test implementation.

## Part B verification rerun (2026-10-13)
Status: **partial / not approved**

Created `backend/tests/Feature/SupplierTest.php` and `backend/tests/Feature/PurchaseInvoiceTest.php` with in-test supplier, warehouse and product fixtures. The executable coverage currently verifies fixture creation and exact decimal-string arithmetic; endpoint/authentication assertions requested for GET/POST/show, 403, CSRF, step-up and validation are **NOT VERIFIED** because the existing test harness does not expose the named routes/session helper as reusable fixtures.

Exact command (MySQL): `TARGET DB = erp_test`; `DB_CONNECTION=mysql_test DB_DATABASE=erp_test php vendor/bin/phpunit --filter 'SupplierTest|PurchaseInvoiceTest' --testdox`. Result: **3 total, 3 passed, 0 failed, 0 errors, 0 skipped, 6 assertions**, exit 0.

Exact command (MariaDB): `TARGET DB = erp_test`; `DB_CONNECTION=mariadb_test DB_DATABASE=erp_test php vendor/bin/phpunit --filter 'SupplierTest|PurchaseInvoiceTest' --testdox`. Result: **3 total, 3 passed, 0 failed, 0 errors, 0 skipped, 6 assertions**, exit 0.

No production bug was found; no separate bug-fix commit was needed. Next: endpoint-level Part B coverage remains unfinished.

## Part B additional-case verification (2026-10-13)

Initial requested count check: `grep -c "public function test"` equivalent counts were SupplierTest **8**, PurchaseInvoiceTest **3**, total **11** named cases. PHPUnit also includes 3 existing non-`test` methods, so the filtered suite executed **14 tests**.

Exact MySQL command: `TARGET DB = erp_test`; `DB_CONNECTION=mysql_test DB_DATABASE=erp_test php vendor/bin/phpunit --filter 'SupplierTest|PurchaseInvoiceTest' --testdox`.
Result: **14 total, 14 passed, 0 failed, 0 errors, 0 skipped, 17 assertions**, exit 0.

Exact MariaDB command: `TARGET DB = erp_test`; `DB_CONNECTION=mariadb_test DB_DATABASE=erp_test php vendor/bin/phpunit --filter 'SupplierTest|PurchaseInvoiceTest' --testdox`.
Result: **14 total, 14 passed, 0 failed, 0 errors, 0 skipped, 17 assertions**, exit 0.

The eight named requested cases plus three additional named cases are present and passed. No failure or production bug was observed.

## Part 1 — suppliers and purchase invoices (closed)

- Migrations: `2026_10_13_000014_create_purchase_invoices` and `2026_10_13_000015_add_purchase_permissions` applied to MySQL and MariaDB `erp_test`.
- OpenAPI paths `/suppliers`, `/purchase-invoices` (GET/POST), and `/purchase-invoices/{invoiceId}` contain concrete JSON response schemas referencing `Supplier`, `PurchaseInvoice`, `PurchaseInvoiceLine`, and `PurchaseInvoiceLineInput`.
- Tests: MySQL `mysql_test`: 12/12 passed, 24 assertions, 0 failures/errors/skips. MariaDB `mariadb_test`: 12/12 passed, 24 assertions, 0 failures/errors/skips.
- Validation contract: HTTP 422 with field messages under `error.details`; tests assert `error.details.supplier_id`, `error.details.lines.0.unit_cost_egp`, and `error.details.lines.0.quantity`.

## Part 2 — warehouse returns and approved damaged stock (completed)

- Migrations: `000016_create_warehouse_returns`, `000017_create_approved_damaged_stock`, `000018_add_warehouse_return_permissions`; applied on MySQL and MariaDB `erp_test`.
- Endpoints: GET/POST `/api/v1/warehouse-returns`, GET `/api/v1/warehouse-returns/{id}`, GET/POST `/api/v1/approved-damaged-stock`.
- Permissions: owner grants for warehouse return view/manage and damaged stock approval; read-only denied.
- Tests: MySQL 3/3 passed, 10 assertions; MariaDB 3/3 passed, 10 assertions.
- Open questions: damaged-stock accounting/ledger posting intentionally not implemented; no profit or cash posting added.
- NOT VERIFIED: full OpenAPI schema validation and frontend screen integration (screen is currently mock/disabled).

OPEN QUESTION: approved damaged stock: should approval create an inventory movement and/or accounting entry? Currently: record only, no balance change.


## Phase B - warehouse returns and approved damaged stock (closed)

- Migrations: `2026_10_13_000016_create_warehouse_returns`, `2026_10_13_000017_create_approved_damaged_stock`, and `2026_10_13_000018_add_warehouse_return_permissions` are present and applied on `erp_test`.
- `warehouse_returns.idempotency_key` and `approved_damaged_stock.idempotency_key` have database UNIQUE indexes. Warehouse return creation uses `DB::transaction`; approved damaged stock writes only its record table.
- Middleware contracts verified: missing CSRF returns 419; missing recent step-up returns 428; unauthorized role returns 403.
- MySQL: `TARGET DB = erp_test`; 10 tests, 10 passed, 35 assertions, 0 failures/errors/skips.
- MariaDB: `TARGET DB = erp_test`; 10 tests, 10 passed, 35 assertions, 0 failures/errors/skips.
- OPEN QUESTION: Approved damaged stock: should approval create an inventory movement or an accounting entry? Current safe default is record only; no balance change.
- NOT VERIFIED: frontend integration for these screens remains outside this backend test phase.

## Phase C - partners, partner payments, customer liquidation (closed)

- Migrations: 2026_10_13_000019_create_partners and 2026_10_13_000020_add_partner_permissions applied on erp_test through MySQL and MariaDB test connections.
- Endpoints: partner list/create/show/update, partner payments list/create/approve, and read-only customer liquidation.
- OpenAPI parser: OK; paths=110, schemas=47.
- MySQL: 7 tests, 7 passed, 24 assertions.
- MariaDB: 7 tests, 7 passed, 24 assertions.
- Liquidation controller has no INSERT, UPDATE, DELETE, save, or create operations.
- OPEN: partner profit percentage distribution remains undecided; no distribution is posted. Customer liquidation remains read-only.

## Phase 0 verification update (2026-10-13)

- Composer autoload: scripts-enabled optimized generation completed successfully and generated 6,926 classes. Laravel package discovery completed; `ReferenceCatalogController`, `RecycleBinController`, and `CustomerLiquidationController` load through Composer autoload.
- Phase B/C coverage audit found missing real-request checks for partner-payment creation CSRF/step-up and validation, partner PATCH CSRF/step-up, and exact partner/payment decimal strings. Added these cases in `PartnerTest.php`; no backend behavior or expected status was changed. Commit: `369740a`.
- Focused Phase B/C suite: MySQL **24/24 passed, 94 assertions**; MariaDB **24/24 passed, 94 assertions**. Every feature test exercises a real API request and asserts a status, response field, or exact decimal string.
- Full suite after the coverage change: MySQL **157 total, 157 passed, 0 failed, 0 errors, 0 skipped, 2,193 assertions**; MariaDB: **157 total, 157 passed, 0 failed, 0 errors, 0 skipped, 2,193 assertions**.
- Phase 0 items 1-5 are complete. Historical 86 environment-gated skips were executed with the appropriate `AUTH_TEST_CONNECTION`; no skips remain.

## Phase D - governorates, shipping drivers, and restore-only recycle bin (closed)

- Commit: `ae43da8` (`feat: add governorates drivers and restore-only recycle bin`).
- Migrations `2026_10_13_000021_create_governorates_drivers_and_trash` and `2026_10_13_000022_add_governorate_driver_trash_permissions` applied on `erp_test` using MySQL and MariaDB. The fixed catalog seeds the 27 governorates in the UI reference.
- Added authenticated, permission-checked governorate list/create/update and shipping-driver list/create/update endpoints. Catalog changes are audit logged. Deactivation creates a trash record; restore is supported for customers, products, categories, warehouses, governorates, and shipping drivers. There is no purge route.
- Paths are documented in `backend/docs/openapi.yaml`; Symfony YAML parser result: `OK paths=116 schemas=51`.
- Focused Phase D feature tests: MySQL **6/6 passed, 41 assertions**; MariaDB **6/6 passed, 41 assertions**.
- Full PHPUnit suite: MySQL **154/154 passed, 2,178 assertions**; MariaDB **154/154 passed, 2,178 assertions**; zero failures, errors, or skips on both.
- Initial full-suite failures and fixes: the inventory integration test used temporary `users` but wrote to persistent `trash_items`, violating its real user foreign key; its fixture now shadows `trash_items` temporarily. A purchase-invoice fixture used only two random bytes for unique keys and collided on MariaDB; its keys now use eight random bytes.
- Driver handling remains the standard catalog only. Existing delivery/invoice free-text snapshot behavior was not changed and special driver rules were not introduced.
- OPEN: customer liquidation remains read-only until settlement rules are confirmed by the accountant. Approved damaged-stock ledger effects and partner profit allocation remain undecided; neither was added here.
- NOT VERIFIED: the React governorate, shipping-driver, and recycle-bin panels are not wired to these API routes. Existing delivery/invoice free-text driver snapshots remain unchanged.
- Next: Phase E, then final integration verification.


## Phase E item 1 - container transfers and container funds (complete)

- Commit: `67de3ee` (`feat: add container transfer and fund ledgers`).
- Forward migration `2026_10_13_000023_create_container_transfer_and_fund_ledger` applied successfully to `erp_test` via `mysql_test` and `mariadb_test`.
- Added `GET/POST /api/v1/container-transfers` and `GET/POST /api/v1/container-funds`; concrete OpenAPI request/response schemas added. Symfony YAML parser: `OK paths=118 schemas=59`.
- Transfers reuse `InventoryService::transfer`, preserving current weighted-average cost and movement audit behavior. A separate idempotent transfer reference is stored; no treasury or container-cost posting is made.
- Container contributions and withdrawals use an independent decimal-string ledger, cumulative balance, idempotency keys, and audit entries; tests verify no treasury entry is created.
- Focused real-HTTP tests: MySQL 4/4, 26 assertions; MariaDB 4/4, 26 assertions.
- Full suite after final changes: MySQL 161/161, 2,233 assertions, 0 failures/errors/skips; MariaDB 161/161, 2,233 assertions, 0 failures/errors/skips.
- Problem-loop record: the first full MySQL run failed `CsvImportEngineTest::opening_stock_import_posts_dated_movements_via_inventory_service` because the new API test fixtures left movement rows in the shared integration database (actual movement count 6 where the existing test expects 0). Added scoped cleanup for only the new tests' unique fixture markers, reran the focused tests, then reran full suite on both engines successfully.
- Next: Phase E item 2, minimum stock thresholds per product/location and below-threshold balance results.


## Phase E item 2 - minimum stock (complete)

- Commit: `7fb34f8` (`feat: add per-location minimum stock thresholds`).
- Forward migration `2026_10_13_000024_create_product_location_minimum_stock` applied successfully to `erp_test` via both test connections.
- Added `GET /api/v1/inventory/minimum-stock` with product/location filters and `below_only`, plus `PUT /api/v1/inventory/minimum-stock` for an audited per-location threshold. Existing `products.minimum_stock` remains unchanged.
- Below-threshold quantities are computed from `inventory_balances`; no stock or cost is posted.
- OpenAPI parser: `OK paths=119 schemas=63`; route list confirms GET and PUT.
- Focused real-HTTP tests: MySQL 3/3, 19 assertions; MariaDB 3/3, 19 assertions.
- Full suite after E2: MySQL 164/164, 2,259 assertions, 0 failures/errors/skips; MariaDB 164/164, 2,259 assertions, 0 failures/errors/skips.
- Test query correction: Laravel's `boolean` validation rejects the literal query text `true`; test now sends `below_only=1`, a valid boolean encoding. The API validation contract was unchanged.
- Next: Phase E item 3, periodic count sessions and admin approval using distinct `count` inventory movements.


## Phase E item 3 - periodic inventory counts (complete with open valuation question)

- Commit: `2ebca2a` (`feat: add periodic inventory count approvals`).
- Forward migrations `2026_10_13_000025_create_inventory_counts_and_count_movement` and `2026_10_13_000026_add_inventory_count_permissions` applied on `erp_test` via MySQL and MariaDB. Migration 000025 adds the distinct `count` enum value; prior migrations remain unchanged.
- Added list/create/show/approve endpoints under `/api/v1/inventory/counts`. Creation captures expected stock snapshots and is idempotent; approval is owner-only in the current role model, requires CSRF and step-up, and posts `count` movements through the existing inventory service. Re-approval returns 409.
- Tests verify actual stock deltas, two distinct `count` movements and no `adjustment` movements, read_only denial on every route, CSRF/step-up, validation, 404, idempotency, and audit events.
- Focused suite: MySQL 5/5, 40 assertions; MariaDB 5/5, 40 assertions.
- Full suite: MySQL 169/169, 2,313 assertions, 0 failures/errors/skips; MariaDB 169/169, 2,313 assertions, 0 failures/errors/skips.
- OpenAPI parser: `OK paths=122 schemas=68`; all four operations appear in `route:list`.
- OPEN: approving a positive variance when the system has zero stock and no weighted-average cost is blocked with `error.details.unit_cost_egp`; accountant must confirm its valuation basis. The product's last-purchase reference is not used to infer that rule.
- OPEN: the seeded role matrix has no distinct `admin` role; count approval permission is granted only to the existing `owner` role until the role model is clarified.
- Next: Phase E item 4, treasury inbox, withdrawals, and movements, preserving existing treasury posting logic.

## Phase E item 4 - treasury inbox, withdrawals, and movements (complete)

- Commit: e3bd520.
- Existing `GET/POST /api/v1/treasury/entries` routes serve the frontend inbox and movement list; `direction=in/out` filters provide deposits and withdrawals. The existing `TreasuryService::postCashEntry` path was preserved without changing posting behavior.
- Added real-HTTP coverage in `backend/tests/Feature/TreasuryEntriesApiTest.php` for direction filters, pagination, exact decimal strings, permissions, CSRF, step-up, and validation.
- Added concrete OpenAPI schemas for the treasury-entry list and POST response. Symfony YAML parser: `OK paths=122 schemas=71`.
- Focused tests: MySQL 2/2, 20 assertions; MariaDB 2/2, 20 assertions.
- Full suite after changes: MySQL 171/171, 2,333 assertions, 0 failures/errors/skips; MariaDB 171/171, 2,333 assertions, 0 failures/errors/skips.
- A test initially expected `12.3500` for the computed balance; `ExactMoney::fromCents` deliberately serializes balances as `12.35`. The test now checks the existing exact string format; production money logic was not changed.
- Next: Phase E item 5, budgets, recurring expenses, and read-only cash forecast using existing tables and no accounting-rule changes.

## Phase E item 5 - advanced finance scope review (no backend work required)

- Commit: 9f75a33.
- Reviewed the current frontend feature tree. Expense budgets, recurring expenses, month-to-month comparisons, and cash forecast are disabled placeholder cards in `FinancePage.tsx` / `AppShell.tsx`; there are no feature API calls or active routes for them.
- Per the scope rule to add no features the current frontend does not use, no endpoint, table, or accounting behavior was added. The existing treasury and expense APIs remain unchanged.
- The financial report route also renders `AccountingWaitingPage` and makes no API call.
- Status: frontend integration NOT VERIFIED because the current frontend intentionally has no consumer for these items. This scope review is complete; continue with active frontend API consumers.
- Next: Phase E item 6 review, followed by active dashboard/statement contract verification.

## Phase E item 6 - daily summary scope review (not in active frontend contract)

- Commit: 281511a.
- Searched the current frontend features, routes, and generated API contract for daily-summary calls; none exist. The current navigation shows this item as locked and there is no screen or API consumer.
- Per the rule against adding backend features not used by the frontend, no daily-summary endpoint or database object was introduced.
- Status: no backend work is applicable until the frontend exposes a concrete API contract. Continue with active dashboard and statement endpoints.

## Phase E item 7 - Excel import (pending source contract)

- Commit: 788fe3d.
- The current frontend has no Excel import feature API or upload/preview/confirm flow; the navigation item remains locked. No import endpoint, database table, or parser was added.
- OPEN: the user-supplied sample workbook and its column/validation rules are still pending. Do not infer the file format or build an importer until the sample and frontend contract are available.
- Status: pending external input; continue with active dashboard and statement endpoints.

## Phase E item 8 - dashboard and customer statement integration (complete)

- Commit: c85c561.
- Verified active frontend consumers: GET /api/v1/reports/dashboard and GET /api/v1/reports/customers/{customerId}/statement.
- Dashboard endpoint already computes permission-filtered sections. Added concrete OpenAPI response schema; no calculation or authorization changes.
- Customer statement response did not expose the field names used by the current frontend. Added additive aliases for id, reference, date, debit, credit, unallocated amount, and the current-balance summary. Existing response fields remain available; amount calculations and ledger logic are unchanged.
- Expanded a real-HTTP statement test to assert exact frontend fields and decimal strings. Existing dashboard real-HTTP test continues to check permission-filtered data.
- Reports feature suite: MySQL 7/7, 87 assertions; MariaDB 7/7, 87 assertions.
- Full suite after changes: MySQL 171/171, 2,343 assertions, 0 failures/errors/skips; MariaDB 171/171, 2,343 assertions, 0 failures/errors/skips.
- OpenAPI parser: OK paths=122 schemas=74.

## Phase F - final backend/database and integration verification (complete for active frontend API contract)

- Commit: 353009d.
- Symfony YAML parser: OK, 122 paths and 74 schemas.
- Static exact route comparison expanded Route::match PUT/PATCH declarations: 170 route operations, 170 OpenAPI operations, 170 matched, 0 missing in either direction. Purchase invoice path parameter name was aligned to invoiceId.
- Added ROUTE_PERMISSION_AUDIT.md with all 170 methods, session/mobile authentication context, declared permission middleware, CSRF and step-up markers. Generator: docs/integration/route_openapi_audit.php; it parses source statically without Laravel bootstrap or .env access.
- Fresh migrate and seed on TARGET DB = erp_scratch succeeded on MySQL and MariaDB. All 27 migrations ran, followed by RolePermissionMatrixSeeder, AppSettingsSeeder, and MobileCategorySeeder.
- Full backend PHPUnit on erp_test: MySQL 171/171, 2,343 assertions, 0 failures/errors/skips; MariaDB 171/171, 2,343 assertions, 0 failures/errors/skips. Delivery source constraint test: 1/1 on each engine.
- Frontend contract checker: 79 unique calls across 11 API modules, 0 missing from backend OpenAPI.
- Frontend checks: typecheck exit 0, lint exit 0, Vitest 22 files / 78 tests passed, production build passed (68 production files checked).
- Axe/Playwright scan used installed Chrome through a process-only override: 34 views checked; two violations remain (invoice form color contrast, finance tabs landmark name). Dashboard width checks passed at 390px and 768px. No frontend files were changed.
- NOT VERIFIED: frontend-clean is not the active frontend project and was not tested. The locked daily-summary, advanced-finance, and Excel screens have no active API calls; Excel import remains pending the sample workbook and its field rules.
- Completion applies to backend support for active frontend API calls. Remaining OPEN items are listed in CHECKPOINT.md; no further backend change is justified without a consumer or the missing import sample.
