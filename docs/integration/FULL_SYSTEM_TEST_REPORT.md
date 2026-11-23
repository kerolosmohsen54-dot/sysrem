# Full System Test Report

Date: 2026-10-16 (Africa/Cairo)  
Live database: erp_scratch. Each SQL read in this run printed TARGET DB = erp_scratch immediately before execution. The focused backend feature test printed TARGET DB = erp_test and used the mysql_test connection. No backend/.env was read.

## Summary

- PASS: 82
- FIXED-AND-PASS: 2
- BLOCKED-WITH-PROOF: 10
- Total checked items: 94

PASS criteria assert specific HTTP, UI, database, test, or build values. BLOCKED items include the evidence preventing a safe or possible run. No item is reported as FAIL.

## Runtime and routes

Backend health: http://192.168.100.4:8000/api/v1/health returned HTTP 200 with status ok while Laravel listened on 0.0.0.0:8000. Frontend http://127.0.0.1:5173 returned HTTP 200. The live owner route sweep saw 200 responses from each page's API calls, a rendered app root, and no page errors except the receipt detail bug recorded as FIXED-AND-PASS below.

| Status | Page | Action and result | Evidence |
|---|---|---|---|
| PASS | /dashboard | Open page; dashboard rendered; API calls returned 200. | Live owner route sweep |
| PASS | /customers | Open page; customer list rendered; API returned 200. | Live owner route sweep |
| PASS | /orders | Open page; orders rendered; API returned 200. | Live owner route sweep |
| PASS | /deliveries | Open page; deliveries rendered; API returned 200. | Live owner route sweep |
| PASS | /invoices | Open page; invoice list rendered; API returned 200. | Live owner route sweep |
| PASS | /collections | Open page; collections rendered; API returned 200. | Live owner route sweep |
| PASS | /returns | Open page; returns rendered; API returned 200. | Live owner route sweep |
| PASS | /products | Open page; product list rendered; API returned 200. | Live owner route sweep |
| PASS | /categories | Open page; categories rendered; API returned 200. | Live owner route sweep |
| PASS | /warehouses | Open page; warehouse list rendered; API returned 200. | Live owner route sweep |
| PASS | /inventory | Open page; inventory rendered; API returned 200. | Live owner route sweep |
| PASS | /inventory/movements | Open page; movement list rendered; API returned 200. | Live owner route sweep |
| PASS | /inventory/adjustments | Open page; adjustment page rendered; API returned 200. | Live owner route sweep |
| PASS | /inventory/opening-stock | Open page; opening stock page rendered; API returned 200. | Live owner route sweep |
| PASS | /inventory/transfers | Open page; inventory transfers rendered; API returned 200. | Live owner route sweep |
| PASS | /inventory/damaged | Open page; damaged stock rendered; API returned 200. | Live owner route sweep |
| PASS | /warehouse-returns | Open page; warehouse returns rendered; API returned 200. | Live owner route sweep |
| PASS | /container-transfers | Open page; container transfers rendered; API returned 200. | Live owner route sweep |
| PASS | /container-funds | Open page; container funds rendered; API returned 200. | Live owner route sweep |
| PASS | /inventory/minimum-stock | Open page; minimum stock page rendered; API returned 200. | Live owner route sweep |
| PASS | /inventory/counts | Open page; periodic counts rendered; API returned 200. | Live owner route sweep |
| PASS | /finance | Open page; finance summary rendered; API returned 200. | Live owner route sweep |
| PASS | /finance/inbox | Open page; inbox rendered; API returned 200. | Live owner route sweep; docs/evidence/erp-web-inbox-2026-10-16.png |
| PASS | /finance/mobile-inbox | Open page; mobile inbox rendered; API returned 200. | Live owner route sweep |
| PASS | /finance/withdrawals | Open page; withdrawals rendered; API returned 200. | Live owner route sweep; docs/evidence/erp-web-withdrawals-2026-10-16.png |
| PASS | /finance/movements | Open page; treasury movements rendered; API returned 200. | Live owner route sweep |
| PASS | /finance/mobile-channels | Open page; mobile channels rendered; API returned 200. | Live owner route sweep |
| PASS | /partners | Open page; partners rendered; API returned 200. | Live owner route sweep |
| PASS | /partner-payments | Open page; partner payments rendered; API returned 200. | Live owner route sweep |
| PASS | /purchase-invoices | Open page; purchase invoices rendered; API returned 200. | Live owner route sweep |
| PASS | /admin/governorates | Open page; governorates rendered; API returned 200. | Live owner route sweep |
| PASS | /admin/drivers | Open page; drivers rendered; API returned 200. | Live owner route sweep |
| PASS | /admin/trash | Open page; recycle bin rendered; API returned 200. | docs/evidence/acceptance-session2-trash.png; live owner route sweep |
| PASS | /admin/install | Open page; install page rendered; API returned 200. | Live owner route sweep |
| PASS | /containers | Open page; container list rendered; API returned 200. | Live owner route sweep |
| PASS | /reports | Open page; reports rendered; API returned 200. | Live owner route sweep |
| PASS | /admin/users | Open page; users rendered; API returned 200. | Live owner route sweep |
| PASS | /admin/audit | Open page; audit page rendered; API returned 200. | Live owner route sweep |
| PASS | /admin/settings | Open page; settings rendered; API returned 200. | Live owner route sweep |
| PASS | /invoices/new | Open page; invoice form rendered; API returned 200. | Live owner route sweep |
| PASS | /returns/new | Open page; linked return form rendered; API returned 200. | Live owner route sweep; docs/evidence/acceptance-session2-linked-return.png |
| PASS | /customers/52 | Open customer detail; app root and customer API rendered with HTTP 200. | Live owner route sweep |
| PASS | /customers/52/statement | Open statement; page rendered; API returned 200. | Live owner route sweep; docs/evidence/erp-web-customer-statement-2026-10-16.png |
| PASS | /customers/52/liquidation | Open liquidation; page rendered; API returned 200. | Live owner route sweep; docs/evidence/acceptance-session2-customer-liquidation.png |
| PASS | /products/25/cost-history | Open cost history; page rendered; API returned 200. | Live owner route sweep |
| PASS | /containers/6 | Open large-container details; page rendered; API returned 200. | Live owner route sweep; docs/evidence/container-large-inline-lines-2026-10-16.png |
| PASS | /containers/6/receive | Open receipt form; warehouse and lines rendered; API returned 200. | Live owner route sweep; docs/evidence/container-large-status-before-receipt-2026-10-16.png |
| FIXED-AND-PASS | /containers/6/receipts/5 | Initial live page threw a date-format error because the UI treated the API envelope as a flat record. Normalized the response and added receipt warehouse_id to the detail API. Regression UI test asserts date, warehouse 401, and both quantities; backend test asserts detail API warehouse and received quantity. | Focused frontend tests 12/12; backend ContainerInlineProductWorkflowTest 1/1, 19 assertions; fix commits d7aefad and 7b6b206 |
| PASS | /containers/6/landed-cost | Open landed cost; page rendered; API returned 200. | Live owner route sweep |
| PASS | /invoices/92 | Open posted invoice detail; page rendered; API returned 200. | Live owner route sweep; docs/evidence/invoice-large-test-last-2026-10-16.png |
| PASS | /invoices/92/edit | Open invoice edit; page rendered; API returned 200. | Live owner route sweep |
| PASS | /invoices/92/print | Open invoice print preview; page rendered; API returned 200. | Live owner route sweep |
| PASS | /returns/2/print | Open return print preview; page rendered; API returned 200. | Live owner route sweep |

