# Figma Visual Parity Inventory

**Reference:** `Untitled (3).pdf` (read-only), 172 pages.
**Inventory scope:** Part 0 inventory, incrementally updated through Part 2B (pages 1–15). Frontend screenshots were compared with the reference for pages 1, 3–15; no screen-level match is claimed.

## Rasterization and status meaning

- Rasterized all 172 pages at their native PDF scale using temporary `pdfjs-dist` and `@napi-rs/canvas` packages under the system temp directory. Nothing was installed globally or added to a project manifest.
- PNG output and contact sheets are outside the repository at `C:\Users\s\Documents\PrecisionSlateFigmaRaster\` (`page-001.png` through `page-172.png`, plus contact sheets). PDF width is 1440px throughout; page heights vary from 1000px to 1318px.
- PDF.js returned no extractable text for the sampled pages: the reference consists of raster screenshots. Names below are transcribed from visible Arabic headings; explicitly unclear pages are marked `NOT VERIFIED`.
- `NOT VERIFIED` means a plausible frontend route exists, but its visual comparison and state parity have not been tested.
- `MISSING` means the screenshot appears to show a distinct screen/action for which no matching frontend route was found in `frontend/src/app/App.tsx` and `frontend/src/shared/constants/routes.ts`. It does not assert that no related backend operation exists.
- Current incremental status: 0 MATCH, 14 DIFFERENT, 24 MISSING, and 134 NOT VERIFIED. Page 4 was compared during Part 1 and its dashboard body differs; pages 1 and 3–15 were compared during Parts 2A–2B and differ. Page 2's invalid-login state and pages with no legible content remain NOT VERIFIED.

## Page inventory

| Page | Screen / visible state | Candidate frontend route | Status |
|---:|---|---|---|
| 1 | Login, initial state | `/login` | DIFFERENT |
| 2 | Login, invalid credentials error | `/login` | NOT VERIFIED |
| 3 | Create sales invoice | `/invoices/new` | DIFFERENT |
| 4 | Dashboard | `/dashboard` | DIFFERENT |
| 5 | Customers list, empty (0 customers) | `/customers` | DIFFERENT |
| 6 | Orders list | `/orders` | DIFFERENT |
| 7 | Create sales order | `/orders/new` | DIFFERENT |
| 8 | Confirmed order detail, tabs | `/orders/:orderId` | DIFFERENT |
| 9 | Invoices list, empty with customer/date/status filters | `/invoices` | DIFFERENT |
| 10 | Collections dashboard, summary cards and empty invoice/receipt tables | `/collections` | DIFFERENT |
| 11 | Invoice print preview | `/invoices/:invoiceId/print` | DIFFERENT |
| 12 | Delivery notes list with status filters and summary cards | `/deliveries` | DIFFERENT |
| 13 | Create delivery note with source, warehouse/method, and item quantities | `/deliveries/new` | DIFFERENT |
| 14 | Returns list | `/returns` | DIFFERENT |
| 15 | New return modal | `/returns` (modal) | DIFFERENT |
| 16 | Products and categories | `/products` | NOT VERIFIED |
| 17 | Inventory balances by warehouse | `/inventory` | NOT VERIFIED |
| 18 | Inventory movements | `/inventory/movements` | NOT VERIFIED |
| 19 | Finance | `/finance` | NOT VERIFIED |
| 20 | Containers | `/containers` | NOT VERIFIED |
| 21 | Reports center | `/reports` | NOT VERIFIED |
| 22 | Sales report | `/reports/sales` | NOT VERIFIED |
| 23 | Profit and loss report | `/reports/invoice-profit` | NOT VERIFIED |
| 24 | Users and permissions | `/admin/users` | NOT VERIFIED |
| 25 | Warehouses | `/warehouses` | NOT VERIFIED |
| 26 | Inventory report | `/reports/stock` | NOT VERIFIED |
| 27 | Financial reports | `/reports/financial` | NOT VERIFIED |
| 28 | Governorates management | — | MISSING |
| 29 | Add stock / opening stock | `/inventory/opening-stock` | NOT VERIFIED |
| 30 | Returned stock | `/returns` (candidate only) | NOT VERIFIED |
| 31 | Deleted-items recycle bin | — | MISSING |
| 32 | Blank / no readable screen content | — | NOT VERIFIED |
| 33 | Blank / no readable screen content | — | NOT VERIFIED |
| 34 | Shipping-company driver management | — | MISSING |
| 35 | Operations history | `/admin/audit` | NOT VERIFIED |
| 36 | Financial overview | `/finance` | NOT VERIFIED |
| 37 | Collections / receipts | `/collections` | NOT VERIFIED |
| 38 | Other revenues | — | MISSING |
| 39 | Payments | — | MISSING |
| 40 | Expenses | `/finance/expenses` | NOT VERIFIED |
| 41 | Transfers | `/finance/transfers` | NOT VERIFIED |
| 42 | Treasuries and banks | `/finance/treasury` | NOT VERIFIED |
| 43 | Customer balances | `/reports/customer-balances` | NOT VERIFIED |
| 44 | Supplier balances | — | MISSING |
| 45 | Financial returns / adjustments | `/finance/adjustments` (candidate only) | NOT VERIFIED |
| 46 | Chart of accounts | `/finance/chart-of-accounts` | NOT VERIFIED |
| 47 | Daily journal entries | — | MISSING |
| 48 | General ledger account detail | — | MISSING |
| 49 | Trial balance | — | MISSING |
| 50 | Financial reports | `/reports/financial` | NOT VERIFIED |
| 51 | Blank / no readable screen content | — | NOT VERIFIED |
| 52 | Container transfers between locations | `/containers` (candidate only) | NOT VERIFIED |
| 53 | Returned stock to warehouse | — | MISSING |
| 54 | Container balances | `/containers` | NOT VERIFIED |
| 55 | Blank / no readable screen content | — | NOT VERIFIED |
| 56 | Finance, home tab | `/finance` | NOT VERIFIED |
| 57 | Customer settlement / liquidation | `/customers/:customerId/statement` (candidate only) | NOT VERIFIED |
| 58 | Expense budget | — | MISSING |
| 59 | Recurring expenses | — | MISSING |
| 60 | Month-to-month comparison | — | MISSING |
| 61 | Cash-flow forecast | — | MISSING |
| 62 | Container tracking | `/containers` (candidate only) | NOT VERIFIED |
| 63 | Minimum stock / reorder threshold | `/reports/stock` (candidate only) | NOT VERIFIED |
| 64 | Periodic stocktaking | `/inventory/adjustments` (candidate only) | NOT VERIFIED |
| 65 | Barcode printing | — | MISSING |
| 66 | Product purchase-price history | `/products/:productId/cost-history` | NOT VERIFIED |
| 67 | Excel import | — | MISSING |
| 68 | Daily summary | `/dashboard` (candidate only) | NOT VERIFIED |
| 69 | Install as mobile app / install prompt | — | MISSING |
| 70 | Personal notes | — | MISSING |
| 71 | Create sales invoice | `/invoices/new` | NOT VERIFIED |
| 72 | Create sales invoice | `/invoices/new` | NOT VERIFIED |
| 73 | Create sales invoice | `/invoices/new` | NOT VERIFIED |
| 74 | Create sales invoice | `/invoices/new` | NOT VERIFIED |
| 75 | Create sales invoice | `/invoices/new` | NOT VERIFIED |
| 76 | Create sales invoice | `/invoices/new` | NOT VERIFIED |
| 77 | Create sales invoice | `/invoices/new` | NOT VERIFIED |
| 78 | Create sales invoice | `/invoices/new` | NOT VERIFIED |
| 79 | Create sales invoice | `/invoices/new` | NOT VERIFIED |
| 80 | Create sales invoice | `/invoices/new` | NOT VERIFIED |
| 81 | Create return invoice | `/returns/new` | NOT VERIFIED |
| 82 | Create return invoice | `/returns/new` | NOT VERIFIED |
| 83 | Create return invoice | `/returns/new` | NOT VERIFIED |
| 84 | Create sales invoice | `/invoices/new` | NOT VERIFIED |
| 85 | Create sales invoice | `/invoices/new` | NOT VERIFIED |
| 86 | Invoices list | `/invoices` | NOT VERIFIED |
| 87 | Containers | `/containers` | NOT VERIFIED |
| 88 | Invoice form with customer lookup overlay | `/invoices/new` | NOT VERIFIED |
| 89 | Finance, home tab | `/finance` | NOT VERIFIED |
| 90 | Finance, withdrawals tab | `/finance` (candidate only) | NOT VERIFIED |
| 91 | Finance, incoming cash tab | `/finance` (candidate only) | NOT VERIFIED |
| 92 | Finance, pending funds tab | `/finance` (candidate only) | NOT VERIFIED |
| 93 | Finance, tab/state unclear | `/finance` (candidate only) | NOT VERIFIED |
| 94 | Finance, tab/state unclear | `/finance` (candidate only) | NOT VERIFIED |
| 95 | Finance, tab/state unclear | `/finance` (candidate only) | NOT VERIFIED |
| 96 | Finance, tab/state unclear | `/finance` (candidate only) | NOT VERIFIED |
| 97 | Finance, tab/state unclear | `/finance` (candidate only) | NOT VERIFIED |
| 98 | Finance, tab/state unclear | `/finance` (candidate only) | NOT VERIFIED |
| 99 | Order detail, order information tab | `/orders/:orderId` | NOT VERIFIED |
| 100 | Order detail, items and prices tab | `/orders/:orderId` | NOT VERIFIED |
| 101 | Order detail, tab/state unclear | `/orders/:orderId` | NOT VERIFIED |
| 102 | Order detail, tab/state unclear | `/orders/:orderId` | NOT VERIFIED |
| 103 | Order detail, tab/state unclear | `/orders/:orderId` | NOT VERIFIED |
| 104 | Customers list | `/customers` | NOT VERIFIED |
| 105 | Customers list, empty state | `/customers` | NOT VERIFIED |
| 106 | Customers list, empty state | `/customers` | NOT VERIFIED |
| 107 | Customers list, empty state | `/customers` | NOT VERIFIED |
| 108 | Customers list, empty state | `/customers` | NOT VERIFIED |
| 109 | Customers list with invoice overlay | `/customers` (candidate only) | NOT VERIFIED |
| 110 | Create invoice with add-customer modal | `/invoices/new` | NOT VERIFIED |
| 111 | Invoice form modal state | `/invoices/new` | NOT VERIFIED |
| 112 | Invoice form modal state | `/invoices/new` | NOT VERIFIED |
| 113 | Invoice form modal state | `/invoices/new` | NOT VERIFIED |
| 114 | Invoice form modal state | `/invoices/new` | NOT VERIFIED |
| 115 | Invoice form modal state | `/invoices/new` | NOT VERIFIED |
| 116 | Invoice form modal state | `/invoices/new` | NOT VERIFIED |
| 117 | Invoice form modal state | `/invoices/new` | NOT VERIFIED |
| 118 | Finance tab/modal state | `/finance` (candidate only) | NOT VERIFIED |
| 119 | Finance tab/modal state | `/finance` (candidate only) | NOT VERIFIED |
| 120 | Finance tab/modal state | `/finance` (candidate only) | NOT VERIFIED |
| 121 | Finance tab/modal state | `/finance` (candidate only) | NOT VERIFIED |
| 122 | Finance tab/modal state | `/finance` (candidate only) | NOT VERIFIED |
| 123 | Finance tab/modal state | `/finance` (candidate only) | NOT VERIFIED |
| 124 | Finance tab/modal state | `/finance` (candidate only) | NOT VERIFIED |
| 125 | Finance tab/modal state | `/finance` (candidate only) | NOT VERIFIED |
| 126 | Finance tab/modal state | `/finance` (candidate only) | NOT VERIFIED |
| 127 | Finance tab/modal state | `/finance` (candidate only) | NOT VERIFIED |
| 128 | Finance tab/modal state | `/finance` (candidate only) | NOT VERIFIED |
| 129 | Finance tab/modal state | `/finance` (candidate only) | NOT VERIFIED |
| 130 | Personal notes | — | MISSING |
| 131 | Excel import, product/customer selection | — | MISSING |
| 132 | Excel import, products selected | — | MISSING |
| 133 | Excel import, customers selected | — | MISSING |
| 134 | Barcode printing, products | — | MISSING |
| 135 | Barcode printing, label list | — | MISSING |
| 136 | Customer detail, overview tab | `/customers/:customerId` | NOT VERIFIED |
| 137 | Customer detail, overview tab | `/customers/:customerId` | NOT VERIFIED |
| 138 | Customer detail, overview tab | `/customers/:customerId` | NOT VERIFIED |
| 139 | Customer detail, invoices tab | `/customers/:customerId` | NOT VERIFIED |
| 140 | Customer detail, invoice state | `/customers/:customerId` (candidate only) | NOT VERIFIED |
| 141 | Finance, home tab | `/finance` | NOT VERIFIED |
| 142 | Finance, tab/state unclear | `/finance` (candidate only) | NOT VERIFIED |
| 143 | Finance, incoming cash tab with count | `/finance` (candidate only) | NOT VERIFIED |
| 144 | Finance, incoming cash tab | `/finance` (candidate only) | NOT VERIFIED |
| 145 | Finance, incoming cash tab | `/finance` (candidate only) | NOT VERIFIED |
| 146 | Finance, incoming cash tab | `/finance` (candidate only) | NOT VERIFIED |
| 147 | Printed invoice/document preview | `/invoices/:documentId/print` (candidate only) | NOT VERIFIED |
| 148 | Printed invoice/document preview | `/invoices/:documentId/print` (candidate only) | NOT VERIFIED |
| 149 | Printed invoice/document preview | `/invoices/:documentId/print` (candidate only) | NOT VERIFIED |
| 150 | Invoice print preview | `/invoices/:documentId/print` | NOT VERIFIED |
| 151 | Invoice print preview | `/invoices/:documentId/print` | NOT VERIFIED |
| 152 | Shared component/style reference sheet, not a business page | — | NOT VERIFIED |
| 153 | Invoice form, no matching invoice-code error | `/invoices/new` | NOT VERIFIED |
| 154 | Create sales invoice | `/invoices/new` | NOT VERIFIED |
| 155 | Containers | `/containers` | NOT VERIFIED |
| 156 | Invoice form modal state | `/invoices/new` | NOT VERIFIED |
| 157 | Invoice form modal state | `/invoices/new` | NOT VERIFIED |
| 158 | Invoice form modal state | `/invoices/new` | NOT VERIFIED |
| 159 | Invoice form modal state | `/invoices/new` | NOT VERIFIED |
| 160 | Invoice form modal state | `/invoices/new` | NOT VERIFIED |
| 161 | Invoice form modal state | `/invoices/new` | NOT VERIFIED |
| 162 | Invoice form modal state | `/invoices/new` | NOT VERIFIED |
| 163 | Invoice form modal state | `/invoices/new` | NOT VERIFIED |
| 164 | Invoice form modal state | `/invoices/new` | NOT VERIFIED |
| 165 | Invoice form modal state | `/invoices/new` | NOT VERIFIED |
| 166 | Invoice form modal state | `/invoices/new` | NOT VERIFIED |
| 167 | Invoice form modal state | `/invoices/new` | NOT VERIFIED |
| 168 | Invoice form modal state | `/invoices/new` | NOT VERIFIED |
| 169 | Invoice form modal state | `/invoices/new` | NOT VERIFIED |
| 170 | Containers | `/containers` | NOT VERIFIED |
| 171 | Containers | `/containers` | NOT VERIFIED |
| 172 | Create sales invoice | `/invoices/new` | NOT VERIFIED |

## Part 2A comparisons — pages 1–8

All frontend captures were made at 1440px viewport width using the local MSW-backed app. PDF pages 3 and 7 are taller than the 1000px viewport; comparison of their remaining full-page vertical content is NOT VERIFIED.

| Page | Result | Observed difference / evidence |
|---:|---|---|
| 1 | DIFFERENT | The PDF shows a phone-number-only field; the frontend retains username/password authentication as the owner decided. The number and placement of fields also changes the card height. |
| 2 | NOT VERIFIED | The screenshot shows rejected credentials. Default MSW accepts any non-empty credentials; the browser attempt reached the dashboard, so this error state could not be compared without a test-only response override. |
| 3 | DIFFERENT | The PDF includes billing/source, payment/terms, customer detail, item, and totals sections that are not in the current invoice create/preview request/response. The frontend shows only contract-supported customer, dates, product/warehouse, quantity, decimal-string price/discount, notes, and server preview. |
| 4 | DIFFERENT | Part 1 confirmed shell geometry but the dashboard body differs; see the Part 1 comparison below. |
| 5 | DIFFERENT | The PDF is an empty customer list with aggregate cards and status/governorate filters. The API-backed frontend has three MSW fixture customers and supports search/pagination; the current customer API has no matching aggregate or governorate-filter fields. |
| 6 | DIFFERENT | Both show an empty table and status filters, but shell/layout and several PDF controls/table details differ. The frontend renders the supported order statuses, search, pagination, and an empty table with headers; unsupported bulk/export controls were not invented. |
| 7 | DIFFERENT | The PDF includes project/warehouse, currency, payment terms, salesperson, tax/discount, and credit-control sections. The current order contract only supports customer, order/delivery dates, notes, and line product/quantity/unit-price/notes; no missing business fields were added. |
| 8 | DIFFERENT | The frontend now exposes tabs for returned order data, items, stock warnings, linked deliveries, and linked invoices. The PDF's contract/terms, tracking history, and financial-summary content is absent from the current `OrderDetail` response and remains an API gap. |

### Part 2A open questions

- Page 2: may a deterministic test-only MSW override be used to capture the rejected-login visual state while leaving the default handler unchanged?
- Page 3: should the backend contract be extended for the source, currency, payment terms, tax/discount presentation, customer details, and invoice-total fields shown in the reference, or should those remain out of scope?
- Page 5: should the backend expose aggregate customer totals and status/governorate filters, and should the mock customer fixture be empty for screenshot parity?
- Page 6: which reference-only bulk/export/table controls and status categories, if any, are intended to be supported by the current order API?
- Page 7: are project/warehouse, currency, payment terms, salesperson, tax/discount, and credit-control fields intended for a future order-contract extension?
- Page 8: is order tracking, contract/terms data, and the financial summary intended to be added to the order response? The frontend must not infer these values.

## Visible states and frame inventory

- Authentication: initial login and rejected-login error (pages 1-2).
- Empty lists/zero counts: customers, invoices and stock/finance screens (for example pages 5, 9, 17, 104-108).
- Modal/overlay states: new customer in invoice creation (page 15 and 110 onward), finance overlays (118-129), and invoice lookup/validation (88, 153, 156-169).
- Data/detail states: order detail and tabs (8, 99-103), customer detail and tabs (136-140), and invoice print documents (10, 147-151).
- Mobile/tablet variants: none observed. Every PDF page is 1440px wide.
- Several pages are entirely blank or cropped/obscured and are not safely classifiable (32, 33, 51, 55).

## Part 1 comparison — page 4 shell

- Captured the Figma page 4 and live MSW-backed `/dashboard` at 1440 × 1258px.
- Shared shell measurements now match the reference frame: 196px sidebar, 52px top bar, 37px shortcut row. The live dashboard content remains visibly different; page 4 is therefore `DIFFERENT`, not a screen-level match.
- Page 152's component sheet provided button heights (26/32/38px) and 32px input height. Page 169 supplied a 480px modal width and `#1C2128` surface; app controls were updated to those measured values, but a same-content modal screenshot was not available.
- Only existing `dashboard` and `audit` routes are shown in the shortcut row. The reference's control-center, recycle-bin, and shipping-driver shortcuts have no matching routes and were not invented.
- Other screen, modal, toast, dropdown, notification, and responsive comparisons remain NOT VERIFIED.

