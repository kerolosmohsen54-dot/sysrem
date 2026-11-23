# Figma Visual Parity Progress

## Current status

- **Current part:** Part 2B — pages 9–15; implementation, verification, and visual comparisons complete; final commit metadata pending.
- **Last completed part:** Part 2A — pages 1–8; committed as `b3f36e28248944d67522a4200ec1ec4397ba6f38`.
- **Reference raster output:** `C:\Users\s\Documents\PrecisionSlateFigmaRaster\` (outside the repository; 172 PNGs and contact sheets).
- **Part 1 commit:** `5263b9bb1924a5f81942788acb227514facfce68`.
- **Next part:** Part 3 — pages 16–35, retaining MSW.
- **Current inventory status counts:** 0 MATCH, 14 DIFFERENT, 24 MISSING, 134 NOT VERIFIED (all 172 pages accounted for).
- **Visual compare status:** Pages 1 and 3–15 are DIFFERENT at a 1440px viewport width; page 2's invalid-login state is NOT VERIFIED. See `FIGMA_PARITY_REPORT.md`.
- **Open questions:** Screen/API gaps for pages 3, 5–15 are documented in `FIGMA_PARITY_REPORT.md`; do not invent fields, aggregates, or endpoints.

## Part history

| Part | Status | Commit | Next |
|---|---|---|---|
| 0 — inventory | Complete; 172 pages rasterized, page-by-page inventory, candidate route mappings, visible states, route-less references, extras, and part split documented. No code changed. | `aa2c7d8`, `613c673` | Part 1 — Figma tokens and shared shell |
| 1 — design tokens and shell | Complete for shared shell geometry, desktop tokens, and observed contrast failures. Page 4 compared at 1440 × 1258; dashboard content and shared modal/toast/dropdown/notification states remain NOT VERIFIED. | `5263b9bb1924a5f81942788acb227514facfce68` | Part 2A — pages 1–8 |
| 2A — pages 1–8 | Implementation and tests complete; screenshots compared for pages 1, 3, 5, 6, 7, and 8 at 1440px viewport width. All six differ from the reference; page 2's invalid-login state is NOT VERIFIED. | `b3f36e28248944d67522a4200ec1ec4397ba6f38` | Part 2B — pages 9–15 |

## Proposed parts in PDF order

The PDF contains 172 screenshot pages, many of which are modal, tab, or repeated workflow states rather than distinct screens. Work is grouped by logical screens while retaining first-appearance order; pages without a matching API remain open questions and must not be invented.

| Part | Page range | Screen groups |
|---|---|---|
| 1 — design foundation | Shared across pages | Figma design tokens, shell, navigation, shared controls, responsive behavior, and accessibility contrast corrections. |
| 2A — sales/order start | 1-8 | Login, dashboard, invoice creation, customers, order list/create/detail. |
| 2B — sales follow-on | 9-15 | Invoice list, collections dashboard, invoice print, delivery-note list/create, returns list/create modal. |
| 3 — catalog and inventory | 16-35 | Products/categories, balances, movements, warehouses, stock reports/add/returns, governorates, deleted items, shipping drivers, audit history. |
| 4 — finance core | 36-54 | Finance overview, collections, revenues/payments, expenses, transfers, treasury, balances, financial adjustments, chart of accounts, container balances. Gate unsupported finance/accounting screens on the open questions. |
| 5 — finance and utilities | 55-70 | Finance tabs, customer settlement, budgets, recurring expenses, comparisons, cash forecast, container tracking, reorder threshold, stocktake, barcode, cost history, Excel import, daily summary, install prompt and notes. Gate unsupported items on the open questions. |
| 6 — invoices and orders | 71-103 | Sales/return invoice states, invoice list, containers, finance tabs, order detail tabs and overlays. |
| 7 — customers and imports | 104-135 | Customer list and invoice overlays, invoice/customer modal states, finance states, notes, Excel import, barcode. |
| 8 — customer detail and closing states | 136-172 | Customer detail tabs, finance tab states, print previews, component reference sheet, invoice validation/modals and container screens. |

## Part 0 verification

- Rasterization: temporary `pdfjs-dist` + `@napi-rs/canvas`, installed outside the repository, no global installation.
- PDF pages: 172/172 rasterized successfully to PNG; width 1440px on every page, height varies 1000-1318px.
- Text extraction: sampled pages yielded no embedded text; headings were transcribed visually. Unreadable/cropped pages are explicitly NOT VERIFIED.
- Frontend routes: inspected `frontend/src/app/App.tsx` and `frontend/src/shared/constants/routes.ts`.
- API reference: inspected the route inventory in read-only `backend/docs/openapi.yaml`; no backend files were changed.
- `npm run typecheck`: PASS, exit 0.
- `npm run lint`: PASS, exit 0.
- `npm test`: first run after the final shared-component edits had 1 failure/73 passes in `finance-reports.test.tsx` (`Unable to find role="heading" and name "حسابات الخزينة"`); the immediate full-suite rerun passed 22 files and 74/74 tests. The failure did not reproduce, per the project test rule.
- Side-by-side comparisons: NOT RUN in Part 0.
- Database: NOT ACCESSED.
- Status rules: do not claim visual MATCH/DIFFERENT before a same-width screenshot comparison; no such comparison was done in this inventory.

## Part 1 verification

- Sampled page 4 directly from its PNG; exact pixel samples and visual estimates are recorded in `FIGMA_TOKENS.md`.
- Live frontend screenshot: `/dashboard` at 1440 × 1258 using the local Vite server and existing MSW setup. Compared shell geometry against page 4; the dashboard body is DIFFERENT.
- Responsive layout check: 1440, 1100, 768, and 600px widths all had matching viewport/document widths; no Figma responsive screenshots exist, so visual responsive parity is NOT VERIFIED.
- `npm run typecheck`: PASS, exit 0.
- `npm run lint`: PASS, exit 0.
- `npm test`: PASS, 22 files and 74/74 tests.
- `npm run build`: PASS; Vite production build succeeded and the external-URL check scanned 67 production files with no unapproved URL literals.
- `npm run a11y`: default launch first failed because Playwright's configured Chromium executable was absent. Retried with the installed Microsoft Edge executable; PASS, 34 views and 0 axe violations. No browser was installed or downloaded.
- Dark and light theme axe spot-checks: 0 violations after the shared contrast changes. Existing automated accessibility widths 390px and 768px had no horizontal overflow.
- `git diff --check`: PASS. Database: NOT ACCESSED. Backend and mobile application: unchanged. MSW remains in use.
- NOT VERIFIED: exact font identity and raster-derived type scale; responsive Figma parity; screen-level dashboard body; same-content modal/toast/dropdown/notification-panel visual states.
- Open questions: three reference shortcut destinations without matching routes (control center, deleted items, shipping-company drivers); see the parity report.

## Part 2A verification — pages 1–8

- Updated login, invoice form, orders list/create/detail, shared empty-table rendering, and detail tabs using only existing frontend behavior and API fields; MSW remains the runtime source. No backend/mobile files or database were changed/accessed.
- Browser captures used a 1440px-wide viewport and the matching raster pages. Pages 1, 3, 5, 6, 7, and 8 were compared and are DIFFERENT. Page 4 remains DIFFERENT from Part 1. Pages 3 and 7 have taller PDF frames than the 1000px browser viewport, so their full-page vertical comparison is NOT VERIFIED.
- Page 1's phone-only reference remains different from username/password login, per the owner's decision. Page 2's rejected-credentials state is NOT VERIFIED because the default MSW login accepts non-empty credentials.
- Page 3 shows invoice inputs/sections not represented by the current create/preview contract. Page 5 shows customer aggregate/filter controls and an empty state while the current API-backed fixture returns three customers. Pages 6–7 differ in unsupported list/form fields and workflow controls. Page 8's contract/tracking/financial summary is not available in the current order response. No unsupported fields were fabricated; details are in `FIGMA_PARITY_REPORT.md`.
- Added supported order list status buttons/empty table headers, an order-create-and-confirm action using the existing create and confirm operations, and data/items/reservations/deliveries/invoices detail tabs backed only by returned data. Removed the stale cancellation-unavailable hint because the documented cancel operation exists.
- `npm ls --depth=0` — PASS, exit 0.
- `npm run typecheck` — PASS, exit 0.
- `npm run lint` — first run found the now-unused `FormEvent` import after form-submit refactoring; removed it. Final rerun PASS, exit 0.
- `npm test` — an initial run after the empty-table edit failed 1/74 because the same empty message rendered twice; changed to a single message in the table row. Rerun: 22 files, 74/74 passed. A later full run had one non-reproducing finance-reports heading timeout (1 failed/73 passed); the immediate rerun passed 22/22 files and 74/74 tests, satisfying the established flaky-run rule.
- `npm run build` — PASS; 173 modules transformed; external-URL check scanned 67 production files with no unapproved URL literals.
- `npm run a11y` with installed Microsoft Edge — PASS, 34 views and 0 axe violations; dashboard width checks: viewport/document 390/390px and 768/768px. The script does not include `/orders/:orderId`; that route's axe result is NOT VERIFIED.
- `git diff --check` — PASS. Database: NOT ACCESSED. Backend and mobile application unchanged.
- NOT VERIFIED: page 2 invalid-login screen; full-page height comparison for pages 3 and 7; screen-level matches for all six compared screens (each remains DIFFERENT); axe on order detail; live API/auth and any real database behavior.
- Open questions are listed in `FIGMA_PARITY_REPORT.md`. Commit hash: `b3f36e28248944d67522a4200ec1ec4397ba6f38`.

## Part 2B verification — pages 9–15

- Updated the invoice list with the documented customer filter, the collections screen with a paginated invoice ledger, delivery list status filters using the documented status enum, and the returns list-to-modal flow. Removed the unsupported invoice status query and kept return submission disabled where the documented create contract is insufficient. MSW remains enabled; no backend, mobile, database, or live API changes/access.
- Corrected page inventory to the rasterized PDF: 9 invoices list, 10 collections dashboard, 11 invoice print preview, 12 delivery notes list, 13 create delivery note, 14 returns list, and 15 new-return modal.
- Captured the authenticated frontend at a verified 1440×1000 browser viewport and compared each of pages 9–15 to its 1440px-wide raster. All seven are DIFFERENT: page 9 has seeded invoices and lacks reference status controls; page 10 lacks API-backed summary metrics and has seeded ledger rows; page 11 differs in branding and the server response has no line-item details; page 12 lacks reference KPI cards/columns; page 13's contract-backed form lacks reference delivery date, warehouse/method, and item quantities; page 14 differs in table columns and empty-table treatment; page 15 lacks return detail fields/items not supported by the create contract. No unsupported fields or metrics were invented.
- `npm run typecheck` — PASS, exit 0.
- `npm run lint` — PASS, exit 0.
- `npm test -- --run tests/integration/invoice-list.test.tsx tests/integration/returns-page.test.tsx` — PASS, 2 files / 4 tests.
- `npm test -- --run tests/integration/orders-deliveries.test.tsx tests/integration/collections-page.test.tsx` — PASS, 2 files / 6 tests.
- `npm test` — PASS, 22 files / 77 tests.
- `npm run build` — PASS, 173 modules transformed; external-URL check scanned 67 production files with no unapproved URL literals.
- `npm run a11y` with installed Microsoft Edge — first run found 1 `landmark-unique` violation on the invoice-ledger pagination region. Added a distinct accessible label; rerun PASS, 34 views / 0 axe violations, and 390px/768px dashboard widths had no horizontal overflow.
- `git diff --check` — PASS. A first set of npm commands from the repository root failed with `ENOENT` because `package.json` is under `frontend/`; rerunning from `frontend/` produced the results above. Database: NOT ACCESSED.
- NOT VERIFIED: exact pixel/geometry measurements beyond the side-by-side page comparisons; live API/auth behavior; unsupported fields, aggregates, and return-create payload gaps; final Part 3 screens. `npm ls --depth=0` was NOT RUN in this part.
- Open questions are listed in `FIGMA_PARITY_REPORT.md`. Commit hash: pending.
