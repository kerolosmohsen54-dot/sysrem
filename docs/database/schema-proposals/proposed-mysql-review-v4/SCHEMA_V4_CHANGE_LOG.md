# Schema v4 Change Log

**UNAPPROVED - review only.** Compared with v3; "fixed" means structural proposal or selected service rule, never implemented/tested behavior. No SQL executed.

## OD-1..OD-20
| Decision | Treatment | Tables / columns | Boundary |
|---|---|---|---|
| OD-1 | Preserved | All operational monetary fields | EGP only; no currencies master or FX ledger. OD-19 adds reference evidence only. |
| OD-2 | Preserved | All quantity columns | Whole-item integer quantities. |
| OD-3 | Preserved | inventory_balances; inventory_movement_lines; container_receipts | Weighted-average projection and unit/extended-cost snapshots; no FIFO or serial model. |
| OD-4 | Preserved | containers.landed_cost_allocation_basis; container_receipts.allocation_basis_snapshot; container_cost_allocations.allocation_basis | value / quantity / manual; eligibility/late-cost handling OPEN. |
| OD-5 | Preserved | container_receipts; container_receipt_lines | Single/multiple/partial receipt events and stock lineage. |
| OD-6 | Preserved | app_settings.sales_tax; sales_document_lines.tax_enabled_snapshot / tax_rate_snapshot | Global tax setting; issue-time line snapshots; no seed/default inferred. |
| OD-7 | Partly superseded by OD-18 | No type changes | Invoice-line rounding decided; ties/order/residuals/non-invoice rounding OPEN. |
| OD-8 | Service rule; structures retained | sales_orders; sales_order_lines; sales_order_invoice_allocations; deliveries; delivery_lines (unchanged) | IN scope, full-only order invoice/delivery. Bridge retained for exact order/product/invoice lineage, including retained invoice versions; not permission for partial fulfillment. |
| OD-9 | Preserved limited scope | suppliers; containers; container_costs; container_cost_payments (unchanged) | Container-cost counterparty only; no purchasing/AP tables. Cost payments unchanged byte-for-byte after line-ending normalization. |
| OD-10 | Structure + service rule | sales_documents.previous_revision_id / revision_number; audit_logs.sales_document_id / field_path / old_value / new_value / actor_name_snapshot | Retained document versions linked by predecessor; unique successor, revision shape CHECK and RESTRICT FK. Existing audit_logs reused with FK, index and field-change completeness CHECK. Atomic stock/receivable/journal reverse-and-record remains a service. |
| OD-11 | Nullable origin preserved; comments corrected | sales_documents.original_document_id; sales_document_lines.original_document_line_id | Free returns permitted; linked quantity/product/customer validation remains transactional. No new return tables. |
| OD-12 | Opening representation | sales_documents.document_type += opening_receivable; opening_balance_direction; inventory_movements opening/movement_date; treasury_entries opening/entry_date/direction | Dated distinguishable opening receivable documents; signed orientation represented by debit/credit plus existing nonnegative total. Existing dated stock/treasury openings reused. No fixed customer/stock/treasury master balance columns. |
| OD-13 | Issuer structure + proposed matrix | sales_documents.issuer_name_snapshot; existing optional issuer_user_id; issued-issuer CHECK; roles/permissions tables unchanged | Issued invoice must retain nonblank issuer name even without login FK. Owner-only edits/reversals/corrections; two issuers create; other users cannot modify; no seeds. |
| OD-14 | Service rule; no new field | customers.credit_limit; optional audit_logs action sales_document.credit_warning | Warn only, never block; evidence uses existing before/after JSON if recorded. Balance basis OPEN. |
| OD-15 | Permission rule only | roles; permissions; role_permissions; API services (not implemented) | Cost/markup/profit owner only. No new schema. |
| OD-16 | Unique index | customers.phone: replace ix_customers_phone with uq_customers_phone | Unique non-null phone; name non-unique; existing phone nullability preserved, requiredness/normalization OPEN. |
| OD-17 | CHECK + service rule | inventory_balances.quantity_on_hand; chk_inventory_balances_nonnegative | On-hand >= 0; locking/posting checks required; engine enforcement NOT VERIFIED. |
| OD-18 | Service arithmetic rule | sales_document_lines; exact DECIMAL fields unchanged | Nearest piastre, two decimals per invoice line. Storage scale does not set calculation order/tie-breaking. Tax convention OPEN. |
| OD-19 | Three optional reference fields | container_costs.original_amount_reference / exchange_rate_reference / original_currency_code_reference | Two numeric reference columns plus requested currency-code text. No calculations, currency FK/default or rate convention imposed. |
| OD-20 | Preserved | container_receipts; container_receipt_lines (unchanged) | Single/multiple/partial container receipts; separate from full-only order fulfillment. |

