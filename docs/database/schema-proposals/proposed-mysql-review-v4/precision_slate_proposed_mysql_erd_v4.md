# Precision Slate ERP - Proposed ERD v4

**UNAPPROVED - review only; DDL NOT executed.**
Companion: [precision_slate_proposed_mysql_v4.sql](./precision_slate_proposed_mysql_v4.sql).
Relationship cardinality follows column nullability, unique keys and service rules; this is a complete static FK catalog, including deferred ALTER FKs.

## All tables and primary keys
| Table | Primary key | Purpose |
|---|---|---|
| `users` | `id` | Application identities; issuer login decision OPEN. |
| `roles` | `id` | Proposed role master, no seeds. |
| `permissions` | `id` | Permission codes, no grants seeded. |
| `user_roles` | `user_id, role_id` | User role association. |
| `role_permissions` | `role_id, permission_id` | Proposed action grants. |
| `auth_sessions` | `id` | Session storage candidate; topology OPEN. |
| `password_reset_tokens` | `id` | Reset token hashes; lifecycle OPEN. |
| `customers` | `id` | Customer identity and warning-only credit limit; unique non-null phone. |
| `suppliers` | `id` | Container-cost counterparty only; no AP ledger. |
| `product_categories` | `id` | Catalog hierarchy. |
| `products` | `id` | Whole-unit catalog, minimum stock and optional default location. |
| `locations` | `id` | Location hierarchy; manager/capacity OPEN. |
| `document_sequences` | `id` | Numbering candidate; formats OPEN. |
| `sales_documents` | `id` | Versioned invoices/free-or-linked credit notes/dated opening receivables. |
| `sales_document_lines` | `id` | Whole-unit commercial snapshots, nullable return origin, issue-time tax snapshots. |
| `treasury_accounts` | `id` | EGP cash/bank masters. |
| `sales_receipts` | `id` | EGP collection/refund sources; policies OPEN. |
| `sales_receipt_allocations` | `id` | Receipt amounts applied to documents. |
| `chart_of_accounts` | `id` | Accounting account candidate, templates OPEN. |
| `journal_entries` | `id` | Dated double-entry headers and reversal sources. |
| `journal_lines` | `id` | One-sided debit/credit lines; aggregate balancing is service rule. |
| `treasury_entries` | `id` | EGP treasury effects including dated opening entries. |
| `expenses` | `id` | Expense sources and optional accounting links. |
| `treasury_transfers` | `id` | EGP transfer headers. |
| `inventory_movements` | `id` | Dated stock events, including opening/reversal. |
| `inventory_movement_lines` | `id` | Stock legs and cost snapshots; sales/receipt lineage. |
| `inventory_balances` | `product_id, location_id` | Rebuildable product/location quantity/value/average-cost; no negative on-hand. |
| `containers` | `id` | Container metadata/stage/allocation basis. |
| `container_lines` | `id` | Expected product quantities and EGP purchase snapshots. |
| `container_costs` | `id` | EGP operational costs plus optional foreign reference evidence. |
| `container_cost_allocations` | `id` | Cost-to-receipt-line allocations in same container. |
| `container_receipts` | `id` | Single/multiple/partial receipt events and valuation snapshots. |
| `container_receipt_lines` | `id` | Event/container-line/product/movement identity and discrepancies. |
| `sales_orders` | `id` | Full-fulfillment order header. |
| `sales_order_lines` | `id` | Whole ordered quantities. |
| `sales_order_invoice_allocations` | `id` | Order/product/invoice version lineage; full quantities service rule. |
| `deliveries` | `id` | Full-only delivery header; state detail OPEN. |
| `delivery_lines` | `id` | Exactly one source plus linked product/stock movement. |
| `app_settings` | `setting_key` | Global sales_tax JSON contract; no seed/default. |
| `idempotency_records` | `id` | Request hash/replay state; services enforce atomically. |
| `audit_logs` | `id` | General audit plus every edited field, actor snapshot and version FK. |
| `sales_document_postings` | `id` | One effect bridge per retained document version. |
| `sales_receipt_postings` | `id` | One receipt effect bridge. |
| `sales_receipt_allocation_reversals` | `id` | Retained allocation reversal history. |
| `treasury_transfer_entries` | `id` | Named transfer legs with exactly-once links. |
| `container_cost_payments` | `id` | Unchanged EGP payment bridge; not supplier AP. |
| `attachment_metadata` | `id` | Optional metadata only; upload ownership/lifecycle OPEN. |

