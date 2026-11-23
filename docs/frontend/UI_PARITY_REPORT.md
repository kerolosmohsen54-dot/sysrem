# UI Parity Audit

**Audit phase:** Part 0 (source inventory only)  
**Reference:** `frontend/reference/precision-slate-erp-v43__3_ (1).html` (read-only; 6,065 lines, 821,223 bytes)  
**Frontend:** route declarations and page source under `frontend/src/`  
**Backend contract:** `backend/docs/openapi.yaml` (read-only; 135 operations, 29 under `/mobile/`)  
**Visual screenshots/browser comparison:** **NOT VERIFIED** in this audit.

## Reference inventory

- 8 sidebar navigation groups in this order: invoices/sales, customers, products/inventory, finance, containers, reports, administration, dashboard.
- 30 sidebar destination entries in markup; 27 unique `showSection` targets (some destinations repeat). These include `invoices`, `invoice-create`, `collections`, `customers`, `customer-accounts`, `products`, `warehouses`, `inventory-summary`, `movements`, `finance`, `coa`, `cashiers`, `transfers`, `expenses`, `financial-adjustments`, `currencies`, `containers`, `container-receive`, `landed-cost`, `reports`, `reports-sales`, `reports-profit`, `reports-inventory`, `reports-financial`, `users`, `settings`, and `dashboard`.
- 34 distinct `sec-*` screen containers are present or created by reference scripts. The final five are runtime-created (`sec-fin-overview`, `sec-transfers`, `sec-move-detail`, `sec-fin2`, `sec-liq`).
- Login is separately present in the reference. The 34 screen containers do not include it.
- 12 modal-related IDs/hooks were found: six explicit user-facing modal IDs (`modal-add-customer`, `modal-payment`, `modal-expense`, `modal-add-product`, `modal-add-warehouse`, `modal-confirm`), plus the customer modal tab hooks and two generic/demo modal containers. The two generic containers are not counted as additional confirmed user workflows.
- Tab hooks/groups found: customer detail, order detail, user/security, settings, customer creation modal, finance, and additional runtime user/return tab hooks. Exact visible options in every state are **NOT VERIFIED**.
- Reference states/components include loading skeleton styling, empty/no-data content, status badges, modal confirmation, dropdown menus, notification panel, toast feedback and error/danger styling. The exhaustive trigger-to-state transitions are **NOT VERIFIED**.
- Responsive media breakpoints: 1100px, 768px, and 600px.

## Screen-by-screen source comparison

Status records implementation/source evidence, not pixel matching. `NOT VERIFIED` means a visual/behavior comparison was not run. A corresponding frontend route/page is not proof of parity.

