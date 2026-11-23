# Precision Slate ERP — MySQL Schema v2 Design Notes

**Status: UNAPPROVED PROPOSAL FOR REVIEW.** This is a structural revision of
the v1 proposal, not an approved database design or migration. No owner answers
were provided for D1–D10. No application files were changed and no SQL was
executed.

## 1. Source basis and scope

This revision uses the v1 proposal and its correction register,
`precision_slate_ui_database_traceability_audit.md`,
`database_schema_correction_plan.md` (C-01–C-19),
`docs/project/ERP_PROJECT_READINESS_AUDIT.md`, and the backend decision/transaction
documents. The v1 folder is preserved unchanged. The original MVP remains a
localStorage prototype; screens and client behavior are not treated as proof of
backend implementation or as approval of accounting rules.

The target dialect remains MySQL 8.0.16+, InnoDB, `utf8mb4`, and
`utf8mb4_0900_ai_ci`, as in v1. PostgreSQL `NUMERIC`, `BOOLEAN`, JSON, UUID
proposals in the source blueprint are not silently adopted: this remains
MySQL `DECIMAL`, MySQL boolean alias, native JSON, and candidate
`BIGINT UNSIGNED AUTO_INCREMENT` IDs. The ID choice is **OPEN — A5/G-04**;
the PDF/runtime compatibility and MariaDB compatibility are not verified.

The revision adds structural provenance and uniqueness, not business policy.
It keeps reports derived, adds no report tables, and creates no migrations,
seeds, stored procedures, or application code. Optional
`attachment_metadata` is pending G-06 and contains no file bytes or owner
relation.

## 2. Relationship and integrity model

The full relationship map is in
[`precision_slate_proposed_mysql_erd_v2.md`](./precision_slate_proposed_mysql_erd_v2.md).
The DDL contains 48 tables: all 40 v1 tables plus eight additions:

1. `container_receipt_lines`
2. `sales_order_invoice_allocations`
3. `sales_document_postings`
4. `sales_receipt_postings`
5. `sales_receipt_allocation_reversals`
6. `treasury_transfer_entries`
7. `container_cost_payments`
8. `attachment_metadata` (optional; pending G-06)

There are no removed tables. Fourteen v1 tables have structural changes;
the other 26 are retained without intentional schema changes. Exact names and
columns are in the DDL and the change log.

### Structural behavior introduced in v2

- **Container receipt provenance:** a `container_receipts` row is an event,
  not a one-per-container marker. Each event has one unique inventory movement
  and may have multiple `container_receipt_lines`. Each receipt line references
  its parent receipt/movement/container and its `container_lines` row/product
  using composite foreign keys. An inventory movement line points to that
  receipt line with the same movement ID and product, and the link is unique
  for the original receipt effect. Multiple receipt events can reference the
  same container line to represent partial receipts.
- **Discrepancies:** `container_receipt_lines` stores expected and actual
  quantities, a signed difference (`received_quantity - expected_quantity`),
  reason, an ungoverned condition label, actor, and receipt time. The header
  `container_lines.received_quantity` is retained only as an aggregate/
  projection; receipt-event lines are the auditable source.
- **Sales order lineage:** `sales_order_invoice_allocations` records quantity
  allocated from an order line to an invoice line. Composite foreign keys
  require the allocation product to match both lines. Partial quantities are
  representable; over-invoicing is a posting-service invariant.
- **Delivery integrity:** a delivery line must reference exactly one of an
  order line or invoice line and must link to one inventory movement line for
  the same product. The header-to-line, source-header, source quantity, source
  state, movement direction, and delivery state transition remain transaction
  checks.
- **Exactly-once source effects:** `inventory_movements`,
  `journal_entries`, and `treasury_entries` have unique `(source_type,
  source_id)` keys and require the pair to be either both set or both null.
  Additional typed bridges use unique source/effect keys for sales-document
  effects, receipts, container receipts, container-cost payments, expenses,
  and transfer legs. A polymorphic source tuple is still not a foreign key;
  type validity and source status must be checked in services.
- **Landed costs and payment legs:** each
  `container_cost_allocations.container_receipt_line_id` points to the
  affected receipt line, and composite FKs require the cost and receipt line
  to belong to the same container. `container_cost_payments` can link multiple treasury
  entries to one cost, each with its own amount/currency/time; the old single
  `container_costs.treasury_entry_id` is removed. This does not decide cost
  capitalization, allocation basis, FX, or valuation.