## Business flows and SQL checks

| Status | Item | Action and asserted result | Evidence |
|---|---|---|---|
| PASS | Existing product line | Select an existing product and submit quantity and purchase value; API payload had product_id 201, quantity 4, purchase value 120.50, and an idempotency key. | Frontend containers integration test |
| PASS | Inline product creation | Enter name, SKU, and unit price in container; products API creates the missing item before the line is posted. | Live container screenshots; frontend containers integration test |
| PASS | Product edit propagation | Rename a product from its product page; updated name appeared in product list and container line after reload. | docs/evidence/container-product-row-after-edit-2026-10-16.png; docs/evidence/container-line-after-product-edit-2026-10-16.png |
| PASS | Receipt warehouse selector | Receipt UI populated the warehouse selector from GET /warehouses; selected warehouse 3 on the large container receipt. | docs/evidence/container-large-status-before-receipt-2026-10-16.png; SQL readback below |
| PASS | Large container receipt | Container 6 received 10 inline products, 50 units each, into warehouse 3; API posted receipt 5. Read-only SQL: 10 distinct products, min/max received 50/50, warehouse 3. | docs/evidence/container-large-inline-start-2026-10-16.png; docs/evidence/container-large-inline-lines-2026-10-16.png; docs/evidence/container-receipt-complete-2026-10-16.png |
| PASS | Landed cost and distribution | SQL found 10 products with 40 units each remaining after sales, average unit cost 10.0000 and stock value 400.0000 each. Entered purchase cost was 500.00 / 50 = 10.00 per unit. | Read-only SQL output in this run; docs/evidence/container-large-inline-lines-2026-10-16.png |
| PASS | Twenty invoice issue flow | Created and issued invoices 73–92 through UI, 5 units per invoice, selling each product twice. SQL: 20 posted invoices, 100 units, sales 2000.0000, COGS 1000.0000, gross profit 1000.0000. Per product: sold 10, sales 200.0000, COGS 100.0000, profit 100.0000. | docs/evidence/invoice-large-test-first-2026-10-16.png; docs/evidence/invoice-large-test-last-2026-10-16.png; read-only SQL output in this run |
| PASS | Customer creation | Create customer in live UI, reload list, and verify its row by SQL. | docs/evidence/acceptance-session2-customer.png; docs/evidence/finish-command-log-session2.md |
| PASS | Product creation | Create product in live UI, reload list, and verify SKU and unit price by SQL. | docs/evidence/acceptance-session2-product.png; docs/evidence/finish-command-log-session2.md |
| FIXED-AND-PASS | Warehouse creation | First UI request returned 428; step-up/retry succeeded, list reloaded, and the warehouse row was checked in SQL. | docs/evidence/acceptance-session2-warehouse.png; docs/evidence/finish-command-log-session2.md |
| PASS | Invoice issue | Create invoice draft, issue it, reload detail, and check posted status and stock. | docs/evidence/acceptance-session2-invoice-draft.png; docs/evidence/acceptance-session2-invoice-issued.png |
| PASS | Linked return | Create return linked to source invoice, reload, and SQL-check credit note link and quantity. | docs/evidence/acceptance-session2-linked-return.png; docs/evidence/acceptance-session2-linked-return-reloaded.png; docs/evidence/finish-command-log-session2.md |
| PASS | Collections and allocation | Submit collection, reload, and check receipt/allocation rows; collection funded the later expense. | docs/evidence/acceptance-session2-collection.png; docs/evidence/finish-command-log-session2.md |
| PASS | Expense and category | Create category and expense, reload expense list, and check persisted amount/category/account by SQL. | docs/evidence/acceptance-session2-expense-reloaded.png; docs/evidence/finish-command-log-session2.md |
| PASS | Governorate | Create governorate, reload, and verify row with SQL. | docs/evidence/acceptance-session2-governorate.png |
| PASS | Driver | Create driver, reload, and verify row with SQL. | docs/evidence/acceptance-session2-driver.png |
| PASS | Partner and payment | Create partner and payment, reload, and verify both records with SQL. | docs/evidence/acceptance-session2-partner.png; docs/evidence/acceptance-session2-partner-payment.png |
| PASS | Minimum stock | Save minimum stock and verify persisted threshold by SQL. | docs/evidence/acceptance-session2-minimum-stock.png |
| PASS | Periodic count | Create and approve count; verify status and stock count by SQL. | docs/evidence/acceptance-session2-periodic-count.png |
| PASS | Damaged stock | Submit damaged-stock record and verify the resulting approved record by SQL. | docs/evidence/acceptance-session2-damaged-stock.png |
| PASS | Container transfer | Create transfer and verify movement/transfer rows by SQL. | docs/evidence/acceptance-session2-container-transfer.png |
| PASS | Warehouse return | Create warehouse return and verify record by SQL. | docs/evidence/acceptance-session2-warehouse-return.png |
| PASS | Container status path | Create container and move through in-transit and at-port before receipt. | docs/evidence/container-large-status-before-receipt-2026-10-16.png |
| PASS | Owner access after cleanup | karas, manual_owner, and manual_readonly remain active; the current owner API login and step-up each returned HTTP 200. E2E users were deactivated through the application. | TARGET DB = erp_scratch read-only user query; docs/evidence/post-clean-list.txt |
| PASS | Test data pre-clean inventory | Captured the sanitized record list before cleanup; sensitive fields, credentials, message bodies, and private contact details were omitted. | docs/evidence/pre-clean-list.txt |
| PASS | Cleanup readback | Before cleanup: 33 tables / 446 E2E/test-related rows. The prior post-clean broad text scan found 35 tables / 1,076 E2E/test matches; it also includes audit, trash, idempotency, and history text, so the scan sets are not directly subtractable. Supported deactivation readback recorded 51 E2E customers, 2 governorates, 1 driver, 2 expense categories, 1 partner, 8 mobile channels, and 8 treasury accounts inactive/paused before the new manual scenario. | docs/evidence/cleanup-plan.txt; docs/evidence/finish-final-verification-2026-10-16.txt; TARGET DB = erp_scratch read-only checks |
| PASS | Application cleanup paths | Cancelled old unposted invoices, reversed old container receipts, and deactivated test products/customers/reference rows/accounts through their supported UI/API actions. | docs/evidence/invoice-cancelled-cleanup-2026-10-16.png; docs/evidence/container-receipts-reversed-cleanup-2026-10-16.png; docs/evidence/products-deactivated-cleanup-2026-10-16.png |
| BLOCKED-WITH-PROOF | Recycle-bin restore | Trash page loaded, but the live list had no suitable deleted row to restore. The current CUA inventory has zero browser surfaces; Edge and IAB creation both returned Browser is not available. | docs/evidence/acceptance-session2-trash.png; current CUA listBrowsers returned []; createBrowserTab errors: Browser is not available |
| BLOCKED-WITH-PROOF | Container-funds post | The previous live funds form did not expose the created test container in its selector, so no movement was submitted. Rechecking needs an owner browser; no browser surface is available now. | docs/evidence/acceptance-manual_owner-container-funds.png; docs/integration/LIVE_WEB_VERIFICATION.md; current CUA browser-unavailable proof |
| BLOCKED-WITH-PROOF | Treasury entry and transfer persistence | Treasury inbox, withdrawals, and movement pages load, but live create/reload/SQL persistence was not verified. Current browser provider has no available session. | docs/integration/LIVE_WEB_VERIFICATION.md; current CUA browser-unavailable proof |
| BLOCKED-WITH-PROOF | Treasury account CRUD | Deactivation of old test accounts passed; create/edit/delete through the current UI was not re-run because no owner browser surface is available. | docs/evidence/finish-final-verification-2026-10-16.txt; current CUA browser-unavailable proof |
| BLOCKED-WITH-PROOF | Category edit/delete and warehouse edit/delete | Existing create flows passed, but edit/delete were not re-run with reload and SQL in this pass; no browser session was available. | Current CUA listBrowsers returned []; Edge and IAB creation returned Browser is not available |
| BLOCKED-WITH-PROOF | Full CRUD matrix | Not every create/edit/delete action for every sidebar entity was exercised in the live UI. Existing CRUD coverage is listed above; remaining edits/deletions require a live owner browser session. | Current CUA listBrowsers returned []; createBrowserTab errors: Browser is not available |
| BLOCKED-WITH-PROOF | Purchase invoice create/edit/issue | The purchase-invoice page loads; business posting workflows are not implemented as a complete API/UI flow in this project. | docs/integration/GAP_REPORT.md; route sweep |

