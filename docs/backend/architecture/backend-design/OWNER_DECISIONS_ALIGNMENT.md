# Owner Decisions Alignment - Documentation Baseline

Date: 2026-10-09. Status: DESIGN / DOCUMENTATION ONLY.
Sources: v3 SCHEMA_V3_CHANGE_LOG.md, SCHEMA_V3_OPEN_DECISIONS.md and precision_slate_proposed_mysql_design_v3.md under ../../../../data/schema/proposals/proposed-mysql-review-v3/ (repository-relative locations); supplied attachment "Task: Create Schema Revision v4 - Apply Owner Decisions (Round 2)", OD-8..OD-20; current user DOCS REFRESH instruction.

The Round 2 choices supersede conflicting older backend recommendations. v3 remains UNAPPROVED and unchanged. No v4 schema folder was found; references to v4 mean supplied decisions, not verified DDL. This task refreshes canonical backend docs only; it does not perform the attachment's schema creation or Git commits.

## Decision register
| OD | Current documentation rule |
|---|---|
| 1 | EGP sole operational currency; no currency master, FX conversion service or finance currencies endpoint. Convert foreign costs before entry. OD-19 adds optional evidence only. |
| 2 | Whole-unit quantities; no fractional stock/order/invoice/delivery quantities. |
| 3 | Weighted-average costing; product/location quantity/value/average-cost projections and movement cost snapshots; no FIFO layers/serial numbers. |
| 4 | Landed-cost basis value, quantity or manual, no weight/no inferred default; eligibility and late costs OPEN. |
| 5 | Single/multiple/partial container receipt events retained. |
| 6 | Global configurable sales_tax enabled/rate; no inferred default; snapshot each invoice line at issue; settings changes do not alter issued snapshots. Tax convention/formula OPEN. |
| 7 | Originally rounding OPEN in v3; OD-18 settles nearest-piastre per-invoice-line rounding only. Other rounding detail remains OPEN. |
| 8 | Orders/deliveries IN scope with full fulfillment only; no partial order invoice/delivery. Retain order -> invoice -> delivery -> stock lineage; state/reservation/issue point detail OPEN. |
| 9 | Supplier is container-cost counterparty only; no purchase invoices/AP ledger; retain container_cost_payments. |
| 10 | Posted invoices ARE editable: reverse old stock/receivable/journal effects and record new effects/version, retain BOTH versions. Every change stores field, old value, new value, who, when, reason; reuse audit_logs where adequate. No immutable-document business rule. |
| 11 | Returns may link to original invoice line or be free; original line FK nullable; linked return quantity validated. Refund/tax/valuation/disposition detail OPEN. |
| 12 | Opening receivables, product/location stock and treasury balances through dated, distinguishable/auditable opening documents/movements, not fixed columns. |
| 13 | Only owner edits/reverses/corrects; two designated issuers create invoices; everyone else cannot modify anything. Proposed matrix, no seeds. Invoice issuer BOTH optional users FK and name snapshot. Issuer login decision OPEN; exact names unreadable in attachment, NOT VERIFIED. |
| 14 | Credit limit warning only, never blocking. Warning evidence may be proposed, not assumed implemented. |
| 15 | Cost/markup/profit visibility owner only across API/report/print/export/history. Markup formula still unspecified. |
| 16 | Customer phone unique; name need not be; normalization OPEN. |
| 17 | Negative stock prohibited; target inventory_balances CHECK quantity_on_hand >= 0 plus transactional locking/validation. DDL/enforcement NOT VERIFIED. |
| 18 | Nearest piastre (2 decimals) per invoice line. Tax-rate representation and inclusive/exclusive formula OPEN; ties/calculation sequence/residuals and other workflow rounding not inferred. |
| 19 | Optional original foreign amount/exchange rate/original currency-code text on container_costs, reference only. Never used in calculations; all operational amounts EGP. Exact v4 column names/types NOT VERIFIED. |
| 20 | Single or partial container receipts remain supported; distinct from full-only order fulfillment. |

## Proposal versus implementation
Business choices do not approve schema, runtime, migrations, seeds or application code. API paths/fields and physical revision/history/opening mappings in this folder are proposed. Do not treat columns in v3 as evidence that Round 2 is implemented.

Retained financial effects and audit evidence do not make invoices uneditable: editing is the approved reverse-and-record workflow. It must atomically retain versions, reverse/post effects and record every field change. Changes to collections/allocations/downstream delivery and revised tax snapshot policy need specifications.

Production likely MariaDB/Hostinger Premium only; exact engine/version/collation/mode/PHP/extensions/topology NOT VERIFIED. Compatibility belongs to later v4.1 review. Keep identifier strategy, session/CSRF, report formulas, journal design/numbering, warehouse attributes, attachments, receipt-stage history and issuer logins OPEN.

## Canonical and snapshot boundary
Only docs/backend/architecture/backend-design/ is refreshed. The duplicate snapshot is preserved at docs/_to_review/backend-design-snapshot/ as a historical reference, not the current decision baseline. Earlier schema versions and reference HTML are untouched. See DOCS_REFRESH_CHANGE_LOG.md for every edit.
