# Frontend UI/UX Specification

**Baseline inspected:** `frontend/reference/precision-slate-erp-v43__3_ (1).html`
**Audit date:** 2026-10-11
**Status:** Reference-only specification. The React app is empty. This records the visual layout and user-facing flows to reproduce; browser persistence, math, authentication and security behavior are explicitly not requirements.

## Shell and global behavior

### Application frame

- Arabic-only interface, `lang="ar"`, right-to-left document and forms.
- Full-height app frame: fixed-width right sidebar, a flexible main column, 52px top bar and a scrollable content region. The final override in the reference sets the desktop sidebar to 196px (an earlier token says 240px).
- Sidebar: logo mark/name/subtitle; grouped, expandable navigation with section labels, icons, active highlight, optional count badges and sub-navigation; bottom user avatar/name/role and connection indicator.
- Navigation group labels include sales, customer accounts, products/inventory, finance, containers, reports and administration/settings. Exact screen labels are listed below; do not surface routes that are out of release scope.
- Header: breadcrumb, global search with `Ctrl+K`, notification control/panel, quick actions and a dark/light theme control. User menu is in the sidebar footer in the reference. Responsive menu toggle is added for mobile.
- Content page header: Arabic title and supporting description on the right; primary/secondary actions aligned opposite it. Cards and section groups use subtle separators and low-contrast borders.
- The reference includes a login overlay with username/password fields and an Enter-to-submit affordance. React uses real `/auth/login` and must not reproduce the demo credential behavior.
- Toasts appear at the upper left: success, error and informational variants, title and optional description, dismiss after approximately four seconds.
- Row overflow menus, confirm dialogs, notification panel, quick-search dropdown and form modals are overlays. Escape closes overlays/row menus. Click-away closes overlays.

### Themes, typography and components

- Dark theme is the default. Light theme changes backgrounds, text, border, accent, success/warning/danger colors while preserving the same component geometry.
- Font: IBM Plex Sans Arabic with system sans-serif fallback. The original imports it remotely; the React app must self-host the font in `public/assets/fonts` and make no font CDN requests.
- Base font size 13px; compact data UI uses 10–13px; page titles are larger and bold; amounts use tabular numerals.
- Small 4px radius, large-card/modal 8px radius. Borders are thin and muted; cards distinguish low/normal/high surfaces. Buttons are compact, with primary blue, secondary neutral, ghost and danger treatments.
- Common components: page header, cards, status badges, KPI cards, table toolbar, filters, data table, pagination, modal, tabs, form grid, alert, timeline, toast, empty state and chart.
- Icons are inline SVG/emoji in the reference, not a remote icon service. Use local/inline accessible SVG icons in React.

### Responsive, motion and print

- Reference breakpoints: 1100px for dense invoice form grid; 768px for sidebar off-canvas, page-header wrapping and narrower table spacing; 600px for invoice preview stacking.
- On phones the sidebar becomes a right-side overlay; table content in the reference may horizontally scroll. The product requirement supersedes this: use responsive cards instead of sideways-scrolling tables.
- Chart bars animate height over 0.3s; menu/sidebar transitions are about 0.2s; toast entrance slides/fades over 0.2s. Preserve motion only when it respects reduced-motion preferences.
- Print hides sidebar, topbar and page actions. Invoice/document print is a white, RTL print view; invoice paper is A4 with 10mm margins in the later reference print CSS. The user decision is browser print only—do not add PDF, WhatsApp or QR integrations.

### Keyboard and interaction affordances

- `Ctrl+K` / `Cmd+K`: global search.
- `N` (when not typing): open new invoice.
- `Ctrl+Enter` / `Cmd+Enter` on invoice form: issue invoice.
- `Escape`: close open modal/overlay/menu.
- `Enter`: submit login; confirm global-search result; some lookup fields activate on Enter.
- Forms expose visible labels, required markers, inline warnings, status badges and confirmation dialogs. Keep keyboard focus visible and return focus to the trigger after closing dialogs.
- The reference includes success/error toasts and local demo feedback. React feedback must follow the API result; never show success before the API confirms it.

### Data, loading, error and empty states