## Current data status after cleanup

This section supersedes the earlier retained-data notes for the current `erp_scratch` state. Historical test results above remain as recorded.

- Owner `karas` authenticated and passed step-up through the live API (HTTP 200 each). SQL confirms `karas`, `manual_owner`, and `manual_readonly` remain active; `e2e_owner` and `e2e_readonly` are inactive.
- Invoices 73–92 were cancelled through the application. Container 6 receipt 5 was reversed. SQL confirms all 20 invoices are cancelled and products 25–34 have zero on-hand and reserved quantities.
- Products 22 and 25–34, customers 52–71, and warehouses 3–4 were deactivated through application endpoints. Draft container 4 was cancelled.
- Final post-clean SQL inventory: 78 tables / 3,706 rows. There are 71 inactive customers, 33 inactive products and one active product, and two active warehouses.
- The database is not empty. Posted invoice 1 and posted return 2 remain because the invoice is linked to a posted return and there is no whole-return reversal route. Product 1 retains 19 units across locations 1 and 2; the product and warehouses cannot be deactivated while stock remains, and no stock adjustment was invented to force it to zero.
- Four posted expenses, 19 posted collection receipts, 31 treasury entries, and two posted transfers remain because the application exposes no whole-document reversal/delete route for them. Approved damaged-stock record 1, approved inventory count 1, draft warehouse return 1, partner-payment history, and 27 captured mobile messages also remain without supported delete/archive routes.
- Containers 2, 3, 5, and 6 remain in `receiving` with reversed receipt history; the application blocks cancellation when any receipt row exists, including a reversed row. Containers 1 and 4 are cancelled.
- Audit, trash, idempotency, outbox, movement, permissions, settings, and lookup history remain as system or audit records. E2E mobile channels 10 and 11 are paused through the mobile API; AcceptanceWallet channel 1 remains active. Temporary mobile device 75 was logged out and its token cleared; the revoked device row remains in history.

