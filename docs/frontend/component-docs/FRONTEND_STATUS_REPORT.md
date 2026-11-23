# Frontend Status Report

**Inspection date:** 2026-10-11
**Repository:** `D:\system karas\system end`
**Branch at inspection:** `master`
**Scope:** Read-only inspection of the frontend, its reference HTML, project requirements, and the backend OpenAPI contract. No database was accessed. No build, install, commit, or staging operation was performed. The only file created by this task is this report.

## Executive summary

The React frontend is an unimplemented scaffold. All 77 files under `frontend/src` are zero bytes, including all routes, components, screens, stores and API client/service files. Thus **0 of the 29 reference screens are complete; 29 are at 0%; none are partial**. The reference is a large, standalone Arabic/RTL HTML demo that must not be treated as working application code.

The dependency tree is installed. TypeScript type-check passes, but this establishes only that the empty `src` tree causes no compiler errors. There is no lint or test script and no actual frontend test. The user explicitly prohibited building, so `build` was **NOT RUN**.

The current `backend/docs/openapi.yaml` documents 88 method/path operations across 63 paths. It has dashboard, treasury, expenses and some reporting operations; it does **not** document audit-log, user/role administration, general settings, financial statements, ledger/journal/COA, a customer detail GET, or some order and landed-cost actions. OpenAPI coverage is contract evidence only; this report does not claim that every documented route has been independently exercised against a running API.

## 1. Frontend folder, file sizes and Git state

### Inventory scope and counts

The table below lists every file tracked by Git under `frontend/` at inspection time (90 files), with byte size and empty status. It includes source, tests, reference HTML, manifests and configs. An additional four untracked/generated files in `frontend/dist/` are listed after the table. The installed, ignored `frontend/node_modules/` contains **4,430 files**; it is summarized rather than printing thousands of dependency paths. `node_modules` was present before this task.

Of the 90 tracked files, **85 are empty** and five are non-empty. All 77 files under `frontend/src/` are empty: 72 `.ts`/`.tsx`, three CSS files and two `.gitkeep` files. There are three test-directory `.gitkeep` placeholders and **zero actual frontend test files**.

