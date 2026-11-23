# ASSUMPTIONS.md

## System Assumptions

This document lists assumptions made during development that can be changed via configuration.

---

## 1. Authentication & Security

### A1.1 JWT Configuration
- Access token expires in 15 minutes
- Refresh token expires in 7 days
- Tokens are signed with HS256 algorithm
- Refresh token hash stored in database (not token itself)

### A1.2 Password Hashing
- Using Argon2 for password hashing
- Default work factors applied

---

## 2. Inventory

### A2.1 Costing Method Default
- System default costing: WEIGHTED_AVERAGE
- Can be overridden per product

### A2.2 Stock Calculation
- On Hand = SUM(quantity_in - quantity_out) from stock_movements
- Available = On Hand - Reserved - Blocked

### A2.3 Cost Layer Behavior
- FIFO layers consumed oldest-first
- Layer remaining_quantity cannot go negative

---

## 3. Sales

### A3.1 Order Approval Threshold
- Orders exceeding 50,000 require approval
- Configurable via system settings

### A3.2 Credit Limit Check
- Checked at order confirmation
- Configurable to warn or block

### A3.3 Invoice Due Date
- Calculated from payment_terms
- Default: payment_terms days from invoice_date

---

## 4. Accounting

### A4.1 Default Accounts
Seeded during initialization:
- 1000: Cash
- 1100: Accounts Receivable
- 1200: Inventory
- 2000: Accounts Payable
- 3000: Sales Revenue
- 4000: Cost of Goods Sold
- 5000: Tax Payable

### A4.2 Journal Entry Numbering
Format: JE-{YEAR}-{SEQUENCE}

### A4.3 Posting Behavior
- Automatic posting enabled by default
- Can be disabled per transaction type

---

## 5. Currency

### A5.1 Default Currency
- USD as system default
- Configurable via environment/seeding

### A5.2 Rate Updates
- Manual update only (no automatic fetch)
- Historical rates preserved

---

## 6. Tax

### A6.1 Default Tax Rate
- 15% VAT assumed
- Configurable per jurisdiction

### A6.2 Tax Calculation
- Applied at invoice line level
- Aggregated to invoice total

---

## 7. Container Landed Cost

### A7.1 Default Allocation Method
- VALUE_BASED as default
- WEIGHT_BASED available if weight configured

---

## 8. Customer & Supplier Balance

### A8.1 Opening Balance
- Set during customer/supplier creation
- Can be adjusted via financial adjustment

### A8.2 Balance Recalculation
- On-demand via service method
- Used for reconciliation

---

## 9. Document Numbering

### A9.1 Sequence Reset
- Yearly reset (SEQUENCE per year)
- Format: {PREFIX}-{YEAR}-{NNNNNN}

### A9.2 Number Sequences
```
Invoice:     INV-{YEAR}-{SEQ}
Order:       ORD-{YEAR}-{SEQ}
Delivery:    DLV-{YEAR}-{SEQ}
Payment:     PAY-{YEAR}-{SEQ}
Return:      RET-{YEAR}-{SEQ}
PO:          PO-{YEAR}-{SEQ}
Receipt:     GR-{YEAR}-{SEQ}
PI:          PI-{YEAR}-{SEQ}
Container:   CNT-{YEAR}-{SEQ}
JE:          JE-{YEAR}-{SEQ}
```

---

## 10. Audit

### A10.1 Retention
- Audit logs retained indefinitely
- No automatic purge

### A10.2 Excluded Fields
- password, password_hash, refresh_token
- secrets, api_keys

---

## 11. Permissions

### A11.1 Default Roles
Seeded:
- Admin: all permissions
- Manager: operational permissions
- Sales: sales module permissions
- Warehouse: inventory permissions

### A11.2 Permission Format
{model}.{action} (create, read, update, delete, approve, cancel, export)

---

## 12. File Storage

### A12.1 Storage Driver
- Local in development
- S3-compatible in production

### A12.2 File Size Limits
- Max upload: 10MB
- Allowed types: images, PDFs, documents

---

## 13. Date & Time

### A13.1 Timezone
- All timestamps in UTC
- Display conversion frontend responsibility

---

**Last Updated:** 2026-09-22