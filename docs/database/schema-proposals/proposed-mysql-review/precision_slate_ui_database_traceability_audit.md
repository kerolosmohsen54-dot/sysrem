# Precision Slate ERP — UI/UX to Proposed MySQL Schema Audit

**Audit type:** Read-only functional and data-model review  
**Outcome:** **Not ready for schema approval**  
**Scope:** Original HTML UI/UX reference and all three proposed database review
documents. No project source, ERD, DDL, or existing proposal document was
modified. This report is the only new file for this audit.

## 1. Executive summary

The proposed 40-table MySQL design provides a substantial normalized starting
point for core customer, catalog, sales, inventory, treasury, finance,
container, authorization, and audit records. It correctly favors decimal
storage, relational lines, append-only posted records, source-ledger-derived
balances, and application transactions over trusting browser state.

It **does not yet support every meaningful workflow shown in the original
prototype without material gaps**. Most importantly:

1. **Container-to-stock provenance is broken at line level.** A container has
   expected/received `container_lines`, and receipt has one linked
   `inventory_movements` header, but `inventory_movement_lines` has no FK to
   `container_lines`. The resulting stock cannot be reliably traced to the
   exact container product line, receipt quantity, and landed cost.
2. **Order-to-invoice fulfillment is not connected.** The UI shows orders with
   line items, reservations, deliveries, and invoices. `sales_documents` and
   `sales_document_lines` have no order or order-line FK; deliveries may point
   at an order or invoice, but delivery lines do not require exactly one
   source line and do not point to a stock movement. Billed, reserved,
   delivered, and canceled quantities cannot be reconciled reliably.
3. **Order fields and states are under-modeled.** The UI captures warehouse,
   payment terms, salesperson, line discount, tax, shipping/handling, and
   shows tax totals; proposed `sales_orders`/`sales_order_lines` omit these.
   The UI’s “preparing” state is absent from the order status enum.
4. **Landed cost is recorded but not reliably attached to valuation.** Cost
   allocations are not linked to receipt movement lines or persisted
   inventory valuation/cost layers. There is no product weight for the
   weight-allocation option. The UI explicitly presents value allocation,
   while the business documents mark the method unresolved.
5. **Several explicit UI fields are missing or only weakly represented:**
   customer tax number/default currency/payment terms/salesperson/opening
   balance, product tax rate/purchase cost/default location, warehouse
   manager/capacity, customer and expense attachment metadata, currency
   exchange-rate history, container stage history and discrepancy reasons.
6. **Accounting and integrity are not guaranteed by the DDL.** Journal balance,
   status transitions, receipt allocations, source-document compatibility,
   stock availability, duplicate source postings, and all transaction
   boundaries require backend enforcement and tests. The SQL has not been
   executed or validated by a MySQL parser.
7. **Supplier payables remain intentionally absent.** The prototype has no
   dedicated supplier screen section in the 29-section HTML, but the
   navigation/finance design refers to supplier accounts, and containers have
   supplier costs. The D9 decision still gates a complete supplier/AP
   subledger.

Some limitations are acceptable design boundaries rather than missing tables:
report metrics should usually be calculated from posted transactions, and
financial decisions must not be embedded as schema defaults. Others are
concrete model gaps that should be corrected before schema approval.

## 2. Sources inspected and evidence quality

### Original UI/UX reference

- [`precision-slate-erp-v43__3_ (1).html`](../../../../frontend/reference/precision-slate-erp-v43__3_%20%281%29.html) — actual UI, embedded styles/scripts, modal markup, browser logic.
- The file has 29 `sec-*` screen sections. It is a single HTML prototype, not a
  React app. It has embedded browser state and no `fetch`/`XMLHttpRequest`
  references. Findings below distinguish visible static UI from JavaScript
  behavior; neither is treated as proof of a production-ready workflow.

### Proposed architecture reviewed

- [`precision_slate_proposed_mysql_erd.md`](./precision_slate_proposed_mysql_erd.md)
- [`precision_slate_proposed_mysql.sql`](./precision_slate_proposed_mysql.sql)
- [`precision_slate_proposed_mysql_design.md`](./precision_slate_proposed_mysql_design.md)

The DDL defines 40 tables. This audit used their actual fields, primary/unique
keys, foreign keys, checks, and relationship notes—not table names alone.

### Requirement documents cross-checked

- [`BACKEND_ARCHITECTURE.md`](../../../../docs/backend/architecture/backend-design/BACKEND_ARCHITECTURE.md)
- [`API_ENDPOINT_CATALOG.md`](../../../../docs/backend/architecture/backend-design/API_ENDPOINT_CATALOG.md)
- [`API_CONTRACTS.md`](../../../../docs/backend/architecture/backend-design/API_CONTRACTS.md)
- [`AUTHENTICATION_AND_AUTHORIZATION.md`](../../../../docs/backend/architecture/backend-design/AUTHENTICATION_AND_AUTHORIZATION.md)
- [`BUSINESS_LOGIC_AND_TRANSACTIONS.md`](../../../../docs/backend/architecture/backend-design/BUSINESS_LOGIC_AND_TRANSACTIONS.md)
- [`BACKEND_DECISIONS_AND_GAPS.md`](../../../../docs/backend/architecture/backend-design/BACKEND_DECISIONS_AND_GAPS.md)
- [`DATABASE_SCHEMA_MAPPING.md`](../../../../docs/backend/architecture/backend-design/DATABASE_SCHEMA_MAPPING.md)
- [`FRONTEND_BACKEND_INTEGRATION.md`](../../../../docs/architecture/backend-integration/FRONTEND_BACKEND_INTEGRATION.md)
- [`SCREEN_TO_ENDPOINT_MAP.md`](../../../../docs/architecture/backend-integration/SCREEN_TO_ENDPOINT_MAP.md)
- [`database archert.pdf`](../../docs/reference/database%20archert.pdf)

The PDF is a proposed target, not authoritative MySQL DDL. Its PostgreSQL,
Prisma, and UUID suggestions are not used as approved database decisions.
The backend architecture notes and the current request establish PHP/MySQL
as the implementation direction; this report does not propose a different
stack.

## 3. Original UI/UX inventory

The rows below enumerate all 29 actual `sec-*` sections and their principal
functional evidence. Line ranges are in the original HTML.

