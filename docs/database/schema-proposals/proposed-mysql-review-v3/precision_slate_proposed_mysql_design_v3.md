# Precision Slate ERP — Proposed MySQL Schema v3 Design

**Status: UNAPPROVED — review only.** This proposal applies only the recorded
owner decisions OD-1–OD-7 to v2. It was not executed or validated by a MySQL
server. It is not an application implementation, migration, or production
approval.

Companion files:

- [`precision_slate_proposed_mysql_v3.sql`](./precision_slate_proposed_mysql_v3.sql)
- [`precision_slate_proposed_mysql_erd_v3.md`](./precision_slate_proposed_mysql_erd_v3.md)
- [`SCHEMA_V3_CHANGE_LOG.md`](./SCHEMA_V3_CHANGE_LOG.md)
- [`SCHEMA_V3_OPEN_DECISIONS.md`](./SCHEMA_V3_OPEN_DECISIONS.md)

## 1. Owner decisions incorporated

| Decision | Proposal treatment |
|---|---|
| OD-1 — Currency | EGP is the only persisted currency. Currency and FX tables/columns are removed. Foreign container costs must be converted to EGP before entry; the original foreign amount and conversion rate are not retained. All monetary columns, including those without `_egp` suffix, represent EGP. |
| OD-2 — Quantity | Unit quantities and stock counts use whole-number integer columns; no weight-based basis or fractional quantities are modeled. Monetary, price, rate, and cost amounts remain `DECIMAL`. |
| OD-3 — Costing | `inventory_balances` holds the per-product/location weighted-average unit cost and inventory-value projections. `inventory_movement_lines` holds EGP unit-cost and extended-cost snapshots for valuation/COGS reconciliation. No FIFO layers or serial-number model is added. |
| OD-4 — Landed-cost basis | `containers.landed_cost_allocation_basis` allows `value`, `quantity`, or `manual`, without a default. Allocations snapshot the selected basis. Weight is not an option. |
| OD-5 — Receipts | The v2 receipt-event structure is retained: multiple/partial receipts per container, with receipt-line to originating container-line/product and inventory-movement-line traceability. |
| OD-6 — Tax | A `sales_tax` JSON setting in `app_settings` stores `{ "enabled": boolean, "rate": number }`; no default is seeded. Invoice-line tax-enabled and rate snapshots may be null in drafts, and must be populated at issue by the posting service. Issued lines must not be recalculated using later settings. |
| OD-7 — Rounding | Rounding remains OPEN. `DECIMAL(19,4)` and `DECIMAL(9,6)` are storage capacities, not selected rounding or tax-rate interpretation rules. |

No owner decision was supplied for D4–D10 or for the remaining topics in
[`SCHEMA_V3_OPEN_DECISIONS.md`](./SCHEMA_V3_OPEN_DECISIONS.md). A nullable
product default location is retained because the MVP product form captures a
default warehouse; it is only a catalog convenience and does not determine
inventory posting. No tax category is added because OD-6 specifies a global
tax setting and does not approve per-product tax categories.

## 2. Architecture and relational model

The DDL is a MySQL/InnoDB relational proposal using `BIGINT UNSIGNED
AUTO_INCREMENT` identifiers (still OPEN — identifier strategy). It separates
operational source documents from posting ledgers and projections:

1. Users, roles, permissions, sessions, settings, sequences, idempotency
   records, and audit events support protected application workflows.
2. Sales documents and lines record EGP invoice/credit-note snapshots;
   sales receipt allocations and allocation reversals record collections and
   allocation history.
3. Sales orders, order lines, invoice-allocation bridges, deliveries, and
   delivery lines represent order/invoice/fulfillment lineage. D8 still
   controls whether those workflows belong in the initial release.
4. Inventory movements and lines are the append-only stock-effect ledger.
   `inventory_balances` is a rebuildable product/location projection.
5. Containers, expected container lines, receipt events/lines, costs,
   receipt-line cost allocations, and cost payments model container receiving
   and its traceable EGP costs.