## Open questions: screens without a matching API operation / frontend route

The following reference items have no matching dedicated frontend path, and no clearly named operation was found in the inspected OpenAPI path inventory. Some may be representable by a broader operation or intentionally local UI; confirm their intended scope before implementation:

- Governorates management (page 28).
- Deleted-items recycle bin (page 31).
- Shipping-company drivers (page 34).
- Other revenues and a distinct payments screen (pages 38-39).
- Supplier balances (page 44).
- Daily journal, general ledger and trial balance (pages 47-49).
- Expense budgets, recurring expenses, monthly comparison and cash-flow forecast (pages 58-61).
- Barcode printing and Excel import (pages 65, 67, 131-135); confirm whether these are local-only interactions or require API support.
- Install-as-app and personal notes (pages 69-70, 130); these may not require business APIs but have no matching app route.
- Container transfers and returns to warehouse (pages 52-53); existing container/inventory paths are not evidence of equivalent behavior.
- Component/style sheet on page 152 is not a business route; confirm whether it is reference-only.
- The page-4 shortcut labels for control center, deleted items, and shipping-company drivers have no current matching frontend route; confirm their intended route/API before adding them.

No endpoint or feature was invented. API parity for candidate routes and exact route-to-screen correspondence remain **NOT VERIFIED** in Part 0.

## Existing frontend routes not individually identified in the PDF

These are kept; this inventory does not remove or change features. They were not clearly distinguishable as separate reference screens at contact-sheet scale and should be rechecked during final review: category management, inventory adjustments/opening-stock/transfers/damaged-stock flows, finance currencies and financial adjustments, container receive/receipt/landed-cost detail, general settings, and cost/customer statement subroutes.
