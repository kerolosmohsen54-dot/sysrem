# Frontend API Requests

**Date:** 2026-10-12
**Current local snapshot:** `frontend/api-contract/openapi.snapshot.yaml` declares OpenAPI version `1.1.0`. This frontend-only phase did not inspect the separate checkout or assert which backend tag is latest. No backend files were read or changed.
**Verification:** `npm run contract:check` found 78 unique frontend API method/path calls in the checked-in snapshot and 0 missing operations. This is a path/method check only; it does not validate response schemas or live-backend compatibility.
**Rule:** Keep business behavior in the UI adapter/API layer, use decimal-string money from server/mock responses, and do not claim persistence unless the request succeeds.

## Current frontend contract status

The frontend currently calls the snapshot operations for invoice/order/return previews; customer detail; user listing, creation, update and role assignment; company settings; order cancellation; landed-cost preview; product cost history; receipt list/detail; adjustment history; and audit logs. These flows are implemented against MSW, not verified against a live backend.

| Remaining gap | Affected frontend flow | Required before live integration |
| --- | --- | --- |
| Invoice detail/revision line identifiers and product/warehouse values are not defined in the successful response schema. | Invoice editing and linked returns. | Specify stable invoice-line IDs, product/warehouse IDs, returnable quantities and a revision request/response shape. |
| `POST /returns` does not accept the product/price/description fields required by the free-form return form; linked line IDs are not supplied by invoice detail. The return-processing method is also unspecified. | Return preview is available; final linked/free-form posting stays disabled. | Define the approved free-return request fields, cash/credit/replacement behavior, and linked-line limits. |
| Dashboard and report success payloads are prose descriptions, not machine-readable JSON schemas. | Dashboard KPIs/charts and report summaries. | Publish stable field names, permissions, pagination envelopes, and EGP decimal-string rules for each report. |
| Treasury, expenses, orders, deliveries, containers, receipts, users, audit, and general-setting success shapes are partly prose-only. | Corresponding lists, details, forms and permission displays. | Confirm exact response keys, nullability, status enums, decimal strings and pagination/error envelopes. |
| No supplier directory/list operation is present. | Container and cost forms that would need a supported supplier selector. | Add a searchable supplier contract or explicitly remove supplier selection from the approved workflow. |
| Accounting ledgers, chart-of-accounts operations, financial adjustments/statements, and an approved damaged-stock workflow are absent. | Chart of accounts, financial adjustments/reports, damaged stock. | Provide accountant-approved workflows and endpoints; these screens remain parked. |
| The API does not describe additional reference-only order/delivery fields such as warehouse/payment terms or transport details. | Optional fields from the static reference. | Confirm the request fields and their business rules before exposing them. |

Historical backend-v1.0 audit notes are retained below for context. They are not the current endpoint backlog; use the table above and the local `1.1.0` snapshot for frontend work.

## Historical endpoint gaps from the backend-v1.0 review (superseded)