6. Treasury entries and transfer legs represent cash/bank effects; chart of
   accounts and journal entries/lines represent double-entry accounting.
7. Reports are derived from source and ledger records; there are no report
   tables.

The complete FK map is in the companion ERD. Structural FKs do not by
themselves validate a business workflow, quantity totals, document state,
posting permissions, or aggregate accounting.

## 3. Table-by-table purpose and key design

### Identity, access, and control

| Table | Purpose and notable design |
|---|---|
| `users` | Application identities and password hashes; unique nullable username/phone/email indexes. D7 still leaves actor identity policy open. |
| `roles` | Role master; role names/codes are unique. |
| `permissions` | Permission-code master; no grants or matrix are seeded. |
| `user_roles` | User-role many-to-many grants with optional granting actor. |
| `role_permissions` | Role-permission many-to-many grants. |
| `auth_sessions` | Session-token hash, optional CSRF-token hash, expiry/revocation/client metadata; topology and lifecycle remain open. |
| `password_reset_tokens` | Hashed reset-token records with expiry and use time. |
| `app_settings` | Keyed JSON application settings, including the tax-setting contract. Configuration validation and protected change policy belong in the application. |
| `document_sequences` | Atomic-numbering state by sequence and period; numbering format/policy remains open. |
| `idempotency_records` | Per-user request key/hash and replayable response/resource state for retry-safe APIs. |
| `audit_logs` | Actor, action, entity, before/after JSON, request/IP metadata; not a substitute for immutable financial ledgers. |
| `attachment_metadata` | Optional upload metadata only, pending G-06. It has no file bytes or business-owner FK and must not be treated as a complete upload design. |

### Customer, supplier, product, and warehouse masters

| Table | Purpose and notable design |
|---|---|
| `customers` | Customer master, contact/address, optional credit-limit amount and audit actors. Credit policy, uniqueness policy, and opening balance are not decided. |
| `suppliers` | Supplier master used for container/cost references; it is not an accounts-payable subledger. |
| `product_categories` | Hierarchical catalog grouping. |
| `products` | SKU/barcode/name/category, whole-item `unit_code`, company price, minimum-stock integer, and optional default location. No product tax category or purchase-price history is selected. |
| `locations` | Hierarchical warehouse/location master, including location type. Capacity, manager, and occupancy remain undecided. |

### Sales, collections, and fulfillment

| Table | Purpose and notable design |
|---|---|
| `sales_documents` | Invoice/credit-note header, customer, date/status, EGP totals, issuer/driver and reversal references. Posted-edit and return rules remain open. |
| `sales_document_lines` | Invoice/credit-note line snapshots including product description/SKU, location, integer quantity, EGP price/discount/tax/total, tax enabled/rate snapshots, and optional original return line. Rate interpretation, tax formula, rounding, and return policy remain unresolved. |
| `sales_document_postings` | Unique document effect bridge to optional inventory movement and journal entry. Valid posting combination is a service invariant. |
| `sales_receipts` | Collection/refund source record in EGP, customer, treasury account, and reversal reference. Refund policy is open. |
| `sales_receipt_allocations` | Applied receipt amounts against sales documents. Unapplied amount is derived as the receipt amount less net active allocations. |
| `sales_receipt_postings` | Exactly-once receipt bridge to treasury and journal effects. |
| `sales_receipt_allocation_reversals` | Append-only allocation reversal amount, reason, actor, and timestamp. Allocation caps and reallocation/refund policies remain service/owner decisions. |
| `sales_orders` | Customer order header and basic status/date fields; D8 determines whether it is in scope and its state machine. |
| `sales_order_lines` | Product and ordered whole quantity with EGP unit price. Reservation, order tax, discounts, and additional header fields await approved order scope. |
| `sales_order_invoice_allocations` | Many-to-many quantity bridge for partial order-line to invoice-line invoicing; aggregate over-invoicing prevention is transactional. |
| `deliveries` | Delivery header linked to an order and/or sales document. Cross-header compatibility and legal combinations require D8 service rules. |
| `delivery_lines` | Integer fulfilled quantity; XOR check requires exactly one order-line or invoice-line source; FK links the stock movement line. Source/header agreement and quantity reconciliation require transactional validation. |

