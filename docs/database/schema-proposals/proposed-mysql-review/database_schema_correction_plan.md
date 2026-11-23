# Proposed MySQL Schema — Correction Plan for Review

**Status: REVIEW PLAN ONLY — NOT APPROVED.** This document identifies
corrections and decisions for the proposed schema. It does not amend the
proposal DDL or ERD, define an approved schema, execute SQL, or authorize
application implementation.

## 1. Recommendation

**Do not approve the current schema yet.** It is a substantial 40-table
proposal, but important operational lineages are missing, some UI-entered
data has no persistent representation, and core financial/inventory policies
remain unresolved. Resolve the P0 design gaps and the blocking business
decisions below, then revise and validate a new proposal before approval.

This plan is based on the existing UI-to-schema audit, the proposed DDL/ERD,
the backend business-decision register, and the original HTML prototype. The
prototype's browser behavior is evidence of current prototype behavior, not
approval of its accounting or inventory rules. The SQL remains unexecuted.

## 2. Severity and approval gates

| Priority | Meaning | Approval / delivery gate |
|---|---|---|
| P0 — core integrity | Data cannot be reliably traced or reconciled for a core posting workflow. | Resolve before schema approval and before implementing the affected posting workflow. |
| P1 — module completeness | A material screen/workflow is underrepresented or depends on an unapproved policy. | Resolve before approving or releasing that module; some choices may be deferred if the module is explicitly out of scope. |
| P2 — scope/operational | Required scope, audit history, or displayed data has not been settled. | Resolve before the related feature is approved or exposed; defer only with explicit scope boundaries. |

## 3. Correction register

