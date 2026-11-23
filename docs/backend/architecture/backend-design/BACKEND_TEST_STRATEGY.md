# Backend Test Strategy

Decision baseline: [OWNER_DECISIONS_ALIGNMENT.md](./OWNER_DECISIONS_ALIGNMENT.md). Design only; schema approval and runtime behavior NOT VERIFIED.
Tooling [PROPOSED]: PHPUnit/Pest, Laravel HTTP tests, a **separate disposable MySQL/MariaDB test database** loaded from the approved DDL once supplied (never the production DB). Tests never run migrations against production.

| Layer | Scope | Examples |
|---|---|---|
| Unit | Money/rounding, status derivation, policies | nearest-piastre invoice-line vectors (OD-18); tie cases/calculation order await specification |
| Integration (DB) | Repositories and services with real DB | post-invoice rollback if movement insert fails; unique number; ledger-derived balance |
| Concurrency | Two parallel posts of last unit (no negative stock); duplicate receipt event while later partial receipts allowed; duplicate idempotency key; concurrent invoice revision | no duplicate effects; one last-unit consumer; safe same-request replay; valid later receipt events succeed |
| API/Feature | Every endpoint: validation 400, 401, 403, 404, 409, 422, success | RBAC matrix test generated from route list |
| Security | Login throttling, CSRF/CORS, no secrets in responses/logs, SQLi probes | |
| Reconciliation | Stock = Σmovements; customer balance = docs − allocations; debit = credit; treasury = Σentries | run nightly + in CI on fixtures |
| E2E scenario | Blueprint §15: customer+product+location → opening stock → draft → post → partial receipt → second receipt → good return / damaged return → reconcile → unauthorized user rejected | |
| Schema guard | Read-only check live schema == approved mapping; CI fails on migration files | |
Acceptance: all above pass; expected values come from business-approved examples, not from the code under test.

## Owner-decision acceptance cases (future tests, not executed)
- OD-10: owner edits a posted invoice, reverses stock/receivable/journals, posts new effects, retains both versions and every field/old/new/actor/time/reason (including tiny changes and line additions/removals). Fault injection must roll back all effects/history; stale revision and replay must not double-post.
- OD-13/15: only owner edits/reverses/corrects; two designated issuers create invoices; others cannot mutate. Cost/markup/profit hidden from non-owner list/detail/print/report/export/history responses. Issuer-post grants/logins remain OPEN.
- OD-8: full order invoicing and delivery succeed; partial attempts rejected; lineage and one stock issue verified. OD-20 container partial receipt still succeeds separately.
- OD-3/4/6/18: weighted-average quantity/value/cost snapshot reconciliation; only value/quantity/manual bases; tax enabled/rate snapshotted at issue, later settings preserve past snapshots; exact EGP nearest-piastre per-line rounding. Expected tax and reversal values require approved accountant examples.
- OD-9/19: no purchase/AP or currencies/FX endpoints; changing optional foreign evidence never changes EGP totals, allocation, valuation or journals; container_cost_payments retained.
- OD-11/12/14/16/17: linked-return quantity limits and free nullable-link returns; dated identifiable opening postings; credit warning never blocks; unique phone/non-unique names once normalization approved; concurrent nonnegative stock validation plus target CHECK once engine validated.

This is a test plan only. No SQL, DB connections, application tests or compatibility claims are part of the refresh.
