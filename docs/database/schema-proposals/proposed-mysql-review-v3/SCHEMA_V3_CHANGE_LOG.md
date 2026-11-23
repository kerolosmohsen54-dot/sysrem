# Schema v3 Change Log

**Status: UNAPPROVED — review only.** Compared with v2. “Fixed” means the
proposal contains a structural representation, not that a workflow was
implemented, transaction-tested, or approved. No SQL was executed.

## Owner decision changes

| Decision | Status | Tables / columns changed | Why / boundary |
|---|---|---|---|
| OD-1 — EGP only | APPLIED | Removed `currencies`; removed currency and FX fields/FKs from monetary/source tables; `containers` has no currency; `container_costs.amount_egp`, `container_cost_payments.amount_egp`; `treasury_transfers.amount_egp`. | EGP is the sole persisted unit for all monetary fields. Foreign container costs must be converted before storage; the original foreign value/rate is not retained. |
| OD-2 — Whole quantities | APPLIED | `products.minimum_stock`; `sales_document_lines.quantity`; `sales_order_lines.quantity`; `sales_order_invoice_allocations.quantity`; `delivery_lines.quantity`; `inventory_movement_lines.quantity`; `inventory_balances.quantity_on_hand`/`quantity_reserved`; `container_lines.expected_quantity`/`received_quantity`; `container_receipt_lines.expected_quantity`/`received_quantity`/`discrepancy_quantity`. | Replaced fractional quantity representation with integer types. No weight-related basis was added. |
| OD-3 — Weighted average | APPLIED — structural model | `container_receipts.costing_method_snapshot`; `inventory_balances.average_unit_cost_egp`, `inventory_value_egp`; `inventory_movement_lines.unit_cost_egp_snapshot`, `line_cost_egp_snapshot`. | Minimum product/location projection and movement snapshots support valuation/COGS reconciliation without FIFO layers or serial numbers. Posting/update/reversal algorithms remain service contracts. |
| OD-4 — Allocation basis | APPLIED | `containers.landed_cost_allocation_basis`; `container_receipts.allocation_basis_snapshot`; `container_cost_allocations.allocation_basis`. | Per-container choices are `value`, `quantity`, `manual`; no default and no weight option. |
| OD-5 — Partial receipts | PRESERVED | `container_receipts`; `container_receipt_lines`; `inventory_movement_lines.container_receipt_line_id`. | Retains v2 multiple/partial receipt event lineage. |
| OD-6 — Tax configuration and snapshot | APPLIED — structural model | `app_settings.setting_key`/`setting_value`; `sales_document_lines.tax_enabled_snapshot`, `tax_rate_snapshot`. | Global setting contract is `sales_tax`; no default is seeded. Service must snapshot each invoice line at issue. Rate representation, tax formula, and rounding remain to be approved. |
| OD-7 — Rounding | OPEN | Monetary fields remain `DECIMAL`; tax rate remains `DECIMAL(9,6)`. | No rounding sequence, scale policy, or residual allocation behavior has been chosen. |

## Corrections C-01 through C-19

