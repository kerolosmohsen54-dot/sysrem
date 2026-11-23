# Final ERP System Report

Date: 2026-10-16 (Africa/Cairo)

## Overall disposition: INCOMPLETE

Parts A, C, and D passed after the mobile withdrawal correction and the final mobile unknown-sender rerun. MySQL backend, frontend, and Android checks passed. The remaining blocker is Part B: the MariaDB server requires its configured GSSAPI client plugin for the test account, while the installed PHP PDO client is `mysqlnd 8.3.33` and cannot load that plugin. The available account cannot authenticate through the installed client, so a project-only connection change or scoped test user could not be established safely.

## Latest live cleanup on `erp_scratch` (2026-10-16)

The `erp_scratch` dataset was later cleaned through application endpoints. Earlier scenario results in Sections C and E are historical test snapshots, not the current live balances.

- Invoices 73-92 were cancelled; container 6 receipt 5 was reversed. Products 25-34 now have zero stock and are inactive.
- Product 22, customers 52-71, warehouses 3-4, draft container 4, and test users `e2e_owner`/`e2e_readonly` were deactivated or cancelled. Mobile test channels 10-11 were paused. `karas`, `manual_owner`, and `manual_readonly` remain active.
- Final read-only inventory: 78 tables / 3,706 rows. This is not a physically empty database.
- Retained by design: posted invoice 1 with posted return 2; product 1's 19 units in locations 1-2; 4 posted expenses; 19 posted collection receipts; 31 treasury entries; 2 transfers; approved damaged-stock and inventory-count records; a draft warehouse return; 27 captured mobile messages; reversed container receipts and related history; audit/trash/idempotency/outbox/movement records. The application exposes no complete reversal or delete route for these records, and no inventory adjustment was made solely to force stock to zero.
- A temporary mobile device row was used to pause channels 10-11 and immediately logged out; its token is cleared and the revoked history row remains.

See [pre-clean inventory](../evidence/pre-clean-list.txt) and [post-clean readback](../evidence/post-clean-list.txt) for exact evidence.
| Part | Result | Evidence / blocker |
|---|---|---|
| A. Mobile withdrawal `other` → drawer | PASS | Exact 6.50 balance and two-leg feature test passes on MySQL; no expense is created. Forward-only migration adds the transfer recording type. |
| B. MariaDB test connection | INCOMPLETE | MariaDB returns SQLSTATE 2054 / `auth_gssapi_client`; no client-compatible MariaDB account is available. No server auth or other database was changed. |
| C. Container and inventory scenario | PASS | Final readback matches the application screens: 500 units received, 100 sold, 400 remain, 20 posted invoices, 1,000 COGS, 1,000 gross profit. |
| D. Mobile A–K | FIXED-AND-PASS | All scenarios passed. Scenario C was rerun with a sender that does not match the channel filter; its Android log reports zero matching sources and SQL finds zero new rows. |
| E. Full system verification | PARTIAL | MySQL, frontend, and mobile suites pass; MariaDB is blocked by the authentication plugin above. |

## A. Mobile withdrawal mapping

The API route is `POST /api/v1/mobile/messages/{messageId}/record-withdrawal`, routed to `MobileCaptureController::recordWithdrawal` in `backend/routes/api_v1.php:575`. The handler validates category and notes, then calls `MobileCaptureWithdrawalService::post` in `backend/app/Http/Controllers/MobileCaptureController.php:249`.

Relevant posting logic in `backend/app/Services/MobileCaptureWithdrawalService.php`:

```php
$isOtherCategory = $this->isOtherWithdrawalCategory($category);
$targetAccountId = $isOtherCategory
    ? $this->drawerTargetAccountId()
    : ($category->category_kind === 'transfer' ? $category->target_treasury_account_id : null);

if ($category->category_kind === 'transfer' || $isOtherCategory) {
    return $this->treasury->postTransfer($request, [
        'from_treasury_account_id' => (int) $channel->treasury_account_id,
        'to_treasury_account_id' => (int) $targetAccountId,
        'amount_egp' => $amount,
        ...
    ]);
}
return $this->treasury->postExpense($request, [
    'treasury_account_id' => (int) $channel->treasury_account_id,
    'amount_egp' => $amount,
    ...
]);
```

