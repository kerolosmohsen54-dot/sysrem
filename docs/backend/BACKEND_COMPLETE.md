# Backend completion and operations handoff

**Contract:** `backend/docs/openapi.yaml` is the API contract for backend-v1.2. It is versioned `1.2.0`; future changes must be reviewed and versioned rather than silently changing this baseline.

## Completion evidence and current state

| Check | Result |
|---|---|
| Local PHP | PHP 8.3.33 |
| MySQL | MySQL 8.4.3, `mysql_test` / `erp_test` |
| MariaDB | MariaDB 13.0.2, `mariadb_test` / `erp_test` |
| Latest full Laravel test suite | MySQL: 111 passed, 1704 assertions; MariaDB: 111 passed, 1704 assertions |
| Constraint suite | MySQL: 21 passed, 0 failed; MariaDB: 21 passed, 0 failed |
| Fresh install | `migrate:fresh --seed --force` passed for all 13 migrations and all three canonical seeders on MySQL and MariaDB `erp_test` |
| End-to-end acceptance | Backend scenario: 2 passed, 53 assertions per engine; combined mobile login/channel/message/deposit/withdrawal/sync: 1 passed, 22 assertions per engine |
| Security acceptance | Dedicated route-auth audit: 1 passed, 461 assertions per engine; high-confidence credential-pattern scan found no matches in backend and completion/log documents |
| Backup/restore | MySQL and MariaDB `erp_scratch`: each restored 52 base tables; full schema-and-data fingerprints matched before/after |
| Route and contract coverage | 135/135 non-HEAD method/path pairs documented, 0 missing or extra; 29/29 mobile operations documented; route-auth audit found zero permission gaps |
| OpenAPI parser | **NOT VERIFIED**; no local YAML/OpenAPI parser was available |

The Part 3a end-to-end scenario exercised two warehouses, a two-product
container received in two batches, value-based freight/customs allocation,
sales from both warehouses, an invoice revision, linked and free-form returns,
a partial collection with an unapplied remainder, an inter-warehouse transfer,
and payment of container freight from treasury. The output printed stock,
average costs, invoice totals, customer balance, and provisional invoice
profit after each step. Both engines produced matching business results; no
negative stock occurred and amounts reconciled to the piastre.

Migration status was checked read-only immediately before this handoff:

1. `2026_10_10_000000_create_approved_v4_1_schema`
2. `2026_10_10_000001_add_v4_2_email_verification_to_users`
3. `2026_10_10_000002_add_step_up_authentication_to_sessions`
4. `2026_10_11_000003_add_container_cost_controls_and_status_history`
5. `2026_10_11_000004_add_container_line_purchase_value`
6. `2026_10_11_000005_add_sales_workflow_cost_and_tax_snapshots`
7. `2026_10_11_000006_add_sales_receipt_unapplied_amount`
8. `2026_10_11_000007_enforce_delivery_source`
9. `2026_10_11_000008_add_financial_outbox_and_expense_categories`
10. `2026_10_12_000009_add_optional_master_data_reference_fields`

## API endpoint groups

The API is under `/api/v1`; its registered routes are defined in
[`backend/routes/api_v1.php`](../../backend/routes/api_v1.php), and the
contract is [`backend/docs/openapi.yaml`](../../backend/docs/openapi.yaml).
The v1.2 contract statically matches all **135 non-HEAD method/path operations**
registered by Laravel (including **29 mobile operations**).

- **Health and authentication:** public health check and login; authenticated
  profile, password re-authentication, logout, and session revocation.
- **Users and settings:** owner-only paginated user list, create, update/disable,
  role assignment, reset another user's password, and general company/numbering
  settings. User administration is step-up protected and audited.
- **Audit:** filtered audit history and invoice change history.
- **Customers:** list/detail, create/update, dated opening balance, and
  informational contact/tax/payment fields.
- **Sales:** invoice/order/return previews, invoices and issue/revision/cancel,
  linked and free-form returns, collections and allocations/reversals,
  sales-tax settings.