| Actual module/page | HTML evidence | What is visible or represented |
|---|---:|---|
| Dashboard | `:1019-1330` | Month/week/year selectors; sales, collections, expenses, profit, pending orders, low-stock, treasury balance; overdue invoices; container alert; cash/inventory charts and recent activity. |
| Customers | `:1331-1472` | Customer list/search/status/currency filters and pagination; customer detail tabs for overview, orders, invoices, payments, statement/activity; credit limit, balance, account data and quick actions. Add-customer modal `:2655-2719` includes name/code/email/phone/address/salesperson/tax number/currency/credit/payment terms/opening balance and attachment tab. |
| Orders | `:1473-1500` | List, search, export, draft/confirmed/preparing/completed/cancelled filters; order/customer/date/total/reservation/status columns. |
| Order creation | `:1501-1562` | Customer, date, currency, warehouse, payment terms, salesperson, notes and dynamic lines with product, availability, quantity, price and discount; save draft or confirm. |
| Order detail | `:1563-1652` | Order data/items/prices, tax, discount, shipping/handling, total; reservations, warehouse, deliveries, invoices, financial summary; cancel/reserve/create delivery/create invoice actions. |
| Invoices | `:1653-1686` | Search, customer/date/status filters, date range, pagination, selected-row printing/PDF/WhatsApp; list includes issue/due dates, total/paid/remaining/status. |
| Invoice creation | `:1687-1808` | Sale vs return, collect-now vs credit, issuer, customer, customer balance/credit, original invoice/reason for return, issue date/time/number, payment terms/due date, driver, warehouse, product/quantity/price, discount, immediate collection and notes. |
| Invoice print | `:1809-1861` | Printable sales-document view and line details; print/PDF/WhatsApp controls. These controls do not establish a server document or actual external delivery. |
| Collections | `:1862-1883` | Outstanding invoices, due/late values and statuses, collection action and aggregate collection figures. Payment modal `:2720-2749`; dynamic collection code includes customer, method, treasury, amount and date. |
| Deliveries | `:1884-1913` | Pending/preparing/delivered/cancelled filters; order, recipient, date, source warehouse, requested and delivered quantities, status; QR-scan control. |
| Delivery creation | `:1914-1946` | Delivery type (issue+delivery, issue-only, delivery-only), linked order/customer, source warehouse, date, transport mode, driver name, vehicle plate, requested/available/issued quantities and notes. |
| Returns | `:1947-1955` | Return number, source invoice, customer, reason, processing type, amount and status. |
| Return creation | `:1956-1988` | Source invoice/customer/date/reason, cash refund/customer credit/replacement processing, destination warehouse, returned product, sold/returned quantity, unit price, condition and notes. |
| Products | `:1989-2000` | Product list by SKU/name/category/total/reserved/available/sale price/status, low-stock alert, export and add. Product modal `:2771-2805` includes SKU/category/unit/default warehouse/tax rate/purchase price/sale price/opening quantity/minimum stock/description. |
| Inventory summary | `:2001-2013` | Balances by warehouse, total items/value/low-stock/warehouse counts, export and adjustment action. |
| Inventory movements | `:2014-2032` | In/out/adjustment/transfer/return filters; date/type/product/warehouse/quantity/reference/user columns. |
| Inventory adjustments | `:2033-2067` | Adjustment history; location/date/reason; system vs actual quantities/difference; possible second approval; optional financial impact, amount and account/treasury. |
| Finance (nested views) | `:2068-2254` | Chart of accounts, customer accounts, cashiers, transfers, expenses, financial adjustments and currencies. Tables show ledger, receipts, transfer sides, expenses, account codes and balances; much content is static or dynamically rendered. |
| Containers | `:2255-2271` | Active/in-transit/port/clearance/received counts; number/supplier/origin/expected date/expenses/status. Dynamic modal in script `:4198-4238` captures supplier/origin/ETA, expenses/status and container lines with quantity/purchase and sale prices; can mark received immediately. |
| Container receipt | `:2272-2303` | Expected vs actual quantities, discrepancy/reason, costs, landed distribution, receiving confirmation that should add actual quantities to stock. |
| Landed cost | `:2304-2348` | Purchase, freight, customs, clearance cost breakdown; value allocation currently displayed; per-product cost/unit cost; approval/update-cost control. The page itself flags the allocation basis as a business question. |
| Reports center | `:2349-2386` | Advertises 28 reports in six groups: sales (6), containers (4), profit (5), inventory (5), customers/suppliers (4), financial (4). Categories route to report pages or containers/accounts. |
| Sales report | `:2387-2425` | Date range, employee, grouping by month/week/employee, sales/order count/average/top employee, monthly chart and employee table with discounts/net/share. |
| Profit/loss report | `:2426-2457` | Period and comparison selectors; income statement and period variance. |
| User/permissions | `:2458-2515` | User/role interface. Auth/permission details are largely client-side and do not imply API authorization. |
| Warehouses | `:2516-2528` | Name/location/manager/item count/occupancy/status and add/edit warehouse modal `:2806-2825`. |
| Inventory report | `:2529-2549` | Warehouse/category filters; stock value, turnover, slow-moving (>90 days), below-minimum KPIs; product/location/on-hand/average unit cost/value/status. |
| Financial reports | `:2550-2581` | Income statement, balance sheet, cash flows; revenue, COGS, gross profit, operating expense, net profit, total assets/liabilities/equity. |
| Settings | `:2582-2654` | Company/tax details, numbering/billing, general settings, backup, security/password/session settings. Finance also includes currency configuration. |

### UI elements that are not a demonstrated feature

- The screen headings above are present, but some controls are placeholders,
  sample values, generic demo-row insertion, or success toasts. No backend is
  connected. Do not treat those as proof of a complete business workflow.
- Navigation and script labels mention suppliers, purchases, supplier
  accounts, and purchase returns, but these do **not** have one of the 29
  actual `sec-*` section containers in the inspected page. The HTML does
  contain purchase-related JavaScript functions (`purchaseProductOptions`,
  `addPurchaseRow`, `savePurchase`); their existence alone does not prove a
  user-reachable, complete purchase module. Supplier/AP remains a requirements
  question, not an inferred complete MVP workflow.
- Report-center claims of 28 reports are category descriptions. Only a subset
  has dedicated report sections and visible filters/tables in this file.
- Customer/expense attachment upload areas are visible, but no upload handler,
  server storage, or attachment entity is implemented in the prototype.

### Verified browser-side behavior and data loss in the prototype

| Behavior | Evidence | Audit consequence |
|---|---|---|
| Business state is loaded/saved to browser `localStorage` under `ps-erp-v4`, including customers, products, invoices, stock minima, cashiers, movements, containers, collections and sequences. | HTML `:3957-3971`. | This is local demo persistence, not a multi-user database or API. The legacy migration needs a deliberate, reconciled import/cut-off process. |
| Customer save persists only name, phone, code, currency, credit limit and opening balance; the modal also asks for email, address, salesperson, tax number, payment terms and attachments. | HTML `:2655-2719`, `:4021-4030`. | The UI’s displayed customer form is not fully implemented in its save path. Do not infer that every visible field currently survives save. |
| Product save persists SKU, category, sale price, opening stock and unit/minimum-stock values; the modal additionally presents purchase price, default warehouse, tax rate and description. | HTML `:2771-2805`, `:3998-4017`. | Several visible product attributes are discarded by the prototype and would require deliberate schema/API support if retained. Opening stock is simulated as a local movement, not durable ledger history. |
| Invoice logic mutates local product stock, customer balance, invoice records, immediate collection/cashier state and movement arrays before calling `psSave`. | HTML `:4077-4154` and `:3971`. | There is no database transaction or server authorization; client-side validation cannot protect stock, credit, invoice totals or financial postings. Reimplement posting as one server transaction, not a literal port of browser mutations. |
| The container receiver prorates the entered aggregate expense by each line’s `quantity × purchase cost`, updates local product cost/stock, and creates a movement. | HTML `:4221-4230`. | This demonstrates the prototype’s value-based formula, but the architecture marks D3 unresolved. It is evidence to reconcile, not approval of value allocation. |
| `allocatePayment` applies collections FIFO by invoice timestamp, then returns any unallocated remainder. `savePayment` ignores that remainder and subtracts the full receipt from the customer’s balance. | HTML `:4156-4187`. | The prototype both asks whether allocation should be FIFO or manual and implements FIFO; an overpayment can reduce customer balance beyond invoice allocations. Treat this as an unresolved requirement and a prototype defect, not a rule to preserve. |
| The demo login accepts username `admin` with any non-empty password. | HTML `:3312-3330`. | This is not an authentication implementation. The backend must use real credential verification, throttling, session security and server-side permission checks. |

## 4. UI/UX-to-database traceability matrix

**Coverage meanings:** **Supported** = columns and relationships can represent
the demonstrated data, subject to normal service rules. **Partially Supported**
= material fields/links or integrity rules are absent. **Missing** = no
appropriate persisted model for the visible feature. **Unclear** = behavior
or required data is not sufficiently defined by the UI/specs. **Not
Applicable** = UI item is presentation/configuration, not persistent business
data.

