# Frontend Parity Progress

## Current status

- **Current part:** Part 2 — live setup blocked before backend startup.
- **Last completed part:** Part 1 — design tokens, shared components/states, shell/navigation and responsive layout.
- **Test status:** Known flaky under load, not a confirmed regression. Three affected files passed 15/15 isolated runs; default parallel full-suite runs have varied. Per the working rule, a failing full-suite run counts as a blocker only if it reproduces on rerun. Details: `TEST_FLAKY_ROOT_CAUSE.md`.
- **Part 1 validation:** Typecheck, lint and build passed; one full-suite run passed 74/74 and another under concurrent validation load passed 60/74; axe scan completed with 33 contrast violations.
- **Last completed Part 1 commits:** `c781b1f` (foundation), `7d61fa5` (progress record).
- **Part 2 blocker:** installed PHP is 8.2.33 (backend requires >=8.3); Composer is unavailable. Artisan fails the Composer platform check. No relevant service listeners were found; no database was contacted.
- **Next part:** Resume Part 2 after PHP 8.3+ and Composer are available and the approved `erp_test` database service is running.

## Part history

| Part | Status | Commit | Next |
| --- | --- | --- | --- |
| 0 — audit | Audit documents committed; typecheck/lint passed; full-suite status classified as known flaky under load, not a confirmed regression | `a27e38b`, `3db7e81` | Part 1 — foundation, not started |
| 1 — foundation | Complete; visual shell captures at four requested widths; typecheck/lint/build passed; axe reported 33 contrast violations; details below | `c781b1f`, `7d61fa5` | Part 2 — live setup |
| 2 — live setup | Blocked before backend startup by PHP 8.2.33 and missing Composer; no database accessed. Details in `LIVE_INTEGRATION.md`. | `3528ab0` | Resume Part 2 after local prerequisites are ready |

## Proposed screen parts

The ordering follows the reference sidebar groups and then its additional workflow sections. Screen groups remain at or below eight screens. The split can be revised only if the actual reference inventory requires it; no screen is removed by this proposal.

| Part | Screens |
| --- | --- |
| 1 — foundation | Tokens, shared controls/states, app shell, navigation, directionality and responsive layout; no feature-screen group. |
| 2 — live setup | Local backend setup and auth/integration evidence; no new screen group. |
| 3 — sales/invoices | Invoice list, invoice create, invoice print, collections. |
| 4 — customers | Customer list, customer accounts, customer detail, customer liquidation. |
| 5 — products/inventory | Products, warehouses, inventory summary, movements, movement detail, adjustments, inventory transfers. |
| 6 — finance core | Finance page, financial overview, alternate finance tabs, chart of accounts, cashiers, finance transfers. |
| 7 — finance and containers | Expenses, financial adjustments, currencies, containers, container receive, landed cost. |
| 8 — reports | Reports center, sales report, profit report, inventory report, financial report. |
| 9 — administration | Users, settings. |
| 10 — dashboard | Dashboard. |
| 11 — additional workflows | Orders list/create/detail, deliveries list/create, returns list/create. |

## Part 0 verification

- `npm run typecheck` (from `frontend/`): PASS, exit 0.
- `npm run lint` (from `frontend/`): PASS, exit 0.
- `npm test` (from `frontend/`): FAIL, 22 files; 68 passed, 6 failed, 74 total. See `UI_PARITY_REPORT.md`.
- Reference screenshots and cross-viewport comparison: NOT VERIFIED.
- Backend/live API calls and database access: NOT RUN.

## Part 1 verification

- Implemented reference-derived design tokens, shared control/state styling, an eight-group RTL shell/navigation, and responsive behavior. The app remains on MSW; no live API integration or feature-screen work was started.
- Verified the requested token values against the read-only reference HTML and captured the dashboard shell at 1440x900, 1100x900, 768x900 and 600x900. Reference and frontend screenshots are in `parity/part-1/`; the reference captures were refreshed after its transient login toast cleared.
- The reference root token specifies a 240px sidebar, but a later CSS override makes the rendered reference sidebar 196px. The frontend honors the explicitly requested 240px, leaving a documented 44px desktop mismatch. At 768px and below, both sidebars are off-canvas while closed.
- A document-width overflow observed at 390px was fixed in `.app-shell`; measured width is 390px at that viewport and 768px at 768px.
- `npm run typecheck`: PASS, exit 0.
- `npm run lint`: PASS, exit 0.
- `npm run build`: PASS, exit 0; 67 production files checked.
- `npm test`: one run PASS, 74/74; second run 60/74, with 14 failures across five files during concurrent validation load. Under the agreed rule, a full-suite failure is not a confirmed blocker unless reproduced on rerun; because one of the two runs passed 74/74, the acceptance rule is met. The known flaky-under-load status remains.
- `npm run a11y`: scan completed 34 views and exited 1 with 33 color-contrast violations. Accessibility validation is NOT PASS; no contrast values were changed because they are explicit reference tokens.
- Backend calls, database access and live API behavior: NOT RUN.
- NOT VERIFIED: drawer-open screenshots; feature-screen content and visual states; every individual modal, toast, dropdown and notification state; accessibility compliance beyond the reported contrast scan; browser behavior beyond the captured dashboard shell.
- Open questions: none requiring a decision for Part 1. Part 2 live setup had not started when Part 1 was closed.
- Next: Part 2 — live setup.

## Part 2 attempt

- Inspected the frontend API client, MSW switch, Vite proxy, backend route middleware and OpenAPI security declarations; recorded the evidence in `LIVE_INTEGRATION.md`.
- `php -v`: PHP 8.2.33. `backend/composer.json` requires PHP `^8.3`; `php artisan --version` failed with exit 255 because vendor dependencies require PHP `>= 8.3.0`.
- `composer --version`: NOT AVAILABLE; command not found.
- Port check for 3306, 3307, 8000, 8001 and 5173 returned no listeners at check time.
- Backend startup, local API, browser auth/CSRF/step-up, DB connection, migrations, seeders and UI live behavior: NOT VERIFIED / NOT RUN. No database was contacted, and `system_end` was not touched. `backend/.env` was not read or modified; no software was installed.
- Blocked pending PHP 8.3+ and Composer, plus the approved local `erp_test` database service being available. Do not install software or proceed to database access until prerequisites are provided.