- **Orders and deliveries:** order lifecycle, invoice creation from orders,
  full deliveries and status history.
- **Catalog:** categories, products, product cost history, and warehouses;
  product catalog descriptions/default warehouse/default tax rate are
  informational, and reference purchase price is cost-permission protected.
- **Inventory:** balances, movement history, adjustments, dated opening stock,
  and atomic warehouse transfers.
- **Containers:** container lines, allocation basis, status history, costs,
  landed-cost preview, receipts list/detail/reversals, configurable cost types,
  and linked cost payments.
- **Finance:** treasury accounts, cash entries and transfers, expense
  categories and expenses.
- **Reports:** customer balances/statements, stock and movements, sales,
  container cost summary, invoice profit/markup, and permission-filtered
  dashboard.
- **Mobile companion API:** mobile-only bearer login/me/logout and password
  confirmation; owner browser device/source administration; paginated
  channels, sources, and categories; message batch ingestion, review, ignore,
  and duplicate handling; unallocated collection registration, manual
  post-office deposits, expense/transfer withdrawals; owner customer creation;
  cursor-based sync and ping.

Health and browser/mobile login are public API routes. Browser routes use
session/CSRF; mobile routes use device tokens scoped to mobile endpoints.
Every protected route requires explicit permission and denies by default.
Browser device administration and high-risk mobile mutations require the
appropriate step-up. See the OpenAPI contract for request/response shapes,
permission names, and error codes.

## Mobile API v1.2

- Device tokens are issued after password login, are revocable/expiring, and
  cannot authenticate browser routes; cookie sessions cannot authenticate
  mobile-only routes. The phone is responsible for its app lock.
- Owners receive all nine `mobile.*` permissions by default; the driver role
  receives none. Grants remain role-configurable for future limited roles.
- High-risk channel creation/deletion and category creation require
  device-specific password confirmation valid for ten minutes.
- Messages are accepted only from an active source owned by the device and
  an active channel, with a permitted direction and matching sender/package
  and configured keyword. OTP/verification-pattern messages are rejected;
  duplicate fingerprints are checked across devices. Raw text is omitted
  from logs/audits and returned only with `mobile.messages.view`.
- Deposits post an unapplied customer collection and channel treasury entry
  atomically; message-origin entries are explicitly unverified. Withdrawals
  use the existing expense/treasury transfer services. Business-data writes
  replayed from the phone require `Idempotency-Key`; authentication lifecycle
  and browser-only device administration are control-plane operations and
  are not offline queue writes.
- Sync returns bounded cursor deltas (maximum 500 events per page), never raw
  message text, and includes balances only with `mobile.balances.view`.
- Full fresh-from-zero migration/seed validation including v1.2 mobile
  migrations is **NOT VERIFIED**. Formal OpenAPI parser validation and
  minimum MySQL 8.0/MariaDB 10.6 runtime validation remain **NOT VERIFIED**.

## Final permission matrix

The canonical grants are seeded only in
[`RolePermissionMatrixSeeder.php`](../../backend/database/seeders/RolePermissionMatrixSeeder.php).
`Yes` means the role has the grant by default; `No` means it does not.
Additional `driver` grants are configurable in `role_permissions` and survive
routine runs of the canonical seeder.