| Required information / Module | Actual page / component | UI feature and expected behavior | Required data | Proposed tables and relationships | Coverage status | Evidence | Gap / risk and recommended action |
|---|---|---|---|---|---|---|---|
| Dashboard | Dashboard | Date-window selection; sales, collections, expenses, profit, pending orders, low stock, treasury balance, overdue invoices, container-stage alert, cash/inventory charts, recent activity. Aggregate posted records for selected period and compare like periods. | Dated/statused invoice, receipt, expense, movement, account, order, container and cost records; currency and cost basis; active filter dates. | `sales_documents`, `sales_document_lines`, `sales_receipts`, `sales_receipt_allocations`, `expenses`, `treasury_entries`, `treasury_accounts`, `inventory_movements`, `inventory_movement_lines`, `inventory_balances`, `products`, `sales_orders`, `containers`, `container_costs`, `journal_entries`, `journal_lines`. | **Partially Supported** | HTML `:1019-1330`; target screen map `SCREEN_TO_ENDPOINT_MAP.md` Dashboard section. | Revenue, cash collection and profit are distinct measures; the query must use approved posted statuses/date basis. Profit needs D1/D2/D6 and accounting approval. Overdue needs timezone/date policy. Keep derived; do not persist dashboard totals as truth. |
| Customer master | Customers; add-customer modal | Create/list/search/filter/paginate customers; code, name, phone, email, address, salesperson, tax number, currency, limit, terms, opening balance, status. | Customer identifiers/contact/tax data, default currency, salesperson, payment terms, active state, approved opening balance transaction. | `customers`, `users`, `currencies`, `journal_lines`, `document_sequences`. | **Partially Supported** | HTML `:1331-1472`, modal `:2655-2719`; DDL `customers` at SQL `:122-147`. | Missing customer tax number, default currency, payment terms, salesperson FK, and explicit opening-balance source. If customer salesperson is user, add `salesperson_user_id`; preserve opening balances as auditable entries, not a mutable balance. D10 uniqueness must be decided. |
| Customer details/activity | Customer detail tabs | Overview, orders, invoices, payments, statement, activity; last order/payment and totals. | Joined source documents, allocations, actors, dates, original references; filtered account statement. | `customers`, `sales_orders`, `sales_documents`, `sales_receipts`, `sales_receipt_allocations`, `audit_logs`, `journal_lines`. | **Partially Supported** | HTML `:1331-1472`; endpoint map Customer sections. | Derived tabs are feasible, but statements cannot reconcile adjustments/opening balances unless customer subledger postings are consistently dimensioned. Audit's polymorphic entity ref is not FK-enforced. Define statement semantics and date/currency grouping. |
| Customer attachments | Add-customer modal | Upload/list legal, tax and contract files; PDF/JPG/PNG up to 10 MB. | Customer FK, opaque storage key, original name, MIME/size/checksum, uploader/time, scan/status and retention metadata. | No attachment table. `customers` is not sufficient. | **Missing** | HTML `:2655-2719`; integration G-06 mentions attachments as unresolved. | Add attachment metadata table only if upload feature remains in scope, and define private storage, malware scanning, download authorization, retention and limits. Never store file content in the customer row. |
| Sales orders | Orders/list | Search/export, list by draft/confirmed/preparing/completed/cancelled, order/customer/date/total/reservation. | Number, customer, date, state history, currency, totals, reserved/fulfilled/billed quantities. | `sales_orders`, `sales_order_lines`, `customers`, `products`, `currencies`, `document_sequences`, `audit_logs`. | **Partially Supported** | HTML `:1473-1500`; SQL `sales_orders` `:747-769`; `sales_order_lines` `:771-787`. | UI includes `preparing` not in enum `draft/confirmed/fulfilled/cancelled`; no state history, cancellation reason/actor/time, or order fulfillment/reservation links. D8 and workflow state mapping required. |
| Order creation | Order-create | Choose customer/date/currency/warehouse/payment terms/salesperson; add lines with availability, quantity, price, line discount; save draft or confirm. | Header selections and notes; product quantities, unit price, discount/tax; optionally selected warehouse and price snapshots. | `sales_orders`, `sales_order_lines`, `customers`, `products`, `locations`, `users`, `currencies`. | **Partially Supported** | HTML `:1501-1562`; SQL fields above. | `sales_orders` lacks `location_id`, `payment_terms`, salesperson/issuer, discount, tax, shipping/handling, subtotal/total. Lines lack discount/tax and line snapshots. Add needed persisted fields only after confirming these are truly part of order totals; keep totals recomputed by server. |
| Order detail/reservation | Order-detail | View tax/discount/shipping total; reserve stock; cancel; create delivery/invoice; tabs for reservation, delivery, invoice, financial summary. | Relationship from order line to reservation and actual movement; partial reservation, fulfillment and invoicing quantities; transition actors/times. | `sales_orders`, `sales_order_lines`, `inventory_balances`, `inventory_movements`, `inventory_movement_lines`, `deliveries`, `delivery_lines`, `sales_documents`, `sales_document_lines`. | **Missing / Partially Supported** | HTML `:1563-1652`; backend flow docs; SQL above. | No order-line ↔ invoice-line FK; no reservation ledger/allocation table; `quantity_reserved` is aggregate only. Cannot prove which order reserved/consumed stock or reconcile partial invoices. If D8 approved, add reservation/fulfillment link design and transaction rules. |
| Invoice list/print | Invoices and invoice-print | Search/filter by customer/date/status; issue/due, total/paid/remaining; bulk print/PDF/WhatsApp; print document. | Stable header/lines, line snapshots, currency/tax/discount, status, due date, payments/allocations, external export is generated. | `sales_documents`, `sales_document_lines`, `sales_receipts`, `sales_receipt_allocations`, `customers`, `products`, `currencies`. | **Partially Supported** | HTML `:1653-1686`, `:1809-1861`; SQL `:239-321`. | Core invoice fields fit, but no link to originating order. Totals can be stored but must be recomputed and frozen at posting. `paid`/`remaining` should derive from posted allocations and refunds; do not duplicate them on the invoice. |
| Invoice creation/posting | Invoice-create | Select sale/return, issuer, customer, terms/due date, driver, location; product lines; discount; immediate payment or credit; notes. One click issues in prototype. | Customer/order, product/location, quantity, unit price, snapshots, currency, due/terms, discount/tax, actor/driver, linked receipt; posting and idempotency. | `sales_documents`, `sales_document_lines`, `sales_receipts`, `sales_receipt_allocations`, `treasury_entries`, `inventory_movements`, `inventory_movement_lines`, `journal_entries`, `journal_lines`, `idempotency_records`, `audit_logs`. | **Partially Supported** | HTML `:1687-1808`; JS invoice logic at HTML `:3724-3790`, `:4077+`; transaction plan in `BUSINESS_LOGIC_AND_TRANSACTIONS.md`. | Schema has a header/line base, but no order source FK or explicit payment-term code. Posting uniqueness is only service behavior: no unique `inventory_movements(source_type,source_id,type)` or typed source relation prevents duplicate effects. Transaction, status, total, stock and idempotency checks are mandatory. |
| Collections/receipts | Collections and payment modal | Select customer/invoice(s), method (cash/bank/cheque/card in static modal), treasury, amount, date, reference and notes; allocate across invoices; view due/late summaries. | Receipt/refund, allocations, method/reference, treasury source, date, customer/document/currency consistency and allocation history. | `sales_receipts`, `sales_receipt_allocations`, `treasury_accounts`, `treasury_entries`, `customers`, `sales_documents`, `currencies`. | **Partially Supported** | HTML `:1862-1883`, modal `:2720-2749`; dynamic payment code HTML `:4159-4197`; SQL `:339-385`. | Static form says a single invoice; dynamic code allocates FIFO across all outstanding invoices. `sales_receipt_allocations` supports multiple links but not allocation strategy/override or allocation reversal history. Add allocation rows transactionally; define method vocabulary and unapplied/overpayment/refund policy. |
| Sales returns | Returns/return-create | Source invoice, customer, return date/reason, cash refund/customer credit/replacement, destination warehouse, return lines and quantity/condition. | Source invoice and line; returned quantity; good/damaged status; credit note; location; refund/credit application; actors and reason. | `sales_documents`, `sales_document_lines`, `sales_receipts`, `sales_receipt_allocations`, `inventory_movements`, `inventory_movement_lines`, `locations`, `audit_logs`. | **Partially Supported** | HTML `:1947-1988`; JS return flow at `:3724-3790`; SQL `:239-321`, `:562-618`. | Return-line FK and condition field are a good start, but schema cannot enforce source header is invoice, same customer/product, posted state, cumulative return limit, or return treatment. Cash refund/customer credit/replacement semantics need separate transaction logic and policy. |
| Products/pricing | Products/add-product modal | SKU/name/category/unit/default warehouse/tax rate/purchase price/sale price/opening stock/min-stock/description; barcode search and stock/reserved/available display. | Product identifiers and snapshots; unit; default location; tax category/rate; price history; opening quantity movement; cost history. | `products`, `product_categories`, `currencies`, `locations`, `inventory_movements`, `inventory_movement_lines`. | **Partially Supported** | HTML `:1989-2000`, modal `:2771-2805`; SQL `:167-209`. | No product tax-rate field, default location, explicit purchase cost/cost history, or product weight. `company_price` meaning is ambiguous and not a replacement for separate buy/sell prices. Opening quantity must be an opening movement, not a product stock field. |
| Warehouses/locations | Warehouses modal/list | Name, geographic location, manager, item count, capacity/occupancy, active state; nested main/sub/vehicle/damaged locations. | Stable location data, manager/owner, location type/hierarchy, capacity unit/quantity if occupancy is meaningful. | `locations`, `users`, `inventory_balances`, `products`. | **Partially Supported** | HTML `:2516-2528`, modal `:2806-2825`; SQL `:211-226`. | `locations` supports name/code/type/parent, but not address/geographic location, manager FK, capacity or capacity unit. Item count derives from balances. Add only fields needed for a genuine capacity/occupancy calculation. |
| Inventory summary/low stock | Inventory summary | Per-location on-hand, total inventory value, item/warehouse counts and low-stock count; adjustment link. | Posted movement-derived balances; product threshold; unit valuation/currency/date. | `inventory_balances`, `inventory_movements`, `inventory_movement_lines`, `products`, `locations`, valuation records. | **Partially Supported** | HTML `:2001-2013`; SQL `:562-631`. | Quantity projection exists; inventory value cannot be calculated consistently from current proposal without approved D2 valuation and maintained cost layers/average-cost balance. Negative on-hand policy is open; projection has no nonnegative check. |
| Movement history/transfers/damage | Movements | Date/type/product/location/quantity/reference/user; inbound/outbound/adjustment/transfer/return; source trace. | Movement header/lines, source document, per-location legs, reason, actor/time, exact reversal. | `inventory_movements`, `inventory_movement_lines`, `products`, `locations`, `users`, `sales_document_lines`, `audit_logs`. | **Partially Supported** | HTML `:2014-2032`; movement code HTML `:3957-3990`; SQL `:562-618`. | Polymorphic `source_type/source_id` is not FK-protected; `sales_document_line_id` covers only sales lines and no container/order/adjustment typed source. A movement can have two locations in one line, but type-specific shape and transfer pairing are not constrained. |
| Inventory adjustments | Adjustment form | Count date/location/reason; system vs actual quantity; difference; optional financial impact and account; possible second approval threshold. | Adjustment document/lines with counted and expected qty, reason, approvers, before/after stock, optional financial/journal effect. | `inventory_movements`, `inventory_movement_lines`, `inventory_balances`, `users`, `treasury_entries`, `journal_entries`, `journal_lines`, `audit_logs`. | **Partially Supported** | HTML `:2033-2067`; SQL `:562-631`. | Generic movement lines only record delta quantity, not count quantity/system snapshot, approval workflow, financial amount/account relation, or second approver. If count evidence/audit is required, add adjustment-specific header/lines or typed columns. |
| Finance/chart of accounts | Finance nested panels | Hierarchical account codes/balances; customer accounts; cashiers; transfers; expense categories; adjustments; currencies; ledger and reports. | Account hierarchy, active state, currency, journal postings and dimensions, opening balances, source references. | `chart_of_accounts`, `journal_entries`, `journal_lines`, `treasury_accounts`, `treasury_entries`, `customers`, `suppliers`, `currencies`. | **Partially Supported** | HTML `:2068-2254`; SQL `:387-485`; `SCREEN_TO_ENDPOINT_MAP.md` Finance section. | Basic COA and journal structure exists, but no fiscal period/close controls, account-level currency/base-currency amounts, journal templates, or typed source links. Journals are not auto-balanced by FK/check; post logic needs debit=credit and closed-period gates. |
| Cash/bank/treasury | Finance/cashier subview | Multiple cash/bank accounts; in/out, reference, balance, transfers; receipts, expenses and corrections. | Account + currency, immutable dated entries, typed source/reversal, transfer-pair correlation, opening balance. | `treasury_accounts`, `treasury_entries`, `treasury_transfers`, `sales_receipts`, `expenses`, `journal_entries`. | **Partially Supported** | HTML finance block `:2068-2254`; SQL `:323-337`, `:459-560`. | Core ledgers exist. No opening balance source entity, no explicit transfer-pair key on the two treasury entries, and a generic polymorphic source is unverified. Currency must equal account currency; DDL does not enforce it. |
| Expenses/attachments | Finance expense modal | Category, amount, treasury, date, description, receipt attachment. | Expense header, category/account, payment, currency, source/audit and optional private attachment metadata. | `expenses`, `chart_of_accounts`, `treasury_entries`, `journal_entries`, `journal_lines`; no attachments table. | **Partially Supported** | HTML modal `:2750-2770`; SQL `:487-519`. | Expense core is modeled; UI receipt file has no persisted attachment metadata. Category can be account FK only if chart semantics match UI categories. Multiple payments/partial expense settlement are not represented. |
| Finance transfers | Finance transfer form | From/to treasury, amount, date, user, description; preserve debit and credit as one transfer. | Transfer header and exactly two correlated treasury entries; currency/FX/rate and journal effects. | `treasury_transfers`, `treasury_entries`, `currencies`, `journal_entries`, `journal_lines`. | **Partially Supported** | HTML `:2068-2254`; SQL `:521-560`. | Transfer header references from/to entries, but entries do not FK back to transfer; integrity is unilateral and polymorphic source. Add typed transfer_id on each entry or a transfer-entry bridge with unique roles. |
| Financial adjustments | Finance adjustments | Dated adjustment/reason/amount/account/treasury; before/after balance; user/reference. | Adjustment header, one or more ledger entries, account dimensions, evidence and reversal. | `journal_entries`, `journal_lines`, `treasury_entries`, `audit_logs`; no adjustment entity. | **Partially Supported** | HTML finance block `:2068-2254`; SQL journals/treasury. | A generic journal may represent some adjustments, but the UI may change treasury balance directly. Need decide adjustment classes and source type; avoid orphan polymorphic references and make every effect reversible/audited. |
| Currencies/exchange rates | Finance currencies | Currency code/name, exchange rate against EGP, default currency and status. | Currency metadata, effective-dated exchange-rate pairs/sources, configured base currency and historical rate snapshots on transactions. | `currencies`, `sales_documents`, `sales_receipts`, `treasury_accounts`, `treasury_transfers`, `container_costs`. | **Partially Supported** | HTML finance block `:2068-2254`; SQL `currencies :17-26`; `treasury_transfers.exchange_rate :529-532`. | No exchange-rate history or rate-effective date/source; only transfer has optional scalar rate. A currency code per transaction cannot reproduce historical values/reports in base currency. D1 blocks multi-currency accounting design. |
| Containers/stages | Container list/receive | Container #, supplier, origin, expected arrival, expenses/status; track in transit/port/clearance/received. | Container, supplier identity, date/status history/events, costs and receipt. | `containers`, `suppliers`, `container_costs`, `container_receipts`, `users`. | **Partially Supported** | HTML `:2255-2271`; dynamic modal/logic `:4198-4238`; SQL `:633-659`, `:729-745`. | `containers.status` has draft/in_transit/at_port/receiving/received/cancelled but not explicit customs-clearance state/history. UI supplier is free text; proposed FK requires supplier master. Add stage event history if historical tracking/ETA changes are reportable. |
| Container lines/receipt/shortages/damage | Container receipt | Expected vs actual; discrepancy and reason; actual received qty updates stock exactly once. | Container line, received quantity, shortage/overage/damage classification/reason, receipt event, resulting movement line FK and location. | `container_lines`, `container_receipts`, `inventory_movements`, `inventory_movement_lines`, `products`, `locations`. | **Partially Supported — Critical gap** | HTML `:2272-2303`; SQL `:588-618`, `:661-682`, `:729-745`. | Expected/received quantities exist, but discrepancy reason/condition is missing, and stock movement line does not reference `container_line_id`. The header-level receipt-to-movement link cannot identify which stock line came from which container line. Add a typed FK from each receipt movement line to `container_lines` (or a receipt-line bridge) and store discrepancy/condition. |
| Landed-cost allocation/product valuation | Landed cost | Purchase/freight/customs/clearance; basis (currently UI says value); allocated expense per product, landed unit cost; apply/update product cost. | Cost lines by type/currency, allocation basis/amount per container line, FX conversion, receipt line mapping, capitalized unit cost/layers and allocation residuals. | `container_costs`, `container_cost_allocations`, `container_lines`, `inventory_movement_lines`, `products`, `currencies`, `treasury_entries`. | **Partially Supported — High gap** | HTML `:2304-2348`; SQL `:684-727`; decision D3 in `BACKEND_DECISIONS_AND_GAPS.md`. | Allocation basis and amount are present but not connected to posted inventory cost lines; no product weight for weight-based policy; no cost-layer/valuation projection for profit and inventory reports. Add lineage/valuation after D2/D3/D1 approval. Multiple/partial payments need a payment-allocation bridge if supported. |
| Suppliers and payables | No dedicated `sec-suppliers` section; labels/navigation and conditional docs | Potential supplier directory, balances, purchases, purchase returns/payables; containers show supplier and costs. | If D9 confirms: suppliers, purchase docs/lines, receipt/landed-cost relationship, supplier invoices/payments/allocations/credit notes and payable ledger. | `suppliers`, `containers`, `container_costs`; no supplier invoice/AP/payment-allocation entities. | **Unclear / Partially Supported** | HTML section inventory has no supplier screen; backend catalog marks D9 conditional; design note section 4. | Do not label supplier/AP implemented or fully supported. Approve D9 scope before adding AP tables; if needed, design its subledger and link purchases to received quantities/container costs. |
| User/auth/permissions | Users and settings/security | Login, users/roles, password policy, session lifetime, role-dependent controls. | Hashed credentials, user status, role/permission grants, revocable sessions, CSRF/session metadata, grant/audit history. | `users`, `roles`, `permissions`, `user_roles`, `role_permissions`, `auth_sessions`, `password_reset_tokens`, `audit_logs`. | **Partially Supported** | HTML `:2458-2515`, settings `:2582-2654`; `AUTHENTICATION_AND_AUTHORIZATION.md`; DDL `:28-120`. | Schema covers role grants and sessions, but actual role matrix is unresolved. No MFA, login-attempt/throttle records, or password-reset UI was found (reset-token table is optional). Enforce server-side, revoke sessions on credential changes, and define unique login requirement; no seed permissions. |
| Audit trail | User/customer/finance/inventory operations | Record actor, reason, before/after, request, date; preserve posted history. | Typed source identity where possible, append-only snapshots, retention/redaction and immutable audit grants. | `audit_logs`, actor links across documents/ledgers. | **Partially Supported** | `audit_logs` SQL `:865-884`; HTML client-side logs are local only (e.g. integration mapping and backend gap notes). | Audit row structure exists, but `entity_type/entity_id` are not FK-enforced; SQL alone permits mutation unless grants/triggers block it. Define sensitive field redaction, retention and actor deletion semantics. Audit must commit with the operation. |
| Global search/filter/export/pagination | Shell and list pages | Search across entities; sort/filter/status/date; pagination; CSV/PDF/WhatsApp exports. | Searchable indexed keys, authorized result scope, query filters; exports are generated, not persisted unless audit is required. | Existing business tables and relevant indexes; no search table. | **Partially Supported** | Navigation/UI `:806-900`; list sections; endpoint map Global. | Core list indexes exist but not all search fields, and API pagination/sort contract needs implementation. Do not add a search table without measured need. Audit sensitive exports if required by policy. |
| Settings/company/numbering/backup | Settings | Company name/tax ID; billing prefixes/numbering; general/security; backup settings. | Typed company/legal identity and configuration; series; audit; backup handled operationally. | `app_settings`, `document_sequences`, `users`, `currencies`. | **Partially Supported** | HTML `:2582-2654`; SQL `:228-237`, `:834-843`. | JSON settings can persist a single company profile, but no typed company entity/tenant FK. Number sequences are present but not linked to a company/document type beyond key strings. If multi-company is intended, company_id must propagate before implementation. Backup is a deployment/operations responsibility, not a schema table. |
| Sales report | Sales report | Date range, employee, grouping, sales total/order count/average/top employee, monthly chart, discount/net/share. | Posted sales/credit notes, dates, employee, amounts, line/header discounts, status, currency and query grouping. | `sales_documents`, `sales_document_lines`, `users`, `currencies`, `sales_orders` if “orders” means orders. | **Partially Supported** | HTML `:2387-2425`; report specs in endpoint catalog. | Data can support basic grouping once issuer/salesperson semantics, status/date inclusion, credit notes, multi-currency aggregation, and discounts are decided. UI label “orders” may be invoice count; clarify. |
| Profit/loss report | Profit report | Period/comparison, income statement, variance; broader daily summary uses margin/net profit. | Revenue/returns/discount/tax, cost of goods sold by approved D2 valuation, expenses/journals, accounting period and currency. | `sales_documents`, `sales_document_lines`, `inventory_movement_lines`, valuation layers (missing), `expenses`, `journal_entries`, `journal_lines`, `currencies`. | **Missing for reliable production profit** | HTML `:2426-2457`, `:2550-2581`; backend business logic forbids fixed `price*0.8` fallback. | Current schema has no complete costing method/valuation layer, and no approved journal templates. Do not report profit from guessed cost. Define D1/D2/D6/accounting policy first. |
| Inventory report | Inventory report | Warehouse/category filter, current stock value, turnover, slow-moving >90 days, below-minimum; product/location/average-cost/value/status. | Dated posted ins/outs/sales, location, item threshold, valuation by date and cost method. | `products`, `locations`, `inventory_movements`, `inventory_movement_lines`, `inventory_balances`, valuation tables (missing). | **Partially Supported** | HTML `:2529-2549`; SQL inventory tables `:562-631`. | Quantity and movement age can be derived, but historical stock valuation/turnover require approved valuation, return handling, and time-bound ledger queries. Average cost is not necessarily the approved D2 method. |
| Financial statements/cash flow | Financial reports | Income statement, balance sheet, cash flows; revenue, COGS, expenses, assets, liabilities, equity. | Balanced journals, account hierarchy, posting dates/periods, currency, opening balances, source/reversal entries. | `chart_of_accounts`, `journal_entries`, `journal_lines`, `treasury_entries`, operational source tables. | **Partially Supported** | HTML `:2550-2581`; SQL `:387-457`; PDF accounting policy section. | Structural accounting tables exist but no opening trial balance, period close, base currency, journal templates, or balance enforcement in schema. These reports are not trustworthy until accounting policy is approved and transactions post consistently. |