| Screen | In reference | In frontend | Status | What differs / evidence |
| --- | --- | --- | --- | --- |
| Login | Yes | `/login`, `LoginPage` | NOT VERIFIED | Route exists; visual and live-auth comparison not run. |
| Dashboard | `sec-dashboard` | `/dashboard`, `DashboardPage` | NOT VERIFIED | Route exists; reference-to-frontend visual comparison not run. |
| Customer list | `sec-customers` | `/customers`, `CustomerListPage` | NOT VERIFIED | Route exists; layout, fields and states not compared in browser. |
| Customer accounts | Sidebar target `customer-accounts` | No dedicated route in `App.tsx` | MISSING | `Finance/CustomerAccountsPage.tsx` exists as a file, but the router does not import or expose it. |
| Customer detail | Reference customer panel/tabs | `/customers/:customerId`, `CustomerDetailPage` | NOT VERIFIED | Route exists; panel/tabs and behavior not compared in browser. |
| Orders list | `sec-orders` | `/orders`, `OrdersPage` | NOT VERIFIED | Route exists; visual/behavior comparison not run. |
| Order create | `sec-order-create` | `/orders/new`, `OrderFormPage` | NOT VERIFIED | Route exists; visual/behavior comparison not run. |
| Order detail | `sec-order-detail` | `/orders/:orderId`, `OrderDetailPage` | NOT VERIFIED | Route exists; tab and detail comparison not run. |
| Invoices list | `sec-invoices` | `/invoices`, `InvoiceListPage` | NOT VERIFIED | Route exists; visual/behavior comparison not run. |
| Invoice create | `sec-invoice-create` | `/invoices/new`, `InvoiceFormPage` | NOT VERIFIED | Route exists; visual/behavior comparison not run. |
| Invoice print | `sec-invoice-print` | `/invoices/:documentId/print`, `InvoicePrintPage` | NOT VERIFIED | Route exists; print output not compared. |
| Invoice detail/edit | Reference list/create/print areas | `/invoices/:documentId` and `/invoices/:documentId/edit` | NOT VERIFIED | Routes exist; visual and contract behavior not compared. |
| Collections | `sec-collections` | `/collections`, `CollectionsPage` | NOT VERIFIED | Route exists; visual/behavior comparison not run. |
| Deliveries list | `sec-deliveries` | `/deliveries`, `DeliveriesPage` | NOT VERIFIED | Route exists; visual/behavior comparison not run. |
| Delivery create | `sec-delivery-create` | `/deliveries/new`, `DeliveryFormPage` | NOT VERIFIED | Route exists; visual/behavior comparison not run. |
| Delivery detail | Reference detail interaction | `/deliveries/:deliveryId`, `DeliveryDetailPage` | NOT VERIFIED | Route exists; visual/behavior comparison not run. |
| Returns list | `sec-returns` | `/returns`, `ReturnsPage` | NOT VERIFIED | Route exists; visual/behavior comparison not run. |
| Return create | `sec-return-create` | `/returns/new`, `ReturnFormPage` | NOT VERIFIED | Route exists; API gaps are listed under Open questions. |
| Products | `sec-products` | `/products`, `ProductsPage` | NOT VERIFIED | Route exists; visual/behavior comparison not run. |
| Inventory summary | `sec-inventory-summary` | `/inventory`, `InventoryBalancesPage` | NOT VERIFIED | Route exists; visual/behavior comparison not run. |
| Inventory movements | `sec-movements` | `/inventory/movements`, `InventoryMovementsPage` | NOT VERIFIED | List route exists; detail destination is a separate missing screen. |
| Movement detail | Runtime `sec-move-detail` | No movement-reference detail route in `App.tsx` | MISSING | Reference opens a dedicated movement detail section; frontend exposes only the movement list. |
| Inventory adjustments | `sec-adjustments` | `/inventory/adjustments`, `InventoryAdjustmentPage` | NOT VERIFIED | Route exists; visual/behavior comparison not run. |
| Finance page | `sec-finance` | `/finance`, `FinancePage` | NOT VERIFIED | Route exists; finance view and tab behavior not compared. |
| Financial overview | Runtime `sec-fin-overview` | `/finance`, `FinancePage` | NOT VERIFIED | Same subject area is routed; equivalence of the runtime overview flow is not established. |
| Finance tabs/alternate finance | Runtime `sec-fin2` | `/finance`, `FinancePage`; finance subroutes also exist | DIFFERENT | Reference creates a second tabbed finance view; frontend has a distinct route/component structure. |
| Customer liquidation | Runtime `sec-liq` | Customer detail and statement routes | DIFFERENT | Reference has a dedicated read-only customer liquidation screen; no equivalent dedicated route is declared. |
| Inventory transfers | Runtime `sec-transfers` / `transfers` | `/inventory/transfers`, `InventoryTransferPage` | NOT VERIFIED | Route exists; reference transfer workflow parity not checked. |
| Containers | `sec-containers` | `/containers`, `ContainerListPage` | NOT VERIFIED | Route exists; visual/behavior comparison not run. |
| Container receive | `sec-container-receive` | `/containers/:containerId/receive`, `ContainerReceiptPage` | NOT VERIFIED | Route exists; visual/behavior comparison not run. |
| Landed cost | `sec-landed-cost` | `/containers/:containerId/landed-cost`, `LandedCostPage` | NOT VERIFIED | Route exists; supplier/API gap remains open. |
| Reports center | `sec-reports` | `/reports`, `ReportsPage` | NOT VERIFIED | Route exists; visual/behavior comparison not run. |
| Sales report | `sec-reports-sales` | `/reports/sales`, `SalesReportPage` | NOT VERIFIED | Route exists; payload shape remains partly prose-only in the API contract. |
| Profit report | `sec-reports-profit` | `/reports/invoice-profit`, `ProfitReportPage` | NOT VERIFIED | Route exists; visual/behavior comparison not run. |
| Inventory report | `sec-reports-inventory` | `/reports/stock`, `InventoryReportPage` | NOT VERIFIED | Route exists; visual/behavior comparison not run. |
| Financial report | `sec-reports-financial` | `/reports/financial`, `FinancialReportPage` | DIFFERENT | Reference financial reporting is not backed by a complete machine-readable accounting/report contract; see Open questions. |
| Users | `sec-users` | `/admin/users`, `UsersPage` | NOT VERIFIED | Route exists; visual/behavior comparison not run. |
| Warehouses | `sec-warehouses` | `/warehouses`, `WarehousesPage` | NOT VERIFIED | Route exists; visual/behavior comparison not run. |
| Settings | `sec-settings` | `/admin/settings`, `SettingsPage` | NOT VERIFIED | Route exists; visual/behavior comparison not run. |

