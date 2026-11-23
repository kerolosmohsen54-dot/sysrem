# Frontend delivery status

**Historical status: CHECKPOINT — NOT ACCEPTED AS FRONTEND COMPLETE.** This report predates the latest frontend-only checkpoint and its route/API status table is not authoritative for current work. See [FRONTEND_HANDOFF_REPORT.md](../../docs/frontend/FRONTEND_HANDOFF_REPORT.md) for the current screen status, verified commands, and remaining limitations. No release tag or live-backend acceptance is claimed.

## How to run

From `frontend/`:

- `npm install`
- `npm run dev`
- `npm run typecheck`
- `npm run lint`
- `npm test`
- `npm run build` (includes the production external-URL guard)
- `npm run contract:check`
- `npm run a11y` (requires Playwright Chromium; set `PLAYWRIGHT_CHROMIUM_EXECUTABLE` to a local Chromium-compatible browser if Playwright's bundled browser is unavailable)
- `npm run capture:parity` (captures all routes at 1440/768/390 and regenerates the side-by-side/diff report)

Development uses the real same-origin backend proxy: set `VITE_MOCK_API=false` and configure `VITE_API_TARGET`; see [`.env.example`](../.env.example). MSW is restricted to test mode and is enabled explicitly by browser test scripts. Do not put credentials or secrets in frontend environment variables.

## Screen and route status

`DONE` means the screen UI and its currently supported API/mock interactions exist; it does not mean parity or live-backend acceptance. `WAITING` means the UI exists but the referenced contract gap prevents the complete flow. `PARKED` means the agreed empty/EGP-only state is deliberate.

|   # | Screen                | Route                         | Status  | Outstanding contract or acceptance item                                                                                                                         |
| --: | --------------------- | ----------------------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|   1 | Dashboard             | `/dashboard`                  | WAITING | Dashboard response schema/data is prose-only; no metrics are fabricated.                                                                                        |
|   2 | Customers             | `/customers`                  | DONE    | Dedicated customer detail endpoint is missing; statement is available.                                                                                          |
|   3 | Orders                | `/orders`                     | DONE    | Cancellation endpoint is missing.                                                                                                                               |
|   4 | Order creation        | `/orders/new`                 | WAITING | Server preview endpoint is missing; no browser-side totals.                                                                                                     |
|   5 | Order detail          | `/orders/:id`                 | WAITING | Cancellation is unavailable; response schema is prose-only.                                                                                                     |
|   6 | Invoices              | `/invoices`                   | DONE    | Real-backend integration not verified.                                                                                                                          |
|   7 | Invoice creation      | `/invoices/new`               | WAITING | Server preview endpoint and confirmed success schema are missing.                                                                                               |
|   8 | Invoice print preview | `/invoices/:id/print`         | DONE    | Mobile overflow is fixed; comparison remains MAJOR because reference company branding, line items and notes are not present in the documented invoice response. |
|   9 | Collections           | `/collections`                | DONE    | Shows allocated and unallocated values separately; backend integration not verified.                                                                            |
|  10 | Deliveries            | `/deliveries`                 | DONE    | Real-backend response contract remains prose-only.                                                                                                              |
|  11 | Delivery creation     | `/deliveries/new`             | DONE    | Full delivery only; real-backend response contract remains prose-only.                                                                                          |
|  12 | Returns               | `/returns`                    | DONE    | Real-backend integration not verified.                                                                                                                          |
|  13 | Return creation       | `/returns/new`                | WAITING | Preview and return processing/request fields are not defined.                                                                                                   |
|  14 | Products              | `/products`                   | DONE    | Unsupported reference-only fields are not enabled.                                                                                                              |
|  15 | Inventory summary     | `/inventory`                  | DONE    | Real-backend integration not verified.                                                                                                                          |
|  16 | Inventory movements   | `/inventory/movements`        | DONE    | Real-backend integration not verified.                                                                                                                          |
|  17 | Inventory adjustments | `/inventory/adjustments`      | WAITING | Create route exists; dedicated adjustment history endpoint is missing.                                                                                          |
|  18 | Finance               | `/finance`                    | DONE    | Reference is a populated finance dashboard; current screen is a permission-filtered route hub (MAJOR parity gap).                                               |
|  19 | Containers            | `/containers`                 | DONE    | Several container response fields are prose-only.                                                                                                               |
|  20 | Container receipt     | `/containers/:id/receive`     | WAITING | Receipt schemas and supplier lookup are incomplete.                                                                                                             |
|  21 | Landed cost           | `/containers/:id/landed-cost` | WAITING | Backend-computed preview endpoint is missing.                                                                                                                   |
|  22 | Reports center        | `/reports`                    | DONE    | Report data availability is contract-dependent.                                                                                                                 |
|  23 | Sales report          | `/reports/sales`              | DONE    | Paginated report rows work; reference aggregate KPIs/chart are absent from the API response (MAJOR parity gap).                                                 |
|  24 | Profit report         | `/reports/invoice-profit`     | WAITING | Success response schema is prose-only; required reference summary/chart aggregates are not defined (MAJOR parity gap).                                          |
|  25 | Users and permissions | `/admin/users`                | WAITING | User administration collection and role/grant endpoints are missing.                                                                                            |
|  26 | Warehouses            | `/warehouses`                 | DONE    | Real-backend integration not verified.                                                                                                                          |
|  27 | Inventory report      | `/reports/stock`              | DONE    | Inventory rows work; reference stock KPIs are not in the documented response (MAJOR parity gap).                                                                |
|  28 | Financial reports     | `/reports/financial`          | PARKED  | Accountant-waiting state; reference financial figures are intentionally not fabricated (MAJOR parity gap).                                                      |
|  29 | General settings      | `/admin/settings`             | WAITING | Sales tax is implemented; general company and numbering settings are not in the contract.                                                                       |

Additional routed screens:

| Screen                  | Route                              | Status  | Notes                                                         |
| ----------------------- | ---------------------------------- | ------- | ------------------------------------------------------------- |
| Categories              | `/categories`                      | DONE    | Product/category API-supported state.                         |
| Opening stock           | `/inventory/opening-stock`         | DONE    | Posts through the documented inventory endpoint.              |
| Inventory transfers     | `/inventory/transfers`             | DONE    | Server-owned movement values.                                 |
| Damaged stock           | `/inventory/damaged`               | PARKED  | Waiting on approved damaged-stock workflow.                   |
| Customer statement      | `/customers/:customerId/statement` | DONE    | Server response owns balance and statement totals.            |
| Invoice detail/history  | `/invoices/:documentId`            | DONE    | Owner-only history is permission-gated.                       |
| Invoice edit            | `/invoices/:documentId/edit`       | WAITING | Revision identifiers and preview contract are not documented. |
| Order detail            | `/orders/:orderId`                 | WAITING | Response schema is prose-only; cancellation is missing.       |
| Delivery detail         | `/deliveries/:deliveryId`          | WAITING | Response schema is prose-only.                                |
| Container detail        | `/containers/:containerId`         | WAITING | Several response fields are prose-only.                       |
| Treasury                | `/finance/treasury`                | DONE    | Supported list and post flows; live server not verified.      |
| Treasury transfers      | `/finance/transfers`               | DONE    | Supported transfer flow; live server not verified.            |
| Expenses                | `/finance/expenses`                | DONE    | Supported expense flow; live server not verified.             |
| Currencies              | `/finance/currencies`              | PARKED  | EGP only.                                                     |
| Chart of accounts       | `/finance/chart-of-accounts`       | PARKED  | Accountant/API approval pending.                              |
| Financial adjustments   | `/finance/adjustments`             | PARKED  | Accountant/API approval pending.                              |
| Stock-movement report   | `/reports/stock-movements`         | DONE    | Uses documented movement list fields.                         |
| Container-cost report   | `/reports/container-costs`         | WAITING | Response schema remains prose-only.                           |
| Customer-balance report | `/reports/customer-balances`       | WAITING | Authoritative report schema/data needs confirmation.          |
| Audit log               | `/admin/audit`                     | DONE    | Owner-only audit read; real server behavior not verified.     |

See [FRONTEND_API_REQUESTS.md](../../docs/frontend/FRONTEND_API_REQUESTS.md) for the complete missing endpoint/schema and unsupported-field list.

## Parity evidence

The final capture generated 96 React screenshots and all 75 available reference comparisons across 1440, 768 and 390 pixels. Each comparison's status, reviewed difference, real pixel metrics, side-by-side and pixel diff is in [`frontend/parity-report/REPORT.md`](../parity-report/REPORT.md).

**Parity outcome: NOT ACCEPTED.** There are major unresolved differences for dashboard, invoice print, finance, and sales/profit/inventory/financial reports. Data absent from the contract remains unavailable rather than fabricated. All remaining available comparisons are `MINOR DIFFERENCES`; no screenshot qualifies as `MATCH` under the strict criterion. Seven screens have no populated reference baseline at any viewport: categories, adjustments, opening stock, inventory transfers, container receipt, landed cost, and settings. Their status is `NO BASELINE`, and they are not treated as matches. The 42 reference key states still have no React-state parity capture and remain NOT VERIFIED.

### Final parity table

Each width cell represents one of the 75 reviewed comparisons. The notes name the visible differences; the detailed images and numeric measures are linked above.

| Screen            | 1440px            | 768px             | 390px             | Reviewed difference                                                                                           |
| ----------------- | ----------------- | ----------------- | ----------------- | ------------------------------------------------------------------------------------------------------------- |
| Dashboard         | MAJOR             | MAJOR             | MAJOR             | Reference demo chart, transactions and KPI values are populated; React correctly withholds undocumented data. |
| Customers         | MINOR DIFFERENCES | MINOR DIFFERENCES | MINOR DIFFERENCES | Filter grouping and row-action placement differ.                                                              |
| Orders            | MINOR DIFFERENCES | MINOR DIFFERENCES | MINOR DIFFERENCES | Toolbar and table/card spacing differ.                                                                        |
| Order creation    | MINOR DIFFERENCES | MINOR DIFFERENCES | MINOR DIFFERENCES | Unsupported fields/preview omitted; mobile form stacks responsively.                                          |
| Order detail      | MINOR DIFFERENCES | MINOR DIFFERENCES | MINOR DIFFERENCES | Reference-only summary actions/values absent; supported detail remains.                                       |
| Invoices          | MINOR DIFFERENCES | MINOR DIFFERENCES | MINOR DIFFERENCES | Filter and action placement differ.                                                                           |
| Invoice creation  | MINOR DIFFERENCES | MINOR DIFFERENCES | MINOR DIFFERENCES | Unsupported live preview and sample totals omitted.                                                           |
| Invoice print     | MAJOR             | MAJOR             | MAJOR             | Customer-business branding, product lines and notes unavailable; paper layout differs.                        |
| Collections       | MINOR DIFFERENCES | MINOR DIFFERENCES | MINOR DIFFERENCES | Toolbar and allocation spacing differ; unallocated remainder is distinct.                                     |
| Deliveries        | MINOR DIFFERENCES | MINOR DIFFERENCES | MINOR DIFFERENCES | Search/filter grouping and status presentation differ.                                                        |
| Delivery creation | MINOR DIFFERENCES | MINOR DIFFERENCES | MINOR DIFFERENCES | Unsupported recipient/transport fields omitted.                                                               |
| Returns           | MINOR DIFFERENCES | MINOR DIFFERENCES | MINOR DIFFERENCES | Filter and empty-state placement differ.                                                                      |
| Return creation   | MINOR DIFFERENCES | MINOR DIFFERENCES | MINOR DIFFERENCES | Source controls differ; preview/unsupported request fields unavailable.                                       |
| Products          | MINOR DIFFERENCES | MINOR DIFFERENCES | MINOR DIFFERENCES | Unsupported purchase/cost fields remain hidden; column widths differ.                                         |
| Inventory summary | MINOR DIFFERENCES | MINOR DIFFERENCES | MINOR DIFFERENCES | Unavailable summary metrics omitted; filter density differs.                                                  |
| Movements         | MINOR DIFFERENCES | MINOR DIFFERENCES | MINOR DIFFERENCES | Search/filter grouping and table density differ.                                                              |
| Finance           | MAJOR             | MAJOR             | MAJOR             | Reference has populated account/expense/treasury panels; React is a permission-filtered route hub.            |
| Containers        | MINOR DIFFERENCES | MINOR DIFFERENCES | MINOR DIFFERENCES | Filter grouping and details density differ.                                                                   |
| Reports center    | MINOR DIFFERENCES | MINOR DIFFERENCES | MINOR DIFFERENCES | Link-card grouping/spacing differs.                                                                           |
| Sales report      | MAJOR             | MAJOR             | MAJOR             | Reference aggregate KPIs/chart/breakdowns are not returned by the paginated API.                              |
| Profit report     | MAJOR             | MAJOR             | MAJOR             | Reference aggregate profitability panels are not in the documented response.                                  |
| Inventory report  | MAJOR             | MAJOR             | MAJOR             | Reference stock KPI summary is not in the documented response.                                                |
| Financial report  | MAJOR             | MAJOR             | MAJOR             | Reference figures intentionally withheld pending accountant-approved API.                                     |
| Users             | MINOR DIFFERENCES | MINOR DIFFERENCES | MINOR DIFFERENCES | User collection and role/grant endpoints are missing; waiting state differs from demo data.                   |
| Warehouses        | MINOR DIFFERENCES | MINOR DIFFERENCES | MINOR DIFFERENCES | Action placement and table spacing differ.                                                                    |

`NO BASELINE` at 1440px, 768px and 390px: categories, adjustments, opening stock, inventory transfers, container receipt, landed cost, and settings. Built from the UI specification only.

## Accessibility and manual checks

Automated axe scan: 32 routes including login; 0 violations, including color contrast, after the contrast-token adjustments. This is an automated scan only.

Manual accessibility checks still required (**NOT VERIFIED**):

- Keyboard-only order: tab/shift-tab through login, shell navigation, tables and primary forms; verify visible focus at all breakpoints and both themes.
- Dialog/modal focus entry, containment, Escape/confirmation behavior and focus return to the trigger.
- Screen-reader names, table/card navigation, label/error association and announcements for loading, errors and toasts.
- Browser print output and the session-timeout warning/restoration flow.
- Real-device checks on phones/tablets/desktops, including touch targets, zoom, orientation and print.
- Live step-up and permission behavior with the backend; owner acceptance.

## API contract and security-relevant behavior

`npm run contract:check` checks 62 unique method/path calls in 11 frontend API modules against `frontend/api-contract/openapi.snapshot.yaml`; latest recorded result: **0 missing method/path operations**. This verifies path/method existence only, not request/response schema agreement or live backend compatibility.

The HTTP client uses same-origin `/api/v1`, cookie credentials, CSRF token header when present, request IDs, idempotency keys for posting requests, step-up retry on HTTP 428, and redirects unauthorized requests through the session handler. Permission gates and navigation use the permissions returned for the current server session: drivers without `costs.view`, `profit.view`, or finance permissions do not see those protected fields/routes; owners with `*` see all permitted screens/actions. These behaviors have frontend mock tests, not live-server verification. Money and quantities are formatted from strings; authoritative totals, tax, balances and stock are not browser-calculated. Business data is not intentionally stored in browser storage. Real server behavior for all these policies is **NOT VERIFIED**.

## Validation and build

### Bundle sizes

Before route-level lazy loading, the production build emitted one `index` JavaScript bundle of **517.10 kB minified / 137.24 kB gzip** and the Vite >500 kB chunk advisory. After splitting, `index` is **257.67 kB / 84.53 kB gzip** (50.2% smaller); the login route is loaded as a separate **89.20 kB / 25.14 kB gzip** chunk. The initial login transfer therefore includes 346.87 kB / 109.67 kB gzip of JS, 32.9% / 20.1% less than the previous single bundle. The final build emits no chunk-size advisory.

### Final command output

Commands were run from `frontend/`; all exited successfully:

```text
npm run typecheck
> tsc --noEmit
Exit 0

npm run lint
> eslint .
Exit 0

npm test
Test Files  22 passed (22)
     Tests  69 passed (69)

npm run build
vite v5.4.21 building for production...
✓ 170 modules transformed.
dist/assets/index-xrYqayeK.js 257.67 kB │ gzip: 84.53 kB
dist/assets/LoginPage-CEgpKqdv.js 89.20 kB │ gzip: 25.14 kB
✓ built in 2.80s
Checked 64 production files; no unapproved external URL literals found.
No chunk-size advisory.

npm run contract:check
Checked 62 unique API method/path calls from 11 API modules; 0 missing from the OpenAPI snapshot.

npm run a11y
Accessibility scan complete: 32 routes; 0 violations.

npm run capture:parity
Captured 96 React route screenshots; compared 75 against populated reference.
Wrote 75 side-by-side images, 75 pixel-diff images, and parity-report/REPORT.md.
```

`npx prettier --check` on changed source, scripts and docs reported all files formatted; `git diff --check` passed. Accessibility/parity browser checks used installed Microsoft Edge via `PLAYWRIGHT_CHROMIUM_EXECUTABLE`.

The production build includes `scripts/check-dist-external-urls.mjs`; the final build checked 64 production files and found no unapproved external URL literals. Vite source maps are not explicitly enabled. Production `npm audit --omit=dev` reported zero vulnerabilities. Full `npm audit` reported 2 critical (`tinypool`, `vitest`), 1 high (`vite`) and 3 moderate (`@vitest/mocker`, `esbuild`, `vite` transitive) findings; all are in development-only dependency trees and none are in the production dependency audit. No upgrades were applied; avoid breaking-major automatic remediation and reassess compatible, safe upgrades separately.

## WAITING endpoints and unsupported fields

See the canonical, prioritized endpoint/field list and satisfaction state in [FRONTEND_API_REQUESTS.md](../../docs/frontend/FRONTEND_API_REQUESTS.md). Key blockers include invoice/order/return preview, customer detail, user administration, order cancellation, landed-cost preview, supplier lookup, general settings, and accountant-approved accounting endpoints. Several finance, report, order, delivery and container response schemas need formal OpenAPI schemas rather than prose.

Unsupported reference fields remain hidden rather than simulated: customer email/address/salesperson/tax number/payment terms and attachments; product purchase price/default warehouse/tax rate/description; and order/delivery fields absent from their request schemas.

| Hidden field/workflow                                                        | Screen               | Status                                                                                        |
| ---------------------------------------------------------------------------- | -------------------- | --------------------------------------------------------------------------------------------- |
| Customer email, address, salesperson, tax number, payment terms, attachments | Customer create/edit | HIDDEN — absent from the documented request schema.                                           |
| Product purchase price, default warehouse, tax rate, description             | Product create/edit  | HIDDEN — absent from the documented request schema; no client-side feature toggle exposes it. |
| Order warehouse/payment terms and delivery date/transport method             | Order/delivery forms | HIDDEN — request schemas do not support these fields.                                         |
| Invoice/order/return preview totals and tax breakdown                        | Create/edit flows    | WAITING — server preview endpoints are missing; browser calculations are prohibited.          |
| Supplier selection and landed-cost allocation preview                        | Container/cost flows | WAITING — supplier lookup and server preview endpoints are missing.                           |
| Multiple currencies                                                          | Currency settings    | PARKED — EGP only.                                                                            |

## NOT VERIFIED

- Live-backend integration (covered by the separate integration phase); cookie, CSRF, step-up, endpoint schema and response behavior on the real server.
- Real phones/tablets/desktops/printers.
- Manual accessibility checks listed above.
- Owner acceptance.
- React captures of the reference's 42 key states.
- WAITING/PARKED workflows after the required endpoints, schemas and accounting decisions are available.
- The 21 `MAJOR` comparisons remain release-blocking; no `frontend-v1.0` tag is appropriate until they are resolved and the visual parity table is accepted.
