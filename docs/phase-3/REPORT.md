# Phase 3 — Accounting workflows

**Status: COMPLETE.** All requested gaps are implemented, tested against Laravel and MariaDB, exercised through Playwright, and checked against persisted database rows. Work was performed on `codex/precision-slate-accounting-workflows-20261030`.

## Gap results

| Gap | Status | Delivered behavior |
|---|---|---|
| GAP-0005 — Chart of accounts | DONE | Real parent/child account tree, create/edit, cycle prevention, and protection for accounts already used by posted entries. |
| GAP-0007 — Journal entries | DONE | Dynamic debit/credit lines, exact balance and visible difference, invalid draft rejection, policy-protected posting, idempotent posting, immutable posted entries, and reversal by a new posted entry. |
| GAP-0008 — General ledger | DONE | Account and date filters; posted entries only; opening balance, period debit/credit, closing balance, and links to journal details. |
| GAP-0009 — Trial balance | DONE | All accounts remain visible, with period and closing totals. An imbalance and its difference are explicitly reported. |
| GAP-0010 — Financial statements | DONE | Income statement, balance sheet, and cash flow derived from posted journal activity and treasury-linked lines for the requested period/as-of date. Totals are reconciled to ledger/trial-balance values. |
| GAP-0006 — Financial adjustments | DONE | Reference and reason, idempotent creation, one balanced posted journal, treasury impact in the same transaction, and an audit/effect detail view. |

## Files delivered

- Database: `backend/database/migrations/2026_10_30_000003_add_accounting_adjustment_workflows.php`, `backend/database/migrations/2026_10_30_000004_add_adjustment_treasury_links.php`.
- Backend: `backend/app/Models/ChartOfAccount.php`, `JournalEntry.php`, `JournalLine.php`, `FinancialAdjustment.php`; `backend/app/Policies/AccountingPolicy.php`; `backend/app/Services/AccountingService.php`; `backend/app/Support/AccountingAmount.php`; `backend/app/Http/Controllers/AccountingController.php`; `backend/routes/api_v1.php`; `backend/app/Providers/AppServiceProvider.php`; `backend/database/seeders/RolePermissionMatrixSeeder.php`.
- Acceptance data and tests: `backend/database/seeders/AccountingAcceptanceSeeder.php`, `backend/tests/Feature/AccountingApiTest.php`, `backend/tests/Unit/AccountingAmountTest.php`.
- Frontend: `frontend/src/features/finance/AccountingPages.tsx`, `accountingApi.ts`, chart/adjustment wrappers, `frontend/src/features/reports/FinancialReportPage.tsx`, `ReportsPage.tsx`, `frontend/src/features/finance/FinancePage.tsx`, `frontend/src/app/App.tsx`, `frontend/src/app/layouts/AppShell.tsx`, `frontend/src/shared/api/http.ts`, and accounting rules in `frontend/src/styles/global.css`.
- Frontend verification: `frontend/tests/integration/accounting.test.tsx`, `frontend/e2e/accounting.spec.ts` (wired into Playwright global setup).
- Decisions: `docs/DECISIONS.md` now records the accounting rules and their implementation semantics.

## Verification performed

Migrations were additive and applied to the dedicated MariaDB acceptance database. `php artisan migrate:status` reported both `2026_10_30_000003_add_accounting_adjustment_workflows` and `2026_10_30_000004_add_adjustment_treasury_links` as **Ran**. No existing migration was edited and no `DROP`/`TRUNCATE` was used.

Successful commands and results:

```text
php artisan test --filter=AccountingApiTest       PASS — 5 tests, 57 assertions
php artisan test --filter=AccountingAmountTest    PASS — 2 tests, 5 assertions
npm run typecheck                                 PASS
npm test -- --run tests/integration/accounting.test.tsx
                                                  PASS — 3 component tests
npm run test:e2e:reservations -- --grep "real accounting flows"
                                                  PASS — 1 Playwright test
```

The browser run used the real Laravel API and MariaDB database `erp_acceptance_tests`, with the dedicated `AccountingAcceptanceSeeder` fixture and `CACHE_STORE=file` because that acceptance database does not provide Laravel's cache table. The test created and edited an account, created and posted an opening journal and revenue journal, checked the ledger and trial balance, opened all three statements, reversed the revenue journal, and created a treasury-linked expense adjustment. It asserted statement totals against exact-decimal sums from the trial balance and the cash-flow rows.

## Persisted database evidence

After Playwright completed, a direct MariaDB query confirmed:

- Journal entry IDs 15, 16, and 17 were persisted as `posted`. Entry 15 recorded debit 200.0000 to the fixture cash account and credit 200.0000 to equity; entry 16 recorded 25.0000 revenue; entry 17 has `reversal_of_entry_id = 16` and the inverse debit/credit rows.
- Financial adjustment ID 3 (`ACCEPTANCE-ADJ-1`) persisted for 10.0000 and references posted journal entry 18. One `financial_adjustment.posted` audit row contains actor user 2 and its timestamp.
- Fixture treasury account 14 contains four posted accounting-sourced entries: 200.0000 in, 25.0000 in, 25.0000 out for the reversal, and 10.0000 out for the adjustment. Its observed closing balance and the fixture cash-account ledger closing balance are both **190.0000**.
- The real API returned a balanced trial balance and a balanced balance sheet. Statement asset totals equalled the sum of asset closing balances in the trial balance; cash-flow closing equalled its treasury-account closing rows.

The acceptance database already contained fixture rows from earlier successful/aborted acceptance runs. They were retained; global statement totals include those rows, and the Playwright reconciliation compares global statement totals against the same-period trial balance instead of assuming a pristine database. The current seeded treasury and cash account were still checked independently at 190.0000.

## Screenshots

Screenshots captured from the successful real-browser run are in `docs/phase-3/screenshots/`:

- `account-chart.png`
- `journal-form-opening.png`, `journal-opening-posted.png`
- `journal-form-revenue.png`, `journal-revenue-posted.png`
- `ledger-period.png`, `trial-balance.png`
- `financial-statements.png`, `cash-flow-statement.png`
- `journal-reversal-posted.png`, `adjustment-audit.png`
