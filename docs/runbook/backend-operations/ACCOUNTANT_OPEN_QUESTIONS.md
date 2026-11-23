# Accountant decisions required before Phase 8

These questions are intentionally unresolved. Do not infer accounting policy
from current operational behavior.

1. **Journal entries and posting model:** Which accounts and debit/credit
   entries are required for invoice issue, returns, collections, container
   costs/payments, inventory receipts, opening balances, adjustments, and
   reversals? What are the posting dates, periods, and close/lock rules?
2. **Sales tax:** Confirm whether tax is enabled, the applicable rate, and
   whether prices are inclusive or exclusive. The current configurable setting
   defaults to off; each invoice line snapshots the issue-time tax settings.
3. **Container cost types:** For each freight/customs/handling/insurance/
   brokerage/other cost type, decide whether it is included in inventory cost.
   Defaults are configurable; no type is treated as accountant-approved by
   this document.
4. **Late costs after receipt:** The implementation records and displays costs
   entered after receipt but does not change historical inventory cost.
   Confirm whether those costs remain period expense or require an approved
   accounting adjustment workflow.
5. **Cost allocation policy:** Confirm the per-container choice of value,
   quantity, or manual allocation, treatment of partial receipts, and
   acceptable deterministic rounding-residual assignment.
6. **Sales and profit reports:** Define revenue, discount, tax, return,
   COGS, gross profit, and markup formulas, including whether tax is excluded
   from revenue and how revisions/returns are attributed.
7. **Inventory valuation reports:** Define as-of-date weighted-average
   valuation, treatment of reversals/negative-stock prevention, damaged stock,
   and any reconciliation tolerance.
8. **Customer balances and statements:** Confirm debit/credit sign
   presentation, opening receivables, returns, unapplied receipts, write-offs,
   and statement cut-off rules.
9. **Treasury and container-cost settlement:** Confirm how linked treasury
   entries settle cost liabilities and whether partial payments, refunds, or
   exchange-rate references have any accounting effect. Current original
   amount/exchange-rate fields are reference-only and EGP is the calculation
   currency.
10. **Period close and corrections:** Define who may reopen a closed period,
    whether corrections must use reversals/reposting, and required audit
    evidence or approval thresholds.

Phase 8 and accounting reports remain blocked until these answers are supplied
and translated into approved rules and tests.
