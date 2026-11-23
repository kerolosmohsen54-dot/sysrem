# Backend report

## Scope and verification legend

This describes `backend/`. Static source checks were run during cleanup with PowerShell file inventories and `rg` against route, migration, controller, and seeder files. No Laravel command was run during cleanup because it could load the protected `backend/.env`; no database-backed suite was run because the task prohibits database writes. Therefore current runtime checks are marked NOT VERIFIED even when earlier dated evidence exists.

## Contents and modules

- Laravel application and dependencies: `backend/app/`, `bootstrap/`, `config/`, `lang/`, `public/`, `resources/`, `routes/`, `storage/`, and retained `vendor/`.
- Database code: 32 migration files under `backend/database/migrations/`, seeders and factories under `backend/database/`, schema snapshot under `backend/database/schema/` (copied to `database/schema/precision_slate_v4_1.sql`).
- Tests: 33 `*Test.php` files under `backend/tests/` at cleanup inventory time.
- Static inventory: 35 controller PHP files, 14 service PHP files, 8 middleware PHP files, and 1 file under `backend/app/Models/` (the app uses query-builder patterns extensively). Command: `Get-ChildItem ... -Recurse -Filter '*.php' | Measure-Object`; result as stated. VERIFIED (file inventory), not proof of runtime coverage.
- Routes are declared in `backend/routes/api_v1.php`. The current static route audit parsed `backend/routes/api_v1.php`, expanded `Route::match`, and Symfony-parsed `backend/docs/openapi.yaml` without booting Laravel or reading `.env`: **180 route operations, 180 OpenAPI operations, 180 matched, 0 missing, 0 orphan** (VERIFIED by the output-only temporary copy of `docs/integration/route_openapi_audit.php`; the existing audit report was not overwritten). `artisan route:list` was not run.
- Permissions and roles are seeded by `backend/database/seeders/RolePermissionMatrixSeeder.php`; middleware includes session, permission, CSRF, step-up, mobile token, and request controls. VERIFIED (source inspection).

## Test and contract status

| Item | Status |
|---|---|
| MySQL full suite | Prior report `docs/integration/FINAL_SYSTEM_REPORT.md`: `vendor/bin/phpunit --no-progress --colors=never`, `mysql_test` / `erp_test`: 187 passed, 2,631 assertions. Current cleanup run: NOT VERIFIED (not run; database writes prohibited). |
| MariaDB full suite | Prior report: same command on `mariadb_test` / `erp_test`: 187 passed, 2,631 assertions. Current cleanup run: NOT VERIFIED. |
| Constraint suite | Prior `docs/backend/BACKEND_COMPLETE.md`: `php scripts/run-phase1-constraints.php mysql_test` and `... mariadb_test`: 21 passed, 0 failed each. Current run NOT VERIFIED. |
| Fresh-from-zero migration | Historical reports record a successful fresh install on `erp_test`; not repeated. Current state NOT VERIFIED. |
| OpenAPI | `backend/docs/openapi.yaml` exists, declares OpenAPI 3.1.0 and version 1.2.0 (static check VERIFIED). Current static parse and parity check: PASS, 180/180 operations matched; this does not replace runtime route boot verification. |

## Completeness

Implemented source includes authentication and authorization, sales, inventory, containers, treasury, customers, suppliers/purchases, partners, warehouse returns, reference catalogs, mobile capture, and reporting. Whether each workflow is complete is NOT VERIFIED by this file inventory; consult `docs/integration/FINAL_SYSTEM_REPORT.md` and `docs/integration/BACKEND_COMPLETION_PROGRESS.md` for dated acceptance results and gaps. High-risk unresolved items documented there include accountant decisions and live end-to-end coverage.