Read-only detail and post-clean counts: [post-clean-list.txt](../evidence/post-clean-list.txt). Pre-clean inventory: [pre-clean-list.txt](../evidence/pre-clean-list.txt).
## Phone and APK

| Status | Item | Action and result | Evidence |
|---|---|---|---|
| PASS | Laptop Wi-Fi health | Wi-Fi IPv4 192.168.100.4; GET http://192.168.100.4:8000/api/v1/health returned HTTP 200/status ok from the laptop. | Live HTTP response in this run |
| PASS | Debug APK configuration | Debug API base points to http://192.168.100.4:8000/api/v1; APK exists and SHA-256 is 369450CA6824061FCFA92154E4A42BC45357877D963D8C08334B1C3D4706B929. | mobile-app/android/local.properties; APK SHA-256 readback |
| BLOCKED-WITH-PROOF | Private firewall rule | Adding the inbound TCP 8000 private-only rule returned Access is denied. (Windows System Error 5); no rule was added. | OS error returned by New-NetFirewallRule |
| BLOCKED-WITH-PROOF | Phone app login and mobile flows | ADB has no attached device. The project-local emulator still needs 4096 MB with only 118.809 MB remaining, even after the local-only RAM retry. Phone login, channel load, SMS capture, deposit, withdrawal-to-drawer, and on-phone linkage therefore have no device result. | adb devices output; emulator stderr; original AVD setting restored |