| Tracked frontend file                                          |   Bytes | State     |
| -------------------------------------------------------------- | ------: | --------- |
| `frontend/.env.example`                                        |       0 | EMPTY     |
| `frontend/index.html`                                          |       0 | EMPTY     |
| `frontend/package-lock.json`                                   |  63,709 | non-empty |
| `frontend/package.json`                                        |     631 | non-empty |
| `frontend/public/assets/fonts/.gitkeep`                        |       0 | EMPTY     |
| `frontend/public/assets/icons/.gitkeep`                        |       0 | EMPTY     |
| `frontend/public/assets/images/.gitkeep`                       |       0 | EMPTY     |
| `frontend/reference/precision-slate-erp-v43__3_ (1).html`      | 821,223 | non-empty |
| `frontend/src/app/App.tsx`                                     |       0 | EMPTY     |
| `frontend/src/app/layouts/AppShell.tsx`                        |       0 | EMPTY     |
| `frontend/src/app/layouts/AuthLayout.tsx`                      |       0 | EMPTY     |
| `frontend/src/app/providers.tsx`                               |       0 | EMPTY     |
| `frontend/src/app/router.tsx`                                  |       0 | EMPTY     |
| `frontend/src/features/admin/AuditPage.tsx`                    |       0 | EMPTY     |
| `frontend/src/features/admin/SettingsPage.tsx`                 |       0 | EMPTY     |
| `frontend/src/features/admin/UsersPage.tsx`                    |       0 | EMPTY     |
| `frontend/src/features/admin/api.ts`                           |       0 | EMPTY     |
| `frontend/src/features/auth/LoginPage.tsx`                     |       0 | EMPTY     |
| `frontend/src/features/catalog/ProductForm.tsx`                |       0 | EMPTY     |
| `frontend/src/features/catalog/ProductListPage.tsx`            |       0 | EMPTY     |
| `frontend/src/features/catalog/api.ts`                         |       0 | EMPTY     |
| `frontend/src/features/containers/ContainerListPage.tsx`       |       0 | EMPTY     |
| `frontend/src/features/containers/ContainerReceiptPage.tsx`    |       0 | EMPTY     |
| `frontend/src/features/containers/LandedCostPage.tsx`          |       0 | EMPTY     |
| `frontend/src/features/containers/api.ts`                      |       0 | EMPTY     |
| `frontend/src/features/customers/CustomerDetailPage.tsx`       |       0 | EMPTY     |
| `frontend/src/features/customers/CustomerForm.tsx`             |       0 | EMPTY     |
| `frontend/src/features/customers/CustomerListPage.tsx`         |       0 | EMPTY     |
| `frontend/src/features/customers/CustomerStatementPage.tsx`    |       0 | EMPTY     |
| `frontend/src/features/customers/api.ts`                       |       0 | EMPTY     |
| `frontend/src/features/dashboard/DashboardPage.tsx`            |       0 | EMPTY     |
| `frontend/src/features/dashboard/api.ts`                       |       0 | EMPTY     |
| `frontend/src/features/finance/ChartOfAccountsPage.tsx`        |       0 | EMPTY     |
| `frontend/src/features/finance/CurrenciesPage.tsx`             |       0 | EMPTY     |
| `frontend/src/features/finance/CustomerAccountsPage.tsx`       |       0 | EMPTY     |
| `frontend/src/features/finance/ExpensePage.tsx`                |       0 | EMPTY     |
| `frontend/src/features/finance/FinancePage.tsx`                |       0 | EMPTY     |
| `frontend/src/features/finance/FinancialAdjustmentsPage.tsx`   |       0 | EMPTY     |
| `frontend/src/features/finance/TransfersPage.tsx`              |       0 | EMPTY     |
| `frontend/src/features/finance/TreasuryPage.tsx`               |       0 | EMPTY     |
| `frontend/src/features/finance/api.ts`                         |       0 | EMPTY     |
| `frontend/src/features/inventory/AdjustmentPage.tsx`           |       0 | EMPTY     |
| `frontend/src/features/inventory/DamagedStockPage.tsx`         |       0 | EMPTY     |
| `frontend/src/features/inventory/InventorySummaryPage.tsx`     |       0 | EMPTY     |
| `frontend/src/features/inventory/MovementListPage.tsx`         |       0 | EMPTY     |
| `frontend/src/features/inventory/StockTransferPage.tsx`        |       0 | EMPTY     |
| `frontend/src/features/inventory/WarehouseListPage.tsx`        |       0 | EMPTY     |
| `frontend/src/features/inventory/api.ts`                       |       0 | EMPTY     |
| `frontend/src/features/orders-deliveries/DeliveryFormPage.tsx` |       0 | EMPTY     |
| `frontend/src/features/orders-deliveries/DeliveryListPage.tsx` |       0 | EMPTY     |
| `frontend/src/features/orders-deliveries/OrderDetailPage.tsx`  |       0 | EMPTY     |
| `frontend/src/features/orders-deliveries/OrderFormPage.tsx`    |       0 | EMPTY     |
| `frontend/src/features/orders-deliveries/OrderListPage.tsx`    |       0 | EMPTY     |
| `frontend/src/features/orders-deliveries/api.ts`               |       0 | EMPTY     |
| `frontend/src/features/reports/FinancialReportPage.tsx`        |       0 | EMPTY     |
| `frontend/src/features/reports/InventoryReportPage.tsx`        |       0 | EMPTY     |
| `frontend/src/features/reports/ProfitReportPage.tsx`           |       0 | EMPTY     |
| `frontend/src/features/reports/ReportsPage.tsx`                |       0 | EMPTY     |
| `frontend/src/features/reports/SalesReportPage.tsx`            |       0 | EMPTY     |
| `frontend/src/features/reports/api.ts`                         |       0 | EMPTY     |
| `frontend/src/features/sales/CollectionsPage.tsx`              |       0 | EMPTY     |
| `frontend/src/features/sales/InvoiceFormPage.tsx`              |       0 | EMPTY     |
| `frontend/src/features/sales/InvoiceListPage.tsx`              |       0 | EMPTY     |
| `frontend/src/features/sales/InvoicePrintPage.tsx`             |       0 | EMPTY     |
| `frontend/src/features/sales/ReturnFormPage.tsx`               |       0 | EMPTY     |
| `frontend/src/features/sales/ReturnsPage.tsx`                  |       0 | EMPTY     |
| `frontend/src/features/sales/api.ts`                           |       0 | EMPTY     |
| `frontend/src/main.tsx`                                        |       0 | EMPTY     |
| `frontend/src/shared/api/errors.ts`                            |       0 | EMPTY     |
| `frontend/src/shared/api/http.ts`                              |       0 | EMPTY     |
| `frontend/src/shared/api/types.ts`                             |       0 | EMPTY     |
| `frontend/src/shared/auth/PermissionGate.tsx`                  |       0 | EMPTY     |
| `frontend/src/shared/auth/sessionStore.ts`                     |       0 | EMPTY     |
| `frontend/src/shared/components/ConfirmDialog.tsx`             |       0 | EMPTY     |
| `frontend/src/shared/components/DataTable.tsx`                 |       0 | EMPTY     |
| `frontend/src/shared/components/FormField.tsx`                 |       0 | EMPTY     |
| `frontend/src/shared/components/Modal.tsx`                     |       0 | EMPTY     |
| `frontend/src/shared/components/PageState.tsx`                 |       0 | EMPTY     |
| `frontend/src/shared/constants/routes.ts`                      |       0 | EMPTY     |
| `frontend/src/shared/hooks/.gitkeep`                           |       0 | EMPTY     |
| `frontend/src/shared/utils/format.ts`                          |       0 | EMPTY     |
| `frontend/src/shared/validation/.gitkeep`                      |       0 | EMPTY     |
| `frontend/src/styles/design-tokens.css`                        |       0 | EMPTY     |
| `frontend/src/styles/global.css`                               |       0 | EMPTY     |
| `frontend/src/styles/rtl.css`                                  |       0 | EMPTY     |
| `frontend/tests/components/.gitkeep`                           |       0 | EMPTY     |
| `frontend/tests/integration/.gitkeep`                          |       0 | EMPTY     |
| `frontend/tests/unit/.gitkeep`                                 |       0 | EMPTY     |
| `frontend/tsconfig.json`                                       |     491 | non-empty |
| `frontend/vite.config.ts`                                      |     142 | non-empty |

Generated/untracked `frontend/dist/` files present at inspection:

| File                                   | Bytes | State |
| -------------------------------------- | ----: | ----- |
| `frontend/dist/index.html`             |     0 | EMPTY |
| `frontend/dist/assets/fonts/.gitkeep`  |     0 | EMPTY |
| `frontend/dist/assets/icons/.gitkeep`  |     0 | EMPTY |
| `frontend/dist/assets/images/.gitkeep` |     0 | EMPTY |

The HTML reference is 821,223 bytes. `frontend/index.html`—the app entry HTML—is empty. A pre-existing `dist/` directory was observed; **this task did not run its build command**.

### Git status

Read-only commands: `git branch --show-current` and `git status --short --branch`.

```text
master
## master
 M backend/database/seeders/RolePermissionMatrixSeeder.php
 M backend/docs/openapi.yaml
 M backend/routes/api_v1.php
?? PROJECT_STATUS_HANDOFF.md
?? backend/app/Http/Controllers/ReportsController.php
?? backend/app/Services/ReportsService.php
?? backend/tests/Feature/ReportsEngineTest.php
```

These pre-existing changes are outside the report task and were not altered, staged or committed. The report itself is the only new file requested here.

## 2. Libraries, tools and configuration

### Runtime and install state

- `frontend/node_modules/`: **exists**; 4,430 files counted.
- Node: `v26.8.2`.
- npm: `12.0.2`.
- Package manager: npm, evidenced by `package-lock.json` lockfile version 3 and the npm scripts/commands below.
- `npm ls --depth=0` succeeded. The resolved versions below are installed direct versions reported by that command. Manifest values are ranges; lockfile pins resolved versions.

### Dependencies