| ID / priority | Finding and evidence | Proposed correction to the next schema revision | Required decision / gate |
|---|---|---|---|
| C-01 / P0 | Container receipt headers reference one inventory movement, but movement lines have no reference to the originating container line. The receipt UI captures actual quantity and discrepancy per product line (`HTML :2272-2303`); see DDL `container_receipts`, `container_lines`, and `inventory_movement_lines`. The current unique key on `container_receipts.container_id` permits only one receipt header per container. | Add a nullable/required-as-applicable `container_line_id` FK to movement lines, or an explicit receipt-line-to-movement-line allocation table. Enforce that the linked line belongs to the same container receipt and product; preserve partial receipt and reversal semantics if supported. If multiple/partial receipt events are allowed, revise the one-receipt-per-container uniqueness rule and define quantity aggregation. | Decide whether partial/multiple receipts per container are allowed. Resolve before schema approval. |
| C-02 / P0 | Orders have no source relationship to sales documents or their lines. Delivery lines can refer to order/invoice lines without a required, exclusive source and have no stock-movement-line link. The order detail offers invoice/delivery actions (`HTML :1563-1652`); delivery UI supports partial quantities and several issue/delivery modes (`HTML :1884-1946`). | Add a normalized source/allocation bridge between order lines and invoiced lines, allowing partial quantities if approved. Model delivery-line source and stock effect explicitly, including partial fulfillment; enforce permitted source combinations and prevent over-fulfillment in transactional service logic. | Decide whether orders/deliveries are in the MVP and whether partial invoice/delivery, issue-only, and delivery-only are valid. Resolve before approving those modules. |
| C-03 / P0 | The proposal requires journal balancing and source compatibility at service level, but schema rows alone cannot enforce a journal-wide debit/credit sum or valid polymorphic source FKs. Several treasury, inventory, and journal sources are polymorphic. | Keep aggregate rules in posting services, but define typed source relations/bridges for core document effects and unique source-effect keys where posting must occur once. Specify transactional posting/reversal contracts and database constraints available for each path. Do not claim a row `CHECK` can balance a whole journal. | Accountant approval of journal templates and source documents is required before finance posting is released. |
| C-04 / P1 | Order screen fields and states exceed the proposed order model: warehouse, payment terms, salesperson, line/header discounts, tax, shipping/handling, and “preparing” status are displayed (`HTML :1501-1652`). Proposed order headers/lines omit many of these. | Add only approved, persistable snapshot fields or references for order terms and pricing. Define allowed state transitions and distinguish order status from fulfillment status. Add line-level tax/discount snapshots only after tax and price policies are decided. | D1, D6, and D8. Do not infer tax or financial defaults from the UI. |
| C-05 / P1 | Container discrepancy reasons and stage transitions are visible, but the proposal stores only expected/received quantity and current container status (`HTML :2272-2303`). | Add discrepancy quantity/reason/condition and actor/time attribution at receipt-line level. Add append-only container-stage events if users need auditable stage history; otherwise document that only current status is retained. | Confirm whether stage history and multiple receipt events are required. |
| C-06 / P1 | Landed-cost allocations store a basis and allocated amount, but are not linked to receipt valuation lines or a valuation ledger. The UI displays value allocation and unit landed cost (`HTML :2304-2348`), while D2/D3 remain open. | Link each posted allocation to the affected receipt/stock valuation effect; retain the selected basis, source amount/currency, converted amount/rate snapshot as approved, and posting/reversal linkage. Introduce cost layers/consumption links only if FIFO is selected; otherwise define the moving-average valuation projection and reconciliation path. | D2 costing policy and D3 allocation basis, plus treatment of later/incurred costs and reversals. Resolve before inventory valuation or profit reports are approved. |
| C-07 / P1 | Receipt allocation and collection logic requires aggregate limits and compatible currencies/customer/document types; these cannot be guaranteed by simple FKs. The prototype's FIFO allocator returns an unallocated remainder, but collection save subtracts the full receipt from customer balance (`HTML :4156-4187`). | Specify receipt-to-document allocations, unapplied cash, overpayment/refund/credit treatment, allocation currency rules, and reversals. Enforce total allocation bounds with locked rows and one database transaction. Never reproduce the prototype's balance mutation without an approved ledger policy. | Decide FIFO versus manual allocation, unapplied receipt/overpayment behavior, refunds, and customer-credit semantics. Resolve before collections are released. |
| C-08 / P1 | Customer master UI captures tax number, default currency, payment terms, salesperson, and opening balance, but the proposed customer record is incomplete for those fields (`HTML :2655-2719`). The prototype save path discards several visible fields. | Add approved customer attributes or references for the retained fields. Represent opening balances through a controlled, dated opening subledger/journal process rather than a mutable customer balance. | D1, D7, D10; accountant must approve opening-balance conversion and cut-off. |
| C-09 / P1 | Product UI captures tax rate/category, purchase price, default warehouse, opening quantity, minimum stock, and price information (`HTML :2771-2805`). Some are not persisted in the proposed product table. | Add approved tax classification, default location, reorder threshold/unit, and price/cost history or snapshots as required. Make opening quantity a posted opening movement, not an unexplained balance field. | D1, D2, D6, D7; define unit precision, tax, price visibility, and purchase-cost ownership. |
| C-10 / P1 | DDL has currency codes and one optional transfer exchange rate, but no effective-dated rate history or consistent base-currency amount on all relevant postings. The UI shows EGP/USD and exchange-rate controls; reports expose financial totals. | If multi-currency accounting/reporting is in scope, model rate source/date/direction and store immutable transaction/base-currency snapshots under an approved convention. If not in scope, explicitly constrain supported currency behavior and reports. | D1: base currency, rate source/time, conversion and rounding, revaluation, realized/unrealized FX. Resolve before multi-currency posting/report approval. |
| C-11 / P1 | Product landed cost has no approved valuation/COGS connection; inventory reports display average unit cost/value and profit views depend on COGS (`HTML :2529-2549`, `:2426-2457`). | Define how posted inventory movement values feed valuation and COGS; add the required immutable valuation effect or approved projection and reconciliation controls. Reports must derive from approved posted data, not front-end totals. | D2/D3 and accounting approval. |
| C-12 / P1 | Customer and expense upload areas exist in the prototype, but there is no attachment metadata model or working upload/storage flow (`HTML :2655-2719`, `:2750-2770`). | If retained, add secure attachment metadata linked through typed owner relations (or explicit owner-specific bridges), storage key, media metadata, actor/time, and retention/deletion status. Store file bytes outside MySQL unless explicitly approved otherwise. | Decide upload scope, storage provider, access control, malware scanning, retention, and deletion/audit behavior (G-06). |
| C-13 / P1 | Suppliers are used for container costs and referenced in finance/navigation, while supplier/AP operations are conditional; no payable subledger is proposed. | If D9 is in scope, add supplier invoices/lines, credit notes, payment/allocation records, and payable ledger with source links and posting/reversal behavior. If out of scope, explicitly label supplier records as container-cost counterparties only and suppress incomplete AP workflows. | D9: supplier master versus full AP module. |
| C-14 / P2 | Warehouse screen shows manager, location, item count, and occupancy (`HTML :2516-2528`); proposed locations contain minimal hierarchy/name/code. | Persist only operational attributes actually needed (for example manager FK/address/capacity and unit). Calculate item count/occupancy from approved inventory facts rather than maintaining duplicate counters without reconciliation. | Confirm whether capacity/occupancy is meaningful and what unit/measurement represents. |
| C-15 / P2 | UI exposes customer and supplier reports, many report-center categories, and financial statements, but formulas and definitions are unresolved; only some have dedicated prototype screens. | Treat reports as derived queries/views over posted source records. For every report, approve included document states, date basis, currency, tax/discount handling, COGS, returns, comparisons, and row-level authorization before freezing its query contract. Do not add report tables merely to mirror a UI count. | G-07 report formulas and permission matrix. |
| C-16 / P2 | The proposal includes hashed auth/session/reset data and normalized role/permission tables, but actual role codes, permission grants, session topology/retention, and server enforcement are not approved. The prototype's client-side role selection is not authorization. | Retain deny-by-default server authorization as an invariant; agree on session/cookie or bearer model, CSRF, revocation, token hashing, reset flow, role seed definitions, and audit events. Never trust localStorage roles. | G-03/G-05 and approved role/permission matrix required before authenticated endpoints go live. |
| C-17 / P2 | The proposed DDL uses `BIGINT UNSIGNED AUTO_INCREMENT`, while the PDF suggests UUIDs and existing data identity strategy is unknown. | Confirm internal key/public API identifier strategy, import compatibility, and whether identifiers can be exposed. If UUID/ULID is needed, revise the proposal before contracts or imports depend on numeric IDs. | G-04; decide before API freeze or legacy data import. |
| C-18 / P2 | The proposal targets MySQL 8.0.16+ and uses enforced checks, JSON, InnoDB, and MySQL-specific collation; the actual host database/version and PHP runtime are unverified. | Select the exact production-compatible MySQL version (or run a deliberate MariaDB compatibility review), set strict SQL mode/time zone/charset, and validate the full DDL in a disposable matching engine before approval. | G-02; no production connection or migration is part of this review. |
| C-19 / P2 | The MVP's localStorage state is split among keys and includes browser-computed stock, customer balances, invoice totals, and sequence state. That state is not a normalized or transactionally consistent database. | Before import, design a one-time reconciliation/cut-off: map source IDs, deduplicate, reconcile cash/receivables/stock, map openings to approved posted entries, preserve provenance, and produce a dry-run exception report. Do not blindly import localStorage into production tables. | Approve migration scope, source snapshots, cut-off date, and sign-off owners. |