## Table-definition comparison
| Added | Changed | Removed | Unchanged | Total |
|---|---|---|---|---|
| 0 | 6 | 0 | 41 | 47 |

Changed definitions: `customers`, `sales_documents`, `sales_document_lines`, `inventory_balances`, `container_costs`, `audit_logs`.
Includes sales_document_lines comment-only clarification for OD-11. No columns were removed. Supplier, container receipt and payment structures preserved; no separate revision/history table added because audit_logs already stores contextual history and now records required field-level evidence.

## Exact definition edits
1. **customers (OD-16)**: replace
```sql
    KEY ix_customers_phone (phone),
```
with
```sql
    UNIQUE KEY uq_customers_phone (phone),
```

2. **sales_documents (OD-12)**: replace
```sql
    document_type ENUM('invoice', 'credit_note') NOT NULL,
```
with
```sql
    document_type ENUM('invoice', 'credit_note', 'opening_receivable') NOT NULL,
    opening_balance_direction ENUM('debit', 'credit') NULL COMMENT 'OD-12: direction of a dated opening receivable document; not a customer balance column',
```

3. **sales_documents (OD-10/11)**: replace
```sql
    original_document_id BIGINT UNSIGNED NULL COMMENT 'Required by service for a return/credit note; not all credit-note policies are decided',
```
with
```sql
    original_document_id BIGINT UNSIGNED NULL COMMENT 'OD-11: optional return origin; free returns permitted',
    previous_revision_id BIGINT UNSIGNED NULL COMMENT 'OD-10: retained predecessor; new row is the edited version',
    revision_number INT UNSIGNED NOT NULL DEFAULT 1 COMMENT 'OD-10: per-chain sequence; predecessor continuity is a service rule',
```

4. **sales_documents (OD-13)**: replace
```sql
    issuer_user_id BIGINT UNSIGNED NULL,
```
with
```sql
    issuer_user_id BIGINT UNSIGNED NULL,
    issuer_name_snapshot VARCHAR(160) NULL COMMENT 'OD-13: mandatory nonblank snapshot for issued invoices; issuer users FK remains optional',
```

5. **sales_documents (OD-10)**: replace
```sql
    UNIQUE KEY uq_sales_documents_number (document_number),
```
with
```sql
    UNIQUE KEY uq_sales_documents_number (document_number),
    UNIQUE KEY uq_sales_documents_revision_successor (previous_revision_id),
```

6. **sales_documents (OD-10)**: replace
```sql
    CONSTRAINT fk_sales_documents_original FOREIGN KEY (original_document_id) REFERENCES sales_documents (id) ON DELETE RESTRICT,
```
with
```sql
    CONSTRAINT fk_sales_documents_original FOREIGN KEY (original_document_id) REFERENCES sales_documents (id) ON DELETE RESTRICT,
    CONSTRAINT fk_sales_documents_previous_revision FOREIGN KEY (previous_revision_id) REFERENCES sales_documents (id) ON DELETE RESTRICT,
```

7. **sales_documents (OD-10/12/13)**: replace
```sql
    CONSTRAINT chk_sales_documents_discount CHECK (discount_amount <= subtotal)
```
with
```sql
    CONSTRAINT chk_sales_documents_discount CHECK (discount_amount <= subtotal),
    CONSTRAINT chk_sales_documents_revision_shape CHECK (
        (previous_revision_id IS NULL AND revision_number = 1)
        OR (previous_revision_id IS NOT NULL AND revision_number > 1)
    ),
    CONSTRAINT chk_sales_documents_opening_direction CHECK (
        (document_type = 'opening_receivable' AND opening_balance_direction IS NOT NULL)
        OR (document_type <> 'opening_receivable' AND opening_balance_direction IS NULL)
    ),
    CONSTRAINT chk_sales_documents_issued_issuer CHECK (
        document_type <> 'invoice'
        OR (status = 'draft' AND posted_at IS NULL)
        OR (issuer_name_snapshot IS NOT NULL AND CHAR_LENGTH(TRIM(issuer_name_snapshot)) > 0)
    )
```

8. **sales_document_lines (OD-11)**: replace
```sql
    original_document_line_id BIGINT UNSIGNED NULL,
```
with
```sql
    original_document_line_id BIGINT UNSIGNED NULL COMMENT 'OD-11: nullable for a free return; linked return bounds/product agreement enforced transactionally',
```