## Frontend-only routes/pages to retain

Do not remove these merely because they are absent from a top-level reference section; several are supporting detail/form routes. Compare them as screen flows in later parts:

- Categories, opening stock, damaged stock, admin audit.
- Finance treasury, transfers, expenses, currencies, chart of accounts and financial adjustments.
- Reports for container costs, customer balances, stock movements and invoice profit.
- Customer statement; product cost history; container detail, receipt entry and receipt detail.
- Invoice edit/detail; delivery detail; order detail.

The source also contains `frontend/src/features/orders-deliveries/` page files separate from the route-wired `frontend/src/features/orders/` pages. Whether those un-routed files are intentional extras is **NOT VERIFIED**; do not delete without inspecting usage/history.

## Frontend page-source inventory

The source tree contains 57 feature files whose filename ends in `Page.tsx`, plus `CatalogPages.tsx` and `StockPages.tsx`, which export multiple routed page components. This is a filename inventory, not a count of unique routed screens.

```text
frontend/src/features/admin/AuditPage.tsx
frontend/src/features/admin/SettingsPage.tsx
frontend/src/features/admin/UsersPage.tsx
frontend/src/features/auth/LoginPage.tsx
frontend/src/features/catalog/ProductListPage.tsx
frontend/src/features/containers/ContainerDetailPage.tsx
frontend/src/features/containers/ContainerListPage.tsx
frontend/src/features/containers/ContainerReceiptDetailPage.tsx
frontend/src/features/containers/ContainerReceiptPage.tsx
frontend/src/features/containers/LandedCostPage.tsx
frontend/src/features/customers/CustomerDetailPage.tsx
frontend/src/features/customers/CustomerListPage.tsx
frontend/src/features/customers/CustomerStatementPage.tsx
frontend/src/features/dashboard/DashboardPage.tsx
frontend/src/features/finance/AccountingWaitingPage.tsx
frontend/src/features/finance/ChartOfAccountsPage.tsx
frontend/src/features/finance/CurrenciesPage.tsx
frontend/src/features/finance/CustomerAccountsPage.tsx
frontend/src/features/finance/ExpensePage.tsx
frontend/src/features/finance/FinancePage.tsx
frontend/src/features/finance/FinancialAdjustmentsPage.tsx
frontend/src/features/finance/TransferPage.tsx
frontend/src/features/finance/TransfersPage.tsx
frontend/src/features/finance/TreasuryPage.tsx
frontend/src/features/inventory/AdjustmentPage.tsx
frontend/src/features/inventory/CostHistoryPage.tsx
frontend/src/features/inventory/DamagedStockPage.tsx
frontend/src/features/inventory/InventorySummaryPage.tsx
frontend/src/features/inventory/MovementListPage.tsx
frontend/src/features/inventory/StockTransferPage.tsx
frontend/src/features/inventory/WarehouseListPage.tsx
frontend/src/features/orders/DeliveriesPage.tsx
frontend/src/features/orders/DeliveryDetailPage.tsx
frontend/src/features/orders/DeliveryFormPage.tsx
frontend/src/features/orders/OrderDetailPage.tsx
frontend/src/features/orders/OrderFormPage.tsx
frontend/src/features/orders/OrdersPage.tsx
frontend/src/features/orders-deliveries/DeliveryFormPage.tsx
frontend/src/features/orders-deliveries/DeliveryListPage.tsx
frontend/src/features/orders-deliveries/OrderDetailPage.tsx
frontend/src/features/orders-deliveries/OrderFormPage.tsx
frontend/src/features/orders-deliveries/OrderListPage.tsx
frontend/src/features/reports/ContainerCostsReportPage.tsx
frontend/src/features/reports/CustomerBalancesReportPage.tsx
frontend/src/features/reports/FinancialReportPage.tsx
frontend/src/features/reports/InventoryReportPage.tsx
frontend/src/features/reports/ProfitReportPage.tsx
frontend/src/features/reports/ReportsPage.tsx
frontend/src/features/reports/SalesReportPage.tsx
frontend/src/features/sales/CollectionsPage.tsx
frontend/src/features/sales/InvoiceDetailPage.tsx
frontend/src/features/sales/InvoiceEditPage.tsx
frontend/src/features/sales/InvoiceFormPage.tsx
frontend/src/features/sales/InvoiceListPage.tsx
frontend/src/features/sales/InvoicePrintPage.tsx
frontend/src/features/sales/ReturnFormPage.tsx
frontend/src/features/sales/ReturnsPage.tsx
```