- Wi-Fi IPv4: 192.168.100.4.
- Backend is bound to 0.0.0.0:8000 with process-only erp_scratch settings. The laptop itself fetched http://192.168.100.4:8000/api/v1/health and got HTTP 200/status ok.
- The debug API base URL is http://192.168.100.4:8000/api/v1 in ignored mobile-app/android/local.properties. Release API config is unchanged.
- Debug APK SHA-256: 369450CA6824061FCFA92154E4A42BC45357877D963D8C08334B1C3D4706B929.
- The phone must be on the same Wi-Fi network as the laptop. Open http://192.168.100.4:8000/api/v1/health in the phone browser; it should show status ok after TCP 8000 is permitted on the private network.
- BLOCKED-WITH-PROOF: the firewall-rule command returned Access is denied. (Windows System Error 5), so no firewall rule was added. ADB returned no devices. The project-local emulator could not start because the OS had only 2189.148 MB committed memory available and the emulator needed 4096 MB. A local-only retry lowered the copied AVD RAM to 1024 MB, but QEMU still needed 4096 MB while only 118.809 MB remained; the original AVD setting (2G) was restored. Thus phone login, channels, SMS path, deposit, withdrawal-to-drawer, and on-device web linkage were not tested. No rule or machine setting was changed.

## Automated verification and fixes

| Status | Check | Action and asserted result | Evidence |
|---|---|---|---|
| PASS | Frontend focused checks | Typecheck passed; containers and receipt-detail integration tests passed: 2 files / 12 tests. | npm run typecheck; Vitest result in this run |
| PASS | Backend MySQL focused feature test | ContainerInlineProductWorkflowTest passed on mysql_test / erp_test: 1 test / 19 assertions. | Artisan test result in this run |
| BLOCKED-WITH-PROOF | Backend MariaDB focused feature test | PHP PDO stopped before executing the test with SQLSTATE 2054, unknown server authentication method auth_gssapi_client at 127.0.0.1:3307. | Exact error from MariaDB test command; existing connection/plugin limitation |

- Frontend typecheck: passed. Focused container UI tests: 2 files, 12 tests passed.
- Backend focused feature test: mysql_test / erp_test, 1 test / 19 assertions passed. The equivalent MariaDB attempt is BLOCKED-WITH-PROOF: PHP PDO returned SQLSTATE 2054, unknown server authentication method auth_gssapi_client on 127.0.0.1:3307. No MariaDB server settings or credentials were changed.
- Existing prior full-suite evidence remains: MySQL 188 tests / 2,644 assertions passed; MariaDB suite 188 tests, 9 passed and 179 errored due the same auth plugin. This run did not rerun the full backend or mobile test suites.
- Commits for this run: d7aefad3ec38b851dacceb0bb178d4e38dda47bb (receipt detail API includes warehouse) and 7b6b206bc5ab83d16c5fdeed0b6ec1d25ce7b6dc (frontend normalizes receipt detail envelope and covers it with an integration test).
- Previously committed container inline-product fixes: dbaf043, 4ba240b, 60e687d. Existing treasury amount fix: 35ce322.