| Package                 | `package.json` range | Installed version | Purpose                                                                 |
| ----------------------- | -------------------: | ----------------: | ----------------------------------------------------------------------- |
| `@hookform/resolvers`   |             `^3.9.0` |          `3.10.0` | Adapters between schema validation (including Zod) and React Hook Form. |
| `@tanstack/react-query` |            `^5.59.0` |         `5.104.1` | Server-state fetching, caching and mutation lifecycle.                  |
| `react`                 |            `^18.3.1` |          `18.3.1` | React UI runtime.                                                       |
| `react-dom`             |            `^18.3.1` |          `18.3.1` | Browser DOM renderer for React.                                         |
| `react-hook-form`       |            `^7.53.0` |          `7.89.0` | Form state and validation integration.                                  |
| `zod`                   |            `^3.23.8` |         `3.25.76` | Runtime schemas and input validation.                                   |

### Development dependencies

| Package                | `package.json` range | Installed version | Purpose                                    |
| ---------------------- | -------------------: | ----------------: | ------------------------------------------ |
| `@types/react`         |            `^18.3.3` |         `18.3.31` | React TypeScript declarations.             |
| `@types/react-dom`     |            `^18.3.0` |          `18.3.7` | React DOM TypeScript declarations.         |
| `@vitejs/plugin-react` |             `^4.3.1` |           `4.7.0` | React/JSX integration for Vite.            |
| `typescript`           |             `^5.5.4` |           `5.9.3` | TypeScript compiler and type-checker.      |
| `vite`                 |             `^5.4.8` |          `5.4.21` | Development server and production bundler. |

### Config files and tooling gaps

- [`package.json`](../package.json): scripts are `dev`, `typecheck`, and `build`. No `lint` or `test` script.
- [`package-lock.json`](../package-lock.json): npm lockfile v3.
- [`tsconfig.json`](../tsconfig.json): strict TypeScript, ES2022 target/libs, ESNext modules, Bundler resolution, `react-jsx`, `noEmit`; includes `src`.
- [`vite.config.ts`](../vite.config.ts): Vite with the React plugin, no other configuration.
- `frontend/index.html`: empty.
- No ESLint, Prettier, Vitest, Jest, Playwright or Cypress configuration/package was found under `frontend/`.
- `frontend/tests/{components,integration,unit}/.gitkeep` are empty directory markers, not test setup.
- `.github/workflows/` contains only an empty `.gitkeep`; no CI workflow file is configured.
- Design-token, global-style and RTL CSS files exist by name, but are all empty.

## 3. Commands and real output

Dependencies were already installed. The following checks were attempted. **Build was deliberately not run** because the instruction explicitly said not to build.

### Type-check

Command: `npm --prefix frontend run typecheck`

```text
> precision-slate-erp-web@0.1.0 typecheck
> tsc --noEmit
```

Exit code: `0` (no TypeScript diagnostics). This is a smoke check only: every file in `src` is empty, so it does not validate application code.

### Lint

Command: `npm --prefix frontend run lint`

```text
npm error Missing script: "lint"
npm error
npm error Did you mean this?
npm error   npm link # Symlink a package folder
npm error
npm error To see a list of scripts, run:
npm error   npm run
```

Exit code: `1`. No lint command is configured.

### Tests

Command: `npm --prefix frontend test`

```text
npm error Missing script: "test"
npm error
npm error To see a list of scripts, run:
npm error   npm run
```

Exit code: `1`. No test runner/script exists and no actual frontend test files exist.

### Build

**NOT RUN** — explicitly prohibited by the user. The manifest does define `build` as `tsc --noEmit && vite build`.

## 4. What is built

**Nothing is implemented in React.** There are 72 TypeScript/TSX files, three stylesheets and two `.gitkeep` files in `src`; all 77 are zero bytes. Consequently:

| Screen state           |   Count |
| ---------------------- | ------: |
| Complete               |  0 / 29 |
| Partial                |  0 / 29 |
| 0% / empty placeholder | 29 / 29 |

The screen count refers to the 29-page reference inventory in the prior traceability audit; it does not mean there are 29 React pages. All present React files are empty. “What it does” below is the intent suggested by the filename only, not implemented behavior.

- **App/router/layout placeholders:** `src/main.tsx`, `src/app/App.tsx`, `src/app/providers.tsx`, `src/app/router.tsx`, `src/app/layouts/AppShell.tsx`, `src/app/layouts/AuthLayout.tsx`.
- **Screen/page placeholders:** `features/admin/{AuditPage,SettingsPage,UsersPage}.tsx`; `features/auth/LoginPage.tsx`; `features/catalog/{ProductForm,ProductListPage}.tsx`; `features/containers/{ContainerListPage,ContainerReceiptPage,LandedCostPage}.tsx`; `features/customers/{CustomerDetailPage,CustomerForm,CustomerListPage,CustomerStatementPage}.tsx`; `features/dashboard/DashboardPage.tsx`; `features/finance/{ChartOfAccountsPage,CurrenciesPage,CustomerAccountsPage,ExpensePage,FinancePage,FinancialAdjustmentsPage,TransfersPage,TreasuryPage}.tsx`; `features/inventory/{AdjustmentPage,DamagedStockPage,InventorySummaryPage,MovementListPage,StockTransferPage,WarehouseListPage}.tsx`; `features/orders-deliveries/{DeliveryFormPage,DeliveryListPage,OrderDetailPage,OrderFormPage,OrderListPage}.tsx`; `features/reports/{FinancialReportPage,InventoryReportPage,ProfitReportPage,ReportsPage,SalesReportPage}.tsx`; `features/sales/{CollectionsPage,InvoiceFormPage,InvoiceListPage,InvoicePrintPage,ReturnFormPage,ReturnsPage}.tsx`.
- **Feature API placeholders:** `features/{admin,catalog,containers,customers,dashboard,finance,inventory,orders-deliveries,reports,sales}/api.ts`.
- **Shared API/auth placeholders:** `shared/api/{errors,http,types}.ts`, `shared/auth/{PermissionGate,sessionStore}.tsx`.
- **Shared UI/utilities placeholders:** `shared/components/{ConfirmDialog,DataTable,FormField,Modal,PageState}.tsx`, `shared/constants/routes.ts`, `shared/utils/format.ts`.
- **Style placeholders:** `styles/{design-tokens,global,rtl}.css`.
- `shared/hooks/.gitkeep` and `shared/validation/.gitkeep`: empty markers.