- **Collections:** `sales_receipt_allocations` can represent partial
  allocations; `sales_receipt_allocation_reversals` preserves append-only
  reversal amounts, reasons, actors, and times. Unapplied value is derived,
  not stored as an independently mutable customer-credit balance:
  `receipt.amount - SUM(allocation.amount) + SUM(reversal.amount)`.
  Limits, document compatibility, reversal bounds, and currency rules require
  a locked transaction. No FIFO/manual allocation or overpayment policy is
  selected.
- **Treasury transfers:** `treasury_transfer_entries` types each transfer
  leg as outflow or inflow, uniquely permits one of each per transfer, and
  prevents reuse of a treasury entry as another transfer leg. The posting
  service must require a complete pair and reconcile account, direction,
  currency, and amount.
- **Negative stock and accounting:** `inventory_balances.quantity_on_hand`
  has no nonnegative check; the negative-stock policy is OPEN. The journal
  debit/credit equality rule is a posting-service invariant, **not a DDL
  check**. The DDL only checks each journal line is one-sided and
  nonnegative.

These relational constraints do not prove a workflow is implemented. Posting
and reversal must be one transaction with status checks, row locks,
idempotency, and audit records. Allocation totals, receipt/movement quantity
reconciliation, over-fulfilment, stock direction, and journal totals are
aggregate/service rules and have not been tested.

## 3. Table-by-table purpose and key relationships

The following descriptions summarize the proposal; the DDL is authoritative
for candidate column definitions and named constraints.

### Identity, access, and shared reference data

| Table | Purpose and key relationships |
|---|---|
| `currencies` | Currency code PK and optional minor-unit setting; referenced by monetary records. No base currency, tax, exchange, or rounding policy is selected. |
| `users` | Candidate numeric PK, login identifiers and password hash; actor FK target. |
| `roles` | Role catalog; unique role code. Role semantics and seeds remain open. |
| `permissions` | Permission-code catalog; permission matrix remains open. |
| `user_roles` | User/role join with composite PK and optional grantor. |
| `role_permissions` | Role/permission join with composite PK. No permissions are granted by this proposal. |
| `auth_sessions` | Hash-only session and CSRF-token storage with expiry/revocation metadata; cookie/token topology remains open. |
| `password_reset_tokens` | Hash-only expiring reset-token records; delivery, rate limiting, and lifecycle remain service requirements. |
| `document_sequences` | Sequence-key/period counter for serialized numbering; formats, periods, and reset policy remain open. |
| `idempotency_records` | Unique authenticated-user/key pair, request hash and response data for retry-safe posting; retention and resource typing remain open. |
| `audit_logs` | Actor/action/entity/time/reason and before/after JSON; append-only permissions, redaction and retention require operational design. |
| `app_settings` | Keyed JSON settings and optional updater; must not establish unapproved financial defaults. |
| `attachment_metadata` | Optional metadata-only record for a storage key, name, media type, size, checksum, actor, and deletion time; pending G-06, with no bytes or owner relationship. |

### Customers, suppliers, products, and locations

| Table | Purpose and key relationships |
|---|---|
| `customers` | Customer contacts and optional number/credit-limit amount and currency. Customer uniqueness and credit-limit enforcement remain open. |
| `suppliers` | Supplier/cost-counterparty identity only; no supplier payable ledger is implied. |
| `product_categories` | Optional self-referencing category tree. |
| `products` | SKU/barcode, category, optional price/currency/minimum stock and active flag; unit precision, tax, default warehouse, purchase cost, and markup remain unresolved. |
| `locations` | Hierarchical stock locations (warehouse/sub-location/vehicle/damaged etc.); occupancy/capacity/manager attributes from C-14 remain unresolved and are not added. |

### Sales, collections, accounting, and treasury