## 5. Missing tables and columns (evidence-based)

This list identifies candidate changes for review; it does not amend the DDL.
Some items should be tables, while others may be typed columns or a bridge.

### Required before the affected core workflow can be implemented reliably

1. **Container receipt-line provenance**
   - Add `inventory_movement_lines.container_line_id` FK to
     `container_lines`, or an equivalent receipt-line bridge.
   - Evidence: UI receipt compares and receives each product line
     (`HTML :2272-2303`); DDL has `container_receipts.inventory_movement_id`
     but movement lines only reference `sales_document_line_id`
     (`SQL :588-618`, `:729-745`).
   - Without it, receipt is linked to the movement header but not which actual
     quantity/cost from which container line entered stock.

2. **Order ↔ invoice source/quantity relationship**
   - Add order source reference on sales documents and, where partial
     invoicing is possible, `sales_document_lines.sales_order_line_id` or a
     dedicated allocation/link table.
   - Evidence: order detail exposes invoices and “create invoice”
     (`HTML :1563-1652`); DDL sales docs/lines have no order FK
     (`SQL :239-321`).
   - Needed to reconcile ordered, invoiced, delivered, canceled and outstanding
     quantities.

3. **Order financial/header fields and line discount/tax**
   - Candidate fields: `sales_orders.location_id`, `payment_terms`,
     `salesperson_user_id`, header `discount_amount`, `tax_amount`,
     `shipping_amount`/`handling_amount`; order-line discount and tax
     snapshot fields. Confirm whether all are persistable order terms or only
     derived display.
   - Evidence: order form/detail shows location, terms, salesperson,
     line discount, 15% VAT and shipping/handling (`HTML :1501-1652`);
     proposal order lines contain only quantity/unit price/notes
     (`SQL :747-787`).
   - Tax/rounding and pricing policies must be approved before deciding exact
     fields/defaults.