## Every declared foreign key
| Constraint | Source table | Source columns | Target table | Target columns | Delete |
|---|---|---|---|---|---|
| `fk_user_roles_user` | `user_roles` | `user_id` | `users` | `id` | RESTRICT |
| `fk_user_roles_role` | `user_roles` | `role_id` | `roles` | `id` | RESTRICT |
| `fk_user_roles_granted_by` | `user_roles` | `granted_by_user_id` | `users` | `id` | SET NULL |
| `fk_role_permissions_role` | `role_permissions` | `role_id` | `roles` | `id` | RESTRICT |
| `fk_role_permissions_permission` | `role_permissions` | `permission_id` | `permissions` | `id` | RESTRICT |
| `fk_auth_sessions_user` | `auth_sessions` | `user_id` | `users` | `id` | RESTRICT |
| `fk_password_reset_user` | `password_reset_tokens` | `user_id` | `users` | `id` | RESTRICT |
| `fk_customers_created_by` | `customers` | `created_by_user_id` | `users` | `id` | SET NULL |
| `fk_customers_updated_by` | `customers` | `updated_by_user_id` | `users` | `id` | SET NULL |
| `fk_product_categories_parent` | `product_categories` | `parent_category_id` | `product_categories` | `id` | RESTRICT |
| `fk_products_category` | `products` | `category_id` | `product_categories` | `id` | RESTRICT |
| `fk_products_created_by` | `products` | `created_by_user_id` | `users` | `id` | SET NULL |
| `fk_products_updated_by` | `products` | `updated_by_user_id` | `users` | `id` | SET NULL |
| `fk_locations_parent` | `locations` | `parent_location_id` | `locations` | `id` | RESTRICT |
| `fk_sales_documents_customer` | `sales_documents` | `customer_id` | `customers` | `id` | RESTRICT |
| `fk_sales_documents_original` | `sales_documents` | `original_document_id` | `sales_documents` | `id` | RESTRICT |
| `fk_sales_documents_previous_revision` | `sales_documents` | `previous_revision_id` | `sales_documents` | `id` | RESTRICT |
| `fk_sales_documents_issuer` | `sales_documents` | `issuer_user_id` | `users` | `id` | SET NULL |
| `fk_sales_documents_driver` | `sales_documents` | `driver_user_id` | `users` | `id` | SET NULL |
| `fk_sales_documents_reversal` | `sales_documents` | `reversal_of_document_id` | `sales_documents` | `id` | RESTRICT |
| `fk_sales_documents_created_by` | `sales_documents` | `created_by_user_id` | `users` | `id` | SET NULL |
| `fk_sales_documents_posted_by` | `sales_documents` | `posted_by_user_id` | `users` | `id` | SET NULL |
| `fk_sales_documents_reversed_by` | `sales_documents` | `reversed_by_user_id` | `users` | `id` | SET NULL |
| `fk_sales_document_lines_document` | `sales_document_lines` | `sales_document_id` | `sales_documents` | `id` | RESTRICT |
| `fk_sales_document_lines_product` | `sales_document_lines` | `product_id` | `products` | `id` | RESTRICT |
| `fk_sales_document_lines_location` | `sales_document_lines` | `location_id` | `locations` | `id` | RESTRICT |
| `fk_sales_document_lines_original` | `sales_document_lines` | `original_document_line_id` | `sales_document_lines` | `id` | RESTRICT |
| `fk_sales_receipts_customer` | `sales_receipts` | `customer_id` | `customers` | `id` | RESTRICT |
| `fk_sales_receipts_treasury` | `sales_receipts` | `treasury_account_id` | `treasury_accounts` | `id` | RESTRICT |
| `fk_sales_receipts_reversal` | `sales_receipts` | `reversal_of_receipt_id` | `sales_receipts` | `id` | RESTRICT |
| `fk_sales_receipts_created_by` | `sales_receipts` | `created_by_user_id` | `users` | `id` | SET NULL |
| `fk_sales_receipts_posted_by` | `sales_receipts` | `posted_by_user_id` | `users` | `id` | SET NULL |
| `fk_receipt_allocations_receipt` | `sales_receipt_allocations` | `sales_receipt_id` | `sales_receipts` | `id` | RESTRICT |
| `fk_receipt_allocations_document` | `sales_receipt_allocations` | `sales_document_id` | `sales_documents` | `id` | RESTRICT |
| `fk_chart_of_accounts_parent` | `chart_of_accounts` | `parent_account_id` | `chart_of_accounts` | `id` | RESTRICT |
| `fk_journal_entries_reversal` | `journal_entries` | `reversal_of_entry_id` | `journal_entries` | `id` | RESTRICT |
| `fk_journal_entries_created_by` | `journal_entries` | `created_by_user_id` | `users` | `id` | SET NULL |
| `fk_journal_entries_posted_by` | `journal_entries` | `posted_by_user_id` | `users` | `id` | SET NULL |
| `fk_journal_lines_entry` | `journal_lines` | `journal_entry_id` | `journal_entries` | `id` | RESTRICT |
| `fk_journal_lines_account` | `journal_lines` | `account_id` | `chart_of_accounts` | `id` | RESTRICT |
| `fk_journal_lines_customer` | `journal_lines` | `customer_id` | `customers` | `id` | RESTRICT |
| `fk_journal_lines_supplier` | `journal_lines` | `supplier_id` | `suppliers` | `id` | RESTRICT |
| `fk_journal_lines_treasury` | `journal_lines` | `treasury_account_id` | `treasury_accounts` | `id` | RESTRICT |
| `fk_treasury_entries_account` | `treasury_entries` | `treasury_account_id` | `treasury_accounts` | `id` | RESTRICT |
| `fk_treasury_entries_reversal` | `treasury_entries` | `reversal_of_entry_id` | `treasury_entries` | `id` | RESTRICT |
| `fk_treasury_entries_created_by` | `treasury_entries` | `created_by_user_id` | `users` | `id` | SET NULL |
| `fk_expenses_treasury` | `expenses` | `treasury_account_id` | `treasury_accounts` | `id` | RESTRICT |
| `fk_expenses_account` | `expenses` | `expense_account_id` | `chart_of_accounts` | `id` | RESTRICT |
| `fk_expenses_treasury_entry` | `expenses` | `treasury_entry_id` | `treasury_entries` | `id` | RESTRICT |
| `fk_expenses_journal_entry` | `expenses` | `journal_entry_id` | `journal_entries` | `id` | RESTRICT |
| `fk_expenses_created_by` | `expenses` | `created_by_user_id` | `users` | `id` | SET NULL |
| `fk_expenses_posted_by` | `expenses` | `posted_by_user_id` | `users` | `id` | SET NULL |
| `fk_treasury_transfers_from_account` | `treasury_transfers` | `from_treasury_account_id` | `treasury_accounts` | `id` | RESTRICT |
| `fk_treasury_transfers_to_account` | `treasury_transfers` | `to_treasury_account_id` | `treasury_accounts` | `id` | RESTRICT |
| `fk_treasury_transfers_journal` | `treasury_transfers` | `journal_entry_id` | `journal_entries` | `id` | RESTRICT |
| `fk_treasury_transfers_created_by` | `treasury_transfers` | `created_by_user_id` | `users` | `id` | SET NULL |
| `fk_treasury_transfers_posted_by` | `treasury_transfers` | `posted_by_user_id` | `users` | `id` | SET NULL |
| `fk_inventory_movements_reversal` | `inventory_movements` | `reversal_of_movement_id` | `inventory_movements` | `id` | RESTRICT |
| `fk_inventory_movements_created_by` | `inventory_movements` | `created_by_user_id` | `users` | `id` | SET NULL |
| `fk_inventory_movements_posted_by` | `inventory_movements` | `posted_by_user_id` | `users` | `id` | SET NULL |
| `fk_inventory_movement_lines_movement` | `inventory_movement_lines` | `inventory_movement_id` | `inventory_movements` | `id` | RESTRICT |
| `fk_inventory_movement_lines_product` | `inventory_movement_lines` | `product_id` | `products` | `id` | RESTRICT |
| `fk_inventory_movement_lines_from_location` | `inventory_movement_lines` | `from_location_id` | `locations` | `id` | RESTRICT |
| `fk_inventory_movement_lines_to_location` | `inventory_movement_lines` | `to_location_id` | `locations` | `id` | RESTRICT |
| `fk_inventory_movement_lines_sales_line` | `inventory_movement_lines` | `sales_document_line_id` | `sales_document_lines` | `id` | RESTRICT |
| `fk_inventory_movement_lines_reversal` | `inventory_movement_lines` | `reversal_of_movement_line_id` | `inventory_movement_lines` | `id` | RESTRICT |
| `fk_inventory_balances_product` | `inventory_balances` | `product_id` | `products` | `id` | RESTRICT |
| `fk_inventory_balances_location` | `inventory_balances` | `location_id` | `locations` | `id` | RESTRICT |
| `fk_containers_supplier` | `containers` | `supplier_id` | `suppliers` | `id` | RESTRICT |
| `fk_containers_received_location` | `containers` | `received_location_id` | `locations` | `id` | RESTRICT |
| `fk_containers_created_by` | `containers` | `created_by_user_id` | `users` | `id` | SET NULL |
| `fk_containers_received_by` | `containers` | `received_by_user_id` | `users` | `id` | SET NULL |
| `fk_container_lines_container` | `container_lines` | `container_id` | `containers` | `id` | RESTRICT |
| `fk_container_lines_product` | `container_lines` | `product_id` | `products` | `id` | RESTRICT |
| `fk_container_costs_container` | `container_costs` | `container_id` | `containers` | `id` | RESTRICT |
| `fk_container_costs_supplier` | `container_costs` | `supplier_id` | `suppliers` | `id` | RESTRICT |
| `fk_container_costs_created_by` | `container_costs` | `created_by_user_id` | `users` | `id` | SET NULL |
| `fk_container_receipts_container` | `container_receipts` | `container_id` | `containers` | `id` | RESTRICT |
| `fk_container_receipts_movement` | `container_receipts` | `inventory_movement_id` | `inventory_movements` | `id` | RESTRICT |
| `fk_container_receipts_received_by` | `container_receipts` | `received_by_user_id` | `users` | `id` | SET NULL |
| `fk_container_receipts_journal` | `container_receipts` | `journal_entry_id` | `journal_entries` | `id` | RESTRICT |
| `fk_container_receipt_lines_receipt` | `container_receipt_lines` | `container_receipt_id, inventory_movement_id, container_id` | `container_receipts` | `id, inventory_movement_id, container_id` | RESTRICT |
| `fk_container_receipt_lines_container_line_product` | `container_receipt_lines` | `container_id, container_line_id, product_id` | `container_lines` | `container_id, id, product_id` | RESTRICT |
| `fk_container_receipt_lines_received_by` | `container_receipt_lines` | `received_by_user_id` | `users` | `id` | SET NULL |
| `fk_sales_orders_customer` | `sales_orders` | `customer_id` | `customers` | `id` | RESTRICT |
| `fk_sales_orders_created_by` | `sales_orders` | `created_by_user_id` | `users` | `id` | SET NULL |
| `fk_sales_orders_confirmed_by` | `sales_orders` | `confirmed_by_user_id` | `users` | `id` | SET NULL |
| `fk_sales_order_lines_order` | `sales_order_lines` | `sales_order_id` | `sales_orders` | `id` | RESTRICT |
| `fk_sales_order_lines_product` | `sales_order_lines` | `product_id` | `products` | `id` | RESTRICT |
| `fk_sales_order_invoice_allocation_order_line_product` | `sales_order_invoice_allocations` | `sales_order_line_id, product_id` | `sales_order_lines` | `id, product_id` | RESTRICT |
| `fk_sales_order_invoice_allocation_invoice_line_product` | `sales_order_invoice_allocations` | `sales_document_line_id, product_id` | `sales_document_lines` | `id, product_id` | RESTRICT |
| `fk_deliveries_order` | `deliveries` | `sales_order_id` | `sales_orders` | `id` | RESTRICT |
| `fk_deliveries_sales_document` | `deliveries` | `sales_document_id` | `sales_documents` | `id` | RESTRICT |
| `fk_deliveries_driver` | `deliveries` | `driver_user_id` | `users` | `id` | SET NULL |
| `fk_deliveries_created_by` | `deliveries` | `created_by_user_id` | `users` | `id` | SET NULL |
| `fk_delivery_lines_delivery` | `delivery_lines` | `delivery_id` | `deliveries` | `id` | RESTRICT |
| `fk_delivery_lines_order_line_product` | `delivery_lines` | `sales_order_line_id, product_id` | `sales_order_lines` | `id, product_id` | RESTRICT |
| `fk_delivery_lines_document_line_product` | `delivery_lines` | `sales_document_line_id, product_id` | `sales_document_lines` | `id, product_id` | RESTRICT |
| `fk_delivery_lines_product` | `delivery_lines` | `product_id` | `products` | `id` | RESTRICT |
| `fk_delivery_lines_inventory_movement_line` | `delivery_lines` | `inventory_movement_line_id, product_id` | `inventory_movement_lines` | `id, product_id` | RESTRICT |
| `fk_app_settings_updated_by` | `app_settings` | `updated_by_user_id` | `users` | `id` | SET NULL |
| `fk_idempotency_user` | `idempotency_records` | `user_id` | `users` | `id` | RESTRICT |
| `fk_audit_logs_actor` | `audit_logs` | `actor_user_id` | `users` | `id` | SET NULL |
| `fk_audit_logs_sales_document` | `audit_logs` | `sales_document_id` | `sales_documents` | `id` | RESTRICT |
| `fk_sales_document_postings_document` | `sales_document_postings` | `sales_document_id` | `sales_documents` | `id` | RESTRICT |
| `fk_sales_document_postings_movement` | `sales_document_postings` | `inventory_movement_id` | `inventory_movements` | `id` | RESTRICT |
| `fk_sales_document_postings_journal` | `sales_document_postings` | `journal_entry_id` | `journal_entries` | `id` | RESTRICT |
| `fk_sales_receipt_postings_receipt` | `sales_receipt_postings` | `sales_receipt_id` | `sales_receipts` | `id` | RESTRICT |
| `fk_sales_receipt_postings_treasury` | `sales_receipt_postings` | `treasury_entry_id` | `treasury_entries` | `id` | RESTRICT |
| `fk_sales_receipt_postings_journal` | `sales_receipt_postings` | `journal_entry_id` | `journal_entries` | `id` | RESTRICT |
| `fk_sales_receipt_allocation_reversals_allocation` | `sales_receipt_allocation_reversals` | `sales_receipt_allocation_id` | `sales_receipt_allocations` | `id` | RESTRICT |
| `fk_sales_receipt_allocation_reversals_actor` | `sales_receipt_allocation_reversals` | `actor_user_id` | `users` | `id` | SET NULL |
| `fk_treasury_transfer_entries_transfer` | `treasury_transfer_entries` | `treasury_transfer_id` | `treasury_transfers` | `id` | RESTRICT |
| `fk_treasury_transfer_entries_entry` | `treasury_transfer_entries` | `treasury_entry_id` | `treasury_entries` | `id` | RESTRICT |
| `fk_container_cost_payments_cost` | `container_cost_payments` | `container_cost_id` | `container_costs` | `id` | RESTRICT |
| `fk_container_cost_payments_treasury` | `container_cost_payments` | `treasury_entry_id` | `treasury_entries` | `id` | RESTRICT |
| `fk_container_cost_payments_journal` | `container_cost_payments` | `journal_entry_id` | `journal_entries` | `id` | RESTRICT |
| `fk_container_cost_payments_created_by` | `container_cost_payments` | `created_by_user_id` | `users` | `id` | SET NULL |
| `fk_attachment_metadata_uploaded_by` | `attachment_metadata` | `uploaded_by_user_id` | `users` | `id` | SET NULL |
| `fk_inventory_movement_lines_container_receipt_line` | `inventory_movement_lines` | `container_receipt_line_id, inventory_movement_id, product_id` | `container_receipt_lines` | `id, inventory_movement_id, product_id` | RESTRICT |
| `fk_container_cost_allocations_cost_container` | `container_cost_allocations` | `container_cost_id, container_id` | `container_costs` | `id, container_id` | RESTRICT |
| `fk_container_cost_allocations_receipt_line_container` | `container_cost_allocations` | `container_receipt_line_id, container_id` | `container_receipt_lines` | `id, container_id` | RESTRICT |
| `fk_products_default_location` | `products` | `default_location_id` | `locations` | `id` | RESTRICT |

## Revision / opening / lineage notes
sales_documents.previous_revision_id self-reference retains old/new invoice versions; unique non-null predecessor prevents direct branching, continuity/cycles remain service rules. audit_logs.sales_document_id ties each changed field to the edited version; predecessor gives the old document.

Opening receivables are a typed dated sales document, stock/treasury openings reuse existing dated movement/entry types. No fixed master opening columns.
Full-only order invoice/delivery quantities are service rules; bridges remain for exact/historical version lineage, not partial fulfillment. delivery_lines preserves exclusive source and stock movement link. Container partial receipts remain supported through composite container/product/movement FKs.
No currencies/AP/report/FIFO/history-copy tables added. Nonnegative stock CHECK and unique phone accompany the FK catalog; engine enforcement NOT VERIFIED.
