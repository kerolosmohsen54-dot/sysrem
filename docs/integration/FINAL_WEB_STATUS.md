# Final web status

Date: 2026-10-15 (Africa/Cairo)

## Phase 1: live core flows

The full browser and database evidence is in [LIVE_WEB_VERIFICATION.md](LIVE_WEB_VERIFICATION.md).

| Flow | Result |
|---|---|
| Owner login, logout, login again | PASS |
| Customer creation and reload | PASS |
| Product and warehouse creation | PASS |
| Invoice draft, issue, and reload | PASS |
| Partial collection, reload, and allocation | PASS |
| Linked sales return | BLOCKED: source movement/product contract unavailable; save control remains disabled |
| Expense with category | BLOCKED: write and database row passed, but final live list reload was not rechecked |
| Dashboard and customer statement | PASS |
| Read-only customers, invoices, dashboard, and create attempt | BLOCKED: invoice request status was not captured |

Phase 1 counts: PASS 6, FAIL 0, BLOCKED 3.

## Phase 2: operational screens with backend support

The backend routes, frontend API calls, and automated integration suites below were checked. They do not substitute for the required live browser, reload, and database verification. Each live check is BLOCKED because the permitted file %TEMP%/test-accounts.local.txt was no longer available after Phase 1; no other password source was used.

| Screen | UI route and backend API | Backend test and frontend test | Live result |
|---|---|---|---|
| Governorates | /admin/governorates; GET/POST/PATCH /reference/governorates | PhaseDReferenceDataTest.php; governorates.test.tsx | BLOCKED |
| Shipping drivers | /admin/drivers; GET/POST/PATCH /drivers | PhaseDReferenceDataTest.php; reference-admin.test.tsx | BLOCKED |
| Recycle bin | /admin/trash; GET /admin/trash, POST /admin/trash/{trashId}/restore | PhaseDReferenceDataTest.php; reference-admin.test.tsx | BLOCKED |
| Warehouse returns | /warehouse-returns; GET/POST /warehouse-returns | WarehouseReturnTest.php; stock-workflows.test.tsx | BLOCKED |
| Approved damaged stock | /inventory/damaged; GET/POST /approved-damaged-stock | ApprovedDamagedStockTest.php; stock-workflows.test.tsx | BLOCKED |
| Container transfers | /container-transfers; GET/POST /container-transfers | ContainerLedgerTest.php; advanced-live.test.tsx | BLOCKED |
| Container funds | /container-funds; GET/POST /container-funds | ContainerLedgerTest.php; advanced-live.test.tsx | BLOCKED |
| Minimum stock | /inventory/minimum-stock; GET/PUT /inventory/minimum-stock | MinimumStockTest.php; advanced-live.test.tsx | BLOCKED |
| Periodic count | /inventory/counts; GET/POST /inventory/counts, POST /inventory/counts/{countId}/approve | InventoryCountTest.php; advanced-live.test.tsx | BLOCKED |
| Partners | /partners; GET/POST/PATCH /partners | PartnerTest.php; partners.test.tsx | BLOCKED |
| Partner payments | /partner-payments; GET/POST /partner-payments, POST /partner-payments/{id}/approve | PartnerTest.php; partner-payments.test.tsx | BLOCKED |
| Customer liquidation | /customers/:customerId/liquidation; GET /customers/{customerId}/liquidation | CustomerLiquidationTest.php; customer-liquidation.test.tsx | BLOCKED |
| Treasury inbox | /finance/inbox; GET /treasury/entries?direction=in | TreasuryEntriesApiTest.php; treasury-inbox.test.tsx | BLOCKED |
| Treasury withdrawals | /finance/withdrawals; GET /treasury/entries?direction=out | TreasuryEntriesApiTest.php; treasury-withdrawals.test.tsx | BLOCKED |
| Treasury movements | /finance/movements; GET /treasury/entries | TreasuryEntriesApiTest.php; treasury-movements.test.tsx | BLOCKED |

Phase 2 counts: PASS 0, FAIL 0, BLOCKED 15.

## Phase 3: verification gates

| Gate | Result |
|---|---|
| Frontend typecheck | PASS: npm run typecheck |
| Frontend lint | PASS: npm run lint |
| Frontend Vitest | PASS: 43 files, 173 tests |
| Frontend build | PASS: Vite production build; 84 production files checked for external URL literals |
| Backend MySQL suite | PASS: 187/187 tests, 2,631 assertions; mysql_test against erp_test, with TARGET DB = erp_test printed first |
| Backend MariaDB suite | PASS: 187/187 tests, 2,631 assertions; mariadb_test against erp_test, with TARGET DB = erp_test printed first |
| Edge axe scan | PASS: 51 views, 0 violations. Dashboard at 390px had 390px document width; at 768px had 768px document width. |
| Live backend health | PASS: GET /api/v1/health returned status ok on the process-only erp_scratch backend. |

## Fix commits

| Commit | Fix |
|---|---|
| 4973491 | Invoice document/line response mapping and draft issue flow |
| 858ee0b | Collection receipt field mapping and null allocation display |
| fee6227 | Render returned dashboard metrics |
| 91f1f39 | Use the accepted active expense-category query value |
| 8f352bb | Map backend expense amount and category fields |
| c673e4e | Give invoice print links accessible names |

## NOT IN SCOPE

| Item | Reason |
|---|---|
| Budgets | No backend endpoint or approved business rule. |
| Recurring expenses | No backend endpoint or approved business rule. |
| Month-over-month comparison | No backend endpoint or approved business rule. |
| Cash forecast | No backend endpoint or approved business rule. |
| Daily summary | No backend endpoint or approved business rule. |
| Excel import | No backend endpoint or approved business rule. |
| Chart of accounts | No backend endpoint or approved business rule. |
| Financial adjustments | No backend endpoint or approved business rule. |
| Currency persistence | No backend persistence endpoint or approved business rule. |

## OPEN QUESTIONS

- Step-up behavior: dashboard and customer reads can return 428 STEP_UP_REQUIRED. Safe default is to keep the prompt and reauthenticate before retrying.
- Linked sales return: the screen says حفظ المرتجع كمسودة غير مدعوم and cannot identify the source product/movement for a free return. Safe default is to leave the action disabled until the backend contract supplies the needed source fields.
- Expense screen: the 1.00 expense was POSTed and DB-verified, but its live table reload after the response adapter fix is not verified.
- Read-only user: the customer create action was absent and a direct POST returned 403; the invoice-list HTTP status remains unrecorded.
- Phase 2: all 15 candidates have route, API-client, and automated test evidence, but their live browser persistence checks remain blocked by the missing permitted credential file. No candidate is marked live PASS.
- Dashboard trend and recent activity: the backend response has no supporting datasets. Safe default is to keep these sections empty.

## Final counts

Phase 1: PASS 6 / FAIL 0 / BLOCKED 3.
Phase 2: PASS 0 / FAIL 0 / BLOCKED 15.