4. **Delivery inventory and fulfillment source link**
   - Candidate `delivery_lines.inventory_movement_line_id` or reservation/
     fulfillment allocations; define exactly one source order/invoice line
     per delivery line and source location/transport mode.
   - Evidence: delivery form exposes delivery-only vs issue+delivery,
     warehouse, requested/issued quantities and order link (`HTML :1884-1946`);
     `delivery_lines` has optional order/invoice line refs but no movement
     relation or exactly-one check (`SQL :815-832`).
   - Otherwise a delivered quantity cannot be tied to the stock movement
     that removed it; repeated or partial delivery is hard to reconcile.

5. **Container discrepancy and receipt stage history**
   - Candidate discrepancy/condition/reason fields per received line and
     append-only container-stage events (`container_id`, stage, event time,
     actor, reason/reference). Confirm whether stage history is required.
   - Evidence: UI explicitly requests actual vs expected quantity and a
     mandatory reason for discrepancies; its status flow shows port, customs,
     receiving, received (`HTML :2272-2303`).
   - `container_lines` stores expected and nullable received quantity only;
     `containers` stores current status and receipt date (`SQL :633-682`).

6. **Customer and product UI attributes**
   - Candidate customer columns: `tax_number`, `default_currency_code`,
     `default_payment_terms`, `salesperson_user_id`. Define how opening
     balances are represented (prefer an approved opening/subledger
     transaction, not `customers.balance`).
   - Candidate product columns: `tax_rate` or tax-category FK,
     `default_location_id`, and explicit buy/sell price strategy/history.
   - Evidence: HTML customer modal `:2655-2719`; product modal
     `:2771-2805`; DDL `customers :122-147`, `products :182-209`.
   - Do not add defaults or declare fields mandatory until D1/D6/D7/D10
     decisions are settled.