## 4. Workflow-to-correction map

| UI workflow | Corrections that must be resolved for reliable support |
|---|---|
| Container create → receive actual lines → add stock → allocate landed costs → inventory valuation | C-01, C-05, C-06, C-11; D2/D3; define partial receipt and reversal rules. |
| Sales order → reserve → invoice → collect → deliver/issue stock → return/credit | C-02, C-03, C-04, C-07; D1/D4/D5/D8; define partial quantities, reservation and negative-stock rules, return/restock/refund treatment. |
| Customer/product setup → opening balance/stock → sales and statements | C-08, C-09, C-19; D1/D2/D7/D10; opening balances require a reconciled posting process. |
| Multi-currency collections, transfers, invoices, dashboards and statements | C-07, C-10, C-15; D1; approve base currency and FX semantics. |
| User/role management → authenticated API → audited financial/stock action | C-03, C-16; approve role matrix and session model; enforce permissions server-side. |
| Supplier/container costs → supplier payments/payables | C-06, C-13; D3/D9; do not expose a supplier AP screen without its ledger. |
| Reports and exports | C-11, C-15; approve formulas, source states, date and currency basis, and access rules. |

## 5. Decisions required

The existing decision register must remain the source of truth; this plan
does not resolve these choices:

| Decision | Still needed | Schema consequences |
|---|---|---|
| D1 — Currency, tax, rounding | Base currency; tax jurisdiction/rates/inclusivity; precision; per-line vs invoice rounding; FX source and revaluation. | Currency/rate tables, tax snapshots, base amounts, constraints and report semantics. |
| D2 — Inventory costing | FIFO, weighted/moving average, or another accountant-approved method; timing of cost recognition. | Cost layers/consumption links versus valuation projection; COGS and stock-value reconciliation. |
| D3 — Landed-cost allocation | Value, quantity, weight, manual, or mixed; which costs capitalize; late cost and reversal behavior. | Allocation fields/basis, line weights if needed, receipt valuation links. |
| D4 — Credit limit | Warn, block, approval, and which balances/statuses count. | Usually service policy and audit events; possibly approval records/limit snapshots. |
| D5 — Posted invoice edits | Immutable plus reverse/reissue, or controlled amendments. | Reversal/credit-note lineage and immutable snapshots; avoid destructive updates. |
| D6 — Markup visibility/ownership | Who sets/sees buy/sell cost and markup; required history. | Price/cost history and permission controls. |
| D7 — User/actor model | Whether named prototype actors, drivers, and counterparties are users, employees, contacts, or labels. | Foreign keys and actor snapshots; avoid incorrect FK to `users`. |
| D8 — Orders/deliveries | Whether in release scope; fulfillment states; partial delivery/invoice; reservation; issue-only/delivery-only. | Source links, quantity allocations, reservations, movement linkage, states. |
| D9 — Supplier/AP | Container-cost supplier only or full purchasing/payables. | Supplier invoices, credits, payments, allocations, payable ledger or explicit exclusion. |
| D10 — Customer uniqueness | Uniqueness by name, tax ID, phone, code, or tenant/company. | Unique keys and duplicate-resolution/import rules. |