There is no implemented screen, route, store/session behavior, API client, feature API service, shared component or CSS in those files.

## 5. Old reference: all 29 screens and known problems

The latest reference found in the repository is [`reference/precision-slate-erp-v43__3_ (1).html`](<../reference/precision-slate-erp-v43__3_%20(1).html>), an 821,223-byte single-file Arabic/RTL prototype (`lang="ar"`, `dir="rtl"`). The prior UI-to-database audit enumerates 29 page sections and provides functionality descriptions at [`precision_slate_ui_database_traceability_audit.md`](../../database/proposals/proposed-mysql-review/precision_slate_ui_database_traceability_audit.md), approximately lines 100–140. That source audit also notes that purchase/supplier navigation labels and helper functions do not constitute a complete page.

|   # | Screen name            | What the reference shows                                                                                                                                     | Known defect/risk in the old reference                                                                                                                    |
| --: | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
|   1 | Dashboard              | Period selectors, sales/collection/expense/profit KPIs, pending orders, low stock, treasury, overdue invoices, container alerts, charts and recent activity. | Demo/local figures are not a verified server aggregate; report formulas and date/status semantics are unresolved.                                         |
|   2 | Customers              | Customer search/list/detail tabs for account, orders, invoices, payments and statements; customer creation/editing.                                          | Customer save discards displayed email, address, salesperson, tax number, payment terms and attachment data; only a subset persists.                      |
|   3 | Orders                 | Searchable order list with state filters, customer/date/total/reservation/status.                                                                            | Reservation and order lineage are not a proven ledger workflow; some controls are placeholders/demo interactions.                                         |
|   4 | Order creation         | Customer/date/currency/warehouse/payment terms and line items with quantities, prices and discounts.                                                         | Browser-side money arithmetic and local-only save; the reference order schema/workflow has unresolved gaps.                                               |
|   5 | Order detail           | Order lines/totals, reservation/delivery/invoice summary and actions.                                                                                        | Reserve/cancel/fulfillment links are not backed by a canonical server reservation or audit model.                                                         |
|   6 | Invoices               | Filterable invoice list with status, dates, totals, paid and remaining values.                                                                               | Values derive from browser state; JavaScript floating-point is used for invoice/collection money.                                                         |
|   7 | Invoice creation       | Sale/return mode, customer, terms, driver, warehouse, products, quantities, discounts, tax/collection controls.                                              | Save path hard-codes `noTax: true` (HTML line 3761), conflicting with other views displaying 15% VAT; calculations and posting are client-side.           |
|   8 | Invoice print          | Printable document view and print/PDF/WhatsApp controls.                                                                                                     | Local data and browser controls do not establish a server-issued document or successful external delivery.                                                |
|   9 | Collections            | Outstanding-invoice/collection view and payment form (method, treasury, amount/date).                                                                        | Allocation may leave an unapplied remainder, but save subtracts the full receipt from customer balance; bug documented in the audit.                      |
|  10 | Deliveries             | Delivery list, statuses, source, recipient, quantities and QR-scan affordance.                                                                               | Demo controls do not prove scan or delivery APIs; partial/full workflow and source rules must come from server contract.                                  |
|  11 | Delivery creation      | Linked order/customer, warehouse, delivery type, driver/vehicle and quantities.                                                                              | Local browser workflow only; do not copy local stock mutations as fulfillment logic.                                                                      |
|  12 | Returns                | Return register with invoice/customer/reason/type/amount/status.                                                                                             | Returns are represented as invoice records with `isReturn`, not demonstrated append-only reversing postings.                                              |
|  13 | Return creation        | Source invoice, returned products/quantities/condition, destination and refund/credit/replacement choice.                                                    | Browser-local changes to stock/balance; not a server-atomic return/refund process.                                                                        |
|  14 | Products               | SKU/name/category/stock/prices/status, low-stock state and add/edit form.                                                                                    | Product save drops displayed purchase price, default warehouse, tax rate and description; opening quantity becomes a local movement, not durable history. |
|  15 | Inventory summary      | Stock by warehouse with counts/value/low-stock indicators and adjustment action.                                                                             | Computed from local demo state, not a canonical server balance/valuation projection.                                                                      |
|  16 | Inventory movements    | Movement filters and line items with date/type/product/warehouse/quantity/reference/user.                                                                    | A side movement log does not establish a canonical, reconciled inventory ledger.                                                                          |
|  17 | Inventory adjustments  | Count differences, reason, approval and optional financial impact.                                                                                           | Local mutations do not prove authorization, posting or transaction consistency.                                                                           |
|  18 | Finance (nested views) | Treasury/cashiers, customer accounts, transfers, expenses, adjustments, currencies and accounting panels.                                                    | Browser-side stores and demo gates; no authenticated/permission-checked API or proven accounting journal.                                                 |
|  19 | Containers             | Container/supplier/origin/status/ETA/cost overview and creation.                                                                                             | Local state and immediate-receive actions; no reliable server receipt history or idempotency in the prototype.                                            |
|  20 | Container receipt      | Expected/actual quantities, discrepancies and receipt confirmation.                                                                                          | Prototype locally adjusts product stock/cost; cost allocation rule is not approved by the UI and must not be inferred from it.                            |
|  21 | Landed cost            | Purchase/freight/customs costs and per-item/unit-cost allocation.                                                                                            | The visible value-allocation formula is not an approved accounting policy; allocation, late-cost and rounding rules remain gated.                         |
|  22 | Reports center         | Report groups/cards; it advertises 28 reports.                                                                                                               | The audit finds only a subset with dedicated report sections; advertised reports are not proof of implementation.                                         |
|  23 | Sales report           | Date/employee/grouping filters, totals, charts and employee table.                                                                                           | Demo data/formulas; report definitions and server values are not established.                                                                             |
|  24 | Profit/loss report     | Period comparison and income-statement-style view.                                                                                                           | Profit must not be calculated from the prototype fallback `price * 0.8`; approved COGS/profit definitions are required.                                   |
|  25 | User/permissions       | User and role controls.                                                                                                                                      | Demo-only login/role behavior is not authentication or authorization; role is editable in browser state.                                                  |
|  26 | Warehouses             | Warehouse list, manager/location/capacity/status and edit form.                                                                                              | Local-only persistence; no server-side location validation or permission evidence.                                                                        |
|  27 | Inventory report       | Warehouse/category filters, stock value, turnover, aging and minimum stock.                                                                                  | Valuation/turnover fields are computed from demo state; measures need approved definitions and backend data.                                              |
|  28 | Financial reports      | Income statement, balance sheet and cash-flow presentation.                                                                                                  | Labeled/model financial summaries are not verified accounting output; journal rules and report formulas remain open.                                      |
|  29 | Settings               | Company/tax/numbering/general/security/password/session settings.                                                                                            | Prototype local settings and UI gates are not authoritative server settings; hard-coded tax behavior conflicts with display/settings.                     |