| Permission | owner | designated_invoice_issuer | read_only | driver (`السواق`) |
|---|:---:|:---:|:---:|:---:|
| `users.view_self` | Yes | Yes | Yes | Yes |
| `sessions.revoke_self` | Yes | Yes | Yes | Yes |
| `invoices.view` | Yes | No | Yes | No |
| `audit_logs.view` | Yes | No | No | No |
| `users.manage` | Yes | No | No | No |
| `invoices.create` | Yes | Yes | No | Yes |
| `customers.view` | Yes | Yes | Yes | Yes |
| `products.view` | Yes | Yes | Yes | Yes |
| `customers.manage` | Yes | No | No | No |
| `customers.opening_balance` | Yes | No | No | No |
| `products.manage` | Yes | No | No | No |
| `warehouses.manage` | Yes | No | No | No |
| `inventory.view` | Yes | No | No | Yes |
| `inventory.manage` | Yes | No | No | No |
| `customers.create` | Yes | No | No | No |
| `collections.create` | Yes | No | No | No |
| `collections.view` | Yes | No | No | No |
| `returns.create` | Yes | No | No | No |
| `returns.view` | Yes | No | No | No |
| `documents.edit` | Yes | No | No | No |
| `documents.cancel` | Yes | No | No | No |
| `documents.reverse` | Yes | No | No | No |
| `documents.correct` | Yes | No | No | No |
| `costs.view` | Yes | No | No | No |
| `markup.view` | Yes | No | No | No |
| `profit.view` | Yes | No | No | No |
| `containers.view` | Yes | No | No | No |
| `containers.manage` | Yes | No | No | No |
| `costs.manage` | Yes | No | No | No |
| `costs.pay` | Yes | No | No | No |
| `sales_tax.manage` | Yes | No | No | No |
| `orders.view` | Yes | No | No | Yes |
| `orders.manage` | Yes | No | No | Yes |
| `deliveries.view` | Yes | No | No | Yes |
| `deliveries.manage` | Yes | No | No | Yes |
| `treasury.view` | Yes | No | No | No |
| `treasury.manage` | Yes | No | No | No |
| `treasury.post` | Yes | No | No | No |
| `expenses.view` | Yes | No | No | No |
| `expenses.post` | Yes | No | No | No |
| `expense_categories.manage` | Yes | No | No | No |
| `reports.customer_balances.view` | Yes | No | No | No |
| `reports.customer_statement.view` | Yes | No | No | No |
| `reports.container_costs.view` | Yes | No | No | No |
| `reports.dashboard.view` | Yes | No | Yes | No |

The two owners are ابنوب and كراس; each owner role receives all 45 currently
seeded permissions, including cost, profit, markup, document correction, and
user management. No real owner or driver account was created during acceptance.
The driver can create and post invoices, view customers/products/stock, and
operate orders/deliveries. The driver cannot read invoice records, edit or
cancel documents, access treasury/expenses/financial reports, manage users,
or see cost/profit/markup fields. Re-authentication does not grant permissions.

## Decisions in force

- Currency is EGP. Quantities are integers; money uses exact decimal/piastre
  arithmetic, not floating-point calculations.
- Stock is computed server-side from movements. Negative stock is rejected.
  Warehouses are unlimited. Cost is weighted-average per product per
  warehouse. Transfers are atomic and carry the source warehouse's average
  cost.
- Opening stock and customer balances are dated documents, not imported fixed
  balance values. Orders do not reserve stock; confirmation warns only.
- Container costs can be allocated by value, quantity, or manual entry. No
  weight allocation is supported. Supplier is a party for container costs,
  not a purchase/debt ledger. Costs added after receipt do not retroactively
  change inventory cost.
- Sales tax defaults off. Each invoice line stores issue-time tax settings;
  the inclusive/exclusive method and final rate remain subject to accountant
  confirmation.
- Credit limit is warning-only and never blocks a sale. Delivery is full
  execution only; partial delivery is not supported.
- Invoice edits reverse the previous effect and retain both versions plus a
  field-level change log. Invoice numbers are not reused. Cancellation and
  correction are audited.
- Linked returns are limited to sold/unreturned quantity and use the sold
  line's cost snapshot. Free-form returns use the destination warehouse's
  current average cost; if no usable cost history exists, an owner enters the
  unit cost.
- Customer balances and treasury/stock balances are computed in the backend.
  Unapplied collections are tracked separately and are not deducted from
  invoice balances.
- Every business mutation is audit logged. Financial routes require explicit
  permission and a valid ten-minute password re-authentication window for
  every role. Session idle timeout is 30 minutes; absolute timeout is 12 hours.
  Revoked sessions older than 90 days are pruned by the daily scheduler.
