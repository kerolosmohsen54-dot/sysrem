# Full frontend visual comparison

Captured: 2026-10-30T17:34:03.937Z

React routes captured: 128. Reference comparisons generated and manually reviewed: 75. The populated reference baseline contains 87 viewport entries and 42 key-state entries. MAJOR marks unresolved layout/content gaps; MINOR DIFFERENCES lists observed presentation deviations. Pixel metrics support, but do not determine, the visual classification.

Login screenshots: [1440px](./react/login-1440.png), [1280px](./react/login-1280.png), [768px](./react/login-768.png), [390px](./react/login-390.png).

| Screen | Width | Status | Reviewed difference | Mean RGB difference | Pixels changed (>32/255) | Side-by-side | Diff |
|---|---:|---|---|---:|---:|---|---|
| dashboard | 1440px | MAJOR | Reference charts, transactions and demo KPI values are populated; React preserves the same sections but must withhold unavailable API metrics and chart data. | 5.22% | 8.40% | [image](./all-dashboard-1440-side-by-side.png) | [image](./all-dashboard-1440-diff.png) |
| customers | 1440px | MINOR DIFFERENCES | Filter controls and row actions differ in grouping and spacing; data remains server-shaped. | 4.18% | 7.21% | [image](./all-customers-1440-side-by-side.png) | [image](./all-customers-1440-diff.png) |
| orders | 1440px | MINOR DIFFERENCES | Toolbar and table spacing differ slightly; statuses and sample rows are fixture data. | 4.25% | 6.65% | [image](./all-orders-1440-side-by-side.png) | [image](./all-orders-1440-diff.png) |
| order-create | 1440px | MINOR DIFFERENCES | Unavailable contract fields and preview data are omitted; form groups and responsive stacking differ slightly. | 5.13% | 9.16% | [image](./all-order-create-1440-side-by-side.png) | [image](./all-order-create-1440-diff.png) |
| order-detail | 1440px | MINOR DIFFERENCES | Reference-only summary values/actions are absent; supported order detail sections remain. | 5.34% | 8.86% | [image](./all-order-detail-1440-side-by-side.png) | [image](./all-order-detail-1440-diff.png) |
| invoices | 1440px | MINOR DIFFERENCES | Reference filters and action placement differ; table layout and invoice rows are present. | 5.35% | 10.68% | [image](./all-invoices-1440-side-by-side.png) | [image](./all-invoices-1440-diff.png) |
| invoice-create | 1440px | MINOR DIFFERENCES | Unsupported preview and sample totals are intentionally omitted; supported form layout remains. | 5.05% | 10.15% | [image](./all-invoice-create-1440-side-by-side.png) | [image](./all-invoice-create-1440-diff.png) |
| invoice-print | 1440px | MAJOR | Unavailable customer-business branding, line items and notes make the paper layout/content materially different; do not invent invoice data. | 28.74% | 34.69% | [image](./all-invoice-print-1440-side-by-side.png) | [image](./all-invoice-print-1440-diff.png) |
| collections | 1440px | MINOR DIFFERENCES | Toolbar and allocation display have different spacing; unapplied remainder is shown separately. | 5.48% | 8.51% | [image](./all-collections-1440-side-by-side.png) | [image](./all-collections-1440-diff.png) |
| deliveries | 1440px | MINOR DIFFERENCES | Search/filter grouping and status presentation differ slightly. | 3.95% | 7.04% | [image](./all-deliveries-1440-side-by-side.png) | [image](./all-deliveries-1440-diff.png) |
| delivery-create | 1440px | MINOR DIFFERENCES | Unsupported recipient/transport fields are withheld; form controls use narrower spacing. | 5.84% | 7.99% | [image](./all-delivery-create-1440-side-by-side.png) | [image](./all-delivery-create-1440-diff.png) |
| returns | 1440px | MINOR DIFFERENCES | Filter placement and empty-state treatment differ slightly. | 2.62% | 5.27% | [image](./all-returns-1440-side-by-side.png) | [image](./all-returns-1440-diff.png) |
| return-create | 1440px | MINOR DIFFERENCES | Return source controls differ; preview and unsupported return fields remain unavailable. | 5.58% | 8.31% | [image](./all-return-create-1440-side-by-side.png) | [image](./all-return-create-1440-diff.png) |
| products | 1440px | MINOR DIFFERENCES | Reference-only purchase/cost fields remain hidden; table controls and column widths differ slightly. | 4.50% | 7.17% | [image](./all-products-1440-side-by-side.png) | [image](./all-products-1440-diff.png) |
| inventory-summary | 1440px | MINOR DIFFERENCES | Unavailable inventory summary figures are omitted; filter and table density differ slightly. | 5.10% | 6.34% | [image](./all-inventory-summary-1440-side-by-side.png) | [image](./all-inventory-summary-1440-diff.png) |
| movements | 1440px | MINOR DIFFERENCES | Search/filter control spacing and movement table density differ slightly. | 4.72% | 9.52% | [image](./all-movements-1440-side-by-side.png) | [image](./all-movements-1440-diff.png) |
| finance | 1440px | MAJOR | Reference shows populated customer-account, expense and treasury panels; React currently presents permission-filtered navigation links. | 6.18% | 10.20% | [image](./all-finance-1440-side-by-side.png) | [image](./all-finance-1440-diff.png) |
| containers | 1440px | MINOR DIFFERENCES | Reference and React use different filter-control grouping and details density. | 3.72% | 6.40% | [image](./all-containers-1440-side-by-side.png) | [image](./all-containers-1440-diff.png) |
| reports | 1440px | MINOR DIFFERENCES | Report-link card spacing and grouping differ slightly. | 2.82% | 5.69% | [image](./all-reports-1440-side-by-side.png) | [image](./all-reports-1440-diff.png) |
| reports-sales | 1440px | MAJOR | Reference contains aggregate KPIs, chart and breakdown panels; the documented API supports a paginated row list only. | 3.73% | 6.90% | [image](./all-reports-sales-1440-side-by-side.png) | [image](./all-reports-sales-1440-diff.png) |
| reports-profit | 1440px | MAJOR | Reference contains profitability summaries and chart panels; the documented response does not provide those aggregates. | 2.45% | 5.29% | [image](./all-reports-profit-1440-side-by-side.png) | [image](./all-reports-profit-1440-diff.png) |
| reports-inventory | 1440px | MAJOR | Reference contains stock KPIs and summary controls; the documented endpoint provides inventory rows only. | 3.96% | 6.43% | [image](./all-reports-inventory-1440-side-by-side.png) | [image](./all-reports-inventory-1440-diff.png) |
| reports-financial | 1440px | MAJOR | Reference contains accounting figures; this screen is intentionally parked until accountant-approved endpoints and data are available. | 4.52% | 8.08% | [image](./all-reports-financial-1440-side-by-side.png) | [image](./all-reports-financial-1440-diff.png) |
| users | 1440px | MINOR DIFFERENCES | User listing and role/grant operations are unavailable in the contract; current waiting state and layout are not equivalent to reference demo data. | 2.93% | 5.99% | [image](./all-users-1440-side-by-side.png) | [image](./all-users-1440-diff.png) |
| warehouses | 1440px | MINOR DIFFERENCES | Search/action placement and table column spacing differ slightly. | 4.13% | 5.93% | [image](./all-warehouses-1440-side-by-side.png) | [image](./all-warehouses-1440-diff.png) |
| dashboard | 768px | MAJOR | Reference charts, transactions and demo KPI values are populated; React preserves the same sections but must withhold unavailable API metrics and chart data. | 5.94% | 8.47% | [image](./all-dashboard-768-side-by-side.png) | [image](./all-dashboard-768-diff.png) |
| customers | 768px | MINOR DIFFERENCES | Filter controls and row actions differ in grouping and spacing; data remains server-shaped. | 4.45% | 5.54% | [image](./all-customers-768-side-by-side.png) | [image](./all-customers-768-diff.png) |
| orders | 768px | MINOR DIFFERENCES | Toolbar and table spacing differ slightly; statuses and sample rows are fixture data. | 4.63% | 4.99% | [image](./all-orders-768-side-by-side.png) | [image](./all-orders-768-diff.png) |
| order-create | 768px | MINOR DIFFERENCES | Unavailable contract fields and preview data are omitted; form groups and responsive stacking differ slightly. | 5.54% | 9.47% | [image](./all-order-create-768-side-by-side.png) | [image](./all-order-create-768-diff.png) |
| order-detail | 768px | MINOR DIFFERENCES | Reference-only summary values/actions are absent; supported order detail sections remain. | 5.89% | 8.28% | [image](./all-order-detail-768-side-by-side.png) | [image](./all-order-detail-768-diff.png) |
| invoices | 768px | MINOR DIFFERENCES | Reference filters and action placement differ; table layout and invoice rows are present. | 4.80% | 11.39% | [image](./all-invoices-768-side-by-side.png) | [image](./all-invoices-768-diff.png) |
| invoice-create | 768px | MINOR DIFFERENCES | Unsupported preview and sample totals are intentionally omitted; supported form layout remains. | 4.97% | 10.27% | [image](./all-invoice-create-768-side-by-side.png) | [image](./all-invoice-create-768-diff.png) |
| invoice-print | 768px | MAJOR | Unavailable customer-business branding, line items and notes make the paper layout/content materially different; do not invent invoice data. | 17.37% | 21.00% | [image](./all-invoice-print-768-side-by-side.png) | [image](./all-invoice-print-768-diff.png) |
| collections | 768px | MINOR DIFFERENCES | Toolbar and allocation display have different spacing; unapplied remainder is shown separately. | 5.33% | 7.55% | [image](./all-collections-768-side-by-side.png) | [image](./all-collections-768-diff.png) |
| deliveries | 768px | MINOR DIFFERENCES | Search/filter grouping and status presentation differ slightly. | 3.77% | 5.49% | [image](./all-deliveries-768-side-by-side.png) | [image](./all-deliveries-768-diff.png) |
| delivery-create | 768px | MINOR DIFFERENCES | Unsupported recipient/transport fields are withheld; form controls use narrower spacing. | 6.61% | 11.12% | [image](./all-delivery-create-768-side-by-side.png) | [image](./all-delivery-create-768-diff.png) |
| returns | 768px | MINOR DIFFERENCES | Filter placement and empty-state treatment differ slightly. | 1.18% | 2.36% | [image](./all-returns-768-side-by-side.png) | [image](./all-returns-768-diff.png) |
| return-create | 768px | MINOR DIFFERENCES | Return source controls differ; preview and unsupported return fields remain unavailable. | 5.53% | 7.59% | [image](./all-return-create-768-side-by-side.png) | [image](./all-return-create-768-diff.png) |
| products | 768px | MINOR DIFFERENCES | Reference-only purchase/cost fields remain hidden; table controls and column widths differ slightly. | 5.00% | 4.95% | [image](./all-products-768-side-by-side.png) | [image](./all-products-768-diff.png) |
| inventory-summary | 768px | MINOR DIFFERENCES | Unavailable inventory summary figures are omitted; filter and table density differ slightly. | 5.22% | 4.67% | [image](./all-inventory-summary-768-side-by-side.png) | [image](./all-inventory-summary-768-diff.png) |
| movements | 768px | MINOR DIFFERENCES | Search/filter control spacing and movement table density differ slightly. | 4.79% | 8.17% | [image](./all-movements-768-side-by-side.png) | [image](./all-movements-768-diff.png) |
| finance | 768px | MAJOR | Reference shows populated customer-account, expense and treasury panels; React currently presents permission-filtered navigation links. | 7.40% | 11.06% | [image](./all-finance-768-side-by-side.png) | [image](./all-finance-768-diff.png) |
| containers | 768px | MINOR DIFFERENCES | Reference and React use different filter-control grouping and details density. | 3.87% | 4.53% | [image](./all-containers-768-side-by-side.png) | [image](./all-containers-768-diff.png) |
| reports | 768px | MINOR DIFFERENCES | Report-link card spacing and grouping differ slightly. | 2.30% | 4.17% | [image](./all-reports-768-side-by-side.png) | [image](./all-reports-768-diff.png) |
| reports-sales | 768px | MAJOR | Reference contains aggregate KPIs, chart and breakdown panels; the documented API supports a paginated row list only. | 4.74% | 6.01% | [image](./all-reports-sales-768-side-by-side.png) | [image](./all-reports-sales-768-diff.png) |
| reports-profit | 768px | MAJOR | Reference contains profitability summaries and chart panels; the documented response does not provide those aggregates. | 2.02% | 3.45% | [image](./all-reports-profit-768-side-by-side.png) | [image](./all-reports-profit-768-diff.png) |
| reports-inventory | 768px | MAJOR | Reference contains stock KPIs and summary controls; the documented endpoint provides inventory rows only. | 5.20% | 5.20% | [image](./all-reports-inventory-768-side-by-side.png) | [image](./all-reports-inventory-768-diff.png) |
| reports-financial | 768px | MAJOR | Reference contains accounting figures; this screen is intentionally parked until accountant-approved endpoints and data are available. | 4.78% | 7.89% | [image](./all-reports-financial-768-side-by-side.png) | [image](./all-reports-financial-768-diff.png) |
| users | 768px | MINOR DIFFERENCES | User listing and role/grant operations are unavailable in the contract; current waiting state and layout are not equivalent to reference demo data. | 2.56% | 5.08% | [image](./all-users-768-side-by-side.png) | [image](./all-users-768-diff.png) |
| warehouses | 768px | MINOR DIFFERENCES | Search/action placement and table column spacing differ slightly. | 4.98% | 4.56% | [image](./all-warehouses-768-side-by-side.png) | [image](./all-warehouses-768-diff.png) |
| dashboard | 390px | MAJOR | Reference charts, transactions and demo KPI values are populated; React preserves the same sections but must withhold unavailable API metrics and chart data. | 7.78% | 12.94% | [image](./all-dashboard-390-side-by-side.png) | [image](./all-dashboard-390-diff.png) |
| customers | 390px | MINOR DIFFERENCES | Filter controls and row actions differ in grouping and spacing; data remains server-shaped. | 7.64% | 12.45% | [image](./all-customers-390-side-by-side.png) | [image](./all-customers-390-diff.png) |
| orders | 390px | MINOR DIFFERENCES | Toolbar and table spacing differ slightly; statuses and sample rows are fixture data. | 6.47% | 9.74% | [image](./all-orders-390-side-by-side.png) | [image](./all-orders-390-diff.png) |
| order-create | 390px | MINOR DIFFERENCES | Unavailable contract fields and preview data are omitted; form groups and responsive stacking differ slightly. | 5.95% | 12.03% | [image](./all-order-create-390-side-by-side.png) | [image](./all-order-create-390-diff.png) |
| order-detail | 390px | MINOR DIFFERENCES | Reference-only summary values/actions are absent; supported order detail sections remain. | 7.16% | 14.25% | [image](./all-order-detail-390-side-by-side.png) | [image](./all-order-detail-390-diff.png) |
| invoices | 390px | MINOR DIFFERENCES | Reference filters and action placement differ; table layout and invoice rows are present. | 5.94% | 10.88% | [image](./all-invoices-390-side-by-side.png) | [image](./all-invoices-390-diff.png) |
| invoice-create | 390px | MINOR DIFFERENCES | Unsupported preview and sample totals are intentionally omitted; supported form layout remains. | 6.84% | 14.24% | [image](./all-invoice-create-390-side-by-side.png) | [image](./all-invoice-create-390-diff.png) |
| invoice-print | 390px | MAJOR | Unavailable customer-business branding, line items and notes make the paper layout/content materially different; do not invent invoice data. | 22.53% | 29.16% | [image](./all-invoice-print-390-side-by-side.png) | [image](./all-invoice-print-390-diff.png) |
| collections | 390px | MINOR DIFFERENCES | Toolbar and allocation display have different spacing; unapplied remainder is shown separately. | 8.30% | 15.62% | [image](./all-collections-390-side-by-side.png) | [image](./all-collections-390-diff.png) |
| deliveries | 390px | MINOR DIFFERENCES | Search/filter grouping and status presentation differ slightly. | 6.93% | 11.12% | [image](./all-deliveries-390-side-by-side.png) | [image](./all-deliveries-390-diff.png) |
| delivery-create | 390px | MINOR DIFFERENCES | Unsupported recipient/transport fields are withheld; form controls use narrower spacing. | 8.08% | 12.01% | [image](./all-delivery-create-390-side-by-side.png) | [image](./all-delivery-create-390-diff.png) |
| returns | 390px | MINOR DIFFERENCES | Filter placement and empty-state treatment differ slightly. | 3.94% | 7.71% | [image](./all-returns-390-side-by-side.png) | [image](./all-returns-390-diff.png) |
| return-create | 390px | MINOR DIFFERENCES | Return source controls differ; preview and unsupported return fields remain unavailable. | 8.77% | 14.47% | [image](./all-return-create-390-side-by-side.png) | [image](./all-return-create-390-diff.png) |
| products | 390px | MINOR DIFFERENCES | Reference-only purchase/cost fields remain hidden; table controls and column widths differ slightly. | 8.04% | 11.98% | [image](./all-products-390-side-by-side.png) | [image](./all-products-390-diff.png) |
| inventory-summary | 390px | MINOR DIFFERENCES | Unavailable inventory summary figures are omitted; filter and table density differ slightly. | 6.31% | 7.28% | [image](./all-inventory-summary-390-side-by-side.png) | [image](./all-inventory-summary-390-diff.png) |
| movements | 390px | MINOR DIFFERENCES | Search/filter control spacing and movement table density differ slightly. | 4.79% | 9.83% | [image](./all-movements-390-side-by-side.png) | [image](./all-movements-390-diff.png) |
| finance | 390px | MAJOR | Reference shows populated customer-account, expense and treasury panels; React currently presents permission-filtered navigation links. | 16.13% | 36.14% | [image](./all-finance-390-side-by-side.png) | [image](./all-finance-390-diff.png) |
| containers | 390px | MINOR DIFFERENCES | Reference and React use different filter-control grouping and details density. | 8.50% | 11.62% | [image](./all-containers-390-side-by-side.png) | [image](./all-containers-390-diff.png) |
| reports | 390px | MINOR DIFFERENCES | Report-link card spacing and grouping differ slightly. | 5.28% | 9.11% | [image](./all-reports-390-side-by-side.png) | [image](./all-reports-390-diff.png) |
| reports-sales | 390px | MAJOR | Reference contains aggregate KPIs, chart and breakdown panels; the documented API supports a paginated row list only. | 5.47% | 9.13% | [image](./all-reports-sales-390-side-by-side.png) | [image](./all-reports-sales-390-diff.png) |
| reports-profit | 390px | MAJOR | Reference contains profitability summaries and chart panels; the documented response does not provide those aggregates. | 3.15% | 6.48% | [image](./all-reports-profit-390-side-by-side.png) | [image](./all-reports-profit-390-diff.png) |
| reports-inventory | 390px | MAJOR | Reference contains stock KPIs and summary controls; the documented endpoint provides inventory rows only. | 6.19% | 8.92% | [image](./all-reports-inventory-390-side-by-side.png) | [image](./all-reports-inventory-390-diff.png) |
| reports-financial | 390px | MAJOR | Reference contains accounting figures; this screen is intentionally parked until accountant-approved endpoints and data are available. | 6.03% | 11.55% | [image](./all-reports-financial-390-side-by-side.png) | [image](./all-reports-financial-390-diff.png) |
| users | 390px | MINOR DIFFERENCES | User listing and role/grant operations are unavailable in the contract; current waiting state and layout are not equivalent to reference demo data. | 6.41% | 12.47% | [image](./all-users-390-side-by-side.png) | [image](./all-users-390-diff.png) |
| warehouses | 390px | MINOR DIFFERENCES | Search/action placement and table column spacing differ slightly. | 7.96% | 10.17% | [image](./all-warehouses-390-side-by-side.png) | [image](./all-warehouses-390-diff.png) |