### Required before the affected module goes live

7. **Accounting/costing representation**
   - If FIFO: cost layers and consumption-to-layer links. If moving average:
     a reconciled valuation projection with as-of cost snapshots. Link
     allocated container costs to receipt valuation lines.
   - Evidence: landed-cost UI shows actual per-unit cost (`HTML :2304-2348`);
     DDL stores optional movement `unit_cost` but no cost-layer/valuation
     ledger (`SQL :588-618`); D2/D3 remain open.

8. **Exchange-rate history / base currency**
   - If multi-currency reports/accounting are required, add effective-dated
     currency-pair rates (source, rate date, rate direction) and transaction
     base-currency amounts or an approved equivalent.
   - Evidence: customers/orders/currencies UI includes EGP and USD and
     exchange rates; DDL only has currency codes and one optional transfer
     `exchange_rate` (`SQL :17-26`, `:529-532`).
   - D1 must determine if multi-currency transactions, revaluation, and FX
     gains/losses are actually in scope.

9. **Attachments metadata and secure storage references**
   - Candidate `attachments` table with owner type/id or separate customer and
     expense FK bridges; do not store files in MySQL unless explicitly chosen.
   - Evidence: customer upload tab `HTML :2655-2719`; expense receipt upload
     `HTML :2750-2770`; no table exists in SQL.
   - G-06 (file handling/security/retention) must be approved first.

10. **Supplier accounts payable, if D9 approved**
    - Add purchase/supplier invoices and lines, supplier payments and
      allocations, supplier credit notes, and a traceable payable ledger.
    - Evidence: finance/report/navigation references supplier accounts;
      backend decision D9 and endpoint catalog gate supplier/purchase
      endpoints. Current SQL has `suppliers` and container supplier refs only.
    - Do not build these tables if D9 is out of scope.

11. **Warehouse operational data, if displayed values are real**
    - Candidate manager FK, postal/location/address fields, capacity and
      capacity unit. Item count can be calculated from `inventory_balances`.
    - Evidence: warehouse list headings (`HTML :2516-2528`); DDL
      `locations` stores name/type/parent/code only (`SQL :211-226`).

12. **History and typed link hardening**
    - Replace or supplement polymorphic references in
      `inventory_movements`, `treasury_entries`, and `journal_entries` with
      typed source FKs/bridges for core workflows; enforce unique source-effect
      keys where exactly-once posting is required.
    - Evidence: SQL comments explicitly acknowledge these refs are
      polymorphic (`SQL :239+`, `:459+`, `:562+`), while transaction plans
      require duplicate prevention and source trace.
    - Determine which document types need a source FK before selecting a
      pattern; polymorphic IDs cannot be protected by ordinary foreign keys.

## 6. Incorrect, weak, or potentially unnecessary model elements

These findings recommend clarification or strengthening; they do not instruct
deletion.

| Severity | Proposed element | Finding and evidence | Recommended action |
|---|---|---|---|
| **Critical** | `inventory_movement_lines` ↔ `container_lines` | No relationship connects received stock to its container item/cost. `container_receipts` links only one header to one movement header. | Add a line-level FK/bridge before receiving/landed-cost workflow is approved. |
| **Critical** | `sales_orders` ↔ invoices/deliveries | No order ID on sales docs/lines and no inventory movement FK on delivery line. The UI shows order → reservation → delivery → invoice. | Model order-line fulfillment/billing/reservation lineage; constrain source combinations. |
| **High** | `sales_orders.status` | Enum omits UI `preparing`; there are no state-history, cancellation reason, or transition actor/time fields. | Define state machine with product owner; persist transitions if the history is operational/audited. |
| **High** | `container_costs.treasury_entry_id` | One nullable treasury entry per cost cannot represent multiple partial payments or combine several cost payments. It also does not reverse-link the entry to the cost. Design note itself mentions the absent `container_cost_payments` possibility. | Confirm payment behavior; use a cost-payment bridge if partial/multiple payments are required. |
| **High** | `inventory_movements.source_type/source_id`, `treasury_entries.source_type/source_id`, `journal_entries.source_type/source_id` | Polymorphic links have no referential integrity; typos, deleted sources, or mismatched type/ID pairs are possible. | Use typed FKs/bridge for important source classes, or explicitly accept and test a registry-based integrity approach. |
| **High** | `sales_receipts` / `sales_receipt_allocations` | FK existence does not ensure matching customer, currency, document status, collection/refund polarity, or allocation totals. Same applies when a receipt is reversed. | Define receipt lifecycle and service transactions; add typed invariants/unique reversal guards where possible. |
| **High** | `journal_entries` / `journal_lines` | No DDL-level aggregate balanced-entry guarantee or minimum posted line count. `journal_lines.currency_code` may differ from the header; no base currency values/FX basis. | Validate atomically in backend, restrict posted-line edits, and finalize multi-currency accounting before posting reports. |
| **High** | `inventory_balances` | Projection has no stock provenance and its on-hand value has no nonnegative check (negative-stock policy is unresolved). It can drift from movements. | Treat only as rebuildable projection; lock/update in same transaction and provide reconciliation/rebuild. Decide negative stock and reservations. |
| **High** | `inventory_movement_lines` | `sales_document_line_id` is not unique and movement header has no typed source uniqueness. Same invoice line could be posted to multiple stock-out movements. | Add source-effect uniqueness or enforce an exactly-once posting state/idempotency guard in a transaction. |
| **Medium** | `delivery_lines` | Both optional `sales_order_line_id` and `sales_document_line_id` may be null or both populated; no CHECK enforces one source; source product may differ from line's product. | Add CHECK if MySQL target supports it; add service FK consistency checks and movement link. |
| **Medium** | `sales_document_lines.return_condition` | Return condition enum is present on every invoice line with default `not_applicable`; document type/source linkage constraints are only service rules. | Consider separate return line model or enforce condition/source only for credit note. |
| **Medium** | `container_cost_allocations` | Allocation table records basis and amount but cannot guarantee total allocated amount matches cost, all rows refer to same container, line received, currency consistency, or basis input availability. | Validate on allocation/post; link to valuation; add product weight only if weight basis approved. |
| **Medium** | `products.company_price` | Ambiguous against UI buy price and sale price; no price type/history, tax category, default location, or currency policy. | Rename/replace with approved pricing model; avoid overwriting historical line snapshots. |
| **Medium** | `idempotency_records` | Unique `(user_id,idempotency_key)` does not include method/route/operation; expired rows still block reuse until purged. JSON replay may not preserve exact response bytes/headers. | Specify key scope, purge/retention, atomic claim/lock, and which response/header data must replay. |
| **Medium** | `audit_logs.entity_type/entity_id` | Generic reference is not FK-enforced; actor `ON DELETE SET NULL` weakens historical identity if users are deleted. | Prefer deactivation; persist actor name/identifier snapshot if required; restrict audit writes and define retention/redaction. |
| **Medium** | `app_settings.setting_value JSON` | Flexible but untyped; it does not provide relational company identity, currency policy constraints, or company FK on transactions. | Fine for non-ledger configuration; use typed entities for business-critical configuration and multi-company if needed. |
| **Low / optional** | `password_reset_tokens` | No password-reset form/workflow was found in the actual 29 sections; inclusion is a security capability proposal rather than demonstrated MVP requirement. | Retain only if account-recovery requirements are approved; not a blocker by itself. |
| **Low / optional** | `document_sequences` | Useful for human numbers, but counter period keys and user-visible patterns are undecided. | Retain as an implementation mechanism; decide scope/prefix/reset policy and test concurrent allocation. |
| **Not unnecessary by default** | `inventory_balances`, `idempotency_records`, `audit_logs`, `journal_*` | These tables have purpose in the documented target; they are not duplicates simply because values can be derived or logs are proposed. | Keep conceptually, but finalize authority, transaction use, and report derivation. |