| Priority | Endpoint/contract needed                                                                     | Screen/action                    | Why / expected behavior                                                                                                                                   | Snapshot status                                                          |
| -------- | -------------------------------------------------------------------------------------------- | -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Blocker  | `POST /invoices/preview`                                                                     | Invoice create/edit              | Debounced server preview for line/discount/tax totals; browser must never calculate money. Return exact decimal strings and tax breakdown.                | **MISSING** — backend-v1.0                                               |
| Blocker  | `POST /orders/preview`                                                                       | Order creation                   | Server-owned price/discount/total preview; return non-blocking low-stock/credit warnings.                                                                 | **MISSING** — backend-v1.0                                               |
| Blocker  | `POST /returns/preview`                                                                      | Linked/free-form return          | Server-owned refund/credit/tax/stock valuation preview.                                                                                                   | **MISSING** — backend-v1.0                                               |
| High     | `GET /customers/{customerId}`                                                                | Customer detail                  | Detail with recent orders/invoices/collections and balance context; list/read statement routes alone do not define the detail payload.                    | **MISSING** — backend-v1.0                                               |
| High     | `GET /users`, user create/update/list and role/grant operations                              | User administration              | Owner-only management screen needs the collection and role/permitted-action contract; snapshot only documents current-user and a user password operation. | **MISSING** — only `POST /users/{userId}/password` exists                |
| High     | `GET /audit-logs`                                                                            | Audit log                        | Searchable/paginated audit events with actor, action, entity, timestamp and safe before/after metadata.                                                   | **SATISFIED** — owner-permission and step-up-protected audit read exists |
| High     | General company and numbering-prefix settings                                                | General settings                 | Company information and numbering prefixes; tax has its own route.                                                                                        | **MISSING** — only `/settings/sales-tax` exists                          |
| High     | `GET /reports/{financial-statements}` or explicit endpoints                                  | Financial report                 | Accountant-approved income statement, balance sheet and cash flow; show empty accounting-waiting state until defined.                                     | MISSING                                                                  |
| High     | Chart of accounts, ledger, journal, trial balance, financial adjustment read/write endpoints | Finance/accounting               | Required for those panels, currently parked pending accountant/API readiness.                                                                             | MISSING                                                                  |
| Medium   | Order cancellation endpoint; no stock reservation                                            | Order detail                     | Orders do not reserve stock on confirmation; low stock is a warning. Do not invent an order-cancel policy.                                                | **MISSING** cancellation; no reservation requested/in scope              |
| Medium   | `GET/POST /orders`, `GET /orders/{orderId}`, `GET/POST /deliveries`, status response schemas | Orders and deliveries             | Document stable order/delivery identifiers, lines and server totals, confirmation warning fields, linked delivery/invoice IDs, recipient and status response values. | **MISSING / prose-only** |
| Medium   | Order/delivery fields: warehouse and payment terms on orders; delivery date and transport method | Order and delivery forms          | These reference fields are absent from the current create request schemas; keep hidden until the owner approves a supported contract. EGP is the only currency. | **MISSING** |
| Medium   | `GET /containers/{containerId}/landed-cost` (preview)                                        | Landed-cost page                 | Return backend-computed preview by allocation basis; no browser allocation or unit-cost calculation.                                                      | **MISSING**                                                              |
| Medium   | `GET /suppliers`                                                                            | Container and cost forms         | Searchable supplier options for supported `supplier_id` fields; do not ask users to enter arbitrary IDs.                                                 | **MISSING**                                                              |
| Medium   | Container and treasury response schemas                                                     | Container detail, receipts, cost payments | Define container line IDs and product IDs, quantity/value fields, status history and receipts; cost payment IDs; treasury entry IDs/date/direction/amount. | **MISSING / prose-only**                                                 |
| Medium   | `GET /products/{productId}/cost-history`                                                     | Product/cost history             | Needed only if owner-approved and permission allows cost visibility.                                                                                      | **MISSING**                                                              |
| Medium   | `GET /inventory/adjustments` list/detail endpoint                                            | Inventory adjustment history     | Snapshot provides `POST /inventory/adjustments` only; movement read is available separately.                                                              | **MISSING**                                                              |
| Medium   | Container receipt list/detail/history endpoint                                               | Container receipt/status history | Snapshot provides receipt posting/reversal but no dedicated read/history route.                                                                           | **MISSING**                                                              |
| High     | `GET /auth/me` response with the complete effective permission list                          | Authentication/bootstrap         | Frontend needs server-authoritative grants to gate navigation/actions; UI gating does not replace backend authorization.                                  | **MISSING from documented response schema**; current-user route exists   |
| Low      | Server document/PDF generation (if required later)                                           | Invoice print                    | Not required by current scope; browser print only.                                                                                                        | OUT OF SCOPE                                                             |

## Reference fields and payload gaps

Feature-flag any reference field without a corresponding approved API input. Do not save a visible field locally or fabricate a successful submission.