- Reference screens are seeded/demo-oriented and are not connected to a backend. Some lists contain sample rows; other screens contain empty/demo tables or generic buttons. It has no authoritative API loading/error contract.
- React states required in every data view: initial loading, empty result with a useful Arabic call to action where permitted, recoverable request error/retry, permission denied, and populated results. Forms preserve entered data after network/server errors.
- Render API validation errors next to fields and shared errors as clear Arabic messages. Unknown/network errors must not become a success-shaped empty state.
- Monetary values, quantities, totals, tax, balances and profit are server results. Use decimal-string formatting only; never calculate them in the browser. Show unapplied collections in their own field/row.

## Screen-by-screen inventory

Fields and buttons below are in visual order where present in the inspected reference. `—` means the reference is principally a list/report or the referenced fields live in a modal. Static prototype controls are not proof that their operation is supported.

|   # | Screen                                         | Layout, fields, filters, tabs and columns                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | Primary actions and important states                                                                                                                                                                                        |
| --: | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|   1 | Dashboard — لوحة التحكم                        | Period selectors for month/week/year; KPI cards for sales, collections, expenses, profit, pending orders, low stock and treasury; overdue invoices; container alert; cash/inventory charts; recent-activity table (type, reference, party, amount, time, status).                                                                                                                                                                                                                                                                           | Export; go to accounts; demo-first-invoice action; preview/demo-data action; view all. Capture date-range selection, chart/summary and empty/loading/error states.                                                          |
|   2 | Customers — العملاء                            | Search, status/currency filters and pagination. List columns: name, phone, currency, credit limit, balance, status; detail view/tabs: overview, orders, invoices, payments, statement. Add-customer modal has tabs **البيانات الأساسية**, **البيانات المالية**, **المرفقات**. Basic fields in order: name, customer code, email, phone, address, salesperson, tax number. Financial fields: default currency, credit limit, payment terms, opening balance. Attachments panel has drag/drop and file table (name, type, size, upload date). | Export; add customer; row/detail actions. Capture each modal tab and customer-detail tabs. API feature-gate fields not supported by the frozen contract; email/address are present in the current snapshot.                 |
|   3 | Orders — الطلبات                               | Search/export, status filters (draft/confirmed/preparing/completed/cancelled in the reference), list columns: order number, customer, date, total, reservation, status.                                                                                                                                                                                                                                                                                                                                                                     | Export; create order; open order detail. Low-stock warning at confirmation is informational and never blocks.                                                                                                               |
|   4 | Order creation — إنشاء طلب مبيعات جديد         | Fields: order number (automatic), customer, order date, currency, warehouse, payment terms; line table columns: product, product code, stock available, requested quantity, unit price, discount %, line total; notes and totals.                                                                                                                                                                                                                                                                                                           | Import quote draft; add customer; add product; cancel; save draft; confirm. Use API-returned preview totals only.                                                                                                           |
|   5 | Order detail — طلب مؤكد ومعتمد                 | Tabs: order details, items/prices, reservations, deliveries, invoices. Displays order data, item code/name, quantity/unit, unit price, tax, line total, and linked fulfillment/finance state.                                                                                                                                                                                                                                                                                                                                               | Cancel order, reserve stock, create delivery, create invoice. Missing cancel/reservation contract is WAITING; do not imitate local mutations.                                                                               |
|   6 | Invoices — الفواتير                            | Search, customer/date/status/date-range filters and pagination. Columns: invoice number, customer, issue date, due date, total, paid, remaining, issuer, status, row actions.                                                                                                                                                                                                                                                                                                                                                               | Preview/print selected; export; create invoice; print; open detail; return/reverse actions where permissioned.                                                                                                              |
|   7 | Invoice creation — إنشاء فاتورة مبيعات جديدة   | Sale/return mode; collect-now/credit choice; customer, phone, current balance, credit limit; invoice date/time/number, payment terms/due date, optional driver/warehouse; item table (#, product name/search by name/code/barcode, category, quantity, unit price, line total); discount, tax from Settings, notes and collection fields.                                                                                                                                                                                                   | Cancel; preview; save draft; issue; copy prior invoice; add/remove line; collect-now. Credit-limit warning is non-blocking. Use debounced server preview endpoint if approved; no browser totals.                           |
|   8 | Invoice print — معاينة الطباعة                 | White invoice preview: company identity/header, document number/date, seller/customer details, line table, server-provided totals and signatures/footer.                                                                                                                                                                                                                                                                                                                                                                                    | Back; print. Reference has WhatsApp/PDF buttons; product scope removes those integrations.                                                                                                                                  |
|   9 | Collections — لوحة التحصيل                     | Outstanding invoices table: invoice number, customer, due date, overdue duration, remaining, status; collection KPIs/summary. Payment modal fields: invoice/customer, method, treasury, amount, date, reference, notes.                                                                                                                                                                                                                                                                                                                     | Record collection; allocate manually/according to backend response; show unapplied remainder separately. Do not subtract unapplied cash from invoice/customer balances.                                                     |
|  10 | Deliveries — أذونات صرف المواد والتسليم        | Status filters; table columns: delivery number, order number, recipient, delivery date, source warehouse, requested quantity, delivered quantity, status.                                                                                                                                                                                                                                                                                                                                                                                   | QR scan button in the prototype (omitted by scope); create delivery; open detail. Full-only delivery; no partial delivery.                                                                                                  |
|  11 | Delivery creation — إنشاء إذن صرف وتوصيل جديد  | Fields: delivery type, linked order, recipient, source warehouse, delivery date, transport method; line table: product code/name, requested quantity, warehouse availability, quantity to issue; driver, vehicle plate and notes.                                                                                                                                                                                                                                                                                                           | Cancel; save/print in prototype (print only if allowed); confirm/create delivery. Full delivery only.                                                                                                                       |
|  12 | Returns — مرتجعات المبيعات                     | Return list columns: return number, source invoice, customer, reason, processing type, amount, status.                                                                                                                                                                                                                                                                                                                                                                                                                                      | Create return; open return.                                                                                                                                                                                                 |
|  13 | Return creation — إنشاء مرتجع مبيعات جديد      | Fields: source invoice, customer, return date, reason, processing type (cash refund/customer credit/replacement), destination warehouse; line table: product, invoice quantity, return quantity, unit price, condition, total; notes.                                                                                                                                                                                                                                                                                                       | Cancel; confirm return; add/remove line. Linked and free-form return flows use backend rules and server totals.                                                                                                             |
|  14 | Products — المنتجات والأصناف                   | Search/filter by SKU/name/category/stock/status; list columns: code, product, category, total, reserved, available, sale price, status; low-stock alert. Add-product modal shows SKU, category, unit, default warehouse, tax rate, purchase price, sale price, opening quantity, minimum stock, description.                                                                                                                                                                                                                                | Export; add/edit product. Unsupported reference fields stay hidden behind a feature flag and are listed in API requests.                                                                                                    |
|  15 | Inventory summary — ملخص المخزون               | Warehouse balances, item/value/low-stock/warehouse KPIs; stock balance table grouped by product and warehouse.                                                                                                                                                                                                                                                                                                                                                                                                                              | Export; inventory adjustment. Use backend balance and valuation only.                                                                                                                                                       |
|  16 | Inventory movements — حركات المخزون            | Filters for in/out/adjustment/transfer/return; table columns: date, movement type, product, warehouse, quantity, reference, user.                                                                                                                                                                                                                                                                                                                                                                                                           | Export; open movement detail.                                                                                                                                                                                               |
|  17 | Inventory adjustments — تسويات المخزون         | Adjustment history and count form. Fields: warehouse, count date, reason, system quantity vs actual quantity/difference; optional financial-effect toggle, impact amount and account/treasury.                                                                                                                                                                                                                                                                                                                                              | New adjustment; cancel; submit/approve. Adjustment list/detail API coverage must be verified.                                                                                                                               |
|  18 | Finance — المالية (nested panels)              | Finance tabs/panels for chart of accounts, customer accounts, treasuries, transfers, expenses, financial adjustments and currencies. Tables show account codes/names/balances; customer invoice/payment/balance/status; treasury date/description/reference/in/out/balance.                                                                                                                                                                                                                                                                 | Add/transfer/record expense; open finance tabs. Only build panels with API support; COA/adjustments are parked pending accounting; currencies is EGP-only per scope. Financial areas require step-up and permission checks. |
|  19 | Containers — متابعة الحاويات                   | Active/in-transit/port/clearance/received KPIs; list columns: container number, supplier, origin, expected date, expenses, status; creation form/modal captures supplier/origin/ETA/expenses/status and lines with quantities/purchase and sale prices.                                                                                                                                                                                                                                                                                     | Add container; open container/lines; status update.                                                                                                                                                                         |
|  20 | Container receipt — استلام حاوية               | Expected vs actual quantities, difference and reason; costs and receiving confirmation.                                                                                                                                                                                                                                                                                                                                                                                                                                                     | Back; view landed cost/stock; cancel; receive. Support partial receipt, retain status history, and post server-side.                                                                                                        |
|  21 | Landed cost — التكلفة الفعلية                  | Purchase/freight/customs/clearance cost breakdown; product, quantity, allocation percent/value, landed unit cost.                                                                                                                                                                                                                                                                                                                                                                                                                           | Back; approve allocation/update costs. Dedicated preview endpoint is missing; screen waits for contract.                                                                                                                    |
|  22 | Reports center — مركز التقارير والذكاء التجاري | Six advertised groups: sales (6), containers (4), profit (5), inventory (5), customer/supplier (4), finance (4); cards navigate to report sections.                                                                                                                                                                                                                                                                                                                                                                                         | Choose report group/report. The advertised 28 reports are not all separate implemented report screens.                                                                                                                      |
|  23 | Sales report — تقرير المبيعات                  | Date range, employee and grouping controls (month/week/employee); KPIs for sales/orders/average/top employee; chart; employee table: employee, order count, sales, discounts, net, share %.                                                                                                                                                                                                                                                                                                                                                 | Export Excel/CSV; print; reset/apply filters.                                                                                                                                                                               |
|  24 | Profit/loss report — تقرير الأرباح والخسائر    | Period and comparison selectors; income-statement rows with current period, prior period and variance.                                                                                                                                                                                                                                                                                                                                                                                                                                      | Export/print/apply. Use API-provided values only; accounting screen is parked pending accountant.                                                                                                                           |
|  25 | User and permissions — المستخدم والصلاحيات     | Tabs: profile and security; profile fields include full name, email, phone, role; security fields include current/new password; user/role permission matrix is shown in older layout.                                                                                                                                                                                                                                                                                                                                                       | Save changes/security settings. Reference's client roles are replaced by server permissions; users admin waits for its endpoint.                                                                                            |
|  26 | Warehouses — المخازن                           | Table columns: warehouse name, location, manager, item count, occupancy, status. Add/edit modal has name, location and manager.                                                                                                                                                                                                                                                                                                                                                                                                             | Add/edit warehouse; open balances.                                                                                                                                                                                          |
|  27 | Inventory report — تقرير المخزون               | Warehouse/category filters; stock value, turnover, slow-moving and below-minimum KPIs; table columns: product, warehouse, on-hand, average unit cost, total value, status.                                                                                                                                                                                                                                                                                                                                                                  | Export/print; filter/reset. Cost/value fields render only when returned and permissioned.                                                                                                                                   |
|  28 | Financial reports — التقارير المالية           | Income statement, balance sheet and cash-flow tabs/sections with revenue, COGS, gross profit, operating expense, net profit, assets/liabilities/equity.                                                                                                                                                                                                                                                                                                                                                                                     | Export/print and period filter in reference. Layout only until accountant-approved definitions and endpoints exist; show «بانتظار الإعداد المحاسبي».                                                                        |
|  29 | Settings — الإعدادات العامة                    | Tabs: company details; billing/numbering; general settings; backup; security/session settings. Company fields: name, tax number, commercial registration, phone, official email, address.                                                                                                                                                                                                                                                                                                                                                   | Backup/restore buttons and save settings in reference; backup/restore remains an operations task. Tax form reads `/settings/sales-tax`; general settings wait for endpoint.                                                 |

### Screen 1 — Dashboard (لوحة التحكم)

See inventory row 1: period selectors, KPI cards, alerts, liquidity/inventory charts and recent activity.

### Screen 2 — Customers (العملاء)

See inventory row 2: searchable customer list, detail and add-customer tabs.

### Screen 3 — Orders (الطلبات)

See inventory row 3: filterable order list and status badges.

### Screen 4 — Order creation (إنشاء طلب مبيعات جديد)

See inventory row 4: customer, order terms, item lines and server preview.

### Screen 5 — Order detail (طلب مؤكد ومعتمد)

See inventory row 5: order tabs, status history, deliveries and invoices.

### Screen 6 — Invoices (الفواتير)

See inventory row 6: invoice search, status filters, totals and row actions.

### Screen 7 — Invoice creation (إنشاء فاتورة مبيعات جديدة)

See inventory row 7: invoice mode, customer, terms, lines and API preview.

### Screen 8 — Invoice print preview (معاينة الطباعة)

See inventory row 8: white RTL invoice paper, parties, lines, totals and signature.

### Screen 9 — Collections (لوحة التحصيل)

See inventory row 9: collection list, allocation and separate unapplied amount.

### Screen 10 — Deliveries (أذونات صرف المواد والتسليم)

See inventory row 10: full-delivery list and status.

### Screen 11 — Delivery creation (إنشاء إذن صرف وتوصيل جديد)

See inventory row 11: source order/items, driver and delivery details.

### Screen 12 — Returns (مرتجعات المبيعات)

See inventory row 12: linked/free-form returns, status and source document.

### Screen 13 — Return creation (إنشاء مرتجع مبيعات جديد)

See inventory row 13: return source, reason and lines with server preview.

### Screen 14 — Products (المنتجات والأصناف)

See inventory row 14: product/category filters, stock and sale-facing values.

### Screen 15 — Inventory summary (ملخص المخزون)

See inventory row 15: warehouse/product stock summary and low-stock states.

### Screen 16 — Inventory movements (حركات المخزون)

See inventory row 16: searchable movement ledger, source and quantity.

### Screen 17 — Inventory adjustments (تسويات المخزون)

See inventory row 17: adjustment reason and quantities; backend owns resulting stock.

### Screen 18 — Finance (المالية)

See inventory row 18: treasury, transfers, expenses and protected account areas.

### Screen 19 — Containers (متابعة الحاويات)

See inventory row 19: status, origin, arrival, contents and cost overview.

### Screen 20 — Container receipt (استلام حاوية)

See inventory row 20: receipt lines, destinations and partial-receipt status.

### Screen 21 — Landed cost (التكلفة الفعلية)

See inventory row 21: cost categories and allocation basis; no client-side cost math.

### Screen 22 — Reports center (مركز التقارير والذكاء التجاري)

See inventory row 22: report groups, navigation and period controls.

### Screen 23 — Sales report (تقرير المبيعات)

See inventory row 23: date/group filters, server totals, chart and employee table.

### Screen 24 — Profit/loss report (تقرير الأرباح والخسائر)

See inventory row 24: period comparison and permissioned API-provided values.

### Screen 25 — Users and permissions (المستخدم والصلاحيات)

See inventory row 25: profile/security controls and owner-only user actions.

### Screen 26 — Warehouses (المخازن)

See inventory row 26: warehouse list, location, manager and stock context.

### Screen 27 — Inventory report (تقرير المخزون)

See inventory row 27: warehouse/category filters and server-reported values.

### Screen 28 — Financial reports (التقارير المالية)

See inventory row 28: accounting report shell and accountant-waiting state.

### Screen 29 — General settings (الإعدادات العامة)

See inventory row 29: company, security, numbering and preferences.

## Modals, tabs and meaningful baseline states

The reference contains a shared add-customer modal with three tabs, payment/collection modal, expense modal, product modal, container/warehouse dialogs, invoice confirmation/detail/edit flows, return form, row menus, global search, notifications and a user/security tab. Include baseline captures for each of the 29 screens at 1440px, 768px and 390px. Capture distinct modal/tab/form states wherever available; the screenshot manifest records any state that could not be reached without relying on demo-only JavaScript.

## Fidelity boundaries and implementation notes

- Preserve the look, page hierarchy, Arabic labels, ordering of fields/actions, list columns, tabs and print layout.
- Preserve warning visibility, but backend owns warning values and decisions; credit and low-stock warnings do not block actions.
- Keep business fields that lack API support hidden behind explicit feature flags, not fake persistence.
- Use the snapshot for endpoint names/types. When missing, mark the screen/action WAITING and record the API request.
- React text rendering must use normal escaped JSX, never raw HTML insertion.
- The reference's localStorage, default PIN/password behavior, floating-point calculations, local stock/balance mutations, lossy save handlers, and demo success toasts are bugs—not parity requirements.