- No accounting journal entries or journal rules are implemented. Invoice
  profit/markup uses a **PROVISIONAL** formula and is not accountant-approved.

## How to run tests

Use the project's PHP 8.3 executable and the exact test database connection
for the selected engine. These PowerShell commands run from the backend
directory and target `erp_test` only:

```powershell
Set-Location 'D:\system karas\system end\backend'
$php = 'C:\laragon\bin\php\php-8.3.33-Win32-vs16-x64\php.exe'
$env:DB_CONNECTION = 'mysql_test'
$env:DB_TEST_DATABASE = 'erp_test'
$env:AUTH_TEST_CONNECTION = 'mysql_test'
& $php artisan test --colors=never
& $php scripts\run-phase1-constraints.php mysql_test
```

For MariaDB:

```powershell
Set-Location 'D:\system karas\system end\backend'
$php = 'C:\laragon\bin\php\php-8.3.33-Win32-vs16-x64\php.exe'
$env:DB_CONNECTION = 'mariadb_test'
$env:DB_MARIADB_TEST_DATABASE = 'erp_test'
$env:AUTH_TEST_CONNECTION = 'mariadb_test'
& $php artisan test --colors=never
& $php scripts\run-phase1-constraints.php mariadb_test
```

Never run these commands with a database selector that points to
`system_end`. Before any migration or restore, verify the selected database.
The restore-test command is deliberately restricted to `erp_scratch`; it
replaces that scratch database's contents.

## Create owner accounts

After verifying the selected database is the intended migrated application
database and the permission matrix has been seeded, run:

```powershell
& $php artisan users:create-owner
```

The command asks interactively for username and display name, then prompts
for a hidden password and hidden confirmation. Passwords are never supplied
as command-line arguments. The enforced password length is 12–1024
characters. Run it separately for each owner; this document and the repository
do not contain account passwords.

## CSV import commands

See [`CSV_IMPORTS.md`](operations/CSV_IMPORTS.md) for
schemas/examples and validation rules. Four commands are dry-run by default:

```powershell
& $php artisan imports:products products.csv
& $php artisan imports:customers customers.csv
& $php artisan imports:opening-stock opening-stock.csv
& $php artisan imports:customer-opening-balances customer-opening-balances.csv
```

Only after reviewing a successful dry run, apply with `--apply
--actor-id=<active-owner-id>`. Apply mode validates the entire file and writes
the batch transactionally through the established services. It rejects
duplicate identifiers and requires an active owner actor. Keep CSVs and
exports containing customer data out of Git and logs.

## Backups and restore operations

See [`BACKUP_AND_RESTORE.md`](operations/BACKUP_AND_RESTORE.md).
The scheduler runs `backup:mysql` hourly, `backup:offsite` daily at 03:00,
and `auth-sessions:prune` daily at 02:00. MySQL/MariaDB client paths are
configured through the documented private `.env` settings. The restore test
requires an explicit one-run confirmation and only accepts `erp_scratch`.
Both local engines passed scratch restore drills with exact 52-table names and
row counts matching before and after.

The off-host destination, SSH key/host-key setup, remote transfer, retention,
and remote restore are **NOT VERIFIED**; no destination has been configured.
Do not claim an off-host backup exists until it has been provisioned and
tested.

## OpenAPI and security evidence

The v1.2 OpenAPI document statically covered all **135 registered non-HEAD
method/path operations** with zero missing or extra operations, including
**29/29 mobile operations**. This was a method/path text comparison; no
YAML/OpenAPI parser was available locally, so actual YAML syntax/schema
validation remains **NOT VERIFIED**.

The route-list authentication tests verified login throttling, CSRF rejection
and middleware coverage, permission checks on every registered non-public
route, secure/HttpOnly/SameSite production cookies, and the minimum password
policy. The current route-auth audit passed on both engines with **461
assertions** each and no route permission gaps. High-confidence key/token/
credential patterns found no matches in the backend and completion/progress
documents; the earlier v1.1 scan covered 354 tracked files and all 183
reachable commits and found zero matches. Dedicated secret scanners were
not installed; coverage for arbitrary/unrecognized secret formats is
**NOT VERIFIED**. `backend/.env` is ignored and is not tracked.

