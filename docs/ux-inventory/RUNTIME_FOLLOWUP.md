# Runtime follow-up — 2026-10-29

This is evidence added to the existing source audit. It does not replace the earlier report or certify full parity.

## Evidence and coverage

- Source inventory retained: 68 reference panels plus login, 557 interactive elements, 44 features, 10 flows, 8 overlays.
- Chromium rendered 67 panels plus login at 1280, 768, and 390. It produced 201 panel images, 3 login images, and 36 of 42 requested state images. `sec-liq` was absent from the initialized Chromium DOM.
- React test mode produced 96 route images (32 routes × 3 viewports) and 75 raw image pairs. The route harness used history.pushState; it did not click the navigation controls. Only six image pairs were manually reviewed.
- Live React with loopback Laravel was inspected at the unauthenticated login screen only. GET /api/v1/auth/me returned 401. No credentials were submitted.
- In MSW mode, one login click returned 200 and reached /dashboard. Separate direct mock API calls returned 201 for order creation and 200/status confirmed for confirmation. These are not a complete UI flow or database persistence evidence.
- Frontend test suite passed: 44 files / 197 tests, in jsdom with MSW.

## GAP-0027 — Mobile navigation differs from the v43 reference

- **Category:** RESPONSIVE_GAP
- **Priority:** P2
- **Confidence:** High for the visible 390px difference; application data used MSW.
- **Affected Module:** App shell navigation
- **Affected Screen IDs:** SCR-001 and mobile shell
- **Affected Element IDs:** Responsive navigation; no one-to-one reference element IDs
- **Related Feature IDs:** Navigation / app shell
- **Related Flow IDs:** All navigation flows
- **Design Reference:** `docs/ux-inventory/screenshots/reference/screens/dashboard-390.png`
- **Current System Evidence:** `docs/ux-inventory/screenshots/system-mock/dashboard_visible_390.png`; `frontend/src/app/layouts/AppShell.tsx`
- **Expected Behavior:** At 390px, use the navigation controls and placement shown in the approved reference.
- **Actual Behavior:** React uses a fixed four-item bottom bar (home/search/add/menu) and hides the desktop sidebar; the reference capture has top navigation and no corresponding bottom bar.
- **Exact Missing or Incorrect Detail:** Persistent navigation placement and pattern differ.
- **Why This Is a Gap:** Navigation occupies a different screen region and changes the available content area.
- **User Impact:** Mobile users encounter a different route-finding pattern than the approved design.
- **Business Impact:** None verified.
- **Technical Impact:** Responsive app-shell layout.
- **Root Cause:** Visible divergence confirmed; implementation cause unknown.
- **Dependencies:** None identified for the visual correction.
- **Suggested Corrective Action:** Align the 390px navigation to v43 while preserving access to every current route.
- **Acceptance Criteria:** At 390px the same navigation controls appear in the same locations as v43 and do not cover screen content.
- **Recommended Verification Method:** Matched screenshots plus touch and keyboard navigation through each item.
- **Implementation Complexity:** Medium
- **Open Questions:** None for the visible difference; all menu actions remain untested.

## GAP-0028 — Login form presentation differs from the v43 reference

- **Category:** VISUAL_MISMATCH
- **Priority:** P2
- **Confidence:** High for the visible 390px difference.
- **Affected Module:** Authentication UI
- **Affected Screen IDs:** SCR-000
- **Affected Element IDs:** ELM-0001, ELM-0002, ELM-0003
- **Related Feature IDs:** F-001
- **Related Flow IDs:** FLOW-001
- **Design Reference:** `docs/ux-inventory/screenshots/reference/states/login-390.png`
- **Current System Evidence:** `docs/ux-inventory/screenshots/system-live/login_390.png`; `frontend/src/features/auth/LoginPage.tsx`
- **Expected Behavior:** Match the reference username control, labels, logo scale, and submit-button copy/layout.
- **Actual Behavior:** Reference shows a username select with a preselected demo user and button label “تسجيل الدخول”; live React shows a blank text input, button label “دخول”, and a larger logo.
- **Exact Missing or Incorrect Detail:** Username control type/default, submit copy, and logo scale differ.
- **Why This Is a Gap:** The first screen differs in both affordance and visual hierarchy.
- **User Impact:** Sign-in looks and reads differently from v43.
- **Business Impact:** Authentication correctness is not established as broken.
- **Technical Impact:** Login component and styling.
- **Root Cause:** Visual difference confirmed; cause unknown.
- **Dependencies:** Live valid/invalid authentication remains unverified.
- **Suggested Corrective Action:** Align login UI with the reference while retaining the configured API contract.
- **Acceptance Criteria:** At 390px the field type, copy, logo scale, and spacing match v43; valid login still uses the API.
- **Recommended Verification Method:** Matched screenshots and live isolated-account valid/invalid login tests.
- **Implementation Complexity:** Small
- **Open Questions:** Live test credentials were not available; no live login was attempted.