`drawerTargetAccountId()` reads the target from the active transfer category whose name is configured as the drawer category. `MobileCategorySeeder` uses the `MOBILE-CASH-DRAWER` account code or resolves the existing cash drawer by name; it does not hardcode a numeric account ID. The forward-only migration `2026_10_16_000001_add_mobile_treasury_transfer_recording_type.php` adds `TREASURY_TRANSFER` to captured-message recording types.

The live category list has one transfer category (the drawer) and three expense categories (salaries, warehouse expenses, other expenses). Existing transfer categories continue to use their configured destination; other expense categories still call `postExpense`. The `other` category now reports `TREASURY_TRANSFER` and creates no expense row.

Feature test `other_withdrawal_category_transfers_exact_amount_to_drawer_without_creating_expense` asserts decimal strings: channel `10.00` → `3.50`, drawer `0.00` → `6.50`, zero new expenses, and exactly two `6.5000` treasury legs (channel out, drawer in). Full `MobileFinanceEngineTest` on MySQL passed 16 tests / 318 assertions.

The requested live check posted one E2E-TEST withdrawal of `1.00` EGP from the funded `AcceptanceWallet` on `erp_scratch`. Read-only SQL showed channel `55.0000` → `54.0000`, drawer `0.0000` → `1.0000`, expenses `3` → `3`, matching expense rows `0`, and two transfer legs (`1` out, `1` in).

Commit: `8286b571351a20981c6266d754a5eacbb1fc6330` — `fix: route other mobile withdrawals to drawer`.

## B. MariaDB connection blocker

`backend/config/database.php` defines `mariadb_test` on `127.0.0.1:3307`, using the MariaDB test account default `root` and database `erp_test`. The connection handshake returns `SQLSTATE[HY000] [2054] The server requested authentication method unknown to the client [auth_gssapi_client]`. That handshake identifies GSSAPI as the auth plugin the server requires for this test account. The installed PHP is 8.3.33 with PDO MySQL client `mysqlnd 8.3.33`; the client has no GSSAPI auth plugin.

No project-only username/auth setting could be pointed at a client-compatible account because no other MariaDB account credentials were available and the current root connection cannot authenticate to create a scoped test account. No global MariaDB authentication settings or unrelated databases were changed.

- Full `mariadb_test` suite on `erp_test`: 190 tests; 9 passed; 181 errors; 52 assertions. The errors are connection/authentication failures with SQLSTATE 2054.
- `MobileFinanceEngineTest` on `mariadb_test` / `erp_test`: 16 tests; 0 passed; 16 errors; 0 assertions, same SQLSTATE 2054.

This is the only remaining blocker to a COMPLETE disposition.

## C. Container and inventory scenario (`erp_scratch`)

All entities and transactions were created through the application API/UI. Allocation decision: quantity basis. Each container line recorded purchase unit cost `0.0000`; the single incurred container cost was `5000.0000` EGP, allocated over 500 units, so landed cost is `10.0000` EGP/unit. This input and resulting cost are recorded as entered; no costing formula was changed.

Read-only SQL results at the time of the historical scenario (superseded by the latest cleanup note above):

| Measure | Result |
|---|---:|
| Container status / allocation | received / quantity |
| Products / expected units | 10 / 500 |
| Receipt split | 300 Main / 200 Second |
| Landed cost per unit | 10.0000 EGP |
| Posted scenario invoices | 20 |
| Units sold / current stock | 100 / 400 |
| Current stock per product | 40 (20 Main + 20 Second) |
| Invoice sales / COGS / gross profit | 2000.0000 / 1000.0000 / 1000.0000 EGP |
| Per-invoice sales / cost / profit | 100.0000 / 50.0000 / 50.0000 EGP |
| Posted collections / allocated | 4 / 300.0000 EGP |
| Four collected invoice balances | 0.0000, 0.0000, 50.0000, 50.0000 EGP |
| Total scenario invoice balance | 1700.0000 EGP |
| E2E drawer balance / entry count | 675.0000 EGP / 6 |
| Scenario expense | 125.0000 EGP |

