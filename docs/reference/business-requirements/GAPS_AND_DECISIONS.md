# Precision Slate ERP - Gaps and Decisions

## Purpose
This document records domain gaps and architectural decisions.

---

## 1. Payment Allocation
- Payment can cover multiple invoices
- Create `payment_allocations` table
- Rule: `SUM(allocated_amount) <= payment.amount`

## 2. Damaged Returns
- Add `damaged` boolean in return items
- Add `return_to_stock` boolean
- Make policy configurable

## 3. Landed Cost Allocation
- Create `LandedCostAllocationStrategy` interface
- Support VALUE_BASED and WEIGHT_BASED strategies
- Make strategy configurable per container

## 4. FIFO vs Weighted Average
- Both supported via `costing_method` on products
- ProductCostLayers table for FIFO
- Weighted average calculated dynamically

## 5. Goods Receiving (3-Way Matching)
- Create `goods_receipts` and `goods_receipt_items`
- Support partial receiving
- Compare PO qty vs received vs invoiced

## 6. Purchase Invoice Items
- Create `purchase_invoice_items` for line item tracking

## 7. Purchase Return Items
- Create `purchase_return_items` for line item tracking

## 8. Accounting Mappings
- Create `accounting_mappings` configuration table
- Define AR, Revenue, Tax, Cash accounts per scenario

## 9. Currency Historical Rates
- Create `currency_exchange_rates` with effective date
- Each transaction stores currency and exchange_rate_used

## 10. Status Transitions
Define explicit rules per document type (see BUSINESS_RULES.md)

## 11. Tax Configuration
- Create `tax_rates` table with effective dates
- Store applied tax snapshot in invoices

## 12. Cashier Balance
- Derived from transactions (primary)
- Controlled cache for performance (secondary)
- Provide recalculate operation

## 13. Stock Reservation
- Reservations table (not movement)
- Movements only on actual delivery/return
- Available = On Hand - Reserved - Blocked

## 14. Container Expenses Types
- sea_freight, customs, clearance, insurance, handling, transport, other

## 15. Customer Balance Formula
```
opening_balance + SUM(invoices) - SUM(payments) + SUM(returns) ± adjustments
```

## 16. Supplier Balance Formula
```
opening_balance + SUM(purchase_invoices) - SUM(payments) + SUM(returns) ± adjustments
```

## 17. Invoice Number Format
Format: `{PREFIX}-{YEAR}-{SEQUENCE}` (e.g., INV-2026-000001)

## 18. Product Weight
- Add `weight` field to products
- Required for weight-based landed cost

## 19. Approval Workflow
- Configurable per document type
- Rule: created_by != approved_by

## 20. Idempotency
- Use Idempotency-Key header
- Store records with 24h TTL
- Required for: payments, invoices, transfers