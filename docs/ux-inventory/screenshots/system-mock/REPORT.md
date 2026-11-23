# Browser capture report — 2026-10-29

## Reference render

- 67 discovered section-content panels were captured at 1280, 768 and 390 px (201 images), plus three login images.
- 36 of 42 requested reference state captures were produced. Six states targeted panels absent in Chromium.
- Source inventory lists 68 panels. sec-liq was absent from the initialized Chromium DOM.
- Panel/state visibility was changed programmatically; no reference control was clicked.
- The reference fixture was loaded locally. Login was hidden for panel screenshots. These are render captures, not verified user transitions.

## React mock-mode render

- 96 screenshots: 32 route targets × 3 viewports.
- 75 same-width reference/React image pairs and raw pixel-difference images were generated.
- Vite mode=test used VITE_MOCK_API=true and MSW. No database writes occurred.
- Paths were set through history.pushState, not clicked navigation. The order-detail target /orders/20001 returned 404; later batch captures may retain a transient toast.
- Image percentages are raw comparison measurements, not pass/fail classifications. The reference and React data fixtures are not unified.
- Clean isolated route captures: fresh/finance_390.png, fresh/order-create_1280.png, fresh/invoice-print_1280.png.

## Live React with loopback API

- Login screenshots: ../system-live/login_1280.png, ../system-live/login_768.png, ../system-live/login_390.png.
- GET /api/v1/auth/me returned 401 without a session. No credentials were submitted.
- No authenticated route, save action, or database persistence was tested.

## Manual image review

Six pairs were inspected: login/390, dashboard/1280, dashboard/390, finance/390, order-create/1280, and invoice-print/1280. The first five show visible differences. Invoice-print content remains NOT_VERIFIED because reference and app screenshots use different invoice fixtures.