| Screen   | Reference field     | Snapshot finding                                                                                                                     |
| -------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Customer | Email               | Supported on `POST /customers` as nullable email.                                                                                    |
| Customer | Address             | Supported on `POST /customers` as nullable string.                                                                                   |
| Customer | Salesperson         | Supported on customer create/update as nullable string.                                                                             |
| Customer | Tax number          | Supported on customer create/update as nullable string.                                                                             |
| Customer | Payment terms       | Supported on customer create/update as nullable string.                                                                             |
| Customer | Attachments         | No upload/list/download contract; WAITING/feature-flag.                                                                              |
| Customer | Default currency    | EGP-only API; omit multi-currency controls.                                                                                          |
| Product  | Purchase price/cost | `last_purchase_price_reference` is supported as a reference-only EGP amount; display only with `costs.view` and never use in calculations. |
| Product  | Default warehouse   | Supported through nullable `default_location_id` on product create/update.                                                           |
| Product  | Tax rate            | Supported through nullable `default_tax_rate`; global tax still comes from `/settings/sales-tax` and issue-time snapshot.              |
| Product  | Description         | Supported by the product create/update schema.                                                                                       |

## Contract mismatches to reconcile

- The proposed `SCREEN_TO_ENDPOINT_MAP.md` uses `/admin/*`, `/finance/*`, `/sales/*` routes for some screens; the snapshot operations use `/users`, `/treasury`, `/expenses`, `/collections`, `/invoices` and `/reports`.
- The snapshot exposes `/reports/dashboard`, not the proposed `GET /dashboard`.
- User list/create/update/role-assignment management, customer detail, general settings, and the current preview/cancellation/receipt/history operations exist in the local `1.1.0` snapshot and are wired through the MSW adapter. Their success response schemas still need backend confirmation.
- Any newly added endpoint/field is not considered available until it appears in the checked-in snapshot and generated types.

## Contract refresh and backend-v1.0 audit

Read-only inspection of `backend-v1.0:backend/docs/openapi.yaml` found **90
operations** and **65 paths**. Compared with the previous frontend snapshot,
26 GET operations changed their optional pagination/search/sorting parameters,
three response descriptions clarified pagination envelopes, and no operation
was added or removed. Malformed flow-style description scalars were quoted
only in the frontend snapshot so it parses as YAML; the latest validation
parsed all 65 paths/90 operations, and `npm run gen:api` generated
`frontend/src/shared/api/generated/schema.d.ts` successfully.

The complete set of changed operations is:

- `GET /audit-logs`
- `GET /customers`
- `GET /invoices`
- `GET /invoices/{documentId}/history`
- `GET /returns`
- `GET /collections`
- `GET /orders`
- `GET /deliveries`
- `GET /categories`
- `GET /products`
- `GET /warehouses`
- `GET /inventory/balances`
- `GET /inventory/movements`
- `GET /containers`
- `GET /treasury/accounts`
- `GET /treasury/entries`
- `GET /treasury/transfers`
- `GET /expense-categories`
- `GET /expenses`
- `GET /reports/customer-balances`
- `GET /reports/customers/{customerId}/statement`
- `GET /reports/stock`
- `GET /reports/stock-movements`
- `GET /reports/sales`
- `GET /reports/container-costs`
- `GET /reports/invoice-profit`

The three changed `200` response descriptions are `GET /audit-logs`
(paginated `data`/`meta` envelope), `GET /invoices/{documentId}/history`
(paginated `data`/`meta` envelope), and `GET /inventory/balances`
(paginated `data`/`meta` envelope). Each changed operation also gained the
shared list parameters where applicable.

Specific additional availability checks against the checked-in local `1.1.0` snapshot:

- **PRESENT:** `GET /users`, user create/update/role assignment, customer detail, `GET/PUT /settings/general`, invoice/order/return previews, order cancellation, landed-cost preview, product cost history, receipt list/detail, adjustment history and `GET /audit-logs`. The frontend calls these through MSW; path presence does not validate the real backend schemas.
- **PRESENT:** inventory adjustment history is available through
  `GET /inventory/movements?movement_type=adjustment`; the UI exposes that
  filtered, searchable, sortable, paginated ledger alongside adjustment entry.
- `GET /auth/me` exists, but the local OpenAPI operation has no `200`
  response content/schema describing a full permission list. Treat the
  permission-list response as **MISSING/undocumented** and do not assume an
  undocumented field shape.
