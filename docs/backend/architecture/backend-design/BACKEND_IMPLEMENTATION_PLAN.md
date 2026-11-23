# Backend Implementation Plan

Decision baseline: [OWNER_DECISIONS_ALIGNMENT.md](./OWNER_DECISIONS_ALIGNMENT.md). v4.2 was approved as the migration baseline on 2026-10-10; MariaDB 10.6, minimum-version behavior, and production runtime remain NOT VERIFIED.

**Runtime target:** PHP 8.3 + Laravel 13, using the existing-schema approach. The Laravel 13 choice is supported by official PHP/database compatibility documentation; see [LARAVEL_13_SKELETON_PLAN.md](./LARAVEL_13_SKELETON_PLAN.md).

| Phase | Content | Depends on | Exit gate |
|---|---|---|---|
| 0 | Readiness, inspect proposals and owner decisions, confirm local runtime and record Laravel compatibility | owner/environment | Phase 0 report and progress-log entry |
| 1 | Produce portable v4.1 SQL/change log and constraint tests; execute on both disposable engines; report actual enforcement differences | credentials for local `erp_scratch` / `erp_test`; owner reviews results | Owner reviews validation results; schema remains unapproved until explicit approval |
| 2 | Laravel 13 application skeleton; preserve the historical v4.1 SQL-first migration and apply the approved additive v4.2 email-verification migration; roles/permissions development seed and tax-disabled/no-rate app settings seed | approved v4.2 schema and `backend/.env` | Fresh migrate and rollback tested on both engines; no demo business data |
| 3 | Backend foundation, error envelope, request IDs, redacted logging, Arabic validation, API versioning, health endpoint; authentication and deny-by-default authorization | permission matrix; session/CSRF topology decision | Login, permission denial and auth audit tests pass |
| 4 | Catalog, dated opening stock, inventory movement ledger, balance projection, weighted-average cost and no-negative-stock controls | confirmed stock/cost calculation details where needed | Concurrent movement, balance reconciliation and exact cost tests pass |
| 5 | Containers, single/multiple receipt events, receipt-line stock lineage, landed-cost allocation, cost payment and receipt reversal | landed-cost eligibility/late-cost decisions | Receipt/stock/cost reconciliation passes |
| 6 | Customers, invoices, returns, collections, issue-time tax snapshot and reverse-and-record invoice revisions/history | tax convention, remaining rounding, return/refund and revision details | Posting/idempotency/history/reconciliation tests pass |
| 7 | Full-fulfillment-only orders and deliveries with source lineage | remaining state/reservation/issue-point details | Partial paths rejected; full paths and no-duplicate-stock tests pass |
| 8 | Treasury, expenses and paired transfers through the journal-posting interface | accountant approval of journal templates and accounting periods | Accountant-approved posting rules and balanced tests |
| 9 | Decided derived reports, hourly Cron backups, retention/encryption/alerts, off-host daily copy, tested scratch restore, Hostinger compatibility report | approved report formulas and hosting facts | Restore drill and hosting checks verified |

## Constraints

- Do not use or modify `system_end`; use only explicitly selected `erp_scratch` and `erp_test` on local engines. Never guess the MariaDB password.
- Do not edit schema proposals v1–v4.1. v4.2 is the approved forward baseline; later compatibility or business changes require a new reviewed schema version.
- Never let ORM-generated migrations define the schema. Existing-schema mode and exact SQL-first reproduction are mandatory.
- Shared hosting has no root access or persistent queue workers; plan for Cron and safe `public_html` routing.
- Stop after Phase 1 for owner review, at any unresolved business decision, if required software installation is needed, and before Phase 8 for accountant input.

Detailed folder layout and hosting gates: [LARAVEL_13_SKELETON_PLAN.md](./LARAVEL_13_SKELETON_PLAN.md). This document is a plan; no Laravel source, migrations, seeds, application endpoints, or deployment were created in this Phase 1 preparation step.