Prototype-wide defects and specific source evidence:

- JavaScript `Number`/floating-point money math; invoice creation hard-codes `noTax: true` at reference line 3761.
- Receipt allocation can retain an unapplied remainder but the old save behavior reduces customer balance by the entire receipt (the traceability audit documents code at HTML lines 4156–4187).
- Business data is held in several browser `localStorage` stores (including `ps-erp-v4` and finance stores). There is no server API in this HTML implementation.
- Stock and financial mutations are split across those local stores; the movement list is not a canonical ledger.
- Return mutations use the invoice record and local balance/stock changes rather than validated compensating postings.
- Demo login accepts username `admin` and any non-empty password (traceability audit, HTML lines 3312–3330); user-editable local roles and default `1234` gates are not access controls.
- Audit documentation records unescaped HTML-string construction as an injection/XSS risk. This is a documented prototype issue, not a finding about the empty React app.
- Customer and product forms present more fields than their save logic persists.
- Some controls are placeholders, sample values, generic demo-row insertion or success toasts. Customer/expense attachments have no actual upload/storage handler.
- The report center advertises more reports than it implements; no supplier/AP complete module is established by navigation labels alone.

These are known defects of the reference only. None is fixed in React because the React files are empty.

## 6. Requirements already written in the repository

This section consolidates the relevant written requirements/specifications found in project documents and the actual reference. Citations are repository-relative file and line numbers. “Proposed” and “open” remain so; a document mentioning a requirement does not mean the application implements it.

| Requirement or decision               | What the repository says                                                                                                                                                                                                                                                                                                                                                             | Source                                                                                                                                                              |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Two owners                            | The two named owners have full app access, including costs/profit/markup, corrections and user management; the handoff says there is no separate owner account.                                                                                                                                                                                                                      | `docs/development/HANDOFF_FOR_NEW_MODEL.md:71`                                                                                                                      |
| Driver role                           | Driver is a future configurable role template, no driver currently assigned, and begins with self-profile/session grants. The repository does **not** specify the requested final grant set (invoices; view customers/products/stock; orders/delivery; no cost/profit/finance).                                                                                                      | `docs/development/HANDOFF_FOR_NEW_MODEL.md:72`; desired detailed scope is **NOT VERIFIED in repository**.                                                           |
| Step-up re-authentication             | Financial areas require password re-authentication; the current handoff and OpenAPI specify a **10-minute** step-up window.                                                                                                                                                                                                                                                          | `docs/development/HANDOFF_FOR_NEW_MODEL.md:73`; `backend/docs/openapi.yaml:76–105`                                                                                  |
| Idle timeout                          | API-client proposal says an idle timer should use a Settings value and server session lifetime is authoritative, but no repository source fixes that value at 30 minutes. The requested 30-minute idle timeout is **NOT VERIFIED as a written repository requirement**.                                                                                                              | `docs/architecture/backend-integration/API_CLIENT_SPEC.md:52`; 30-minute value not found.                                                                           |
| Money calculations                    | Integration design says money/quantity strings end-to-end, client math only for labeled estimates, and server recomputes authoritative values. This is weaker than the request’s strict “no client-side money calculations”; the stricter rule is recorded here as required direction, and the safe implementation is to display server totals without client financial calculation. | `docs/architecture/backend-integration/FRONTEND_BACKEND_INTEGRATION.md:41`                                                                                          |
| No business data in browser storage   | Business data must not be saved in `localStorage`; UI-only preferences may remain there.                                                                                                                                                                                                                                                                                             | `docs/architecture/backend-integration/FRONTEND_BACKEND_INTEGRATION.md:42`; `docs/architecture/backend-integration/LOCALSTORAGE_REPLACEMENT_AND_MIGRATION.md:12,17` |
| Unapplied collections separate        | Backend contract says receipt remainder is tracked separately; customer-balance and statement responses include unapplied collection amount. A UI must render this separately rather than treating it as allocated invoice payment.                                                                                                                                                  | `backend/docs/openapi.yaml:421,456,1563–1592`; `docs/development/HANDOFF_FOR_NEW_MODEL.md:55,90`                                                                    |
| Tax from settings                     | Tax defaults off; setting is snapshotted per invoice line; inclusive/exclusive mode is configurable but accountant approval remains open. Current API path is `/settings/sales-tax`.                                                                                                                                                                                                 | `docs/development/HANDOFF_FOR_NEW_MODEL.md:79`; `backend/docs/openapi.yaml:487`                                                                                     |
| Arabic RTL                            | The reference uses `lang="ar"` and `dir="rtl"`. This demonstrates the prototype’s locale direction, not a React implementation.                                                                                                                                                                                                                                                      | `frontend/reference/precision-slate-erp-v43__3_ (1).html:2`                                                                                                         |
| Phone + desktop                       | The prototype has mobile-web metadata, but no repository requirement defining supported phone/desktop breakpoints or verified responsive acceptance was found. This exact support target is **NOT VERIFIED in repository**.                                                                                                                                                          | Reference metadata at HTML line 7; no acceptance spec found.                                                                                                        |
| Authentication and API behavior       | Proposed API client uses cookie credentials, CSRF, request IDs, normalized errors and central 401 handling; auth bootstrap obtains user/permissions, while server authorization remains authoritative.                                                                                                                                                                               | `docs/architecture/backend-integration/API_CLIENT_SPEC.md:1–62`                                                                                                     |
| Idempotency                           | Design requires idempotency keys on posting/financial mutations and reuse on retry.                                                                                                                                                                                                                                                                                                  | `docs/architecture/backend-integration/API_CLIENT_SPEC.md:15–32`                                                                                                    |
| EGP-only money and integer quantities | OpenAPI says money is decimal strings in EGP and quantities integers. The prototype’s currencies UI conflicts with current EGP-only direction and requires an explicit scope decision, not a copied currency screen.                                                                                                                                                                 | `backend/docs/openapi.yaml:5–10`; `PROJECT_STATUS_HANDOFF.md:102–109`                                                                                               |
| Screen/API mapping                    | A separate integration map lists proposed frontend routes and permissions, with some endpoints marked NEW or conditional. It is a design proposal, not proof those paths exist in the current OpenAPI.                                                                                                                                                                               | `docs/architecture/backend-integration/SCREEN_TO_ENDPOINT_MAP.md:1–79`                                                                                              |

