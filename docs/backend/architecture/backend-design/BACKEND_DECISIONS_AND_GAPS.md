# Decisions, Gaps, Assumptions, Approvals

Decision baseline: [OWNER_DECISIONS_ALIGNMENT.md](./OWNER_DECISIONS_ALIGNMENT.md). Design only; schema approval and runtime behavior NOT VERIFIED.

Design only. [OWNER_DECISIONS_ALIGNMENT.md](./OWNER_DECISIONS_ALIGNMENT.md) records v3 plus supplied Round 2 decisions; owner choices do not approve DDL or implementation.

## Resolved decisions
| Previous topic | Current owner decision |
|---|---|
| D1 currency/tax/rounding | EGP operations; global tax enabled/rate snapshots at issue; nearest piastre, 2 decimals per invoice line (OD-1/6/18) |
| D2 costing | Weighted average, no FIFO/serial model (OD-3) |
| D3 allocation | value, quantity or manual, no weight (OD-4) |
| D4 credit limit | Warning only, never blocking (OD-14) |
| D5 posted edits | ARE allowed: reverse old effects and record new version, retain both and every field/old/new/who/when/reason (OD-10) |
| D6 visibility | Cost, markup and profit owner only (OD-15) |
| D7 issuers | Optional users FK plus issuer name snapshot; login decision partly OPEN (OD-13) |
| D8 fulfillment | Orders/deliveries included, full invoicing/delivery only (OD-8) |
| D9 suppliers | Container-cost counterparty only; no purchase invoices/AP; retain container_cost_payments (OD-9) |
| D10 uniqueness | Phone unique, name need not be; normalization OPEN (OD-16) |
| Returns | Linked original line nullable; free returns allowed (OD-11) |
| Opening balances | Dated, auditable opening documents/movements for receivables, stock and treasury; no fixed columns (OD-12) |
| Modification rights | Owner alone edits/reverses/corrects; two designated issuers create invoices; everyone else cannot modify anything; proposed matrix, no seeds (OD-13) |
| Stock | No negative stock; target nonnegative CHECK plus transactional checks (OD-17) |
| Foreign references | Optional original amount/rate/currency-code text on container costs, reference only and never calculated (OD-19) |
| Container receipts | Single or multiple/partial supported (OD-5/20) |

## Remaining gaps
| Gap | Blocks / status |
|---|---|
| G-01 approved schema | v3 UNAPPROVED; no v4 artifacts found. Revision-history/opening mappings not verified. Schema/API freeze and DB validation blocked |
| G-02 runtime/engine | Exact PHP/extensions/MySQL/MariaDB/hosting topology OPEN. MariaDB on Hostinger Premium likely only; separate v4.1 compatibility step |
| G-03 storage adequacy | v3 proposes auth_sessions, audit_logs, idempotency_records and document_sequences; suitability for final rules NOT VERIFIED |
| G-04 identifiers | PHP/MySQL-family supersede blueprint Node/PostgreSQL; numeric/UUID/ULID strategy OPEN |
| G-05 auth/contract | Sessions/CSRF lifecycle, payload names and whether issuers have logins OPEN; exact issuer names unreadable in attachment, NOT VERIFIED |
| G-06 optional integrations | Attachments/upload scope and email/SMS/server WhatsApp unconfirmed |
| G-07 reports | Formulas/date/status basis OPEN; cost/markup/profit owner only |
| Financial detail | Tax rate fraction/percentage, inclusive/exclusive treatment/formula; rounding ties/sequence/residuals and non-invoice rounding; landed-cost eligibility/late costs; journals/numbering; return/refund/disposition/valuation OPEN |
| Operational detail | Reservation lifecycle, full-order state machine/issue point, warehouse attributes, receipt-stage history OPEN |
| Correction detail | Receipt/allocation/downstream delivery reconciliation and new revision tax-snapshot policy need specification; prior versions/snapshots retained |
| Cut-over | Opening documents selected; date/source mapping/reconciliation/sign-off still needed |

## Boundaries
Laravel remains a recommendation; exact decimal math and server-side deny-by-default permissions apply. Posted invoices are editable under OD-10, with retained versions, history and compensating ledger effects. No immutable-document business rule applies.

Schema changes need separate authorization and approval. No SQL, migration, seeder, application code or deployment is part of this refresh. Earlier schemas remain UNAPPROVED and untouched; history design should reuse audit_logs where adequate, avoiding unjustified duplicate tables.

## Historical prototype findings
Hard-coded 1234, localStorage roles, floating-point money, multiple stock stores, isReturn invoices and unescaped HTML construction remain prototype findings, not implemented server behavior.