### Inventory and containers

| Table | Purpose and notable design |
|---|---|
| `inventory_movements` | Numbered stock event, status/type, source/reversal keys, actor/timestamps. Polymorphic source types cannot be FK-validated directly. |
| `inventory_movement_lines` | Whole quantity, product/from/to location, optional sales line or container receipt line, reversal link, and EGP unit/extended cost snapshots. A posted cost-bearing movement must be populated consistently by service logic. |
| `inventory_balances` | Rebuildable product/location quantity/reserved and weighted-average/value projections. Negative-stock policy remains open; no CHECK chooses it. |
| `containers` | Container/supplier/stage/locations, selected landed-cost allocation basis (`value`, `quantity`, `manual`), actors and dates. Basis is not defaulted. |
| `container_lines` | Expected whole-item product quantity and optional EGP purchase unit-cost snapshot. |
| `container_costs` | Container-associated cost type/amount in EGP, supplier, source/reference and creator. Cost eligibility/capitalization and late-cost handling must be confirmed as described in the open register. |
| `container_receipts` | Receipt event linked to one container and one inventory movement; multiple events per container are allowed. Snapshots the OD-3 `weighted_average` method and the container's selected OD-4 allocation basis. |
| `container_receipt_lines` | Receipt-event line linked to the originating container line and product, with expected/received/discrepancy quantity, reason, condition, actor and time. Expected quantity is an event snapshot; total receipt quantity reconciliation is a service rule. |
| `container_cost_allocations` | EGP allocated amount and basis snapshot linked to one cost and the affected receipt line in the same container. It does not independently calculate or post valuation. |
| `container_cost_payments` | Supports multiple/partial EGP payments against a container cost, each linked to treasury and optional journal effects. |

### Treasury and accounting

| Table | Purpose and notable design |
|---|---|
| `treasury_accounts` | EGP cash/bank account master; no currency dimension remains. |
| `treasury_entries` | EGP inflow/outflow/adjustment/reversal ledger with source and reversal keys. Direction/source compatibility is service-validated. |
| `treasury_transfers` | EGP transfer header between treasury accounts. |
| `treasury_transfer_entries` | Pairing table for one outflow and one inflow treasury entry per transfer; directions, accounts and equal amounts are service invariants. |
| `expenses` | Expense source with EGP amount, treasury account, optional mapped expense account and linked treasury/journal effects. Account mapping must be approved before posting. |
| `chart_of_accounts` | Hierarchical account master. |
| `journal_entries` | Numbered dated journal header, status, optional source-once key and reversal reference. Source tuples are polymorphic. |
| `journal_lines` | Debit/credit lines, account and optional customer/supplier/treasury dimensions. Each row enforces nonnegative one-sided values; balancing the full journal is a service rule, not a DDL CHECK. |

## 4. Financial and inventory invariants

### EGP and money

- All persisted money is EGP, even where a neutral column name such as
  `amount`, `unit_price`, or `total_amount` is retained.
- Foreign container cost conversion happens before persistence. The DDL
  cannot preserve or audit the original foreign amount/rate because OD-1
  instructed removal of FX machinery.
- Money remains `DECIMAL`; there is no binary floating-point storage.
  `DECIMAL` precision does not define how or when values round. OD-7 remains
  OPEN, and no rounding rule is inferred.

### Tax

- The application setting key is `sales_tax`; its JSON value is expected to
  contain boolean `enabled` and numeric `rate`, without a seeded value.
- On invoice issue, the posting service must snapshot both values on every
  invoice line; issued snapshots must not be changed when settings change.
- The schema permits null snapshots on drafts, and the CHECK ensures snapshot
  fields are paired and disabled tax carries zero rate. It cannot enforce
  setting existence, immutability after posting, tax computation, or
  header/line aggregate equality.
