# Precision Slate ERP — Proposed MySQL ERD v3

**REVIEW ONLY — UNAPPROVED.** This ERD is a documentation companion to
[`precision_slate_proposed_mysql_v3.sql`](./precision_slate_proposed_mysql_v3.sql).
It is not a migration or authorization to connect to a database. The DDL was
not executed.

## Relationship map

The catalog below lists every table and every declared DDL foreign-key
constraint (121 total). A relationship is a foreign-key dependency; its
actual optionality/cardinality is governed by the FK columns, unique keys,
and nullability in the DDL. Composite constraints additionally enforce
same-product, same-container, same-movement, or paired-document integrity
where noted.

### Identity, access, and settings

| Source table | Foreign-key relationships |
|---|---|
| `user_roles` | `fk_user_roles_user` → `users`; `fk_user_roles_role` → `roles`; `fk_user_roles_granted_by` → `users` |
| `role_permissions` | `fk_role_permissions_role` → `roles`; `fk_role_permissions_permission` → `permissions` |
| `auth_sessions` | `fk_auth_sessions_user` → `users` |
| `password_reset_tokens` | `fk_password_reset_user` → `users` |
| `app_settings` | `fk_app_settings_updated_by` → `users` |
| `idempotency_records` | `fk_idempotency_user` → `users` |
| `audit_logs` | `fk_audit_logs_actor` → `users` |
| `attachment_metadata` | `fk_attachment_metadata_uploaded_by` → `users` (optional metadata module; pending G-06) |

### Customer, product, and location masters

| Source table | Foreign-key relationships |
|---|---|
| `customers` | `fk_customers_created_by` → `users`; `fk_customers_updated_by` → `users` |
| `product_categories` | `fk_product_categories_parent` → `product_categories` |
| `products` | `fk_products_category` → `product_categories`; `fk_products_default_location` → `locations`; `fk_products_created_by` → `users`; `fk_products_updated_by` → `users` |
| `locations` | `fk_locations_parent` → `locations` |

### Sales, collections, and fulfillment

| Source table | Foreign-key relationships |
|---|---|
| `sales_documents` | `fk_sales_documents_customer` → `customers`; `fk_sales_documents_original`, `fk_sales_documents_reversal` → `sales_documents`; `fk_sales_documents_issuer`, `fk_sales_documents_driver`, `fk_sales_documents_created_by`, `fk_sales_documents_posted_by`, `fk_sales_documents_reversed_by` → `users` |
| `sales_document_lines` | `fk_sales_document_lines_document` → `sales_documents`; `fk_sales_document_lines_product` → `products`; `fk_sales_document_lines_location` → `locations`; `fk_sales_document_lines_original` → `sales_document_lines` |
| `sales_document_postings` | `fk_sales_document_postings_document` → `sales_documents`; `fk_sales_document_postings_movement` → `inventory_movements`; `fk_sales_document_postings_journal` → `journal_entries` |
| `sales_receipts` | `fk_sales_receipts_customer` → `customers`; `fk_sales_receipts_treasury` → `treasury_accounts`; `fk_sales_receipts_reversal` → `sales_receipts`; `fk_sales_receipts_created_by`, `fk_sales_receipts_posted_by` → `users` |
| `sales_receipt_allocations` | `fk_receipt_allocations_receipt` → `sales_receipts`; `fk_receipt_allocations_document` → `sales_documents` |
| `sales_receipt_postings` | `fk_sales_receipt_postings_receipt` → `sales_receipts`; `fk_sales_receipt_postings_treasury` → `treasury_entries`; `fk_sales_receipt_postings_journal` → `journal_entries` |
| `sales_receipt_allocation_reversals` | `fk_sales_receipt_allocation_reversals_allocation` → `sales_receipt_allocations`; `fk_sales_receipt_allocation_reversals_actor` → `users` |
| `sales_orders` | `fk_sales_orders_customer` → `customers`; `fk_sales_orders_created_by`, `fk_sales_orders_confirmed_by` → `users` |
| `sales_order_lines` | `fk_sales_order_lines_order` → `sales_orders`; `fk_sales_order_lines_product` → `products` |
| `sales_order_invoice_allocations` | `fk_sales_order_invoice_allocation_order_line_product` → `sales_order_lines`; `fk_sales_order_invoice_allocation_invoice_line_product` → `sales_document_lines` (both composite FKs include `product_id`) |
| `deliveries` | `fk_deliveries_order` → `sales_orders`; `fk_deliveries_sales_document` → `sales_documents`; `fk_deliveries_driver`, `fk_deliveries_created_by` → `users` |
| `delivery_lines` | `fk_delivery_lines_delivery` → `deliveries`; `fk_delivery_lines_order_line_product` → `sales_order_lines`; `fk_delivery_lines_document_line_product` → `sales_document_lines`; `fk_delivery_lines_product` → `products`; `fk_delivery_lines_inventory_movement_line` → `inventory_movement_lines` (source/product constraints are composite) |

### Inventory and container receiving