## NOT VERIFIED / waiting on external input

- OpenAPI YAML/OpenAPI parser validation.
- Dedicated secret-scanner results and detection of arbitrary/unrecognized
  secret formats.
- Formal YAML/OpenAPI syntax and schema validation.
- Fresh-from-zero validation including the v1.2 mobile migrations; the
  recorded fresh-install result covers the v1.1 baseline.
- MySQL 8.0 and MariaDB 10.6 minimum-version compatibility. The tested
  database engines were MySQL 8.4.3 and MariaDB 13.0.2. The v4.1/v4.2 schema
  change logs record the intended database feature floors; those minimums
  have not been tested here.
- Hostinger PHP 8.3 runtime/extensions, database engine/version and grants,
  cron cadence, storage, SSH/SCP egress, TLS/proxy configuration, and
  production recovery behavior.
- Off-host backup destination, encryption/retention configuration, remote
  transfer, and remote restore.
- Accountant approval is required before Phase 8. The unresolved questions
  are enumerated in
  [`ACCOUNTANT_OPEN_QUESTIONS.md`](operations/ACCOUNTANT_OPEN_QUESTIONS.md):
  journal accounts/debits/credits and posting/period rules; tax enablement,
  rate, inclusive/exclusive method; cost-type capitalization; late costs;
  allocation and rounding; sales/profit/markup formulas; as-of-date inventory
  valuation; customer statement/balance presentation; treasury settlement;
  and period-close/correction controls.

## Key evidence files

- Runtime routes and middleware: `backend/routes/api_v1.php`,
  `backend/app/Http/Middleware/`, `backend/app/Services/`.
- Canonical permissions: `backend/database/seeders/RolePermissionMatrixSeeder.php`
  and `docs/backend/architecture/backend-design/PROPOSED_ROLE_PERMISSION_MATRIX_V3.md`.
- End-to-end: `backend/tests/Feature/BackendAcceptanceEngineTest.php`.
- Authentication/security: `backend/tests/Feature/ApiAuthenticationTest.php`,
  `backend/tests/Feature/AuthenticationEngineTest.php`.
- Named acceptance tests include
  `BackendAcceptanceEngineTest::landed_cost_sales_returns_collection_transfer_and_treasury_payment_reconcile_end_to_end`,
  `AuthenticationEngineTest::both_current_owners_can_access_every_permission_including_sensitive_financial_and_user_management`,
  `AuthenticationEngineTest::driver_role_is_seeded_with_configurable_grants_and_no_current_assignment`,
  `AuthenticationEngineTest::treasury_access_requires_a_finance_permission_and_recent_step_up`,
  `AuthenticationEngineTest::authorization_denies_unauthenticated_and_permissionless_requests_by_default`,
  `AuthenticationEngineTest::authenticated_user_without_any_role_is_denied_every_permission`,
  `InventoryEngineTest::twenty_five_warehouses_can_each_hold_stock_for_the_same_product`,
  `InventoryEngineTest::transfer_preserves_source_cost_and_recomputes_destination_weighted_average`,
  `ApiAuthenticationTest::route_list_shows_only_health_and_login_as_public_and_protects_all_other_routes`,
  and `ApiAuthenticationTest::login_is_limited_to_five_attempts_per_minute`.
- Inventory: `backend/tests/Feature/InventoryEngineTest.php`.
- Imports: `backend/tests/Feature/CsvImportEngineTest.php`.
- OpenAPI contract: `backend/docs/openapi.yaml`.
- Operational docs: `docs/backend/operations/`.
- Append-only execution evidence and next-session handoff:
  [`BACKEND_PROGRESS_LOG.md`](../development/BACKEND_PROGRESS_LOG.md).