| Finding ID | v3 status | Tables / columns changed or retained | v3 outcome / remaining boundary |
|---|---|---|---|
| C-01 | FIXED | `container_receipts`; `container_receipt_lines.container_id`, `container_line_id`, `product_id`, movement/receipt IDs; `inventory_movement_lines.container_receipt_line_id`. | Multiple/partial receipt events remain supported; composite FKs enforce same container, product, and movement lineage. Quantity aggregation and reversal remain transactional. |
| C-02 | FIXED — schema; D8 open | `sales_order_invoice_allocations`; `delivery_lines.sales_order_line_id`, `sales_document_line_id`, `inventory_movement_line_id`, `product_id`, `quantity`. | Order-to-invoice quantity lineage and exclusive delivery source/stock movement linkage remain in v3. D8 still gates scope/state transitions and quantity totals. |
| C-03 | FIXED — structural | Unique source-once keys and typed bridges in `inventory_movements`, `journal_entries`, `treasury_entries`, `sales_document_postings`, `sales_receipt_postings`, `container_receipts`, `expenses`, `container_cost_payments`, `treasury_transfer_entries`. | Source-effect idempotency is structurally represented. Polymorphic type compatibility and exactly-once transaction semantics need services. Journal debit=credit is a service rule, not a DDL check. |
| C-04 | OPEN — D8 | `sales_orders`, `sales_order_lines` unchanged in scope fields. | Order tax/discount/payment/warehouse/salesperson fields and state model are not expanded unless order scope is approved. |
| C-05 | PARTIALLY FIXED | `container_receipt_lines.expected_quantity`, `received_quantity`, `discrepancy_quantity`, `discrepancy_reason`, `condition_code`, `received_by_user_id`, `received_at`. | Receipt-level discrepancy details persist. Current container status is stored; append-only stage history remains open under A13. |
| C-06 | FIXED — linkage/model | `container_cost_allocations.container_receipt_line_id`, `container_id`, `allocation_basis`, `allocated_amount`; `container_receipt_lines`; `inventory_movement_lines` EGP cost snapshots; `inventory_balances` weighted-average/value projections. | Allocation points to the affected receipt line and same container; weighted-average valuation structures are present. Cost eligibility, timing, and reversal reconciliation must be owner-approved and implemented transactionally. |
| C-07 | PARTIALLY FIXED | `sales_receipt_allocations`; `sales_receipt_allocation_reversals.amount`, `reason`, `actor_user_id`, `reversed_at`; `sales_receipt_postings`. | Unapplied amount is derived and allocation history can be reversed. Allocation bounds, reallocation, refund, and credit policies remain open. |
| C-08 | OPEN — opening balance / D7 / D10 | `customers` remains; no opening-balance column/table added. | Customer master additions and controlled opening balance/cutover need owner and accountant approval. |
| C-09 | PARTIALLY FIXED | `products.unit_code`, `minimum_stock INT UNSIGNED`, `default_location_id`; `container_lines.purchase_unit_cost_egp`. | Whole unit and threshold are represented; default location is supported because the MVP captures default warehouse. No product tax category is added: OD-6 selects global tax configuration but not per-product tax classification. Opening stock remains a posted movement decision. |
| C-10 | FIXED — currency scope | Removed `currencies` and currency/FX columns/FKs; retained EGP amount fields including `container_costs.amount_egp`. | No currency conversion machinery remains. Foreign container values must be converted before entry, and source FX evidence is not retained. |
| C-11 | PARTIALLY FIXED | `inventory_balances.average_unit_cost_egp`, `inventory_value_egp`; `inventory_movement_lines.unit_cost_egp_snapshot`, `line_cost_egp_snapshot`; receipt-line cost allocation path. | Weighted-average stock value and movement-level COGS evidence are modeled. Reversal/return valuation, negative stock, and reconciliation formula details remain open. |
| C-12 | PARTIALLY FIXED — pending G-06 | Optional `attachment_metadata` retained with storage metadata only. | No bytes, owner links, storage lifecycle, access rules, or upload implementation; remain pending G-06. |
| C-13 | OPEN — D9 | `suppliers`, `containers`, `container_costs`, `container_cost_payments` only. | No supplier invoices, AP balances, or full payable allocation subledger is added. |
| C-14 | OPEN — A9 | `locations` unchanged beyond its existing hierarchy/type. | Manager/address/capacity/occupancy and derived warehouse facts remain undecided. |
| C-15 | OPEN — A10 | No report tables; reports are derived. | Formula, date/state basis, rounding, and permission scope require owner/accountant approval. |
| C-16 | OPEN — A1/A2 | `users`, `roles`, `permissions`, `user_roles`, `role_permissions`, `auth_sessions`, `password_reset_tokens`, `audit_logs` retained without seeds. | Permission matrix and authentication/session/CSRF topology remain unresolved; server enforcement is not implemented by this schema. |
| C-17 | OPEN — A5 | Existing `BIGINT UNSIGNED AUTO_INCREMENT` candidate retained. | Identifier strategy is not approved. |
| C-18 | OPEN — A12 | MySQL/InnoDB syntax candidate; exact engine version remains unspecified. | No claim of MySQL/MariaDB acceptance or target runtime compatibility. |
| C-19 | OUT OF SCOPE | No migration tables, seed data, import scripts, or cutover artifacts. | Legacy-data mapping/reconciliation requires a separately approved migration plan. |

## Table-definition comparison with v2

The counts below compare `CREATE TABLE` definitions and names; they do not
measure line-level documentation edits.

| Change | Count | Tables |
|---|---:|---|
| Added | 0 | None |
| Removed | 1 | `currencies` |
| Changed definitions | 23 | `journal_entries`, `sales_document_lines`, `treasury_entries`, `container_costs`, `sales_order_invoice_allocations`, `container_cost_allocations`, `containers`, `treasury_accounts`, `sales_orders`, `sales_order_lines`, `container_lines`, `customers`, `container_receipt_lines`, `expenses`, `products`, `sales_receipts`, `inventory_movement_lines`, `journal_lines`, `delivery_lines`, `inventory_balances`, `container_cost_payments`, `treasury_transfers`, `sales_documents` |
| Unchanged definitions | 24 | All remaining shared v2 tables |

The v3 proposal therefore contains **47 tables**, versus 48 in v2. The
comparison used static text extraction; no DDL was executed.
