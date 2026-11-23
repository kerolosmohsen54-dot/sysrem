# Web browser and accessibility verification

Date: 2026-10-14

## Browser accessibility scan

The project's Playwright script launched Microsoft Edge and scanned 50 views, including login, dashboard, sales, inventory, finance, administration, reports, global route search, and dashboard at 390px. Axe reported **0 violations across all 50 views**. Command: `PLAYWRIGHT_CHROMIUM_EXECUTABLE=<installed Edge> npm run a11y` from `frontend/` (exit 0).

The accessibility script explicitly runs Vite in `mode: test` and sets `VITE_MOCK_API=true`; this result checks rendered route states and responsive layout with its test API. It is not evidence of live API persistence or authenticated production-mode behavior.

## Live API and workflow status

The backend health route returned `data.status=ok` from the server configured for `erp_scratch`. A credentialed Playwright session against the live frontend was not run, so no live browser CRUD or persistence claim is made. The existing Vitest suite does exercise feature components and API calls under test conditions; see `FINISH_PROGRESS.md` evidence.

| Screen / flow | Role | Action | Expected | Actual | Result |
|---|---|---|---|---|---|
| Login, dashboard, and 48 application views | Test owner | Render route, scan with axe | Route renders; zero axe violations | 50 views scanned; zero violations | PASS (test API mode) |
| Dashboard responsive layout | Test owner | Scan at 390px and 768px | No horizontal overflow | Document width matched viewport at both widths | PASS (test API mode) |
| Customer create/read/reload | Owner | Live API browser flow | Persisted customer | Not run | NOT VERIFIED |
| Product create/read/reload | Owner | Live API browser flow | Persisted product | Not run | NOT VERIFIED |
| Invoice, collection, container receipt, expense, partner payment, treasury entry | Owner | Live API browser flow | Records persist and balances match | Not run | NOT VERIFIED |
| Write restriction | Read-only | Attempt write in browser | Visible 403 | Not run in browser; backend permission policies are exercised by HTTP feature tests | NOT VERIFIED (browser) |
| Role behavior | Accountant | Open finance views and test writes | Finance reads and expense creation; no approvals/deletions | Backend HTTP role policy test passes; browser not run | PARTIAL |
| Purchase invoices | Owner | List/create/detail | Live persisted invoice | Feature component/API tests exist; live browser flow not run | NOT VERIFIED (browser) |

No web screenshot is attached because the scripted axe job logs view results but does not save screenshots. The Android login screenshot and hierarchy are recorded in `../mobile/android-login-20261014.png` and `.xml`.