| Table | Purpose and key relationships |
|---|---|
| `sales_documents` | Invoice/credit-note header, customer/currency/status/totals, origin/reversal, and actors. Posted-edit and return policies remain open. |
| `sales_document_lines` | Product, quantity, descriptive/pricing/tax snapshots, location and original-line return link. Composite `(id, product_id)` supports product-consistent lineage; tax and rounding remain open. |
| `sales_document_postings` | Typed one-row-per-document link to optional stock movement and journal effects; each effect is unique across this table. Does not choose whether every document needs each effect. |
| `sales_receipts` | Collection/refund amount, date, customer, treasury account/currency and reversal reference. Receipt/refund policy remains open. |
| `sales_receipt_allocations` | Amount rows linking receipts to sales documents; multiple/partial rows are permitted. Active allocation is derived after reversal rows. |
| `sales_receipt_allocation_reversals` | Append-only partial/full allocation reversal amount, reason, actor and timestamp; bounds and permitted target states are transactional rules. |
| `sales_receipt_postings` | One typed posting bridge per receipt to optional treasury and journal effects, each effect unique. |
| `treasury_accounts` | Cash/bank/other account with one currency and unique code. |
| `treasury_entries` | Positive in/out ledger line, account/currency/source and reversal. Source tuple uniqueness is a duplicate guard; balances remain derived. |
| `treasury_transfers` | Transfer header with source/destination accounts, amounts/currencies, optional rate and optional journal; FX convention remains open. |
| `treasury_transfer_entries` | Typed outflow/inflow leg links; unique transfer+leg and unique treasury entry. Requires a complete paired post in service logic. |
| `chart_of_accounts` | Self-referencing account tree and account classification; no chart or posting templates are seeded. |
| `journal_entries` | Numbered, dated, status/source/reversal header. Source pair is unique; debit=credit is checked by the posting service, never a DDL check. |
| `journal_lines` | One-sided, nonnegative debit/credit row with account, currency and optional customer/supplier/treasury dimensions. |
| `expenses` | Expense amount/date/category/treasury and unique optional cash/journal effects; posting configuration remains an accounting decision. |

### Inventory, containers, and deliveries

| Table | Purpose and key relationships |
|---|---|
| `inventory_movements` | Movement header with status, source tuple (unique where set), and reversal link. Source-type validity and exactly-once status changes also require service validation. |
| `inventory_movement_lines` | Product, from/to locations, quantity, optional sales line/cost snapshot, optional container receipt line, and line reversal. Composite receipt FK enforces same receipt movement and product; negative stock and costing remain open. |
| `inventory_balances` | `(product_id, location_id)` projection and reservation projection. No nonnegative on-hand check; negative-stock/reservation rules remain open. |
| `containers` | Shipment header, optional supplier/currency/location, route and ETA. Stage event history is not added. |
| `container_lines` | Expected product quantity and optional cost; `received_quantity` is explicitly a projection/aggregate, not receipt-event evidence. |
| `container_receipts` | Receipt event linked to container and unique inventory movement; container ID is no longer unique, allowing multiple receipt events. Optional journal effect is unique. |
| `container_receipt_lines` | Receipt-event line linked to its container line/product and parent event/movement; actual quantity, signed discrepancy, reason, condition label, actor and time. |
| `container_costs` | Container-incurred cost header, optional supplier, amount/currency/rate/date/status. The former single treasury-entry field is removed. |
| `container_cost_allocations` | Cost amount/basis/currency allocated to a specific receipt line, with unique cost/receipt-line pair and composite same-container FKs to both cost and receipt line. Basis and accounting capitalization remain open. |
| `container_cost_payments` | Multiple partial payment entries per container cost with amount/currency/time and unique treasury/journal effects. Payable accrual semantics are not modeled. |
| `sales_orders` | Optional customer order header; scope, state and reservation policies remain open. |
| `sales_order_lines` | Ordered product/quantity/price snapshots; composite product key supports lineage. |
| `sales_order_invoice_allocations` | Order-line to invoice-line quantity allocation; partial quantities allowed structurally, over-invoicing remains a locked service check. |
| `deliveries` | Optional order/invoice-associated delivery header, status and driver/vehicle/address snapshots. D7/D8 remain open. |
| `delivery_lines` | Quantity and exactly one order/invoice source line plus one unique linked movement line of the same product. State, source consistency and movement direction are service checks. |

No report tables are added. Dashboards, balances, statements, reports, and
financial statements remain derived from source/ledger data after formulas
and source-state rules are approved.

## 4. Transaction and posting requirements

These are application requirements, not implemented stored procedures or
verified behavior:

