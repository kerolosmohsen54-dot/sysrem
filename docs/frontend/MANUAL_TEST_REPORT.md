# Frontend Manual Test Report

Date: 2026-10-14

## Environment

- Backend API verification: Laragon PHP 8.3.33 on `127.0.0.1:8010` with process-only `DB_CONNECTION=mysql` and `DB_DATABASE=erp_scratch`.
- Frontend: Vite on `127.0.0.1:5174` with process-only `VITE_MOCK_API=false` and `VITE_API_TARGET=http://127.0.0.1:8000`.
- Direct `GET /api/v1/health` and the Vite-proxied `GET /api/v1/health` both returned `data.status = ok`.
- The CUA browser inventory returned no apps or browsers; opening both `iab` and `chrome` reported that the browser was unavailable. Both disposable accounts were verified through the local API login/logout flow; browser-based screen testing remains unavailable.
- No migration, seeder, or business flow was run. Only the two requested disposable user records and their role links, plus the authentication session rows created and revoked by API login/logout, were written in `erp_scratch`. No other database was targeted.

## Test accounts

- `manual_owner` - role `owner`.
- `manual_readonly` - role `read_only`.
- Generated passwords are stored only in the local file `%TEMP%\test-accounts.local.txt`.
## Requested live flows

| Flow | Result | Evidence / reason |
|---|---|---|
| Owner and read-only API login/logout | VERIFIED | Each account returned HTTP 200 for login and HTTP 200 for logout through the local API. |
| Create customer, invoice, and collection | NOT VERIFIED | Not run; business flows were outside this task scope. |
| Create warehouse return and damaged-stock approval | NOT VERIFIED | Not run; business flows were outside this task scope. |
| Create partner and partner payment, then approve | NOT VERIFIED | Not run; business flows were outside this task scope. |
| Create governorate and driver, deactivate a driver, restore it | NOT VERIFIED | Not run; business flows were outside this task scope. |
| Create and approve an inventory count | NOT VERIFIED | Not run; business flows were outside this task scope. |
| Open dashboard and customer statement | NOT VERIFIED | Not run; browser-based screen verification was outside this task scope. |
| Read-only user is denied write screens with a visible 403 state | NOT VERIFIED against live API | Screen-level 403 behavior is covered by MSW integration tests; live browser verification remains unavailable. |

## Open questions and deferred behavior

- Customer liquidation remains read-only pending the accountant's settlement and posting rules.
- Partner profit-share allocation (fixed percentage or per-container percentage) remains undecided; the UI does not calculate or post a share.
- Approved damaged stock currently records the approval only. Whether approval should create an inventory movement or accounting entry remains open.
- Excel import remains locked pending the sample workbook and column rules.
- Live authenticated manual testing needs authorized disposable owner and read-only accounts plus an available browser session.