| Source table | Foreign-key relationships |
|---|---|
| `inventory_movements` | `fk_inventory_movements_reversal` → `inventory_movements`; `fk_inventory_movements_created_by`, `fk_inventory_movements_posted_by` → `users` |
| `inventory_movement_lines` | `fk_inventory_movement_lines_movement` → `inventory_movements`; `fk_inventory_movement_lines_product` → `products`; `fk_inventory_movement_lines_from_location`, `fk_inventory_movement_lines_to_location` → `locations`; `fk_inventory_movement_lines_sales_line` → `sales_document_lines`; `fk_inventory_movement_lines_reversal` → `inventory_movement_lines`; `fk_inventory_movement_lines_container_receipt_line` → `container_receipt_lines` (composite receipt-line/movement/product identity) |
| `inventory_balances` | `fk_inventory_balances_product` → `products`; `fk_inventory_balances_location` → `locations` |
| `containers` | `fk_containers_supplier` → `suppliers`; `fk_containers_received_location` → `locations`; `fk_containers_created_by`, `fk_containers_received_by` → `users` |
| `container_lines` | `fk_container_lines_container` → `containers`; `fk_container_lines_product` → `products` |
| `container_costs` | `fk_container_costs_container` → `containers`; `fk_container_costs_supplier` → `suppliers`; `fk_container_costs_created_by` → `users` |
| `container_receipts` | `fk_container_receipts_container` → `containers`; `fk_container_receipts_movement` → `inventory_movements`; `fk_container_receipts_received_by` → `users`; `fk_container_receipts_journal` → `journal_entries` |
| `container_receipt_lines` | `fk_container_receipt_lines_receipt` → `container_receipts` (composite receipt/movement/container identity); `fk_container_receipt_lines_container_line_product` → `container_lines` (composite container/line/product identity); `fk_container_receipt_lines_received_by` → `users` |
| `container_cost_allocations` | `fk_container_cost_allocations_cost_container` → `container_costs`; `fk_container_cost_allocations_receipt_line_container` → `container_receipt_lines` (both composite constraints include `container_id`) |
| `container_cost_payments` | `fk_container_cost_payments_cost` → `container_costs`; `fk_container_cost_payments_treasury` → `treasury_entries`; `fk_container_cost_payments_journal` → `journal_entries`; `fk_container_cost_payments_created_by` → `users` |

### Treasury and accounting

| Source table | Foreign-key relationships |
|---|---|
| `treasury_accounts` | None |
| `treasury_entries` | `fk_treasury_entries_account` → `treasury_accounts`; `fk_treasury_entries_reversal` → `treasury_entries`; `fk_treasury_entries_created_by` → `users` |
| `treasury_transfers` | `fk_treasury_transfers_from_account`, `fk_treasury_transfers_to_account` → `treasury_accounts`; `fk_treasury_transfers_journal` → `journal_entries`; `fk_treasury_transfers_created_by`, `fk_treasury_transfers_posted_by` → `users` |
| `treasury_transfer_entries` | `fk_treasury_transfer_entries_transfer` → `treasury_transfers`; `fk_treasury_transfer_entries_entry` → `treasury_entries` |
| `expenses` | `fk_expenses_treasury` → `treasury_accounts`; `fk_expenses_account` → `chart_of_accounts`; `fk_expenses_treasury_entry` → `treasury_entries`; `fk_expenses_journal_entry` → `journal_entries`; `fk_expenses_created_by`, `fk_expenses_posted_by` → `users` |
| `chart_of_accounts` | `fk_chart_of_accounts_parent` → `chart_of_accounts` |
| `journal_entries` | `fk_journal_entries_reversal` → `journal_entries`; `fk_journal_entries_created_by`, `fk_journal_entries_posted_by` → `users` |
| `journal_lines` | `fk_journal_lines_entry` → `journal_entries`; `fk_journal_lines_account` → `chart_of_accounts`; `fk_journal_lines_customer` → `customers`; `fk_journal_lines_supplier` → `suppliers`; `fk_journal_lines_treasury` → `treasury_accounts` |

## Table inventory

The DDL and this ERD contain the same **47 tables**:

| Domain | Tables |
|---|---|
| Identity/access | `users`, `roles`, `permissions`, `user_roles`, `role_permissions`, `auth_sessions`, `password_reset_tokens` |
| Settings and controls | `app_settings`, `document_sequences`, `idempotency_records`, `audit_logs`, `attachment_metadata` |
| Customers and catalog | `customers`, `suppliers`, `product_categories`, `products`, `locations` |
| Sales and fulfillment | `sales_documents`, `sales_document_lines`, `sales_document_postings`, `sales_receipts`, `sales_receipt_allocations`, `sales_receipt_postings`, `sales_receipt_allocation_reversals`, `sales_orders`, `sales_order_lines`, `sales_order_invoice_allocations`, `deliveries`, `delivery_lines` |
| Inventory and containers | `inventory_movements`, `inventory_movement_lines`, `inventory_balances`, `containers`, `container_lines`, `container_costs`, `container_cost_allocations`, `container_receipts`, `container_receipt_lines`, `container_cost_payments` |
| Treasury and accounting | `treasury_accounts`, `treasury_entries`, `treasury_transfers`, `treasury_transfer_entries`, `expenses`, `chart_of_accounts`, `journal_entries`, `journal_lines` |

`currencies` is intentionally absent: OD-1 selected EGP-only persistence.
Reports remain derived queries and are not stored tables. No FIFO layers,
serial-number table, migration staging table, or returns/refund policy table
is introduced by this revision.

## Notes on relation enforcement

- Container receipts are event-based: a container can have multiple receipt
  headers; each receipt line identifies its originating container line and
  product, and the associated inventory movement line identifies that receipt
  line. Partial receipts are supported across receipt events.
- Order-to-invoice partial quantity lineage is represented by
  `sales_order_invoice_allocations`. Delivery lines have an exclusive
  order-line or invoice-line source and one linked stock movement line.
- Landed-cost allocations target a receipt line in the same container.
  Weighted-average projection/cost snapshots are defined in the DDL; the
  posting service must reconcile them transactionally.
- Unapplied collections are derived from receipt amount less net active
  allocations. Allocation reversals are retained as history.
- `treasury_transfer_entries` pairs exactly the named transfer legs; a
  container cost can have multiple partial payment rows.
- Journal debit/credit totals, quantity aggregates, source status/type
  compatibility, and projection reconciliation are transaction/service
  invariants, not facts guaranteed by the ERD.