- The dashboard endpoint `GET /reports/dashboard` is present, but its
  successful response still lacks a schema. Dashboard data fields and values
  must not be invented; request a documented response shape before wiring
  real dashboard data.

## Dependency audit follow-up — 2026-10-11

`npm audit --omit=dev` before remediation identified two moderate findings
through the production dependency `react-router-dom@6.30.6`, which bundles
`react-router` into the browser app:

- GHSA-wrjc-x8rr-h8h6 (backslash open redirect), affected `<7.18.0`.
- GHSA-337j-9hxr-rhxg (constructor injection in SSR hydration), affected
  `<7.18.0`.

Upgraded `react-router-dom` to exact `7.18.4`, published 2026-09-15
(26 days before this review), and verified `npm audit --omit=dev` reports
zero vulnerabilities. This is the first major upgrade from v6 and needs
continued route/build/test coverage; Node requirement is `>=20`.

`@playwright/test` was also upgraded to exact `1.55.1`, published
2025-09-23, to remove its development-only browser-download advisory. The
remaining audit findings are development-only and are not included in the
production bundle:

| Severity     | Package(s)                                                                            | Advisory                                                                           | Exposure / status                                                                                                                                                                     |
| ------------ | ------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Critical (2) | `vitest@2.1.9`, transitive `tinypool@1.1.1`                                           | GHSA-5xrq-8626-4rwp; GHSA-5gmw-xhrv-c9v3; GHSA-85c8-ppgw-ccpr                      | Test-runner dependency tree only; not bundled. npm recommends Vitest 5.0.3, a major upgrade; compatibility and the 14-day release-age rule are NOT VERIFIED for the proposed version. |
| High (1)     | `vite@5.4.21`                                                                         | GHSA-fx2h-pf6j-xcff (plus Vite dependency advisories)                              | Dev server/build dependency tree only; not bundled. npm recommends Vite 8.3.4, a major upgrade not attempted during this group.                                                       |
| Moderate (3) | `@vitest/mocker@2.1.9`, `esbuild@0.21.5`, `vite@5.4.21` (with transitive `vite-node`) | GHSA-82fw-gwwq-j7x9; GHSA-67mh-4wv8-2f99; GHSA-4w7w-66w2-5vf9; GHSA-v6wh-96g9-6wx3 | Test/build/dev-server dependency tree only; not bundled. Patched versions require larger Vitest/Vite upgrades and have not been applied.                                              |

The full `npm audit` after these upgrades reports 6 findings (3 moderate,
1 high, 2 critical), all in development dependencies; `npm audit --omit=dev`
reports zero vulnerabilities. Before the Playwright update, the two critical
and three high findings named by the prior audit were all dev-only; one
Playwright high finding is now resolved. Do not run `npm audit fix --force`.
The remaining advisories still affect development/test machines and need
compatibility-tested upgrades.

## Group 1 response-schema gap

The latest OpenAPI lists the catalog and inventory operations, but those
operations describe successful list/mutation responses in prose only: they do
not define JSON response schemas or typed pagination envelopes. Group 1 uses
the documented same-origin paths and query/body fields, with a deterministic
MSW adapter for the shared fixture. The inferred response envelope/model in
that mock is provisional and must be reconciled with the backend before real
integration. No monetary or quantity totals are calculated in the browser.

## Additional group 1 contract details

- Catalog edit/deactivation uses the documented `PATCH /categories/{categoryId}`,
  `PATCH /products/{productId}`, and `PATCH /warehouses/{warehouseId}` routes.
  This provides UI coverage for those mutations, but successful response row
  schemas are still prose-only and real backend payload compatibility remains
  unverified.
- The list operations expose generic `sort_by` parameters but do not state
  each endpoint's allowlisted fields. Confirm the accepted values for
  categories (`name`, `code`), products (`name`, `sku`), warehouses (`name`,
  `code`), balances (`product_name`, `quantity_on_hand`), and movements
  (`movement_date`, `product_name`). The UI sends the selected value to the
  API; a server-side 422 remains visible as an error.
