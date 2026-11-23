# BUSINESS RULES

## Stock Management

### S1. Stock Availability
Available Stock = On Hand - Reserved - Blocked/Damaged

### S2. Reservation Limit
Cannot reserve more than available stock

### S3. Stock Movement Immutability
Stock movements cannot be UPDATE or DELETE

### S4. Correction Method
Corrections via reverse movement, not modification

### S5. Transaction Lock
Stock operations use row-level locks during transactions

---

## Order Management

### O1. Order Creation
Orders start in `draft` status

### O2. Order Confirmation
Must validate: customer, items, stock availability

### O3. Approval Rule
If amount > threshold or credit_limit exceeded → require approval

### O4. Self-Approval Prohibited
created_by != approved_by

### O5. Status Transitions
draft → confirmed → preparing → completed
     ↘ cancelled

### O6. Product Snapshots
Store product code/name in order items

---

## Delivery Management

### D1. Delivery Limit
Cannot deliver more than reserved quantity

### D2. Partial Delivery
Supported - track remaining quantity

### D3. Delivery Transaction
All stock movements atomic with delivery update

### D4. Signature/Proof
Store recipient signature and proof images

---

## Invoice Management

### I1. Invoice Number
Unique, formatted: INV-{YEAR}-{SEQUENCE}

### I2. No Hard Delete
Issued/invoiced documents cannot be deleted

### I3. Cancellation Only
Use status change to cancelled

### I4. Customer Snapshots
Store customer name, tax number, address in invoice

### I5. Product Snapshots
Store product details in invoice items

### I6. Amount Validation
Server-side recalculation, no client trust

### I7. Tax Calculation
Based on product category and customer status

---

## Payment Management

### P1. Payment Allocation
One payment can cover multiple invoices

### P2. Allocation Rules
SUM(allocated_amount) <= payment.amount

### P3. Unallocated Amount
Becomes customer credit, not ignored

### P4. Payment Recording
Atomic with: allocation, invoice update, cashier update, accounting

### P5. Idempotency
Prevent duplicate payment recording

---

## Sales Returns

### R1. Quantity Limit
Cannot return more than invoiced quantity

### R2. Approval Required
Returns require approval before processing

### R3. Damaged Items
Tracked separately, may not return to stock

### R4. Return Transaction
Atomic with: inventory, customer balance, accounting

---

## Purchase Orders

### PO1. Approval Rule
If amount > threshold → require approval

### PO2. Partial Receiving
Supported - track received vs ordered

### PO3. Status Tracking
draft → sent → partially_received → fully_received

---

## Goods Receiving

### GR1. 3-Way Matching
PO qty vs Received qty vs Invoiced qty

### GR2. Variance Tracking
Flag differences for review

### GR3. Partial Receipt
Supported per PO item

---

## Accounting

### A1. Balance Requirement
SUM(debit) = SUM(credit) before posting

### A2. No Negative Amounts
debit >= 0, credit >= 0

### A3. One-Sided Entry
No line should have both debit and credit

### A4. No Posting Without Balance
Prevent unbalanced entries

### A5. Duplicate Prevention
Prevent duplicate accounting posting

### A6. Source Tracking
Every entry tagged with source_module, source_id

---

## Journal Entries

### J1. Header + Lines
Always header with multiple lines

### J2. Posting Validation
Only balanced entries can be posted

### J3. Audit Trail
Created by, created at, status

---

## Cashiers

### C1. Transfer Rules
from_cashier != to_cashier

### C2. Balance Check
Cannot transfer more than available

### C3. Dual Lock
Lock both cashiers during transfer

---

## User Management

### U1. Password Security
Never store plain text, use Argon2/bcrypt

### U2. Refresh Token
Rotate on use, revoke capability

### U3. RBAC
Role-based with granular permissions

### U4. Permission Format
{module}.{action} (e.g., customers.create)

---

## Audit

### AU1. Sensitive Operations
Log: create, update, approve, cancel, issue, payment, adjust

### AU2. Before/After State
Store JSON snapshots, exclude sensitive fields

### AU3. IP/User Agent
Track for accountability

---

## Status Transitions

### Order Status Flow
draft → confirmed → preparing → completed
     ↘ cancelled

### Invoice Status Flow
draft → issued → unpaid → partially_paid → paid
                     ↓
                  overdue
                      ↓
              cancelled

### Return Status Flow
draft → pending_review → approved → completed
                              ↓
                          rejected

### Expense Status Flow
pending → approved → rejected

---

## Currency

### CU1. Historical Rates
Store rate with each transaction

### CU2. No Current Rate Usage
Never use current rate for historical tx

---

## Reports

### R1. Source of Truth
Use same services as operational modules

### R2. Date Range Filter
All reports support date_from/date_to

### R3. Pagination
No full table loads

### R4. Export Support
CSV/Excel export capability

---

## Configuration

### CF1. System Settings
Default currency, costing method, tax rates

### CF2. Approval Thresholds
Configurable per operation

### CF3. Accounting Mappings
Customizable chart of accounts mapping

### CF4. Numbering Sequences
Configurable per document type

---

**Last Updated:** 2026-09-22