## 7. Business logic and integrity risk register

| Severity | Risk | Why the current proposal cannot guarantee correctness by itself | Required control |
|---|---|---|---|
| **Critical** | Stock received from container cannot be traced to its container line and allocated landed costs | No line-level relationship among `container_lines`, `container_receipts`, and `inventory_movement_lines`. | Add line lineage; receive and cost allocation atomically; reconcile stock/cost to receipt. |
| **Critical** | Order quantities can diverge from invoices, deliveries, reservations, and stock movements | No order-line FK to invoice line; delivery line source is optional and disconnected from stock movement. | Define explicit order-line fulfillment/billing/reservation relationships and transitions before enabling D8. |
| **Critical** | Finance can be unbalanced or multi-currency values incomparable | Debit=credit is aggregate; schema permits header/line currency mismatch and has no approved base-currency model. | Accountant-approved journal rules; server posting validation; approved D1/base-currency/FX representation. |
| **Critical** | Customer/supplier balances may not reconcile to opening entries and source activity | Customer balance is deliberately derived, but no approved opening transaction model and supplier AP model is absent. | Define subledger sources/opening balances; do not import legacy browser balances as unexplained mutable totals. |
| **High** | Duplicate or partial side effects under retries/concurrency | `idempotency_records` exists, but no unique source-effect links or executable transactional behavior. | Atomic idempotency key claim + request hash; source uniqueness; integration/concurrency tests. |
| **High** | Receipt/refund may be misallocated across invoices or currencies | FKs only enforce row existence; aggregate allocation/currency/type constraints are application logic. | Lock receipt and documents, calculate open balance, reject invalid allocations and reversed/voided sources. |
| **High** | Cost of goods/profit and inventory valuation wrong | No D2 costing policy or complete valuation data model; a movement `unit_cost` is optional. | Select valuation method; add FIFO layers or moving-average projection and landed-cost attribution. |
| **High** | Tax and invoice amounts inconsistent | MVP has VAT display and no-tax calculation paths; schema permits null tax rates and totals not tied to lines. | Approve D1, calculate server-side decimal totals, persist immutable posted line snapshots, test rounding vectors. |
| **High** | Posted transactions editable/deletable through app or DB | Status column does not prevent SQL updates; timestamps update automatically. | Least-privilege DB grants, service guards, reversal-only correction, audit and immutability tests. |
| **High** | Operational statuses may not match actual UI flows | Order “preparing” absent; container stages lack event history; sales fulfillment/payment are not separate state dimensions. | Approve state machines, persist relevant events, keep payment/fulfillment derived or separately tracked. |
| **Medium** | Multi-currency reports aggregate incomparable amounts | Currency is present but historical conversion rates/base amounts absent. | D1 decision; aggregate per currency or store approved base amounts and historical rates. |
| **Medium** | Missing files prevent attachment auditability and access control | UI offers customer/legal and expense receipt attachments; schema has no file metadata. | Approve G-06 and add secure metadata + private object storage if required. |
| **Medium** | Managers/occupancy shown for warehouses cannot be sourced | Location model lacks manager/capacity; occupancy formula is not defined. | Confirm whether displayed columns are required and define units/capacity. |
| **Medium** | Audit trail may expose sensitive data or be modifiable | JSON snapshots may include secrets/personal data; table lacks schema-enforced append-only policy. | Redact before/after values; DB grants prevent update/delete; define retention and access. |

## 8. Dashboard and report data audit

| UI metric/report | Required calculation/source | Schema sufficiency and caveat |
|---|---|---|
| Dashboard sales total / comparison | Sum net posted sales invoices less approved credit notes/discounts for selected date basis and currency. | `sales_documents` and lines can supply raw amounts; status/date/type are present. Need D1/tax, credit-note, status/date, currency-consolidation and comparison-window rules. |
| Dashboard collections | Sum posted customer receipt amounts by receipt date, not invoice revenue. | `sales_receipts` supports date/status/type/currency; exclude reversed/cancelled and distinguish refunds. |
| Dashboard expenses | Sum posted expenses by expense date and category/account; account for reversals. | `expenses` and journal links exist; enforce status/void accounting. Currency conversion and expense-period policy unresolved. |
| Dashboard net profit | Revenue − cost of sales − expenses (and other approved accounts). | **Not ready:** depends on journal policy, D1, D2 and valuation link. No fixed markup/cost estimate is acceptable. |
| Pending orders | Count orders in approved unfulfilled statuses. | `sales_orders.status` exists but its enum omits UI “preparing”; partial fulfillment requires order/delivery links. |
| Low stock | Per product/location quantity against minimum threshold. | `products.minimum_stock` plus `inventory_balances` are adequate for basic threshold count; decide if threshold is global or location-specific. |
| Treasury balance | Sum signed posted `treasury_entries` per account and currency; reverse entries cancel originals. | Structurally possible; opening entries, currency/account equality, reversals, and migration cut-off need rules. |
| Overdue invoices | Posted unpaid invoices past due date, remaining amount from allocations/credit notes, with date/timezone policy. | Header due date and allocation links exist; transaction service must calculate outstanding correctly and filter reversed/credit notes. |
| Container stage alerts | Count/report containers by current state/ETA and stage age. | Current status can give current counts; no stage history means elapsed time per stage/previous event cannot be reported. |
| Cash/inventory chart | Historical cash account balances and stock value by date. | Cash can be derived from dated entries; historical stock valuation needs cost layers/snapshots. Current balance projection alone is insufficient for past stock value. |
| Customer receivable/statement | Posted invoices − receipt allocations − approved credit notes/reversals/opening entries, by customer/currency/date. | Core invoice/receipt records exist, but customer opening entries and FX/base currency semantics are missing. |
| Sales report | Group net sales/discounts/count/average by employee and date; top seller and monthly series. | Possible from documents if issuer/salesperson field semantics and currencies/status rules are approved. Orders versus invoices in “number of orders” needs clarification. |
| Profit & loss | Posted ledger or source transactions grouped by approved account and period. | Journal structure exists; no posting templates, period controls, approved chart, or D2 valuation. Not suitable for production output yet. |
| Inventory report | On-hand and value by product/location; turnover and slow-moving age; below minimum. | On-hand/age/threshold are derivable after ledger correctness; value/turnover need D2 valuation method and treatment of returns/transfers. |
| Balance sheet | Account balances at date, assets = liabilities + equity, including stock/receivables/treasury. | Requires opening journal, balanced postings and approved control-account/subledger policies. Proposed schema allows rows but does not enforce reconciliation. |
| Cash flow | Cash/bank movements by date and classified source/activity. | Treasury entries show direction/source but no cash-flow classification. Add an account/source classification mapping only if the intended report requires it. |
| Container cost report | Cost by container/type/product and actual landed unit cost. | Container cost and allocation records exist, but source-to-stock line link and D2/D3 valuation are missing. |
| “28 reports” catalog | Six groups named in report center. | UI provides group labels/counts, not specifications for all 28 report queries. Each report needs field/formula/filter/export requirements before asserting support. |

Reports should normally be computed from posted source tables. Do not add
duplicated totals/snapshots unless a measured performance requirement and
reconciliation strategy justify them.

## 9. Unresolved business decisions