- Product table fields `reserved_quantity` and `available_quantity`, warehouse
  `manager_name`, `item_count`, and `occupancy_percentage`, and movement
  `created_by_name` are not defined in the successful response schemas.
  They render only when the API returns them; the current fixture mock uses
  an em dash instead of deriving or fabricating the values.
- The inventory summary reference advertises product-count, stock-value,
  low-stock and warehouse-count KPIs. Product and warehouse counts currently
  use their respective server pagination metadata. The list contracts do not
  define an aggregate response shape for stock value or low-stock count.
  Expose a documented backend summary (EGP values as decimal strings), or
  confirm the existing report endpoint that should provide it. The browser
  must not derive stock value, counts of low stock, or other totals from rows.
- Warehouse manager and occupancy fields appear in the reference list but
  have no create/read contract. Confirm whether to add those fields or keep
  them unavailable.

## Sales return contract gaps

- `POST /returns` does not accept `product_id` for a free-form return, and
  does not define the reference's processing type (cash refund, customer
  credit, or replacement). Add the approved product and processing fields
  before enabling free-form return submission; until then the UI must not
  send an invented request body.
- Linked returns require `original_document_line_id`, but the prose-only
  `GET /invoices/{documentId}` response does not document stable invoice-line
  IDs or the product/warehouse values needed to populate a linked return.
  Define those fields and their line-level return limits.
- `GET /returns` documents pagination only; define return row field names and
  decimal-string amount/status values before relying on this frontend type.
- `POST /returns/preview` exists in the local snapshot and is used for
  server-calculated previews. Its successful response and the final return
  posting workflow still require stable schemas and approved processing rules.

## Collection response-schema gap

- `GET /collections`, `GET /treasury/accounts` and `POST /collections` define
  routes and request fields but describe success payloads in prose only.
  Confirm the receipt/account field names and ensure the collection response
  includes decimal-string `amount_egp`, `allocated_egp` and
  `unallocated_egp`. The UI displays the returned unallocated amount separately
  and never derives it from the receipt or allocation inputs.

## Finance and report response-schema gaps

- The finance routes used by treasury accounts, entries, transfers, expense
  categories and expenses are present, but several successful responses are
  described in prose rather than defined as JSON schemas. Confirm the exact
  account, balance, entry, transfer, category and expense row keys, pagination
  envelope, and decimal-string amount fields before real-backend integration.
  The current MSW fixture and frontend response types are provisional.
- `GET /reports/sales`, `/reports/invoice-profit`, `/reports/stock`,
  `/reports/stock-movements`, `/reports/container-costs` and
  `/reports/customer-balances` document their content and permissions but do
  not define stable JSON response schemas. Confirm each row's identifiers,
  date/status fields, pagination metadata and EGP decimal-string values. Until
  then, the report UI is verified only against MSW, not the backend.
- The mock intentionally returns empty invoice-profit and container-cost
  reports because the reference fixture contains no authoritative cost
  snapshots or container cost/payment records. Do not seed or derive those
  amounts in the browser.
- `GET /reports/dashboard` remains without a successful response schema; the
  dashboard displays no fabricated metrics and remains WAITING for the
  documented payload.

## Admin response and endpoint gaps

- `GET /users` and user create/update/role-assignment endpoints exist in the
  local snapshot and are wired to the owner-gated `/admin/users` screen through
  MSW. Confirm the successful response schemas, permission names and error
  behavior with the real backend before integration.
- `GET /audit-logs` is available with owner permission, step-up and documented
  filters, but the response only describes a `data` array and `meta` object.
  Confirm audit row fields for actor, action, entity, timestamp and before/
  after values before real-backend integration; current row types and MSW
  output are provisional/empty.
- `GET/PUT /settings/sales-tax` and `GET/PUT /settings/general` are available
  and wired to the permission-scoped settings screen. Their success responses
  remain prose-only. Confirm the exact tax fields (`enabled`, decimal-string
  `rate`, `calculation_method`) and company/numbering fields before live use.