The 10 products each have 50 receipt units, 10 sold units, and 40 remaining units valued at 400.0000 EGP. Dashboard, customer statement, and treasury screens matched the readback. Evidence: [container funds](../evidence/erp-e2e-container-funds.png), [invoice list](../evidence/erp-e2e-invoice-list.png), [dashboard](../evidence/erp-e2e-dashboard.png), [customer statement](../evidence/erp-e2e-customer-statement.png), [collections](../evidence/erp-e2e-collections.png), [treasury funding](../evidence/erp-e2e-treasury-funding.png), and [expense](../evidence/erp-e2e-expense.png).

The final readback was repeated after the mobile scenarios and returned the same totals.

## D. Mobile scenarios A–K on Pixel_9_Pro

| Scenario | Result | Visible text / server check | Screenshot |
|---|---|---|---|
| a. Deposit SMS | PASS | Inbox row shows `مسجل`; server message is `RECORDED`, one 1.11 EGP collection and one treasury inbound entry. | [a-recorded-live](../evidence/mobile-android-e2e/a-recorded-live-2026-10-16.png) |
| b. Duplicate SMS | PASS | Toast says `تم تسجيل هذه الرسالة من قبل.`; one row remains for the dedupe key. | [b-duplicate-notice](../evidence/mobile-android-e2e/b-duplicate-notice-2026-10-16.png) |
| c. Unknown sender | FIXED-AND-PASS | Rerun sender `99001` does not match channel filter `2`; home shows `رسائل جديدة: 0`, Android log `matchedSources=0`, SQL marker count `0`. Screenshot records the screen after the event. | [c-unknown-sender-fixed](../evidence/mobile-android-e2e/c-unknown-sender-fixed-2026-10-16.png) |
| d. Mixed deposit/withdrawal keywords | PASS | Inbox marks the row `يحتاج مراجعة` / `NEEDS_REVIEW`; no automatic posting. | [d-needs-review](../evidence/mobile-android-e2e/d-needs-review-2026-10-16.png) |
| e. Withdrawal `other` | PASS | Missing notes returns `error.details.notes`; after adding notes, `TREASURY_TRANSFER` moves 1.25 EGP from channel to drawer and creates no expense. | [e-recorded-transfer](../evidence/mobile-android-e2e/e-recorded-transfer-2026-10-16.png) |
| f. Notification allowlist | PASS | Enabled package creates one capture; unlisted package creates none. | [f-allowed](../evidence/mobile-android-e2e/f-allowed-notification-final-2026-10-16.png), [f-unlisted](../evidence/mobile-android-e2e/f-unlisted-notification-2026-10-16.png) |
| g. Manual postal deposit | PASS | Receipt shows `MANUAL`; server receipt source is `manual`. | [g-manual-deposit](../evidence/mobile-android-e2e/g-manual-deposit-saved-2026-10-16.png) |
| h. Offline outbox | PASS | Two queued operations replay after reconnect; pending count is zero and each idempotency marker has one server record. | [h-queued](../evidence/mobile-android-e2e/h-airplane-outbox-2-pending-2026-10-16.png), [h-after-refresh](../evidence/mobile-android-e2e/h-after-refresh.png) |
| i. PIN lock | PASS | After over two minutes in background the screen says `التطبيق مقفل`; entering the ephemeral PIN unlocks it. The PIN was not recorded. | [i-pin-unlocked](../evidence/mobile-android-e2e/i-pin-unlocked-2026-10-16.png) |
| j. Read-only user | PASS | Home hides `إضافة حساب`; a write request returns HTTP 403. | [j-readonly-home](../evidence/mobile-android-e2e/j-readonly-home-2026-10-16.png), [j-readonly-settings](../evidence/mobile-android-e2e/j-readonly-settings-2026-10-16.png) |
| k. Web linkage | PASS | Live API returns HTTP 200: inbox 7 mobile-linked rows, withdrawals 2, customer statement 1. Pages display source label `الهاتف`; frontend integration test covers the transfer leg. | [inbox](../evidence/erp-web-inbox-2026-10-16.png), [withdrawals](../evidence/erp-web-withdrawals-2026-10-16.png), [customer statement](../evidence/erp-web-customer-statement-2026-10-16.png) |