## Contract-dependent Open questions

The frontend API gap list in `docs/frontend/FRONTEND_API_REQUESTS.md` identifies these blockers; this audit does not invent endpoints or alter backend behavior:

1. Supplier directory/list endpoint is absent, although container/cost forms may need supplier selection.
2. Return creation does not define all free-form product/price/description inputs or a complete processing choice for cash/credit/replacement. The invoice detail contract also lacks stable line IDs needed by linked returns.
3. Dashboard and report success payloads are partly prose rather than stable, machine-readable schemas with pagination/permission/error and decimal-string rules.
4. Accounting ledgers, chart-of-accounts workflows, financial adjustments/statements and approved damaged-stock workflows are absent or incomplete in the contract.
5. Treasury, expenses, orders, deliveries, containers, receipts, users, audit and general-settings response schemas are partly prose-only; exact field/nullability/status/pagination shapes need contract confirmation.
6. Some optional order/delivery fields in the reference (including warehouse/payment terms/transport details) are not described in the contract.
7. Mobile source/message APIs are bearer-authenticated, not browser-session screens. Do not create web UI for those operations under this parity task.

## Part 0 audit limits

- Counts are source-based: 34 `sec-*` containers, 8 sidebar groups, 30 visible destination handlers (27 unique), and 6 explicit user-facing modal IDs.
- No reference or frontend screenshots were captured in Part 0.
- Loading/error/empty/success behavior was not exhaustively exercised.
- Backend requests were not run and no database was accessed.
- Consequently all pixel-level parity, live API load/save/error behavior and viewport comparisons are **NOT VERIFIED**.

## Part 0 checks

Commands were run from `frontend/`:

| Command | Result |
| --- | --- |
| `npm run typecheck` | PASS (exit 0) |
| `npm run lint` | PASS (exit 0) |
| `npm test` | FAIL (exit 1): 22 files; 68 passed, 6 failed, 74 total. Failures are in `admin-parked.test.tsx` (3), `container-receipt.test.tsx` (1), and `finance-reports.test.tsx` (2). Observed assertions include missing expected settings/treasury/invoice headings and missing container-receipt empty-state text; one user-administration test timed out. No source code was changed in Part 0, so these failures remain unresolved and block the next part under the requested stop rule. |

An initial invocation of the three npm commands from the repository root failed because the root has no `package.json` (`ENOENT`). They were rerun from `frontend/`; the table records those correct-workspace results.