The user’s current request is the only clear source for the exact driver access boundaries, 30-minute idle interval, strict no-client-math interpretation and phone-plus-desktop acceptance. Those specifics should be treated as requirements to record/confirm, not as already implemented or previously approved project facts.

## 7. API contract coverage for the 29 reference screens

Method/path pairs below were read from the current [`backend/docs/openapi.yaml`](../../backend/docs/openapi.yaml). The file declares 63 paths and 88 operations. “Present” means documented in that OpenAPI file only; it is not a live-service test. An absent action/path is marked **MISSING**. Some screens have core APIs but still have missing secondary behaviors.

|   # | Screen                 | OpenAPI paths relevant to the screen                                                                                                                | Coverage and missing endpoint(s)                                                                                                                                                                           |
| --: | ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|   1 | Dashboard              | `GET /reports/dashboard`, `GET /invoices` (overdue widget data)                                                                                     | Core endpoint **present**. Backend values/definitions still need runtime and formula verification.                                                                                                         |
|   2 | Customers              | `GET/POST /customers`, `PUT/PATCH /customers/{customerId}`, `GET /reports/customer-balances`, `GET /reports/customers/{customerId}/statement`       | List/edit/balance/statement present. **MISSING:** `GET /customers/{customerId}` detail; customer attachment upload endpoint.                                                                               |
|   3 | Orders                 | `GET/POST /orders`, `GET /orders/{orderId}`, `POST /orders/{orderId}/confirm`                                                                       | Core list/detail/create/confirm present. **MISSING:** cancel and reserve operations shown/proposed in the screen map.                                                                                      |
|   4 | Order creation         | `POST /orders`; customers/products/warehouses lookup paths                                                                                          | Core create/lookups present. API field semantics and totals need alignment; no client-side financial totals.                                                                                               |
|   5 | Order detail           | `GET /orders/{orderId}`, confirm/invoice actions; delivery paths                                                                                    | Read/confirm/invoice and delivery resources present. **MISSING:** order cancel/reservation endpoint and reservation ledger/action contract.                                                                |
|   6 | Invoices               | `GET /invoices`                                                                                                                                     | List endpoint present.                                                                                                                                                                                     |
|   7 | Invoice creation       | `POST /invoices`, `POST /invoices/{documentId}/issue`, `GET /customers`, `GET /products`, `GET/PUT /settings/sales-tax`, `POST /collections`        | Core invoice, issue, lookup, tax and collection paths present. Tax policy approval/field mapping and response contract still need confirmation.                                                            |
|   8 | Invoice print          | `GET /invoices/{documentId}`                                                                                                                        | Invoice data present. **MISSING** a server PDF/document-export endpoint; browser print is not a server export.                                                                                             |
|   9 | Collections            | `GET/POST /collections`, `GET /collections/{receiptId}`, `POST /collections/{receiptId}/allocations`, allocation reversal                           | Receipt and allocation paths present; OpenAPI explicitly tracks unapplied remainder.                                                                                                                       |
|  10 | Deliveries             | `GET/POST /deliveries`, `GET /deliveries/{deliveryId}`, `PATCH /deliveries/{deliveryId}/status`                                                     | Core list/detail/create/status present.                                                                                                                                                                    |
|  11 | Delivery creation      | `POST /deliveries`, order/customer/warehouse paths                                                                                                  | Core create/lookups present. QR scanning integration is not established by these routes.                                                                                                                   |
|  12 | Returns                | `GET/POST /returns`                                                                                                                                 | List/create present.                                                                                                                                                                                       |
|  13 | Return creation        | `POST /returns` plus invoice/product/warehouse lookup                                                                                               | Core create path present. Response/stock disposition/refund rules need contract confirmation.                                                                                                              |
|  14 | Products               | `GET/POST /products`, `GET/PUT/PATCH /products/{productId}`, category paths                                                                         | Product CRUD present. **MISSING:** product cost-history endpoint referenced in the proposed screen map; cost visibility must be permission-gated.                                                          |
|  15 | Inventory summary      | `GET /inventory/balances`, `GET /reports/stock`                                                                                                     | Core endpoints present.                                                                                                                                                                                    |
|  16 | Inventory movements    | `GET /inventory/movements`, `GET /reports/stock-movements`                                                                                          | Core endpoints present.                                                                                                                                                                                    |
|  17 | Inventory adjustments  | `POST /inventory/adjustments`, movement reads                                                                                                       | Create endpoint present. **MISSING:** dedicated adjustment-list/detail endpoint (movement API may provide history, but that is not explicitly the adjustment resource contract).                           |
|  18 | Finance (nested views) | `GET/POST /treasury/accounts`, account balance, treasury entries/transfers, `GET/POST /expenses`, expense categories, customer balance/report paths | Treasury, transfers, expenses and customer balances are **present**, not globally missing. **MISSING:** chart of accounts, ledger, journal, trial balance, financial adjustments and currencies endpoints. |
|  19 | Containers             | `GET/POST /containers`, `GET /containers/{containerId}`, lines, costs, status, receipts, cost payments                                              | Main container/list/detail and associated write paths present.                                                                                                                                             |
|  20 | Container receipt      | `POST /containers/{containerId}/receipts`, receipt reversal                                                                                         | Receipt and reversal operations present. **MISSING/unclear:** explicit receipt-list/detail GET; container detail may or may not include it.                                                                |
|  21 | Landed cost            | allocation basis and cost writes on container; `GET /reports/container-costs`                                                                       | Related cost/report paths present. **MISSING:** dedicated `GET /containers/{containerId}/landed-cost` preview path proposed in the screen map; report endpoint is not the same contract.                   |
|  22 | Reports center         | dashboard, sales, invoice-profit, stock, stock-movements, container-cost and customer-balance reports                                               | Several report APIs present. No generic report-index API is required if the page is navigation-only. **MISSING:** financial-statement/report APIs.                                                         |
|  23 | Sales report           | `GET /reports/sales`                                                                                                                                | Present.                                                                                                                                                                                                   |
|  24 | Profit/loss report     | `GET /reports/invoice-profit`                                                                                                                       | Present in OpenAPI under this name. Accounting formulas/meaning still require approval; no frontend fallback calculation.                                                                                  |
|  25 | User/permissions       | `POST /users/{userId}/password`; `GET /auth/me`                                                                                                     | Self/session and password operation only. **MISSING:** user list/create/update, roles/grants management and audit trail APIs.                                                                              |
|  26 | Warehouses             | `GET/POST /warehouses`, `PUT/PATCH/DELETE /warehouses/{warehouseId}`                                                                                | CRUD paths present.                                                                                                                                                                                        |
|  27 | Inventory report       | `GET /reports/stock`, stock movements                                                                                                               | Present.                                                                                                                                                                                                   |
|  28 | Financial reports      | No financial-statement operation in OpenAPI                                                                                                         | **MISSING:** income statement, balance sheet and cash-flow/report endpoints.                                                                                                                               |
|  29 | Settings               | `GET/PUT /settings/sales-tax`                                                                                                                       | Sales tax only. **MISSING:** general/company settings, numbering, session/idle timeout, security settings and other settings shown in the prototype.                                                       |

