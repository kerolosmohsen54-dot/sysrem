# Precision Slate ERP - Proposed Schema v4 Design

**UNAPPROVED - review only.** Based on v3 and supplied Round 2 OD-8..OD-20. No SQL executed, DB contacted, application code/migration/seeder produced. Companion DDL, ERD, permission matrix, change log and open decisions are in this folder.

## Owner decisions and precedence
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

## Table purposes
| Table | Purpose |
|---|---|
| `users` | Application identities; issuer login decision OPEN. |
| `roles` | Proposed role master, no seeds. |
| `permissions` | Permission codes, no grants seeded. |
| `user_roles` | User role association. |
| `role_permissions` | Proposed action grants. |
| `auth_sessions` | Session storage candidate; topology OPEN. |
| `password_reset_tokens` | Reset token hashes; lifecycle OPEN. |
| `customers` | Customer identity and warning-only credit limit; unique non-null phone. |
| `suppliers` | Container-cost counterparty only; no AP ledger. |
| `product_categories` | Catalog hierarchy. |
| `products` | Whole-unit catalog, minimum stock and optional default location. |
| `locations` | Location hierarchy; manager/capacity OPEN. |
| `document_sequences` | Numbering candidate; formats OPEN. |
| `sales_documents` | Versioned invoices/free-or-linked credit notes/dated opening receivables. |
| `sales_document_lines` | Whole-unit commercial snapshots, nullable return origin, issue-time tax snapshots. |
| `treasury_accounts` | EGP cash/bank masters. |
| `sales_receipts` | EGP collection/refund sources; policies OPEN. |
| `sales_receipt_allocations` | Receipt amounts applied to documents. |
| `chart_of_accounts` | Accounting account candidate, templates OPEN. |
| `journal_entries` | Dated double-entry headers and reversal sources. |
| `journal_lines` | One-sided debit/credit lines; aggregate balancing is service rule. |
| `treasury_entries` | EGP treasury effects including dated opening entries. |
| `expenses` | Expense sources and optional accounting links. |
| `treasury_transfers` | EGP transfer headers. |
| `inventory_movements` | Dated stock events, including opening/reversal. |
| `inventory_movement_lines` | Stock legs and cost snapshots; sales/receipt lineage. |
| `inventory_balances` | Rebuildable product/location quantity/value/average-cost; no negative on-hand. |
| `containers` | Container metadata/stage/allocation basis. |
| `container_lines` | Expected product quantities and EGP purchase snapshots. |
| `container_costs` | EGP operational costs plus optional foreign reference evidence. |
| `container_cost_allocations` | Cost-to-receipt-line allocations in same container. |
| `container_receipts` | Single/multiple/partial receipt events and valuation snapshots. |
| `container_receipt_lines` | Event/container-line/product/movement identity and discrepancies. |
| `sales_orders` | Full-fulfillment order header. |
| `sales_order_lines` | Whole ordered quantities. |
| `sales_order_invoice_allocations` | Order/product/invoice version lineage; full quantities service rule. |
| `deliveries` | Full-only delivery header; state detail OPEN. |
| `delivery_lines` | Exactly one source plus linked product/stock movement. |
| `app_settings` | Global sales_tax JSON contract; no seed/default. |
| `idempotency_records` | Request hash/replay state; services enforce atomically. |
| `audit_logs` | General audit plus every edited field, actor snapshot and version FK. |
| `sales_document_postings` | One effect bridge per retained document version. |
| `sales_receipt_postings` | One receipt effect bridge. |
| `sales_receipt_allocation_reversals` | Retained allocation reversal history. |
| `treasury_transfer_entries` | Named transfer legs with exactly-once links. |
| `container_cost_payments` | Unchanged EGP payment bridge; not supplier AP. |
| `attachment_metadata` | Optional metadata only; upload ownership/lifecycle OPEN. |

## Editable posted invoices (OD-10)
Editing a posted invoice is supported, not forbidden. Store the changed invoice as a NEW sales_documents row and fresh sales_document_lines, with previous_revision_id linking the retained prior version. revision_number starts at 1 and must increment by one within the chain. The unique predecessor key prevents direct forks; service validates same invoice/customer lineage as appropriate, no cycles, current-head version and authorized owner. Public numbering remains OPEN; document_number stays unique per stored row and no format is selected.

In one transaction: authorize owner; lock current invoice/version, allocations and affected balances in stable order; validate the requested changes and mandatory reason; retain old header/line values; write compensating old stock/receivable/journal effects once; create/post the new version and its fresh posting/source identity; append complete field-change audit rows; update projections and idempotency response; commit together or roll back all. Old/new posting bridges remain distinct because each version has a distinct document ID. Prior status can transition to reversed with audit; historical commercial values and effects are not destructively overwritten. Financial reversal algorithms and allocation/delivery reconciliation remain OPEN, not guessed.