Routes without a populated reference image remain NO BASELINE. React screenshots are retained for the additional categories, opening-stock, and inventory-transfer routes and for baseline screens that were not present at runtime.

A changed pixel is a pixel whose largest absolute RGB-channel difference exceeds 32/255. Mean RGB difference averages absolute RGB-channel differences over the full image. These metrics are not a substitute for reviewing the image pairs.

## Responsive acceptance results

| Width | Button | Card | Sidebar | Topbar | Input | Horizontal overflow findings |
|---:|---|---|---:|---:|---|---:|
| 1440px | 13px / 4px | 8px | 240px | 52px | 13px / 4px | 0 |
| 1280px | 13px / 4px | 8px | 240px | 52px | 13px / 4px | 0 |
| 768px | 13px / 4px | 8px | 240px | 52px | 13px / 4px | 0 |
| 390px | 13px / 4px | 8px | 240px | 52px | 13px / 4px | 0 |

No document or main-content horizontal overflow was detected on routed screens at 390px and 768px.

## Screen captures

- dashboard at 1440px: MAJOR; [React screenshot](./react/all-screens/dashboard-1440.png).
- customers at 1440px: MINOR DIFFERENCES; [React screenshot](./react/all-screens/customers-1440.png).
- orders at 1440px: MINOR DIFFERENCES; [React screenshot](./react/all-screens/orders-1440.png).
- order-create at 1440px: MINOR DIFFERENCES; [React screenshot](./react/all-screens/order-create-1440.png).
- order-detail at 1440px: MINOR DIFFERENCES; [React screenshot](./react/all-screens/order-detail-1440.png).
- invoices at 1440px: MINOR DIFFERENCES; [React screenshot](./react/all-screens/invoices-1440.png).
- invoice-create at 1440px: MINOR DIFFERENCES; [React screenshot](./react/all-screens/invoice-create-1440.png).
- invoice-print at 1440px: MAJOR; [React screenshot](./react/all-screens/invoice-print-1440.png).
- collections at 1440px: MINOR DIFFERENCES; [React screenshot](./react/all-screens/collections-1440.png).
- deliveries at 1440px: MINOR DIFFERENCES; [React screenshot](./react/all-screens/deliveries-1440.png).
- delivery-create at 1440px: MINOR DIFFERENCES; [React screenshot](./react/all-screens/delivery-create-1440.png).
- returns at 1440px: MINOR DIFFERENCES; [React screenshot](./react/all-screens/returns-1440.png).
- return-create at 1440px: MINOR DIFFERENCES; [React screenshot](./react/all-screens/return-create-1440.png).
- products at 1440px: MINOR DIFFERENCES; [React screenshot](./react/all-screens/products-1440.png).
- categories at 1440px: NO BASELINE; [React screenshot](./react/all-screens/categories-1440.png).
- inventory-summary at 1440px: MINOR DIFFERENCES; [React screenshot](./react/all-screens/inventory-summary-1440.png).
- movements at 1440px: MINOR DIFFERENCES; [React screenshot](./react/all-screens/movements-1440.png).
- adjustments at 1440px: NO BASELINE; [React screenshot](./react/all-screens/adjustments-1440.png).
- opening-stock at 1440px: NO BASELINE; [React screenshot](./react/all-screens/opening-stock-1440.png).
- inventory-transfers at 1440px: NO BASELINE; [React screenshot](./react/all-screens/inventory-transfers-1440.png).
- finance at 1440px: MAJOR; [React screenshot](./react/all-screens/finance-1440.png).
- containers at 1440px: MINOR DIFFERENCES; [React screenshot](./react/all-screens/containers-1440.png).
- container-receive at 1440px: NO BASELINE; [React screenshot](./react/all-screens/container-receive-1440.png).
- landed-cost at 1440px: NO BASELINE; [React screenshot](./react/all-screens/landed-cost-1440.png).
- reports at 1440px: MINOR DIFFERENCES; [React screenshot](./react/all-screens/reports-1440.png).
- reports-sales at 1440px: MAJOR; [React screenshot](./react/all-screens/reports-sales-1440.png).
- reports-profit at 1440px: MAJOR; [React screenshot](./react/all-screens/reports-profit-1440.png).
- reports-inventory at 1440px: MAJOR; [React screenshot](./react/all-screens/reports-inventory-1440.png).
- reports-financial at 1440px: MAJOR; [React screenshot](./react/all-screens/reports-financial-1440.png).
- users at 1440px: MINOR DIFFERENCES; [React screenshot](./react/all-screens/users-1440.png).
- warehouses at 1440px: MINOR DIFFERENCES; [React screenshot](./react/all-screens/warehouses-1440.png).
- settings at 1440px: NO BASELINE; [React screenshot](./react/all-screens/settings-1440.png).
- dashboard at 1280px: NO BASELINE; [React screenshot](./react/all-screens/dashboard-1280.png).
- customers at 1280px: NO BASELINE; [React screenshot](./react/all-screens/customers-1280.png).
- orders at 1280px: NO BASELINE; [React screenshot](./react/all-screens/orders-1280.png).
- order-create at 1280px: NO BASELINE; [React screenshot](./react/all-screens/order-create-1280.png).
- order-detail at 1280px: NO BASELINE; [React screenshot](./react/all-screens/order-detail-1280.png).
- invoices at 1280px: NO BASELINE; [React screenshot](./react/all-screens/invoices-1280.png).
- invoice-create at 1280px: NO BASELINE; [React screenshot](./react/all-screens/invoice-create-1280.png).
- invoice-print at 1280px: NO BASELINE; [React screenshot](./react/all-screens/invoice-print-1280.png).
- collections at 1280px: NO BASELINE; [React screenshot](./react/all-screens/collections-1280.png).
- deliveries at 1280px: NO BASELINE; [React screenshot](./react/all-screens/deliveries-1280.png).
- delivery-create at 1280px: NO BASELINE; [React screenshot](./react/all-screens/delivery-create-1280.png).
- returns at 1280px: NO BASELINE; [React screenshot](./react/all-screens/returns-1280.png).
- return-create at 1280px: NO BASELINE; [React screenshot](./react/all-screens/return-create-1280.png).
- products at 1280px: NO BASELINE; [React screenshot](./react/all-screens/products-1280.png).
- categories at 1280px: NO BASELINE; [React screenshot](./react/all-screens/categories-1280.png).
- inventory-summary at 1280px: NO BASELINE; [React screenshot](./react/all-screens/inventory-summary-1280.png).
- movements at 1280px: NO BASELINE; [React screenshot](./react/all-screens/movements-1280.png).
- adjustments at 1280px: NO BASELINE; [React screenshot](./react/all-screens/adjustments-1280.png).
- opening-stock at 1280px: NO BASELINE; [React screenshot](./react/all-screens/opening-stock-1280.png).
- inventory-transfers at 1280px: NO BASELINE; [React screenshot](./react/all-screens/inventory-transfers-1280.png).
- finance at 1280px: NO BASELINE; [React screenshot](./react/all-screens/finance-1280.png).
- containers at 1280px: NO BASELINE; [React screenshot](./react/all-screens/containers-1280.png).
- container-receive at 1280px: NO BASELINE; [React screenshot](./react/all-screens/container-receive-1280.png).
- landed-cost at 1280px: NO BASELINE; [React screenshot](./react/all-screens/landed-cost-1280.png).
- reports at 1280px: NO BASELINE; [React screenshot](./react/all-screens/reports-1280.png).
- reports-sales at 1280px: NO BASELINE; [React screenshot](./react/all-screens/reports-sales-1280.png).
- reports-profit at 1280px: NO BASELINE; [React screenshot](./react/all-screens/reports-profit-1280.png).
- reports-inventory at 1280px: NO BASELINE; [React screenshot](./react/all-screens/reports-inventory-1280.png).
- reports-financial at 1280px: NO BASELINE; [React screenshot](./react/all-screens/reports-financial-1280.png).
- users at 1280px: NO BASELINE; [React screenshot](./react/all-screens/users-1280.png).
- warehouses at 1280px: NO BASELINE; [React screenshot](./react/all-screens/warehouses-1280.png).
- settings at 1280px: NO BASELINE; [React screenshot](./react/all-screens/settings-1280.png).
- dashboard at 768px: MAJOR; [React screenshot](./react/all-screens/dashboard-768.png).
- customers at 768px: MINOR DIFFERENCES; [React screenshot](./react/all-screens/customers-768.png).
- orders at 768px: MINOR DIFFERENCES; [React screenshot](./react/all-screens/orders-768.png).
- order-create at 768px: MINOR DIFFERENCES; [React screenshot](./react/all-screens/order-create-768.png).
- order-detail at 768px: MINOR DIFFERENCES; [React screenshot](./react/all-screens/order-detail-768.png).
- invoices at 768px: MINOR DIFFERENCES; [React screenshot](./react/all-screens/invoices-768.png).
- invoice-create at 768px: MINOR DIFFERENCES; [React screenshot](./react/all-screens/invoice-create-768.png).
- invoice-print at 768px: MAJOR; [React screenshot](./react/all-screens/invoice-print-768.png).
- collections at 768px: MINOR DIFFERENCES; [React screenshot](./react/all-screens/collections-768.png).
- deliveries at 768px: MINOR DIFFERENCES; [React screenshot](./react/all-screens/deliveries-768.png).
- delivery-create at 768px: MINOR DIFFERENCES; [React screenshot](./react/all-screens/delivery-create-768.png).
- returns at 768px: MINOR DIFFERENCES; [React screenshot](./react/all-screens/returns-768.png).
- return-create at 768px: MINOR DIFFERENCES; [React screenshot](./react/all-screens/return-create-768.png).
- products at 768px: MINOR DIFFERENCES; [React screenshot](./react/all-screens/products-768.png).
- categories at 768px: NO BASELINE; [React screenshot](./react/all-screens/categories-768.png).
- inventory-summary at 768px: MINOR DIFFERENCES; [React screenshot](./react/all-screens/inventory-summary-768.png).
- movements at 768px: MINOR DIFFERENCES; [React screenshot](./react/all-screens/movements-768.png).
- adjustments at 768px: NO BASELINE; [React screenshot](./react/all-screens/adjustments-768.png).
- opening-stock at 768px: NO BASELINE; [React screenshot](./react/all-screens/opening-stock-768.png).
- inventory-transfers at 768px: NO BASELINE; [React screenshot](./react/all-screens/inventory-transfers-768.png).
- finance at 768px: MAJOR; [React screenshot](./react/all-screens/finance-768.png).
- containers at 768px: MINOR DIFFERENCES; [React screenshot](./react/all-screens/containers-768.png).
- container-receive at 768px: NO BASELINE; [React screenshot](./react/all-screens/container-receive-768.png).
- landed-cost at 768px: NO BASELINE; [React screenshot](./react/all-screens/landed-cost-768.png).
- reports at 768px: MINOR DIFFERENCES; [React screenshot](./react/all-screens/reports-768.png).
- reports-sales at 768px: MAJOR; [React screenshot](./react/all-screens/reports-sales-768.png).
- reports-profit at 768px: MAJOR; [React screenshot](./react/all-screens/reports-profit-768.png).
- reports-inventory at 768px: MAJOR; [React screenshot](./react/all-screens/reports-inventory-768.png).
- reports-financial at 768px: MAJOR; [React screenshot](./react/all-screens/reports-financial-768.png).
- users at 768px: MINOR DIFFERENCES; [React screenshot](./react/all-screens/users-768.png).
- warehouses at 768px: MINOR DIFFERENCES; [React screenshot](./react/all-screens/warehouses-768.png).
- settings at 768px: NO BASELINE; [React screenshot](./react/all-screens/settings-768.png).
- dashboard at 390px: MAJOR; [React screenshot](./react/all-screens/dashboard-390.png).
- customers at 390px: MINOR DIFFERENCES; [React screenshot](./react/all-screens/customers-390.png).
- orders at 390px: MINOR DIFFERENCES; [React screenshot](./react/all-screens/orders-390.png).
- order-create at 390px: MINOR DIFFERENCES; [React screenshot](./react/all-screens/order-create-390.png).
- order-detail at 390px: MINOR DIFFERENCES; [React screenshot](./react/all-screens/order-detail-390.png).
- invoices at 390px: MINOR DIFFERENCES; [React screenshot](./react/all-screens/invoices-390.png).
- invoice-create at 390px: MINOR DIFFERENCES; [React screenshot](./react/all-screens/invoice-create-390.png).
- invoice-print at 390px: MAJOR; [React screenshot](./react/all-screens/invoice-print-390.png).
- collections at 390px: MINOR DIFFERENCES; [React screenshot](./react/all-screens/collections-390.png).
- deliveries at 390px: MINOR DIFFERENCES; [React screenshot](./react/all-screens/deliveries-390.png).
- delivery-create at 390px: MINOR DIFFERENCES; [React screenshot](./react/all-screens/delivery-create-390.png).
- returns at 390px: MINOR DIFFERENCES; [React screenshot](./react/all-screens/returns-390.png).
- return-create at 390px: MINOR DIFFERENCES; [React screenshot](./react/all-screens/return-create-390.png).
- products at 390px: MINOR DIFFERENCES; [React screenshot](./react/all-screens/products-390.png).
- categories at 390px: NO BASELINE; [React screenshot](./react/all-screens/categories-390.png).
- inventory-summary at 390px: MINOR DIFFERENCES; [React screenshot](./react/all-screens/inventory-summary-390.png).
- movements at 390px: MINOR DIFFERENCES; [React screenshot](./react/all-screens/movements-390.png).
- adjustments at 390px: NO BASELINE; [React screenshot](./react/all-screens/adjustments-390.png).
- opening-stock at 390px: NO BASELINE; [React screenshot](./react/all-screens/opening-stock-390.png).
- inventory-transfers at 390px: NO BASELINE; [React screenshot](./react/all-screens/inventory-transfers-390.png).
- finance at 390px: MAJOR; [React screenshot](./react/all-screens/finance-390.png).
- containers at 390px: MINOR DIFFERENCES; [React screenshot](./react/all-screens/containers-390.png).
- container-receive at 390px: NO BASELINE; [React screenshot](./react/all-screens/container-receive-390.png).
- landed-cost at 390px: NO BASELINE; [React screenshot](./react/all-screens/landed-cost-390.png).
- reports at 390px: MINOR DIFFERENCES; [React screenshot](./react/all-screens/reports-390.png).
- reports-sales at 390px: MAJOR; [React screenshot](./react/all-screens/reports-sales-390.png).
- reports-profit at 390px: MAJOR; [React screenshot](./react/all-screens/reports-profit-390.png).
- reports-inventory at 390px: MAJOR; [React screenshot](./react/all-screens/reports-inventory-390.png).
- reports-financial at 390px: MAJOR; [React screenshot](./react/all-screens/reports-financial-390.png).
- users at 390px: MINOR DIFFERENCES; [React screenshot](./react/all-screens/users-390.png).
- warehouses at 390px: MINOR DIFFERENCES; [React screenshot](./react/all-screens/warehouses-390.png).
- settings at 390px: NO BASELINE; [React screenshot](./react/all-screens/settings-390.png).