9. **inventory_balances (OD-17)**: replace
```sql
    quantity_on_hand INT NOT NULL DEFAULT 0 COMMENT 'Whole items (OD-2); negative-stock policy OPEN',
```
with
```sql
    quantity_on_hand INT NOT NULL DEFAULT 0 COMMENT 'Whole items (OD-2); negative stock prohibited (OD-17)',
```

10. **inventory_balances (OD-17)**: replace
```sql
    CONSTRAINT chk_inventory_balances_reserved CHECK (quantity_reserved >= 0)
```
with
```sql
    CONSTRAINT chk_inventory_balances_reserved CHECK (quantity_reserved >= 0),
    CONSTRAINT chk_inventory_balances_nonnegative CHECK (quantity_on_hand >= 0)
```

11. **container_costs (OD-19)**: replace
```sql
    amount_egp DECIMAL(19,4) NOT NULL COMMENT 'Foreign payment converted to EGP before persistence (OD-1)',
```
with
```sql
    amount_egp DECIMAL(19,4) NOT NULL COMMENT 'Foreign payment converted to EGP before persistence (OD-1)',
    original_amount_reference DECIMAL(19,4) NULL COMMENT 'OD-19: optional original foreign amount, evidence only; never used in calculations',
    exchange_rate_reference DECIMAL(19,8) NULL COMMENT 'OD-19: optional source exchange rate, evidence only; rate convention not inferred',
    original_currency_code_reference VARCHAR(16) NULL COMMENT 'OD-19: optional source currency text, evidence only; no currency master or FX computation',
```

12. **audit_logs (OD-10)**: replace
```sql
    actor_user_id BIGINT UNSIGNED NULL,
```
with
```sql
    actor_user_id BIGINT UNSIGNED NULL,
    actor_name_snapshot VARCHAR(160) NULL COMMENT 'OD-10: required on field changes; preserves who if the optional users FK becomes null',
    sales_document_id BIGINT UNSIGNED NULL COMMENT 'OD-10: edited/new invoice version; predecessor identified by previous_revision_id',
    field_path VARCHAR(500) NULL COMMENT 'OD-10: stable header/line field path; one row for every changed field',
    old_value JSON NULL COMMENT 'OD-10: JSON null denotes absent/null old value; SQL NULL reserved for other audit actions',
    new_value JSON NULL COMMENT 'OD-10: JSON null denotes absent/null new value; SQL NULL reserved for other audit actions',
```

13. **audit_logs (OD-10)**: replace
```sql
    KEY ix_audit_logs_request_id (request_id),
```
with
```sql
    KEY ix_audit_logs_request_id (request_id),
    KEY ix_audit_logs_sales_document (sales_document_id, created_at, id),
```

14. **audit_logs (OD-10)**: replace
```sql
    CONSTRAINT fk_audit_logs_actor FOREIGN KEY (actor_user_id) REFERENCES users (id) ON DELETE SET NULL
```
with
```sql
    CONSTRAINT fk_audit_logs_actor FOREIGN KEY (actor_user_id) REFERENCES users (id) ON DELETE SET NULL,
    CONSTRAINT fk_audit_logs_sales_document FOREIGN KEY (sales_document_id) REFERENCES sales_documents (id) ON DELETE RESTRICT,
    CONSTRAINT chk_audit_logs_field_change CHECK (
        action <> 'sales_document.field_change'
        OR (
            sales_document_id IS NOT NULL
            AND field_path IS NOT NULL AND CHAR_LENGTH(TRIM(field_path)) > 0
            AND old_value IS NOT NULL AND new_value IS NOT NULL
            AND actor_name_snapshot IS NOT NULL AND CHAR_LENGTH(TRIM(actor_name_snapshot)) > 0
            AND reason IS NOT NULL AND CHAR_LENGTH(TRIM(reason)) > 0
        )
    )
```


DDL header/footer updated for revision/rounding/reference/full-fulfillment invariants; outdated immutable-document and no-foreign-evidence comments removed. Opening stock and treasury enums/dates already exist in v3; no duplicate opening tables required.

