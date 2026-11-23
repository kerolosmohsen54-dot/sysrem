# Precision Slate ERP - Database Design

## 1. Design Principles

- Primary Keys: BIGINT auto-increment
- Money: DECIMAL(18,2)
- Quantities: DECIMAL(18,4)
- Exchange Rates: DECIMAL(18,8)
- Timestamps: TIMESTAMP WITH TIME ZONE
- Soft Deletes: Master data (customers, products, warehouses)
- No Soft Deletes: Financial documents

## 2. Core Tables

### 2.1 Users & Auth
- `users` - User accounts
- `roles` - Role definitions
- `permissions` - Permission definitions
- `role_permissions` - Role-permission mapping
- `refresh_tokens` - JWT refresh tokens

### 2.2 Master Data
- `customers` - Customer accounts
- `customer_contacts` - Customer contacts
- `customer_attachments` - Customer files
- `suppliers` - Supplier accounts
- `products` - Product catalog
- `categories` - Product categories
- `warehouses` - Warehouse locations
- `currencies` - Currency definitions
- `currency_exchange_rates` - Historical rates

### 2.3 Sales
- `orders` - Sales orders header
- `order_items` - Order line items
- `invoices` - Sales invoices
- `invoice_items` - Invoice line items
- `payments` - Customer payments
- `payment_allocations` - Payment-invoice mapping
- `sales_returns` - Sales returns
- `return_items` - Return line items
- `reservations` - Stock reservations
- `deliveries` - Delivery orders
- `delivery_items` - Delivery line items

### 2.4 Inventory
- `stock_movements` - Stock transaction log
- `product_cost_layers` - FIFO cost tracking

### 2.5 Purchases
- `purchase_orders` - Purchase order header
- `purchase_order_items` - PO line items
- `goods_receipts` - Goods receiving
- `goods_receipt_items` - Receipt line items
- `purchase_invoices` - Purchase invoices
- `purchase_invoice_items` - PI line items
- `purchase_returns` - Purchase returns
- `purchase_return_items` - PR line items
- `containers` - Import containers
- `container_items` - Container contents
- `container_expenses` - Container expenses

### 2.6 Finance
- `chart_of_accounts` - Account definitions
- `journal_entries` - Journal entry header
- `journal_entry_lines` - Entry lines
- `cashiers` - Cash/bank accounts
- `cashier_transfers` - Cash transfers
- `expenses` - Expense records
- `financial_adjustments` - Balance adjustments
- `accounting_mappings` - Auto-posting config

### 2.7 System
- `audit_logs` - Operation audit
- `system_settings` - Configuration
- `idempotency_keys` - Duplicate prevention
- `tax_rates` - Tax configuration

## 3. Key Relationships

```
customers 1──N orders
customers 1──N invoices
customers 1──N payments
orders 1──N order_items
orders 1──N deliveries
orders 1──N reservations
invoices 1──N invoice_items
invoices 1──N payments (via allocations)
deliveries 1──N delivery_items
sales_returns 1──N return_items
suppliers 1──N purchase_orders
suppliers 1──N containers
purchase_orders 1──N goods_receipts
goods_receipts 1──N goods_receipt_items
products 1──N stock_movements
products 1──N product_cost_layers
warehouses 1──N stock_movements
users N──N roles
roles N──N permissions
```

## 4. Indexes

- All FK columns indexed
- Unique on: code, sku, invoice_number, account_number
- Composite: (product_id, warehouse_id), (reference_type, reference_id)
- Status indexes for filtered queries

## 5. Constraints

- CHECK: quantity >= 0
- CHECK: amount >= 0
- CHECK: debit >= 0, credit >= 0
- UNIQUE: invoice_number, order_number, sku

## 6. Migrations

All schema changes via versioned migrations in `prisma/migrations/`

**Last Updated:** 2026-09-22