| Decision | Must be answered | Database consequences |
|---|---|---|
| D1 currency/tax/rounding | Base currency; single or multiple currencies; tax applicability/rates; line vs document rounding; precision. | Rate history/base amounts, customer/product defaults, tax fields, report grouping and monetary column precision. |
| D2 costing | Weighted average, FIFO, or another method; return and adjustment cost. | Cost layers/consumption references or moving average projection; stock valuation and profit schema. |
| D3 landed cost | Allocate by value/quantity/weight/manual; capitalizable costs; rounding residual; when costs are finalized. | Product weight if chosen; allocation controls; valuation lineage and cost lock timing. |
| D4 credit limit | Warn or block; override roles/reason; currency/outstanding definition. | Override audit/approval record if overrides exist; limit currency and balance calculation. |
| D5 posted document edit | Immutable with reversal/reissue or restricted corrections. | Reversal links, status transitions, uniqueness and update/delete grants. |
| D6 markup | Ownership, pricing formula, visibility, historical changes and report treatment. | Price/markup history table or fields, access audit and COGS/profit calculation. |
| D7 actor identity | Issuers/drivers are users, partners, employees, companies or locations? | User FK vs actor/partner entity; delivery party and salesperson relation. |
| D8 orders/deliveries | Included in release? Reservations, partial shipment, cancel, fulfillment and invoice timing. | Reservation/fulfillment tables, order-line FKs and state history. |
| D9 supplier/AP | Are suppliers, purchase invoices, payables and payments in scope? | Supplier invoice/payable/payment-allocation/credit-note model. |
| D10 customer uniqueness | Unique name? phone required/unique? normalization and duplicate policy? | Unique index strategy and import de-duplication. |
| Receipt allocation | FIFO or manual; partial/unapplied/overpayment; refund/credit behavior. | Allocation policy/history, refund links and outstanding calculation. |
| Opening balances and cut-off | How convert browser balances; opening date; who reconciles/signs? | Typed opening movements/journals/subledger transactions; no fabricated history. |
| Accounting | Chart of accounts, fiscal periods, journal templates, control accounts, transaction-date policy. | Period/close records and typed posting rules; service must balance journals. |
| Multi-company | Does one company field mean one legal entity or multiple entities? | If multi-company: `companies` and company FK across transactional/reference tables and scoped uniqueness. |
| Attachments/integrations | Customer/expense uploads, email/SMS/WhatsApp/PDF responsibility and retention. | Attachment metadata/storage strategy and audit; no such table now. |
| Warehouse capacity | Are occupancy figures functional or decorative; what capacity unit? | Typed capacity/manager/location columns and calculation definition. |
| Report definitions | Which of the advertised 28 reports are required and their formula/date/status/filter rules? | Usually queries only; possible classification fields or valuation/accounting data if approved. |

## 10. Recommended schema changes

These are recommendations for a revision only. The existing proposed DDL and
ERD remain unmodified.

### Required before implementation starts

1. Resolve ID strategy (`BIGINT` vs UUID/ULID), MySQL vs MariaDB exact version,
   collation, timezone, and company/tenant scope.
2. Approve core transaction lineage:
   - `sales_orders` → invoice headers/lines → delivery lines → inventory
     movement lines.
   - `containers` → `container_lines` → receipt movement lines → cost
     allocations → inventory valuation.
3. Decide whether ledger source references remain polymorphic. If not, replace
   core `source_type/source_id` pairs with typed relationships or a reviewed
   source registry with constraints.
4. Approve D1–D5 and accounting/return/allocation rules sufficiently to
   finalize numeric fields, tax, statuses, posting and reversal semantics.
5. Decide whether existing UI customer/product/order fields are in release
   scope and map each to typed columns/relations (rather than burying
   transaction-critical data in JSON).

### Required before the affected module goes live

- Orders/deliveries: D8 and relationships for reservations, partial
  fulfillment, invoice allocations, cancellations and inventory movements.
- Supplier/AP/purchases: D9 and full payable/payment/return model.
- Inventory and landed cost: D2/D3, line provenance, valuation model,
  discrepancy capture and reconciliation.
- Multi-currency finance: D1, historical rates, base-currency balances, FX
  journal policy, and treasury currency invariants.
- Journals/reports: accountant-approved account map and journal templates;
  aggregate balance and posting-period validation.
- Attachments: G-06 upload/storage/security/retention decision and metadata
  schema if retained.
- Users: approved role matrix, session mode/lifetime, password reset/MFA scope,
  deactivation and audit rules.

### Optional / conditional improvements

- Customer and expense attachment table plus private object storage metadata.
- Container state-event table if users need stage dwell-time/audit history.
- Company table if multi-entity operations are approved.
- Price history/markup table if D6 establishes effective-dated prices.
- Password reset, MFA, or login-attempt records if required by security policy.
- Cash-flow classification table if that report is in the approved release.
- Warehouse capacity/manager fields if occupancy is operational, not
  decorative.
- Unit-of-measure and conversion tables if purchasing/selling/stocking use
  different units.

## 11. Final coverage assessment

| Coverage category | Modules/features |
|---|---|
| **Supported at a structural starting-point level** | Basic product/category and location catalogs; basic customer records; invoice/line and receipt/allocation entities; base user/role/permission entities; treasury account/entry and chart/journal entities; generic audit/idempotency structures. Each still needs business rules and backend transactions. |
| **Partially supported** | Customer profile and balances; order list and creation; invoice-to-payment reporting; returns; stock ledger/projection/adjustments; warehouse operations; transfer/expense/financial adjustment; currencies; container tracking, receipts and costs; delivery; dashboard and all reports. |
| **Missing or materially unlinked** | Container-line-to-stock-movement lineage; order-line-to-invoice/delivery/stock lineage; reservation source records; product valuation/cost layers; attachment metadata; complete supplier AP if required; direct exchange-rate history for multi-currency reports; explicit customer/product/order fields identified above. |
| **Unclear / decision-gated** | Supplier/purchase/AP screens and scope; D1–D10; exact report formulas; actor/driver identities; opening balance import; refund and collection allocation; warehouse capacity; multi-company. |

### Recommendation

**Not ready for approval.** The proposal is a useful draft, but critical source
lineage gaps for container receipts and order fulfillment, plus unresolved
financial/costing rules and material UI fields, prevent approval as a complete
ERP schema. Correct those relationships and settle the blocking policies,
then review a revised ERD/DDL. Do not begin backend posting implementation
against the current draft as though those gaps were settled.

## 12. Implementation readiness checklist

- [ ] Confirm MySQL or MariaDB and exact supported server version/collation.
- [ ] Confirm key strategy and API identifier representation.
- [ ] Confirm single company vs multi-company, and uniqueness scope for document
      numbers and SKUs.
- [ ] Approve currency, tax, precision, rounding and FX rules (D1).
- [ ] Approve costing method, receipt valuation and return valuation (D2).
- [ ] Approve landed-cost capitalization/allocation and weight availability
      (D3).
- [ ] Approve credit policy/override (D4), posted edit/reversal (D5), markup
      (D6), actor identity (D7), orders/deliveries (D8), supplier/AP (D9), and
      customer uniqueness (D10).
- [ ] Add/review container-line-to-inventory-movement-line lineage.
- [ ] Add/review order-line-to-invoice, delivery, reservation, and movement
      lineage; define partial/cancel behavior.
- [ ] Decide which explicit customer, product, order, warehouse and attachment
      fields from the UI must be persisted.
- [ ] Approve opening-balance and legacy localStorage migration/cut-off process.
- [ ] Approve roles/permissions, session mode/lifetime and audit retention.
- [ ] Define journal templates, fiscal-period rules and report formulas with an
      accountant.
- [ ] Validate DDL against a disposable test MySQL server after schema review;
      this audit did not execute it.
- [ ] Add transaction, concurrency, reconciliation and role-denial tests before
      go-live.

## 13. Audit method and limitations

- This audit inspected the actual HTML screen markup and relevant embedded
  JavaScript behaviors, all 29 `sec-*` sections, the proposed ERD, all 40 DDL
  table definitions, the design/mapping document, and architecture/integration
  references listed above.
- Source line references are HTML line numbers and SQL line numbers as shown by
  workspace search/view. Some dynamically generated controls are defined in
  JavaScript rather than static screen markup.
- No browser workflow, PHP code, API, MySQL server, migration, or test suite
  was run. The original UI contains demo/static data and localStorage logic;
  evidence of a control or JS function is not evidence of production
  functionality.
- This is a functional traceability review, not a MySQL syntax certification,
  penetration test, accounting sign-off, or approval of any business policy.
- No tables have been added/removed from the proposal as part of this audit.
