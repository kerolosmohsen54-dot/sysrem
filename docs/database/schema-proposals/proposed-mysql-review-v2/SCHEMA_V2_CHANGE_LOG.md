# Schema v2 — Correction Change Log

**UNAPPROVED proposal.** “FIXED” means the identified structural schema
correction is represented in the v2 DDL; it does not mean a workflow is
implemented, transaction-tested, or production-ready. No owner answers were
provided. No SQL was executed.

| Finding ID | Status | What changed (table/column names) | Why / remaining boundary |
|---|---|---|---|
| C-01 | FIXED | `container_receipts.container_id` is no longer unique; `container_receipt_lines` added with `container_receipt_id`, `inventory_movement_id`, `container_id`, `container_line_id`, `product_id`; `inventory_movement_lines.container_receipt_line_id` and composite FK; composite unique keys on `container_receipts`, `container_lines`, and receipt lines. | Multiple receipt events/partial receipts are representable. Composite FKs enforce same parent container, receipt movement, and product. Quantity reconciliation, duplicate idempotent posting, and reversal posting remain transaction rules. |
| C-02 | FIXED | Added `sales_order_invoice_allocations(sales_order_line_id, sales_document_line_id, product_id, quantity)`; product-consistency unique keys on source lines; `delivery_lines.sales_order_line_id`, `sales_document_line_id`, `inventory_movement_line_id`, and XOR source `CHECK`; composite source/product and movement/product FKs; unique movement-line link. | Order-to-invoice partial quantity lineage is modeled; each delivery line has exactly one source and one same-product stock movement line. Over-fulfillment, header/source consistency, movement direction, and D8 feature scope remain service/owner questions. |
| C-03 | FIXED | Unique `(source_type, source_id)` and paired-null checks on `inventory_movements`, `journal_entries`, `treasury_entries`; unique typed effect bridges in `sales_document_postings`, `sales_receipt_postings`, `container_receipts`, `expenses`, `container_cost_payments`, and `treasury_transfer_entries`. | Adds exactly-once guards/typed FKs for key posting paths. Polymorphic source tuples do not become FKs. Journal debit=credit is explicitly a posting-service rule, not a DDL check. Journal templates and source status rules remain open. |
| C-04 | OPEN pending decision | No v2 columns added to `sales_orders` or `sales_order_lines` for warehouse, payment terms, salesperson, header/line discount, tax, shipping/handling, or preparing state. | D1, D6 and D8 must define pricing/tax fields and order scope/state before choosing persistent fields or transitions. |
| C-05 | PARTIALLY FIXED | Added receipt-level `container_receipt_lines.expected_quantity`, `received_quantity`, `discrepancy_quantity`, `discrepancy_reason`, `condition_code`, `received_by_user_id`, `received_at`; discrepancy equation CHECK. | Captures discrepancy evidence at receipt-line granularity. `containers` retains current status only; append-only stage history awaits the C-05/A13 decision. |
| C-06 | PARTIALLY FIXED | Changed `container_cost_allocations.container_line_id` to `container_receipt_line_id`; added `container_id`, composite FKs to `container_costs(id, container_id)` and `container_receipt_lines(id, container_id)`, and unique `(container_cost_id, container_receipt_line_id)`. | Each allocation points to the affected receipt line in the same container, including partial receipt events. No valuation ledger/costing method is added; D2/D3 and valuation effects remain open. |
| C-07 | PARTIALLY FIXED | `sales_receipt_allocations` permits multiple rows per receipt/document pair and preserves allocation amounts; added append-only `sales_receipt_allocation_reversals(amount, reason, actor_user_id, reversed_at)`. | Unapplied amount is derived as receipt amount minus net allocations, rather than maintained as customer balance. Allocation bounds, reallocation rules, FX, refund and customer-credit policy remain transaction/owner decisions. |
| C-08 | OPEN pending decision | No new customer fields. Existing `customers` shape retained. | Tax number, default currency, terms, salesperson and opening balance require D1/D7/D10 and accountant-approved opening-balance treatment. |
| C-09 | OPEN pending decision | No new product tax/category, purchase-price, default-location, unit, or price-history fields. | D1/D2/D6/D7, unit definitions, ownership and UI data-retention rules are unresolved. Opening stock must be a controlled movement, not an assumed opening-quantity column. |
| C-10 | OPEN pending decision | No FX-rate history or base-currency snapshot columns added. Existing currency and transfer fields remain. | D1 must decide currency set/base, rate source/direction/time, rounding, and FX accounting before adding consistent conversion snapshots. |
| C-11 | OPEN pending decision | No valuation-layer, cost-consumption, COGS or valuation-projection table added. `container_cost_allocations` now identifies receipt lines only. | D2/D3 and accountant approval determine the minimum valid valuation/COGS model. A receipt-line link alone is not proof of valuation or profitability support. |
| C-12 | PARTIALLY FIXED | Added optional `attachment_metadata` with `storage_key`, `original_filename`, `media_type`, `byte_size`, `sha256`, `uploaded_by_user_id`, `uploaded_at`, `deleted_at`. | Metadata-only table is marked pending G-06; file bytes, owner links, upload flow, storage, access, scanning and retention are intentionally not selected. |
| C-13 | OPEN pending decision | No supplier AP tables added; `container_cost_payments` only records payments against container costs. | D9 must decide supplier-as-counterparty versus full purchase/payables subledger, invoice/payment allocations and posting rules. |
| C-14 | OPEN pending decision | No warehouse manager/address/capacity/occupancy columns added to `locations`. | The operational meaning, unit, persistence need, and whether counts are derived remain unverified. |
| C-15 | PARTIALLY FIXED | No report tables added or changed; reports are expressly derived from source records in v2 design. | Formula, date/status basis, currency/tax/COGS/return handling, export, and authorization definitions remain open under G-07/A10. |
| C-16 | OPEN pending decision | Existing `users`, `roles`, `permissions`, `user_roles`, `role_permissions`, `auth_sessions`, `password_reset_tokens`, and `audit_logs` are retained without policy/seed changes. | Role grants/matrix, session topology, CSRF, revocation/retention and server enforcement require G-03/G-05 and security-owner approval. |
| C-17 | OPEN pending decision | No identifier changes; v1 candidate `BIGINT UNSIGNED AUTO_INCREMENT` remains in v2 DDL. | Numeric versus UUID/ULID/public-ID strategy is not owner-approved; resolve before API freeze or imports. |
| C-18 | OPEN pending decision | No runtime-specific changes; MySQL 8.0.16+/InnoDB/collation target remains a candidate. | Actual production MySQL/MariaDB and PHP runtime are unknown; static review does not establish compatibility. |
| C-19 | OUT OF SCOPE | No migration/import tables, scripts, or cutover artifacts added. | Legacy localStorage reconciliation, data mapping, source snapshot, cut-off and sign-off are outside this schema proposal and require a separately approved migration plan. |

## Cross-revision counts

- v1 tables: **40**
- v2 tables: **48**
- Added: **8**
- Removed: **0**
- Existing v1 tables with intentional DDL changes: **14**
- Retained without intentional DDL changes: **26**

Added table names: `container_receipt_lines`,
`sales_order_invoice_allocations`, `sales_document_postings`,
`sales_receipt_postings`, `sales_receipt_allocation_reversals`,
`treasury_transfer_entries`, `container_cost_payments`, and optional
`attachment_metadata` (pending G-06).

Changed table names: `journal_entries`, `sales_document_lines`,
`sales_receipt_allocations`, `treasury_entries`, `container_costs`,
`container_cost_allocations`, `container_receipts`, `inventory_movements`,
`inventory_movement_lines`, `inventory_balances`, `container_lines`,
`sales_order_lines`, `treasury_transfers`, and `delivery_lines`.

No finding status approves the schema. See
[`SCHEMA_V2_OPEN_DECISIONS.md`](./SCHEMA_V2_OPEN_DECISIONS.md) before review
or approval.
