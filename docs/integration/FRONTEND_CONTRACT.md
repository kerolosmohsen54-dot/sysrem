# Frontend API Contract

Generated from frontend API modules and cross-checked with routes and OpenAPI.

| Method | Frontend path | Response type | Permission | Status | Source |
|---|---|---|---|---|---|
| GET | /settings/general | ApiPage<T> | users.manage | EXISTS | frontend/src/features/admin/api.ts |
| PUT | /settings/general | { data: GeneralSettings } | users.manage | EXISTS | frontend/src/features/admin/api.ts |
| GET | /settings/sales-tax | ApiPage<T> | sales_tax.manage | EXISTS | frontend/src/features/admin/api.ts |
| GET | /users | ApiPage<T> | users.manage | EXISTS | frontend/src/features/admin/api.ts |
| POST | /users | ApiPage<T> | users.manage | EXISTS | frontend/src/features/admin/api.ts |
| PUT | /users/${userId} | ApiPage<T> | not declared in OpenAPI | EXISTS-IN-CODE / MISSING-IN-OPENAPI | frontend/src/features/admin/api.ts |
| PUT | /users/${userId}/roles | ApiPage<T> | not declared in OpenAPI | EXISTS-IN-CODE / MISSING-IN-OPENAPI | frontend/src/features/admin/api.ts |
| PUT | /settings/sales-tax | ApiPage<T> | sales_tax.manage | EXISTS | frontend/src/features/admin/api.ts |
| GET | /audit-logs | ApiPage<T> | audit_logs.view | EXISTS | frontend/src/features/admin/api.ts |
| GET | /containers | ApiPage<T> | containers.view | EXISTS | frontend/src/features/containers/api.ts |
| GET | /containers/${encodeURIComponent(containerId)} | ContainerDetail> | not declared in OpenAPI | EXISTS-IN-CODE / MISSING-IN-OPENAPI | frontend/src/features/containers/api.ts |
| GET | /containers/${encodeURIComponent(containerId)}/receipts | ApiPage<T> | not declared in OpenAPI | EXISTS-IN-CODE / MISSING-IN-OPENAPI | frontend/src/features/containers/api.ts |
| GET | /containers/${encodeURIComponent(containerId)}/receipts/${encodeURIComponent(receiptId)} | ContainerReceipt> | not declared in OpenAPI | EXISTS-IN-CODE / MISSING-IN-OPENAPI | frontend/src/features/containers/api.ts |
| POST | /containers | ContainerRecord> | containers.manage | EXISTS | frontend/src/features/containers/api.ts |
| POST | /containers/${encodeURIComponent(containerId)}/lines | ContainerLine> | not declared in OpenAPI | EXISTS-IN-CODE / MISSING-IN-OPENAPI | frontend/src/features/containers/api.ts |
| PUT | /containers/${encodeURIComponent(containerId)}/allocation-basis | void> | not declared in OpenAPI | EXISTS-IN-CODE / MISSING-IN-OPENAPI | frontend/src/features/containers/api.ts |
| PATCH | /containers/${encodeURIComponent(containerId)}/status | ContainerRecord> | not declared in OpenAPI | EXISTS-IN-CODE / MISSING-IN-OPENAPI | frontend/src/features/containers/api.ts |
| POST | /containers/${encodeURIComponent(containerId)}/costs | ContainerCost> | not declared in OpenAPI | EXISTS-IN-CODE / MISSING-IN-OPENAPI | frontend/src/features/containers/api.ts |
| POST | /containers/${encodeURIComponent(containerId)}/receipts | ContainerReceipt> | not declared in OpenAPI | EXISTS-IN-CODE / MISSING-IN-OPENAPI | frontend/src/features/containers/api.ts |
| POST | /containers/${encodeURIComponent(containerId)}/landed-cost/preview | { data: ContainerReceiptPreview } | not declared in OpenAPI | EXISTS-IN-CODE / MISSING-IN-OPENAPI | frontend/src/features/containers/api.ts |
| POST | /containers/${encodeURIComponent(containerId)}/receipts/${receiptId}/reverse | void> | not declared in OpenAPI | EXISTS-IN-CODE / MISSING-IN-OPENAPI | frontend/src/features/containers/api.ts |
| POST | /container-costs/${costId}/payments | ContainerCostPayment> | not declared in OpenAPI | EXISTS-IN-CODE / MISSING-IN-OPENAPI | frontend/src/features/containers/api.ts |
| GET | /customers | ApiPage<T> | customers.view (browser session) or mobile.use (mobile device token) | EXISTS | frontend/src/features/customers/api.ts |
| GET | /customers/${encodeURIComponent(customerId)} | Customer> | not declared in OpenAPI | EXISTS-IN-CODE / MISSING-IN-OPENAPI | frontend/src/features/customers/api.ts |
| GET | /reports/customers/${customerId}/statement?${params.toString()} | CustomerStatement> | not declared in OpenAPI | EXISTS-IN-CODE / MISSING-IN-OPENAPI | frontend/src/features/customers/api.ts |
| POST | /customers | Customer> | customers.create | EXISTS | frontend/src/features/customers/api.ts |
| PATCH | /customers/${customerId} | Customer> | not declared in OpenAPI | EXISTS-IN-CODE / MISSING-IN-OPENAPI | frontend/src/features/customers/api.ts |
| GET | /treasury/accounts | ApiPage<T> | treasury.view | EXISTS | frontend/src/features/finance/api.ts |
| GET | /treasury/accounts/${accountId}/balance | { balance_egp: string } | not declared in OpenAPI | EXISTS-IN-CODE / MISSING-IN-OPENAPI | frontend/src/features/finance/api.ts |
| POST | /treasury/accounts | TreasuryAccount> | treasury.manage | EXISTS | frontend/src/features/finance/api.ts |
| GET | /treasury/entries | ApiPage<T> | treasury.view | EXISTS | frontend/src/features/finance/api.ts |
| POST | /treasury/entries | TreasuryEntry> | treasury.post | EXISTS | frontend/src/features/finance/api.ts |
| GET | /treasury/transfers | ApiPage<T> | treasury.view | EXISTS | frontend/src/features/finance/api.ts |
| POST | /treasury/transfers | TreasuryTransfer> | treasury.post | EXISTS | frontend/src/features/finance/api.ts |
| GET | /expense-categories | ApiPage<T> | expenses.view | EXISTS | frontend/src/features/finance/api.ts |
| POST | /expense-categories | ExpenseCategory> | expense_categories.manage | EXISTS | frontend/src/features/finance/api.ts |
| GET | /expenses | ApiPage<T> | expenses.view | EXISTS | frontend/src/features/finance/api.ts |
| POST | /expenses | Expense> | expenses.post | EXISTS | frontend/src/features/finance/api.ts |
| POST | /categories | Category> | products.manage | EXISTS | frontend/src/features/inventory/api.ts |
| PATCH | /categories/${categoryId} | Category> | not declared in OpenAPI | EXISTS-IN-CODE / MISSING-IN-OPENAPI | frontend/src/features/inventory/api.ts |
| POST | /products | Product> | products.manage | EXISTS | frontend/src/features/inventory/api.ts |
| PATCH | /products/${productId} | Product> | not declared in OpenAPI | EXISTS-IN-CODE / MISSING-IN-OPENAPI | frontend/src/features/inventory/api.ts |
| POST | /warehouses | Warehouse> | warehouses.manage | EXISTS | frontend/src/features/inventory/api.ts |
| PATCH | /warehouses/${warehouseId} | Warehouse> | not declared in OpenAPI | EXISTS-IN-CODE / MISSING-IN-OPENAPI | frontend/src/features/inventory/api.ts |
| GET | /inventory/adjustments | ApiPage<T> | inventory.view | EXISTS | frontend/src/features/inventory/api.ts |
| GET | /products/${productId}/cost-history | ApiPage<T> | not declared in OpenAPI | EXISTS-IN-CODE / MISSING-IN-OPENAPI | frontend/src/features/inventory/api.ts |
| GET | /orders | ApiPage<T> | orders.view | EXISTS | frontend/src/features/orders/api.ts |
| GET | /orders/${encodeURIComponent(orderId)} | OrderDetail> | not declared in OpenAPI | EXISTS-IN-CODE / MISSING-IN-OPENAPI | frontend/src/features/orders/api.ts |
| POST | /orders | OrderDetail> | orders.manage | EXISTS | frontend/src/features/orders/api.ts |
| POST | /orders/preview | { data: OrderPreview } | orders.manage | EXISTS | frontend/src/features/orders/api.ts |
| POST | /orders/${encodeURIComponent(orderId)}/cancel | OrderDetail> | not declared in OpenAPI | EXISTS-IN-CODE / MISSING-IN-OPENAPI | frontend/src/features/orders/api.ts |
| POST | /orders/${encodeURIComponent(orderId)}/confirm | OrderDetail> | not declared in OpenAPI | EXISTS-IN-CODE / MISSING-IN-OPENAPI | frontend/src/features/orders/api.ts |
| POST | /orders/${encodeURIComponent(orderId)}/invoice | OrderInvoiceResult> | not declared in OpenAPI | EXISTS-IN-CODE / MISSING-IN-OPENAPI | frontend/src/features/orders/api.ts |
| GET | /deliveries | ApiPage<T> | deliveries.view | EXISTS | frontend/src/features/orders/api.ts |
| GET | /deliveries/${encodeURIComponent(deliveryId)} | DeliveryRecord> | not declared in OpenAPI | EXISTS-IN-CODE / MISSING-IN-OPENAPI | frontend/src/features/orders/api.ts |
| POST | /deliveries | DeliveryRecord> | deliveries.manage | EXISTS | frontend/src/features/orders/api.ts |
| PATCH | /deliveries/${encodeURIComponent(deliveryId)}/status | DeliveryRecord> | not declared in OpenAPI | EXISTS-IN-CODE / MISSING-IN-OPENAPI | frontend/src/features/orders/api.ts |
| GET | /reports/sales | ApiPage<T> | invoices.view | EXISTS | frontend/src/features/reports/api.ts |
| GET | /reports/invoice-profit | ApiPage<T> | ApiPage<ProfitReportRow> | EXISTS | frontend/src/features/reports/api.ts |
| GET | /reports/stock | ApiPage<T> | inventory.view | EXISTS | frontend/src/features/reports/api.ts |
| GET | /reports/stock-movements | ApiPage<T> | inventory.view | EXISTS | frontend/src/features/reports/api.ts |
| GET | /reports/container-costs | ApiPage<T> | reports.container_costs.view | EXISTS | frontend/src/features/reports/api.ts |
| GET | /reports/customer-balances | ApiPage<T> | reports.customer_balances.view | EXISTS | frontend/src/features/reports/api.ts |
| GET | /reports/dashboard | unknown | reports.dashboard.view | EXISTS | frontend/src/features/reports/api.ts |
| GET | /invoices | ApiPage<T> | invoices.view | EXISTS | frontend/src/features/sales/api.ts |
| GET | /invoices/${encodeURIComponent(invoiceId)} | InvoiceDetail> | not declared in OpenAPI | EXISTS-IN-CODE / MISSING-IN-OPENAPI | frontend/src/features/sales/api.ts |
| GET | /invoices/${encodeURIComponent(invoiceId)}/history | ApiPage<T> | not declared in OpenAPI | EXISTS-IN-CODE / MISSING-IN-OPENAPI | frontend/src/features/sales/api.ts |
| GET | /collections | ApiPage<T> | collections.view | EXISTS | frontend/src/features/sales/api.ts |
| GET | /treasury/accounts | ApiPage<T> | treasury.view | EXISTS | frontend/src/features/sales/api.ts |
| POST | /collections | CollectionReceipt> | collections.create | EXISTS | frontend/src/features/sales/api.ts |
| POST | /invoices | InvoiceDraft \| { data: InvoiceDraft } | invoices.create | EXISTS | frontend/src/features/sales/api.ts |
| POST | /invoices/preview | { data: InvoicePreview } | invoices.create | EXISTS | frontend/src/features/sales/api.ts |
| POST | /returns/preview | { data: ReturnPreview } | returns.create | EXISTS | frontend/src/features/sales/api.ts |
| POST | /returns | {
    data: {
      document: { id: number; document_number: string };
      lines: InvoicePrintLine[];
    };
  } | returns.create | EXISTS | frontend/src/features/sales/api.ts |
| POST | /invoices/${invoiceId}/issue | InvoiceDraft \| { data: InvoiceDraft } | not declared in OpenAPI | EXISTS-IN-CODE / MISSING-IN-OPENAPI | frontend/src/features/sales/api.ts |
| POST | /invoices/${encodeURIComponent(invoiceId)}/cancel | InvoiceMutationResult> | not declared in OpenAPI | EXISTS-IN-CODE / MISSING-IN-OPENAPI | frontend/src/features/sales/api.ts |

Request fields and detailed response fields are defined by the TypeScript input/type aliases in the source file shown. Write calls use the request body and idempotency key arguments in that source function.