Additional cross-cutting endpoint gaps:

- **Audit log:** no `/admin/audit` or equivalent audit-list route is documented. `AuditPage.tsx` is an empty React placeholder; the audit page is not one of the 29 reference sections.
- **Expenses:** `GET/POST /expenses` is present; expenses are **not** an absent API domain.
- **Treasury:** `/treasury/accounts`, `/treasury/entries` and `/treasury/transfers` are present; “treasury missing” would not match the current OpenAPI.
- **Dashboard:** `GET /reports/dashboard` is present; proposed `/dashboard` was replaced by this path in the current contract.
- **General admin endpoints:** most `/admin/*` endpoints in the older screen map are not paths in the current OpenAPI.
- The `SCREEN_TO_ENDPOINT_MAP.md` is explicitly proposed and differs from current path names. Use the OpenAPI as the contract source and reconcile discrepancies before implementing the client.

## 8. Permissions and UI rules to respect

- **Owners:** the two owners require full application access, including cost/profit/markup, corrections and user management (documented in `HANDOFF_FOR_NEW_MODEL.md:71`).
- **Driver:** requested scope is invoice access; view customers/products/stock; orders and deliveries; **no** cost/profit/finance. Exact grants are **NOT VERIFIED** in repository; the documented driver remains a future configurable template (`HANDOFF_FOR_NEW_MODEL.md:72`).
- **Financial step-up:** require password re-authentication before financial access; current backend contract specifies a 10-minute step-up window, not the 30-minute idle timeout (`HANDOFF_FOR_NEW_MODEL.md:73`; OpenAPI `/auth/reauth`).
- **Idle timeout:** requested 30-minute idle timeout must be a separate session-idle rule; do not confuse it with the 10-minute step-up. The exact timeout is **NOT VERIFIED** in existing repository docs.
- **Money:** no client-authoritative monetary calculation; use server-returned decimal-string amounts. Existing design permits labeled estimate previews, but the current stricter instruction should take precedence until clarified.
- **Unallocated collections:** show unapplied receipt amount separately from allocated invoice payments/customer balance (`backend/docs/openapi.yaml:421,456,1563–1592`).
- **Tax:** read the tax configuration from `/settings/sales-tax`; display/use the backend’s issue-time tax snapshots. No hard-coded `noTax`/VAT rate; accountant interpretation remains open.
- **Arabic RTL:** Arabic copy, `lang="ar"` and RTL layout; the prototype is evidence of intended direction, not an implementation.
- **Phone + desktop:** design and verify both viewport classes. Concrete breakpoints and acceptance checks are **NOT VERIFIED** in repository specs.
- **Authorization:** filter/hide navigation by server-provided permissions, but enforce every permission server-side; never trust client role/localStorage.
- **No business-data localStorage:** only non-sensitive UI preferences may remain there.

## 9. Gaps and risks before frontend implementation

1. **No usable app shell or entry point:** `index.html`, `main.tsx`, providers, router and layouts are zero bytes.
2. **No design system:** token/global/RTL CSS files are empty. The old HTML can inform a fresh design spec, but not be copied wholesale.
3. **No API client or generated types:** `shared/api/*` and every feature API module are empty. OpenAPI has a substantial contract, but no `openapi-typescript` generator/dependency or generated API types exist.
4. **Contract reconciliation required:** the proposed screen map’s routes differ from OpenAPI. Missing user/admin/audit, financial statement, COA/ledger/journal and selected detail/action routes must be agreed with backend.
5. **No mock server:** frontend development cannot be isolated from API availability; no mock service worker/server package/config exists.
6. **No frontend tests or runner:** tests folders contain only `.gitkeep`. No unit/component/integration/e2e framework or tests exist.
7. **No lint/format tooling:** no ESLint or Prettier config/dependency/scripts.
8. **No CI:** `.github/workflows/` is empty except `.gitkeep`; no frontend quality/build workflow.
9. **Auth policy needs UI decisions:** cookie/CSRF approach is proposed, but exact session/idle settings and permission grants (especially driver) need to be finalized. Step-up is documented as 10 minutes.
10. **Business rules are not all frontend-ready:** sales tax inclusive/exclusive approval, report formula details and some workflow permissions/actions remain open.
11. **Old HTML contains unsafe patterns:** browser-only authentication/roles, `localStorage` business truth, floating-point calculations, local posting side effects, and unsafe HTML-string insertion. Do not translate those techniques into React.
12. **Old forms are lossy:** customer/product fields are silently discarded on save. A React form must use an approved request schema and explicitly surface validation/errors.
13. **Demo features are not proof of real scope:** report cards, supplier/purchase functions, file attachments, PDF/WhatsApp and QR scanning must not be assumed complete or approved.
14. **Currency mismatch:** prototype has currency UI; current OpenAPI states EGP amounts. Decide whether the currency screen is removed or contract/spec changes before implementing it.
15. **No production claim is justified:** type-checking empty files is not a functional build; no build was run at user direction.