Reuse audit_logs rather than add a duplicate history table. action = sales_document.field_change requires sales_document_id (new version), field_path, old_value/new_value, actor_name_snapshot and nonblank reason. Existing created_at stores when; actor_user_id stores optional user identity. Snapshot preserves who even if user FK is cleared. JSON null records an absent/null field; SQL NULL is not allowed for edit-event old/new values. Existing before_data/after_data can store full context. Define stable header/line paths identifying old/new line IDs; additions/removals produce individual leaf-field changes. CHECK only requires shape, not completeness: service must enumerate EVERY change, even tiny values, and use consistent exact decimal JSON strings for money. Append-only history/grants enforcement is not implemented.

## Opening balances (OD-12)
Use sales_documents.document_type = opening_receivable, issue_date, existing nonnegative total_amount and opening_balance_direction debit/credit, not a customers balance column. Direction expresses opening debit or credit without inventing sign/cut-over policy. Opening documents need no artificial product lines or tax/stock invoice effects; service differentiates them from invoice/credit-note workflows and posting invariants. Accounting mapping and cut-over/sign-off remain OPEN.

Reuse inventory_movements.movement_type = opening, movement_date and product/location movement lines with whole quantities and EGP cost snapshots; update projections atomically. Reuse treasury_entries.entry_type = opening, entry_date and in/out direction/amount for dated treasury openings. These are opening transaction records, not fixed master balances. Persist actor/source/reason via existing fields/audit. No opening supplier AP because OD-9 excludes AP.

## Orders versus container receipts (OD-8/20)
All ordered quantities must be invoiced in full and delivered in full. No partial order invoice/delivery. Existing allocation bridge is retained because it proves exact order-line/product/invoice-line lineage and must retain historical allocations to old invoice versions when corrected. Removing it or enforcing a single invoice-line FK per order line would lose history or introduce a broader header workflow assumption. Service validates full totals across active versions, delivery header/source compatibility and no duplicate stock issue. Multiple historical rows do not authorize partial flows. Exact state/reserve/issue timing remains OPEN.
Container receipts remain independently single/multiple/partial events with per-event idempotency and container-line/product/movement composite lineage. container_cost_payments remains unchanged and may retain partial payment events.

## Money, costing, tax and references
All operational amounts, values, prices, journals and report calculations are EGP. Foreign container costs converted before entry. OD-19 deliberately adds TWO optional numeric evidence columns AND original currency-code text (three columns total), with no currency table or FX calculation. No equality/conversion CHECK is inferred; evidence must never feed calculations.

Whole quantities; weighted-average stock/value projection by product/location and movement unit/extended-cost snapshots. No FIFO/serial tables. Allocation basis value/quantity/manual only; eligibility/late costs/reversal/residual rules OPEN. Negative on-hand prohibited, both proposed CHECK and transaction locking/availability checks; reserved/available lifecycle OPEN.

sales_tax is global enabled/rate JSON, no default seeded. Snapshot each issued line; future setting edits never change prior snapshots. Draft snapshot nullability retained. Issued non-null snapshots/valid pairs are service requirements; inherited CHECK syntax is not proof of issue completeness or engine enforcement. Tax convention/inclusive treatment/formula and new-revision snapshot policy OPEN. OD-18: exact math rounds nearest piastre (2 decimals) per invoice line. Storage DECIMAL(19,4) is retained, not a four-decimal calculation rule; half-way tie-breaking/sequence/residuals and non-invoice rounding OPEN.

## Identity, authorization and audit
Invoice has optional issuer_user_id plus issuer_name_snapshot, with nonblank snapshot required once issued (including retained/reversed issued versions). Only owner edits/reverses/corrects; two designated issuers create invoices; everyone else cannot modify anything. Cost/markup/profit owner-only. See proposed matrix; exact issuer names unreadable in attachment and logins OPEN. No seeded users/grants or authentication implementation. Warning-only credit checks may record audit action sales_document.credit_warning with threshold/comparison context; balance basis still OPEN.

## Engine and validation boundary
No new engine-specific features added. Inherited AUTO_INCREMENT/ENUM/JSON/InnoDB/utf8mb4_0900_ai_ci syntax remains an unvalidated MySQL-oriented candidate, NOT a MariaDB guarantee. Likely MariaDB/Hostinger Premium is not an exact version confirmation. Compatibility fixes/dual-engine validation belong to v4.1. Static counts/relationships are in change log; no SQL, engine acceptance, concurrency or runtime tests.