## C-01..C-19
| Finding | v4 status | Boundary |
|---|---|---|
| C-01 | FIXED structurally | Partial container receipts and composite lineage retained; quantity/reversal reconciliation service-only. |
| C-02 | FIXED structurally; full-only rule specified | Order/invoice/delivery/movement lineage retained; full aggregates/state/stock-issue point remain service specifications. |
| C-03 | FIXED structurally | Source-once bridges retained, per-new-version posting identity; exactly-once atomic effects unimplemented. |
| C-04 | PARTIALLY FIXED | D8 scope/full-only resolved; header tax/discount/payment/location/actor fields and state detail not inferred. |
| C-05 | PARTIALLY FIXED | Receipt discrepancy evidence retained; append-only stage history OPEN. |
| C-06 | FIXED linkage/model | Weighted average and eligible receipt-line allocation structures retained; eligibility/late costs/reversal mechanics OPEN. |
| C-07 | PARTIALLY FIXED | Unapplied amount derived, allocation reversals retained; bounds/refunds/revision reallocation rules OPEN. |
| C-08 | PARTIALLY FIXED | Dated opening receivable documents and unique phone; other attributes, normalization and cut-over detail OPEN. |
| C-09 | PARTIALLY FIXED | Whole units/default location/minimum stock; existing opening movement model; tax categories not inferred. |
| C-10 | FIXED currency scope | EGP-only operational amounts; optional original foreign evidence explicitly non-calculating. |
| C-11 | PARTIALLY FIXED | Weighted-average/value snapshots; nonnegative stock CHECK added; return/reversal/reconciliation algorithms OPEN. |
| C-12 | PARTIALLY FIXED / OPEN scope | Optional metadata only; uploads/security/ownership/lifecycle OPEN. |
| C-13 | RESOLVED by exclusion (OD-9) | No AP ledger required; supplier counterparty/cost payments only. |
| C-14 | OPEN | Warehouse manager/address/capacity/occupancy requirements. |
| C-15 | OPEN | Derived report formulas/date/status/reconciliation; owner-only profit visibility selected. |
| C-16 | PARTIALLY FIXED | Owner/issuer matrix proposed; sessions/CSRF/logins and enforcement unimplemented. |
| C-17 | OPEN | Identifier strategy; inherited BIGINT AUTO_INCREMENT candidate. |
| C-18 | OPEN / deferred to v4.1 | Exact engine compatibility/runtime unvalidated. |
| C-19 | OUT OF SCOPE | Opening representation provided, no migration/import/cut-over implementation. |

## Static verification actually run
A quote/parenthesis-aware JavaScript scanner in memory parsed CREATE TABLE and ALTER FK definitions and checked all key/constraint metadata. No database library or SQL execution used.

| Declaration | v3 | v4 |
|---|---|---|
| Tables | 47 | 47 |
| Primary keys | 47 | 47 |
| Foreign keys (including ALTER) | 121 | 123 |
| Unique keys (excluding primary keys) | 64 | 66 |
| CHECK constraints | 41 | 46 |

v4 column declarations: 489.
Results: 0 missing FK tables/columns; 0 references to not-yet-created tables at their statement; self-references permitted; deferred ALTERs follow table creation. 0 FK arity/type mismatches; every referenced column tuple has an exact declared PK/unique candidate key; every SET NULL FK uses nullable columns.
0 duplicate table/constraint symbols or per-table index names; identifiers within 64 characters; one PK per table; all key/CHECK column tokens resolve. Complete ERD table/FK catalog agrees: 47 tables, 123 FK names.

This scanner is a static inventory/checker, not a complete MySQL/MariaDB parser. Server syntax acceptance, CHECK/JSON/collation semantics, enum handling, uniqueness normalization, grants/audit immutability, aggregate reconciliation, concurrent posting/idempotency, reverse-and-record completeness, all application behavior, migrations and deployment are NOT VERIFIED. Inherited tax-snapshot CHECK permits draft nulls; issued completeness must be enforced by service, not inferred from DDL.

## Remaining approval gates
See SCHEMA_V4_OPEN_DECISIONS.md for only unresolved details. Exact engine compatibility deferred to v4.1. v4 is NOT ready for schema approval or application implementation; ready as an UNAPPROVED review proposal.

Earlier proposals, reference HTML, app sources and existing reports must remain unchanged; hash comparison and commit-scope verification are reported in the task response.

## Static assertion cases actually run

17/17 passed (text/metadata assertions, not DB constraint tests):

1. PASS - All 47 v3 tables retained; no new tables
2. PASS - Schema graph/key/token verification
3. PASS - Full ERD table/FK inventory agreement
4. PASS - Unique nullable customer phone; name not unique
5. PASS - Nonnegative on-hand CHECK present
6. PASS - Revision predecessor nullable and FK RESTRICT
7. PASS - Unique revision successor and shape CHECK
8. PASS - Audit reuse with field old/new actor/reason/date
9. PASS - Audit edited-version FK RESTRICT
10. PASS - Issuer optional FK + name snapshot + issued CHECK
11. PASS - Return header/line links nullable
12. PASS - Dated distinguishable openings
13. PASS - Three optional reference-only foreign fields
14. PASS - Order bridge retained exactly for lineage
15. PASS - Container receipts/cost payments unchanged
16. PASS - No currency/AP/report/history duplicate table
17. PASS - No execution/seed/database selection statements