1. Post container receipt, receipt lines, movement header/lines, balance
   projection, approved valuation/cost effects, optional journal, audit and
   idempotency atomically. Lock container and affected product/location rows
   in deterministic order. Reconcile each receipt-line received quantity to
   its movement lines; record reversals without deleting source records.
2. Post sales order allocation, invoice, stock issue, delivery, collection,
   return, treasury/journal effects, and audit under approved workflow
   boundaries. Lock source lines and balance rows; check total allocations and
   returnable/deliverable quantities before commit.
3. Post receipts and append allocation reversals in a transaction. Enforce
   that reversals do not exceed allocated amount and that net allocations do
   not exceed receipt amount/outstanding documents. Derive unapplied remainder
   from receipt and allocation history; do not mutate customer balance.
4. For all posting paths, claim the idempotency key, validate immutable
   posted-state transitions, insert one source effect, update projections,
   append audit, and persist the exact replay result atomically.
5. For journal posting, require at least two lines and
   `SUM(debit_amount) = SUM(credit_amount)` under the approved accounting
   currency and precision **in the service**; row checks are not aggregate
   balance checks.
6. Treasury transfer posting must create exactly one outflow and one inflow
   leg, validate entry direction/account/amount/currency against the transfer,
   and create the approved journal effect in the same transaction.
7. Inventory balance is a projection reconstructed from posted movements.
   Whether a transaction that would make on-hand negative is rejected remains
   OPEN; no database CHECK picks that policy.
8. Verify typed source document state, product/customer/currency compatibility,
   and source ownership in the service where composite FKs do not capture them.

## 5. Business and architecture decisions remain open

No owner answers were present in the request. D1–D10 and all other questions
listed in
[`SCHEMA_V2_OPEN_DECISIONS.md`](./SCHEMA_V2_OPEN_DECISIONS.md) remain OPEN.
This proposal makes no decisions about currency/tax/rounding, costing, landed
cost basis, credit limits, posted invoice edits, markups, actors, order/
delivery scope, supplier AP, customer uniqueness, authorization grants,
opening balances, returns/refunds, ID type, negative stock, report formulas,
uploads, or deployment compatibility.

## 6. Change and approval status

[`SCHEMA_V2_CHANGE_LOG.md`](./SCHEMA_V2_CHANGE_LOG.md) maps every C-01–C-19
finding to v2. Structural gaps are corrected where the v1 evidence supports
the change; items requiring business-owner decisions are left open. Status
labels do not mean that the DDL is approved, executed, tested against MySQL,
or proven to implement the corresponding workflow.

### Migration and validation risks

- v2 adds receipt-event rows and changes several FKs/columns; it is a new
  proposal, not a data migration script. Mapping any prior records would need
  owner-approved provenance and reconciliation.
- The v1 `container_costs.treasury_entry_id` and
  `container_cost_allocations.container_line_id` representations are changed.
  Any future adoption requires an explicit mapping and review of partial
  payment/allocation histories.
- Receipt quantities, sales/order allocations, transfer legs, and effect
  links require application-level serialization and reconciliation.
- Candidate SQL uses MySQL-specific features. Actual MySQL/MariaDB version,
  SQL mode, collation, PHP runtime, and hosting compatibility are NOT VERIFIED.
- This review performed only static text checks. It did not parse/execute DDL
  in MySQL, validate actual FK engine behavior, run transactions, or contact a
  database.

## 7. Source documents

- [v1 DDL](../proposed-mysql-review/precision_slate_proposed_mysql.sql)
- [v1 ERD](../proposed-mysql-review/precision_slate_proposed_mysql_erd.md)
- [v1 design](../proposed-mysql-review/precision_slate_proposed_mysql_design.md)
- [v1 UI-to-database traceability audit](../proposed-mysql-review/precision_slate_ui_database_traceability_audit.md)
- [v1 schema correction plan C-01–C-19](../proposed-mysql-review/database_schema_correction_plan.md)
- [Project readiness audit](../../../../docs/project/ERP_PROJECT_READINESS_AUDIT.md)
- [Backend decisions and gaps](../../../../docs/backend/architecture/backend-design/BACKEND_DECISIONS_AND_GAPS.md)
- [Backend transaction requirements](../../../../docs/backend/architecture/backend-design/BUSINESS_LOGIC_AND_TRANSACTIONS.md)