- The representation of the rate (for example, percentage versus fraction),
  tax base, exemptions, and rounding sequence require owner/accountant/tax
  specialist approval before implementation.

### Weighted-average inventory

- `inventory_balances` is a projection keyed by `(product_id, location_id)`.
  It stores whole on-hand/reserved quantity, average EGP unit cost, and EGP
  inventory-value projection.
- Every posted inventory movement line that changes stock must record the
  approved EGP unit-cost and extended-cost snapshot as applicable. For an
  issue, the movement line is the source evidence for COGS; receipts and
  adjustments must use an approved average-cost update rule.
- In a single transaction, the posting service must lock affected balance
  rows in stable product/location order, write ledger lines, update average
  cost/value projection, post linked document/journal effects, persist
  idempotency response and audit event, and commit or roll back together.
- A reconciliation job/query must rebuild quantity and value projection from
  posted movements and approved cost adjustments. No FIFO layers or serial
  numbers are modeled.
- Negative stock is not permitted or prohibited by the schema: the signed
  on-hand field deliberately leaves the policy open. Reservations are also
  projections pending D8.

### Container receiving and landed costs

- A container can have multiple receipt headers. Each receipt header binds a
  container and movement; each receipt line snapshots the expected and
  received quantity for a container line/product.
- The movement line points back to the receipt line, and composite foreign
  keys constrain same container, product, and inventory movement. The
  posting service must enforce receipt totals, exactly-once behavior, reversal
  semantics, and stage transitions.
- An allocation identifies both a container cost and an affected receipt
  line in that same container. The service must allocate only against eligible
  received valuation quantities, update weighted-average value as required by
  the approved timing rule, and preserve compensating history on reversal.
- Selected per-container allocation basis is value, quantity, or manual. No
  weight-based allocation exists. Manual residual distribution and late-cost
  handling require explicit operational/accounting sign-off; do not infer a
  rounding policy.

### Posting, authorization, audit

- Unique source-once keys and typed posting bridges prevent common duplicate
  effects, but nullable source tuples and cross-record status compatibility
  require a transaction-safe service.
- Journal debit total must equal credit total at post time. This aggregate
  rule cannot be enforced by a row-level CHECK.
- Server-side permission checks must guard all sensitive read/post/reverse/
  export operations; this proposal does not define the permission matrix or
  seed role grants.
- Posted business/ledger facts should not be edited in place. Reversal and
  correction behavior is intended to append compensating records, subject to
  the still-open posted-invoice and returns/refund decisions.
- No execution plan, production credentials, database connection, migration,
  or application-code change is part of this proposal.

## 5. MVP module mapping