Additional approvals needed from the architecture gap register: permission
matrix; return/refund/replacement policy; stock reservation and negative-stock
policy; journal templates; opening-balance/cut-off; report formulas; session
versus token API model; file upload/storage; single-company versus
multi-company/tenant scope. Each decision should have a named approver and
should be recorded before schema/API contracts depend on it.

## 6. Recommended review sequence and acceptance checklist

1. **Scope and decisions:** settle D1–D10 and the additional approvals above.
   Explicitly defer any out-of-scope workflow rather than modeling it
   incompletely.
2. **Correct core lineage:** revise container receipt lines and the
   order/invoice/delivery/stock quantity chain; define typed source relations
   and reversal/idempotency keys.
3. **Settle accounting and inventory:** approve journal templates, valuation,
   landed-cost capitalization/allocation, collections/unapplied cash,
   opening balances, returns, FX, and report formula dependencies.
4. **Revise a new proposal revision:** update a copy/new version of the DDL and
   ERD, document changes and decision references, and retain this review plan
   and the current proposal for comparison. Do not silently overwrite or
   treat this plan as approval.
5. **Validate offline:** execute candidate DDL only in a disposable local
   matching MySQL version after explicit authorization; test FK/unique/check
   constraints, migration ordering, transaction boundaries, reversal paths,
   and reconciliation queries. Never use production for proposal validation.
6. **Review authorization and deployment fit:** validate role/permission
   matrices, session/CSRF handling, audit coverage, exact host PHP/MySQL
   versions, charset, SQL mode, backups, and restore procedure.
7. **Approval gate:** obtain database and business-owner approval for the
   revised ERD/DDL, then separately authorize application implementation and
   any migration. Schema review approval alone is not production deployment
   authorization.

Before a revised proposal is approval-ready, confirm:

- [ ] Every posted stock quantity traces to a typed source line and has an
      exactly-once posting/reversal strategy.
- [ ] Ordered, reserved, invoiced, delivered, returned, canceled, and
      remaining quantities reconcile for approved order scope.
- [ ] Container expected/received/discrepant quantities reconcile to receipt
      movements and landed-cost valuation.
- [ ] Receipt allocations, unapplied cash, customer balances, journal balance,
      and currency compatibility have explicit rules and transaction tests.
- [ ] Opening balances, posted-document immutability, and correction paths
      preserve an auditable ledger.
- [ ] Every required UI field is either persisted, deliberately derived, or
      explicitly removed from scope.
- [ ] Every report has an approved formula and source-state/currency basis.
- [ ] Exact engine/runtime compatibility is documented and candidate DDL
      passes offline validation.
- [ ] The revised proposal remains marked unapproved until written approval.

## 7. Boundaries and non-actions

- This report does not alter the 40-table proposed SQL or the ERD.
- No SQL was run; no production database was contacted.
- No migration, application code, API endpoint, package, or UI was created by
  this report.
- Nothing in this plan approves a financial, tax, costing, permission, or
  inventory policy.
- The recommended next artifact is a separately versioned revised proposal
  after decisions are signed off, not an implementation migration.

## 8. Source references

- [UI-to-schema traceability audit](./precision_slate_ui_database_traceability_audit.md)
- [Proposed MySQL DDL — review only](./precision_slate_proposed_mysql.sql)
- [Proposed ERD — review only](./precision_slate_proposed_mysql_erd.md)
- [Schema reconciliation and unresolved decisions](./precision_slate_proposed_mysql_design.md)
- [Backend decisions and gaps](../../../../docs/backend/architecture/backend-design/BACKEND_DECISIONS_AND_GAPS.md)
- [Backend transaction requirements](../../../../docs/backend/architecture/backend-design/BUSINESS_LOGIC_AND_TRANSACTIONS.md)
- [API client/integration flow](../../../../docs/architecture/backend-integration/API_CLIENT_SPEC.md)
- [Original MVP reference](../../../../frontend/reference/precision-slate-erp-v43__3_%20%281%29.html)