### Old HTML behavior specifically not to copy

- Client-side `localStorage` as the source of truth for customers, sales, stock, finance, IDs or permissions.
- Client-generated financial totals, JavaScript floating-point currency arithmetic, hard-coded VAT/tax values or `price * 0.8` profit fallbacks.
- Receipt handling that subtracts unallocated cash from a customer balance as though allocated.
- Local stock/treasury side effects not posted atomically by the backend.
- Return-as-edit/flag behavior instead of server-recorded compensating postings.
- Demo passwords/PIN gates, locally editable roles or client-only permission checks.
- Inserting unescaped user-controlled strings into HTML.
- Success toasts/placeholders that claim persistence without a completed API response.
- Treating attachments, exports, QR scanning, supplier/AP or every advertised report as implemented merely because a UI label exists.

## 10. Proposed implementation order

Estimates are relative feature size, not calendar time. The steps are ordered to avoid building screen behavior on unapproved API or accounting assumptions.

| Step | Size   | Work                                                                                                                                                                                                                                                | Backend/API prerequisite                                                                                                                                                                                                                                            |
| ---: | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|    1 | Medium | Resolve driver/owner grants, cookie+CSRF behavior, financial step-up UX, 30-minute idle timeout, RTL/phone/desktop acceptance and screen scope. Create the actual app skeleton, entry, shell, router, auth/session bootstrap and permission guards. | Confirm `/auth/login`, `/auth/me`, `/auth/logout`, `/auth/reauth` response/cookie/CSRF behavior; publish authoritative permission catalog and session-idle settings.                                                                                                |
|    2 | Large  | Establish tokens, typography, RTL primitives, responsive shell, shared form/table/dialog/page states; create typed shared HTTP client, error handling, query conventions and API types.                                                             | Freeze OpenAPI path/field/error/idempotency contract; resolve discrepancies between `SCREEN_TO_ENDPOINT_MAP.md` and `backend/docs/openapi.yaml`. Decide hand-written bootstrap types vs generated types.                                                            |
|    3 | Medium | Add mock server, unit/component/integration test setup, lint/format scripts and CI gates before feature volume grows.                                                                                                                               | Stable OpenAPI fixtures and representative API errors/auth responses; CI runtime and commands agreed.                                                                                                                                                               |
|    4 | Large  | Build customers, products/catalog, warehouses and read-only inventory summary/movements, followed by adjustment workflows.                                                                                                                          | Add customer detail GET/attachments if in scope; define customer balance/statement semantics, product cost history, and adjustment history/detail API; confirm location/product permissions and server valuation.                                                   |
|    5 | Large  | Build sales in sequence: invoice list/detail/print, invoice create/issue, collections/unapplied balances, returns.                                                                                                                                  | Confirm invoice payload and totals, tax config/snapshot semantics, idempotency, collections allocation/reversal, unapplied remainder and return/refund/restock policies. Server owns all posted financial amounts.                                                  |
|    6 | Large  | Build orders and delivery list/create/detail/status actions, only after core sales flows.                                                                                                                                                           | Confirm D8 state machine and approval; add order cancellation/reservation contract or remove those controls; settle full/partial fulfillment and invoice/delivery source rules.                                                                                     |
|    7 | Medium | Build containers, receipt workflow, costs, landed-cost preview and treasury account/transfer screens.                                                                                                                                               | Confirm receipt reads/history, allocation preview/rounding and cost eligibility/timing, payment/treasury behavior and any required step-up permissions.                                                                                                             |
|    8 | Large  | Build expenses and the finance/admin/report screens supported by approved API: dashboard, sales/profit/inventory reports, user/roles, settings, audit, COA/ledger/financial statements.                                                             | Keep existing expense/treasury/dashboard/sales/profit/stock endpoints. Add missing user/role, audit, general settings, COA/ledger/journal/trial balance/financial adjustment, and financial-statement endpoints. Confirm report formulas and grants before release. |
|    9 | Medium | Cross-screen hardening and acceptance: keyboard/accessibility, responsive phone/desktop, RTL, error/loading/empty states, financial permission tests, API contract tests and documented smoke acceptance.                                           | Backend test fixtures/staging API and OpenAPI validation; owner acceptance of permission matrix, 30-minute idle behavior and key financial scenarios.                                                                                                               |

### Backend dependency summary

Can begin UI skeleton/auth only once cookie/CSRF, permission and timeout behavior are agreed. The current contract already gives substantial coverage for customers, sales, collections, orders/deliveries, products, stock, containers, expenses, treasury and selected reports. Do not wait for every endpoint to begin the shell; do wait for missing API contracts before implementing dependent actions. The most material blockers are general user/role administration, audit log, general settings/session timeout, finance ledger/COA/journal/statements, customer detail/attachments, adjustment history, product cost history, order cancel/reservation, and landed-cost preview.

## Evidence boundaries

- The inventory, file sizes, package/install state, Node/npm versions, branch/status and command results above were obtained by running read-only commands during this inspection.
- The React status is based on actual file sizes (all source files are zero bytes), not the previous status document.
- Screen descriptions and prototype-specific defects rely on the HTML and the repository’s earlier UI-to-database traceability audit; they describe that reference, not the React application.
- Endpoint coverage is a static comparison to the current OpenAPI file. **NOT VERIFIED:** parser/schema validation or live API behavior in this frontend inspection.
- No secrets, passwords, keys or `.env` values are included. No database was touched.