| MVP area | Proposed tables | Coverage / caveat |
|---|---|---|
| Authentication and permissions | `users`, `roles`, `permissions`, `user_roles`, `role_permissions`, `auth_sessions`, `password_reset_tokens`, `audit_logs` | Data structures exist; authentication topology, permission matrix, and service enforcement remain open. |
| Customers and balances | `customers`, `sales_documents`, `sales_receipts`, `sales_receipt_allocations`, `journal_lines` | Customer and receivable source records exist; customer balance is derived, and opening balances/credit policy remain open. |
| Products and prices | `products`, `product_categories`, `container_lines`, `sales_order_lines`, `sales_document_lines` | Product/unit/minimum stock and price snapshots are represented. Product-specific tax category is not selected. |
| Warehouses and stock | `locations`, `inventory_movements`, `inventory_movement_lines`, `inventory_balances` | Stock ledger and weighted-average projection modeled; negative stock, reservations, and opening stock procedure remain open. |
| Containers and receiving | `containers`, `container_lines`, `container_receipts`, `container_receipt_lines`, `inventory_movements`, `inventory_movement_lines` | Multiple/partial receipt and discrepancy lineage modeled; actual receipt reconciliation remains transactional. |
| Shipping/customs/landed costs | `container_costs`, `container_cost_allocations`, `container_cost_payments`, `treasury_entries`, `journal_entries` | EGP-only cost/payment and value/quantity/manual allocation modeled; eligible cost categories and later-cost treatment require confirmation. |
| Sales, invoices, delivery, stock issue | `sales_orders`, `sales_order_lines`, `sales_order_invoice_allocations`, `sales_documents`, `sales_document_lines`, `deliveries`, `delivery_lines`, `inventory_movements`, `inventory_movement_lines` | Relationships and partial quantity bridges exist; D8 feature scope and state machine remain open. |
| Collections, allocations, refunds, statements | `sales_receipts`, `sales_receipt_allocations`, `sales_receipt_allocation_reversals`, `sales_receipt_postings`, `treasury_entries`, `journal_lines` | Allocation history and posting links represented; unapplied amount is derived; refunds and customer statement formulas remain open. |
| Expenses and treasury | `expenses`, `treasury_accounts`, `treasury_entries`, `treasury_transfers`, `treasury_transfer_entries` | EGP ledger structures exist; account mapping, transfer reconciliation and journal templates require service rules/approval. |
| Supplier and AP | `suppliers`, `containers`, `container_costs`, `container_cost_payments`, `journal_lines` | Supplier/cost association only; full accounts payable is not modeled (D9 open). |
| Reports and exports | Derived queries over source/ledger tables | No report table. Report formulas, date/state basis, access, and export rules remain open. |
| Attachments/uploads | `attachment_metadata` | Optional metadata-only table, pending G-06; no upload implementation/storage ownership/access design. |
| Administrative settings | `app_settings`, `document_sequences`, `audit_logs` | Configuration and numbering structures only; configuration governance and number policy remain open. |

## 6. MySQL-specific adaptations and compatibility

- The v2 PostgreSQL-oriented proposal has been adapted to MySQL syntax and
  types: MySQL `AUTO_INCREMENT`, `BOOLEAN`/`TINYINT(1)` semantics, `JSON`,
  `ENUM`, InnoDB, and `utf8mb4` collation are used.
- The v3 header leaves the exact database engine version OPEN. MySQL CHECK
  enforcement is version-sensitive (the v2 target candidate was MySQL
  8.0.16+), so the required server and SQL mode must be selected before
  compatibility review. Do not infer MariaDB compatibility from this draft.
- `BIGINT UNSIGNED AUTO_INCREMENT` is retained only as a candidate;
  identifier strategy remains OPEN.
- Composite FKs use declared candidate/unique keys. Static text inspection
  does not prove that a target server accepts every type, index, collation,
  expression, or constraint combination.
- No MySQL server validation, DDL execution, application test, migration
  test, or query-plan review was performed.

## 7. Risks and migration implications

1. Removing currency machinery means a v2-to-v3 data migration would need an
   approved conversion and reconciliation of every non-EGP row; the v3 DDL
   intentionally provides no FX history to perform it.
2. Whole-item integer quantities are incompatible with any legacy fractional
   quantity data. The owner must verify source data and decide how exceptions
   are reconciled before migration.
3. A weighted-average projection is only reconcilable when posting,
   adjustment, landed-cost, return, and reversal services share one approved
   transaction contract and movement-cost snapshot convention.
4. Tax-setting JSON and invoice-line snapshots need application-side schema
   validation and immutability controls; a DDL column alone cannot guarantee
   correctly calculated tax.
5. Numeric identifiers, target engine/runtime, permissions, posting rules,
   reports, and opening balances are unresolved and can affect APIs and
   migration design.
6. `attachment_metadata` is explicitly optional. Treating it as permission
   to implement uploads before G-06 approval would exceed this proposal.

## 8. Proposal boundary

The v3 SQL, ERD, and supporting documents remain **UNAPPROVED**. The DDL is
review material only. Approval of this schema would not itself approve
application implementation, migrations, production deployment, permission
grants, financial policies, or opening-balance cutover.