The initial unknown-sender attempt used `27711` against the deliberately broad configured filter `2`, which is a substring match under the existing channel semantics. That earlier attempt created one unposted `NEW` test row (ID 20, amount 7.7700). It was not posted to finance. The corrected emulator rerun used `99001`, which does not match; it produced no new server row. The historical row remains because captured-message cleanup has no supported ignore/reversal action. No accounting formula or general treasury posting behavior changed.

## E. Full-system verification

- Backend MySQL: `TARGET DB = erp_test`; `php artisan test` — **190 tests, 190 passed, 2685 assertions**.
- Mobile backend file, MySQL: `TARGET DB = erp_test`; `php artisan test tests/Feature/MobileFinanceEngineTest.php` — **16 tests, 16 passed, 318 assertions**.
- Backend MariaDB: `TARGET DB = erp_test`; `php artisan test` — **190 tests, 9 passed, 181 errors, 52 assertions**; auth plugin blocker above.
- Mobile backend file, MariaDB — **16 tests, 16 errors, 0 assertions**; auth plugin blocker above.
- Frontend: typecheck PASS; lint PASS; Vitest **43 files / 179 tests PASS**; production build PASS (**191 modules, 83 output files**); axe **51 views / 0 violations**; API contract **103 unique calls / 0 missing**.
- Android mobile: TypeScript PASS; Jest **12 suites / 94 tests PASS**; lint **0 errors / 143 warnings**; `assembleDebug` PASS (**362 tasks, 9m08s**). APK SHA-256: `92EF9DA1E8C0A1248058D74D6D6090F5796E7EFBB9331937E124ACB1C8D1AE72`.
- Historical `erp_scratch` readback before the latest cleanup: 20 posted scenario invoices / 100 units sold / 400 units on hand / 2000.0000 sales / 1000.0000 COGS / 1000.0000 gross profit / 300.0000 allocated collections / 675.0000 drawer balance. Current live status is documented above.

## Commands and execution record

All PHPUnit runs used process-only environment settings and the `erp_test` database. No `.env` file was read. The live SQL commands connected explicitly to MySQL `127.0.0.1:3306`, database `erp_scratch`, and were read-only `SELECT` statements. Each database invocation printed its target first. No migration, seed, destructive SQL, or direct live data write was run during the final readback.

```text
TARGET DB = erp_test
php artisan test tests/Feature/MobileFinanceEngineTest.php
mysql_test result: 16 tests, 318 assertions, PASS

TARGET DB = erp_test
php artisan test
mysql_test result: 190 tests, 2685 assertions, PASS

TARGET DB = erp_test
php artisan test tests/Feature/MobileFinanceEngineTest.php
mariadb_test result: 16 tests, 0 assertions, 16 errors, SQLSTATE 2054 auth_gssapi_client

TARGET DB = erp_test
php artisan test
mariadb_test result: 190 tests, 9 passed, 52 assertions, 181 errors, SQLSTATE 2054 auth_gssapi_client

TARGET DB = erp_scratch
mysql --host=127.0.0.1 --port=3306 --user=root --database=erp_scratch --execute=<read-only scenario SELECTs>
result: container, inventory, invoices, receipts, drawer, and expense figures above

adb emu sms send 99001 "E2E-TEST-UNKNOWN-99001-20261016-01 deposit EGP 8.23"
Android log: session=true, capture=true, matchedSources=0; read-only SQL marker count=0
```

## Commits

- `8286b571351a20981c6266d754a5eacbb1fc6330` — route mobile `other` withdrawals to the drawer (Part A).
- `3e7d260` — accept allowlisted notification sources and return duplicate capture status.
- `fe8df69` — complete the mobile capture, offline, and PIN-lock flows.
- `9a63953` — show the mobile source on treasury transfer legs.

## Remaining blocker

MariaDB test authentication: the server requests `auth_gssapi_client`; installed PDO `mysqlnd 8.3.33` cannot load it, and no alternate account usable by that client is available. The full MariaDB suite cannot pass until a client-compatible test account/auth method is provided.