## Reference key states

| Screen | State | Width | Status | Reference image |
|---|---|---:|---|---|
| customers | customer-modal | 1440px | NOT CHECKED — React state capture/comparison pending | [image](../reference-shots/baseline-populated/states/customers-customer-modal-1440.png) |
| customers | customer-financial-tab | 1440px | NOT CHECKED — React state capture/comparison pending | [image](../reference-shots/baseline-populated/states/customers-customer-financial-tab-1440.png) |
| customers | customer-attachments-tab | 1440px | NOT CHECKED — React state capture/comparison pending | [image](../reference-shots/baseline-populated/states/customers-customer-attachments-tab-1440.png) |
| collections | collection-modal | 1440px | NOT CHECKED — React state capture/comparison pending | [image](../reference-shots/baseline-populated/states/collections-collection-modal-1440.png) |
| finance | expense-modal | 1440px | NOT CHECKED — React state capture/comparison pending | [image](../reference-shots/baseline-populated/states/finance-expense-modal-1440.png) |
| products | product-modal | 1440px | NOT CHECKED — React state capture/comparison pending | [image](../reference-shots/baseline-populated/states/products-product-modal-1440.png) |
| users | security-tab | 1440px | NOT CHECKED — React state capture/comparison pending | [image](../reference-shots/baseline-populated/states/users-security-tab-1440.png) |
| settings | billing-tab | 1440px | NO BASELINE | — |
| order-create | order-filled-form | 1440px | NOT CHECKED — React state capture/comparison pending | [image](../reference-shots/baseline-populated/states/order-create-order-filled-form-1440.png) |
| invoice-create | invoice-filled-form | 1440px | NOT CHECKED — React state capture/comparison pending | [image](../reference-shots/baseline-populated/states/invoice-create-invoice-filled-form-1440.png) |
| delivery-create | delivery-filled-form | 1440px | NOT CHECKED — React state capture/comparison pending | [image](../reference-shots/baseline-populated/states/delivery-create-delivery-filled-form-1440.png) |
| return-create | return-filled-form | 1440px | NOT CHECKED — React state capture/comparison pending | [image](../reference-shots/baseline-populated/states/return-create-return-filled-form-1440.png) |
| adjustments | adjustment-filled-form | 1440px | NO BASELINE | — |
| dashboard | global-search | 1440px | NOT CHECKED — React state capture/comparison pending | [image](../reference-shots/baseline-populated/states/dashboard-global-search-1440.png) |
| customers | customer-modal | 768px | NOT CHECKED — React state capture/comparison pending | [image](../reference-shots/baseline-populated/states/customers-customer-modal-768.png) |
| customers | customer-financial-tab | 768px | NOT CHECKED — React state capture/comparison pending | [image](../reference-shots/baseline-populated/states/customers-customer-financial-tab-768.png) |
| customers | customer-attachments-tab | 768px | NOT CHECKED — React state capture/comparison pending | [image](../reference-shots/baseline-populated/states/customers-customer-attachments-tab-768.png) |
| collections | collection-modal | 768px | NOT CHECKED — React state capture/comparison pending | [image](../reference-shots/baseline-populated/states/collections-collection-modal-768.png) |
| finance | expense-modal | 768px | NOT CHECKED — React state capture/comparison pending | [image](../reference-shots/baseline-populated/states/finance-expense-modal-768.png) |
| products | product-modal | 768px | NOT CHECKED — React state capture/comparison pending | [image](../reference-shots/baseline-populated/states/products-product-modal-768.png) |
| users | security-tab | 768px | NOT CHECKED — React state capture/comparison pending | [image](../reference-shots/baseline-populated/states/users-security-tab-768.png) |
| settings | billing-tab | 768px | NO BASELINE | — |
| order-create | order-filled-form | 768px | NOT CHECKED — React state capture/comparison pending | [image](../reference-shots/baseline-populated/states/order-create-order-filled-form-768.png) |
| invoice-create | invoice-filled-form | 768px | NOT CHECKED — React state capture/comparison pending | [image](../reference-shots/baseline-populated/states/invoice-create-invoice-filled-form-768.png) |
| delivery-create | delivery-filled-form | 768px | NOT CHECKED — React state capture/comparison pending | [image](../reference-shots/baseline-populated/states/delivery-create-delivery-filled-form-768.png) |
| return-create | return-filled-form | 768px | NOT CHECKED — React state capture/comparison pending | [image](../reference-shots/baseline-populated/states/return-create-return-filled-form-768.png) |
| adjustments | adjustment-filled-form | 768px | NO BASELINE | — |
| dashboard | global-search | 768px | NOT CHECKED — React state capture/comparison pending | [image](../reference-shots/baseline-populated/states/dashboard-global-search-768.png) |
| customers | customer-modal | 390px | NOT CHECKED — React state capture/comparison pending | [image](../reference-shots/baseline-populated/states/customers-customer-modal-390.png) |
| customers | customer-financial-tab | 390px | NOT CHECKED — React state capture/comparison pending | [image](../reference-shots/baseline-populated/states/customers-customer-financial-tab-390.png) |
| customers | customer-attachments-tab | 390px | NOT CHECKED — React state capture/comparison pending | [image](../reference-shots/baseline-populated/states/customers-customer-attachments-tab-390.png) |
| collections | collection-modal | 390px | NOT CHECKED — React state capture/comparison pending | [image](../reference-shots/baseline-populated/states/collections-collection-modal-390.png) |
| finance | expense-modal | 390px | NOT CHECKED — React state capture/comparison pending | [image](../reference-shots/baseline-populated/states/finance-expense-modal-390.png) |
| products | product-modal | 390px | NOT CHECKED — React state capture/comparison pending | [image](../reference-shots/baseline-populated/states/products-product-modal-390.png) |
| users | security-tab | 390px | NOT CHECKED — React state capture/comparison pending | [image](../reference-shots/baseline-populated/states/users-security-tab-390.png) |
| settings | billing-tab | 390px | NO BASELINE | — |
| order-create | order-filled-form | 390px | NOT CHECKED — React state capture/comparison pending | [image](../reference-shots/baseline-populated/states/order-create-order-filled-form-390.png) |
| invoice-create | invoice-filled-form | 390px | NOT CHECKED — React state capture/comparison pending | [image](../reference-shots/baseline-populated/states/invoice-create-invoice-filled-form-390.png) |
| delivery-create | delivery-filled-form | 390px | NOT CHECKED — React state capture/comparison pending | [image](../reference-shots/baseline-populated/states/delivery-create-delivery-filled-form-390.png) |
| return-create | return-filled-form | 390px | NOT CHECKED — React state capture/comparison pending | [image](../reference-shots/baseline-populated/states/return-create-return-filled-form-390.png) |
| adjustments | adjustment-filled-form | 390px | NO BASELINE | — |
| dashboard | global-search | 390px | NOT CHECKED — React state capture/comparison pending | [image](../reference-shots/baseline-populated/states/dashboard-global-search-390.png) |
