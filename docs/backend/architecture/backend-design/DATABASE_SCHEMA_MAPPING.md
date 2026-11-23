# Database Schema Mapping

Decision baseline: [OWNER_DECISIONS_ALIGNMENT.md](./OWNER_DECISIONS_ALIGNMENT.md). Design only; schema approval and runtime behavior NOT VERIFIED.

Status: **BLOCKED for approved/live mapping.** v3 SQL/ERD/design are present, contain 47 proposed tables and remain UNAPPROVED. Round 2 decisions are supplied requirements; no v4 artifacts were found during this refresh. The mappings below are candidate names from v3, NOT a verified live schema or an approved v4 contract.

## Candidate capability mapping
| Capability | v3 candidate tables/fields | Owner alignment / remaining gap |
|---|---|---|
| Authentication/roles | users, roles, permissions, user_roles, role_permissions, auth_sessions, password_reset_tokens | OD-13 owner/issuer restrictions; session/CSRF and issuer logins OPEN; no role seeds |
| Customer identity | customers | OD-16 phone unique, name non-unique; normalization OPEN; target index NOT VERIFIED |
| Catalog/locations | products, product_categories, locations | Integer quantities (OD-2); warehouse attributes OPEN |
| Sales/returns | sales_documents, sales_document_lines, sales_document_postings | OD-10 retained revision links and field history target mapping pending; OD-11 original line nullable/free returns; OD-13 optional issuer users FK plus name snapshot |
| Tax | app_settings sales_tax; sales_document_lines.tax_enabled_snapshot/tax_rate_snapshot | Issue-time snapshots, no inferred default; OD-18 nearest-piastre invoice-line rounding; tax convention/formula OPEN |
| Collections | sales_receipts, sales_receipt_allocations, sales_receipt_allocation_reversals, sales_receipt_postings | Allocation/refund and edit reconciliation still need specification |
| Orders/deliveries | sales_orders, sales_order_lines, sales_order_invoice_allocations, deliveries, delivery_lines | OD-8 full fulfillment only; v3 partial bridges do not authorize partial invoicing/delivery; preserve lineage; v4 simplification NOT VERIFIED |
| Inventory | inventory_movements, inventory_movement_lines, inventory_balances.average_unit_cost_egp/inventory_value_egp | Weighted average and movement cost snapshots; OD-17 no negative stock, target CHECK quantity_on_hand >= 0 NOT VERIFIED; service locking required |
| Containers | containers, container_lines, container_receipts, container_receipt_lines | OD-5/20 single or partial/multiple receipts; per-event posting identity |
| Landed costs | containers.landed_cost_allocation_basis; container_costs, container_cost_allocations | value/quantity/manual only (OD-4); eligibility/late costs OPEN |
| Foreign evidence | container_costs (target optional reference columns) | OD-19 original amount/rate/currency code are reference-only, absent from v3; v4 exact names/types NOT VERIFIED; never calculated |
| Suppliers/payments | suppliers, container_cost_payments | Counterparty only, preserve cost payments; no purchase invoices or AP ledger |
| Treasury/accounting | treasury_accounts, treasury_entries, treasury_transfers, treasury_transfer_entries, expenses, chart_of_accounts, journal_entries, journal_lines | EGP only, no currencies/FX finance scope; journal design/numbering OPEN |
| Audit/revisions | audit_logs; target document revision linkage | Every changed field/old/new/who/when/reason; reuse audit_logs if adequate, avoid duplicate tables; physical history design NOT VERIFIED |
| Opening balances | Target dated opening documents/movements in sales/inventory/treasury domains | OD-12 distinguishable/auditable, no fixed columns; discriminators/mapping NOT VERIFIED |
| Reports | Derived source/ledger queries | No report tables; formulas OPEN; cost/markup/profit owner only |
| Optional attachments | attachment_metadata | Metadata only, scope/security/storage OPEN |
| Numbering/idempotency | document_sequences, idempotency_records and source-effect bridges | Format/ID strategy OPEN; exactly-once per event/version needs services |

## Unblocking approved mapping
Obtain explicit schema approval, exact DDL/ERD and target engine/runtime; reconcile v4 decisions with actual columns/constraints; specify tax/rounding detail, journals and revision effects. Disposable engine compatibility validation belongs to a later authorized step (v4.1); none performed here. Live tables/columns/constraints/enforcement NOT VERIFIED.

## Mapping template
| Approved table.column | Constraint | Repository | Service | API field | Evidence |
|---|---|---|---|---|---|
| NOT VERIFIED | NOT VERIFIED | Proposed | Proposed | Proposed | Await approved schema |

## Boundaries
No schema renames/additions/drops, DDL execution, migrations, seeders or replacement database in this docs refresh. Earlier proposal versions stay untouched. Blueprint PostgreSQL table names are historical vocabulary, not evidence of the current database. An approved schema change requires separate review/authorization.
