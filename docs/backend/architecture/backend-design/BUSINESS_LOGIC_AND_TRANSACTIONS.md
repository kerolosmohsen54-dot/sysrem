# Business Logic & Transactions

Decision baseline: [OWNER_DECISIONS_ALIGNMENT.md](./OWNER_DECISIONS_ALIGNMENT.md). Design only; schema approval and runtime behavior NOT VERIFIED.

Design only. Follow [OWNER_DECISIONS_ALIGNMENT.md](./OWNER_DECISIONS_ALIGNMENT.md); undecided details remain OPEN.

## Historical prototype observations
Browser invoice totals/stock/customer balance mutations, noTax:true despite VAT displays, several local stock stores and isReturn invoice records are historical prototype findings.

## Transactions
| Workflow | Atomic effects | Locks / open detail |
|---|---|---|
| Post invoice | Global sales_tax enabled/rate snapshots on every line at issue; exact EGP totals rounded to nearest piastre per line; stock-out, receivable and approved journal/COGS effects, audit/idempotency | Document/stock rows in stable order; tax formula, journals and valuation algorithms OPEN |
| Edit posted invoice | Owner permission; retain old version; reverse old stock/receivable/journal effects; record/post new version; keep both with revision linkage; every field change records field, old value, new value, actor, time, reason | Current version, affected stock/financial rows; all effects/history commit or rollback together; reject stale revision; allocation/delivery reconciliation OPEN |
| Reverse/correct | Owner-only compensating effects and mandatory reason/history; retain original evidence | Document/balance rows; reversal/journal templates OPEN |
| Return | Original invoice-line link nullable; validate linked quantities against remaining returnable quantity; free returns allowed; stock/credit/audit effects | Origin lines when linked and stock rows; valuation, tax, refunds and disposition OPEN |
| Collection | EGP receipt, treasury effects, bounded allocations, audit/idempotency | Invoice/treasury; allocation/refund policy and rounding outside invoice lines OPEN |
| Stock transfer/adjustment | Atomic movement legs; nonnegative final stock; reason/audit and approved financial effects | Affected balances; adjustment accounting OPEN |
| Expense/treasury transfer/void | EGP entries; reversals through compensating effects | Treasury; journals OPEN |
| Container receipt | Receipt event/lineage, stock-in, weighted-average/value snapshots, eligible allocations, approved journals | Container/stock; single/multiple/partial receipts supported; deduplicate event/request, never reject just because another receipt exists |
| Full order fulfillment | Invoice and deliver every ordered quantity in full; preserve order -> invoice -> delivery -> stock lineage; prevent duplicate stock issue | Order/document/stock; reservation/state/issue point OPEN; partial invoicing and delivery prohibited |
| Opening balances | Dated distinguishable opening receivable documents, product/location stock movements and treasury effects, with actor/reason/audit | Cut-off/reconciliation/sign-off OPEN; no fixed opening columns |

## Invariants
- Posted invoices ARE editable via reverse-and-record; no immutable-document business rule. Both versions, prior effects and history remain retained.
- Every edit, however small, records field/old/new/who/when/reason. Reuse audit_logs where adequate; final revision/history mapping awaits approved v4 design.
- Owner alone edits/reverses/corrects. Two designated issuers may create invoices; everyone else cannot modify anything. Cost/markup/profit owner only.
- Operational money/calculations EGP and exact decimals; quantities whole units. Foreign references never feed totals, allocation, valuation, journals or reports.
- No negative stock: lock, check, write movements and update balances atomically. Target CHECK quantity_on_hand >= 0 complements service validation; implementation/enforcement NOT VERIFIED.
- Weighted-average stock projections and movement unit/extended-cost snapshots; no FIFO/serial model. Cost update/reversal/return algorithms still need accounting specification.
- Landed-cost basis value, quantity or manual, never weight. Eligibility, late costs and residual treatment remain OPEN.
- Global sales_tax setting has no inferred default. Snapshot enabled/rate per line at issue; later settings cannot recalculate past lines. New revision snapshot policy OPEN; old snapshots retained.
- OD-18: nearest piastre (2 decimals) per invoice line; does not select tie-breaking, calculation sequence, tax convention or other workflow rounding.
- Credit limits warn only, never block; warning evidence persistence is proposed pending mapping.
- Suppliers are container-cost counterparties only; keep container_cost_payments, no purchase invoices/AP ledger.
- Exactly-once effects must be scoped per receipt event and invoice version, allowing later partial receipts and later invoice edits.
- Customer phone unique, name non-unique; normalization OPEN. Reports remain derived from reconciled sources.

No SQL or application/transaction tests were executed during this refresh.