## GAP-0029 — Finance screen hierarchy differs from the v43 reference

- **Category:** VISUAL_MISMATCH
- **Priority:** P2
- **Confidence:** High for section/layout difference; values were not data-matched.
- **Affected Module:** Finance
- **Affected Screen IDs:** SCR-017
- **Affected Element IDs:** Finance actions and customer-account section
- **Related Feature IDs:** Finance feature records in INVENTORY.csv
- **Related Flow IDs:** FLOW-006, FLOW-007
- **Design Reference:** `docs/ux-inventory/screenshots/reference/screens/finance-390.png`
- **Current System Evidence:** `docs/ux-inventory/screenshots/system-mock/fresh/finance_390.png`; `frontend/src/features/finance/FinancePage.tsx`
- **Expected Behavior:** Preserve the reference finance tabs, customer-account table, expense section, and their hierarchy at 390px.
- **Actual Behavior:** React places four full-width action buttons before treasury cards, followed by a different section order.
- **Exact Missing or Incorrect Detail:** Tab/table-oriented finance layout and action placement differ.
- **Why This Is a Gap:** Financial navigation and account review appear in a different order on mobile.
- **User Impact:** Core finance information is harder to scan in the reference order.
- **Business Impact:** No numerical/accounting mismatch is asserted; fixtures differ.
- **Technical Impact:** Finance page structure and responsive layout.
- **Root Cause:** Visible divergence confirmed; data/API cause unknown.
- **Dependencies:** Matching finance fixtures are needed to compare values and rows.
- **Suggested Corrective Action:** Align the mobile sections and action placement with v43 without removing current finance operations.
- **Acceptance Criteria:** Tabs, table, and expense section follow reference order at 390px; all current actions remain reachable.
- **Recommended Verification Method:** Matched 390px images and API-backed interaction checks for each section.
- **Implementation Complexity:** Medium
- **Open Questions:** Which fixture represents the approved populated finance state?

## GAP-0030 — Order creation omits reference form sections and controls

- **Category:** MISSING_ELEMENT
- **Priority:** P2
- **Confidence:** High for visible field/section differences; live submission was not tested.
- **Affected Module:** Sales orders
- **Affected Screen IDs:** SCR-004
- **Affected Element IDs:** Order-entry fields and summary controls
- **Related Feature IDs:** Orders feature records in INVENTORY.csv
- **Related Flow IDs:** FLOW-003
- **Design Reference:** `docs/ux-inventory/screenshots/reference/screens/order-create-1280.png`
- **Current System Evidence:** `docs/ux-inventory/screenshots/system-mock/fresh/order-create_1280.png`; `frontend/src/features/orders-deliveries/OrderFormPage.tsx`
- **Expected Behavior:** Show the reference order-number/customer/date/currency/sales-representative/payment-terms/warehouse groups, item table, and financial summary.
- **Actual Behavior:** React shows customer/date/requested-delivery/notes and product-entry cards with a server-provided stock/summary state. Several reference fields and the summary arrangement are absent from the rendered form.
- **Exact Missing or Incorrect Detail:** Form groups and item-table/summary hierarchy differ; this is a visible UI finding.
- **Why This Is a Gap:** The main order-entry screen exposes different information and controls than v43.
- **User Impact:** Users cannot find the same order details and totals in the same places.
- **Business Impact:** No new business rule is inferred.
- **Technical Impact:** Order form structure and API field contract need reconciliation.
- **Root Cause:** Visible difference confirmed; backend contract support remains unknown.
- **Dependencies:** Same seeded customer/catalog/order data is needed for behavior comparison.
- **Suggested Corrective Action:** Reconcile the form with v43 and document any reference fields unsupported by the API.
- **Acceptance Criteria:** Each reference field is present or its unsupported contract is explicitly documented; item rows and totals follow the reference hierarchy.
- **Recommended Verification Method:** Same-fixture screenshots, then create/cancel/confirm in an isolated backend fixture.
- **Implementation Complexity:** Medium
- **Open Questions:** Which reference-only fields are intentionally excluded by the current API contract?

## Existing findings with updated evidence

- **GAP-0020 dashboard:** Reference shows seeded KPIs/chart/treasury/activity; React MSW mode shows “غير متاح من الخادم” where the mock response lacks chart/metric data. This confirms a mock-screen state difference, not live backend parity.
- **GAP-0024 / GAP-0025 sidebar and topbar:** Screenshot pairs at 1280/390 now supplement prior token evidence. Browser pixel dimensions were not measured separately.
- **Invoice print:** Reference and React screenshots use different invoice records. Keep print-content parity NOT_VERIFIED until both use the same fixture.
- **Reference runtime discrepancy:** Source inventory lists 68 panels; Chromium rendered 67. The missing panel is `sec-liq`. Six reference state images were unavailable because their target screens were absent.

