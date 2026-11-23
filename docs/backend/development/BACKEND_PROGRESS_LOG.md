# Backend Progress Log

## HANDOFF — READ THIS FIRST
- Current phase: Android companion phases 1 and 2 are committed as `5f894400df2054acbecd25ec50bbd0b62fb18ca3`.
- Search/cleanup: inventory saved in `docs/mobile/MOBILE_SEARCH_REPORT.md`; the unrelated moved Expo demo was deleted only after backup counts matched.
- Built: URL/login, account management, encrypted token, sync/ping, Room cache/offline write queue, sender matcher and outbox unit tests.
- Verified: XML manifest parses, repository static checks pass; NOT VERIFIED: build/tests because JDK, Gradle, and SDK Platform 35 are unavailable. SDK Platform 37/Build Tools 36.0.0 exist.
- Next: hand off open contract decisions; phases 3–8 were not built.

## CURRENT STATUS
- Current phase: Frontend Figma Part 2B — pages 9–15 are next; not started; MSW remains enabled.
- Last completed phase: Frontend Figma Part 2A — pages 1–8 committed as `b3f36e28248944d67522a4200ec1ec4397ba6f38`.
- Blockers/limitations: Pages 1, 3–8 and page 4 differ from the reference; page 2 invalid-login state is NOT VERIFIED; contract gaps are listed in `docs/frontend/FIGMA_PARITY_REPORT.md`. Database NOT ACCESSED; backend and mobile application unchanged.

## Phase 4 progress — v4.2 email-verification schema proposal drafted

**Date/time:** 2026-10-10 12:43 +03:00

### What changed
- Created a separate `database/proposals/proposed-mysql-review-v4.2/` proposal using copies of v4.1 files; no v4.1 or earlier schema file was edited.
- Added nullable `users.email_verified_at DATETIME` and a CHECK preventing a verification timestamp when the email is NULL.
- Added v4.2 positive/negative verification-marker cases to the copied constraint suite.
- Added `SCHEMA_V4_2_CHANGE_LOG.md` documenting intent, changed schema, inherited/added feature floors, proposal-only status, and unverified validation.

### Commands and actual results
- `git status --short` — showed only the pre-existing untracked `PROJECT_STATUS_HANDOFF.md` and the new v4.2 proposal folder before drafting. The pre-existing handoff file was not modified or staged.
- Inspected v4.1 DDL and change log to retain portability patterns and minimum-version inventory.
- MySQL v4.2 DDL/tests: **NOT VERIFIED** at this checkpoint.
- MariaDB v4.2 DDL/tests: **NOT VERIFIED** at this checkpoint.
- Existing v4.1 constraint baseline remains MySQL 8.4.3 17/17 and MariaDB 13.0.2 17/17 as recorded above; no v4.2 result is inferred from that baseline.

### Problems, deviations, and open questions
- Validation must not overwrite a populated schema or rely on destructive cleanup. Inspect exact approved database targets before deciding how to safely apply the proposal.
- Application enforcement to clear `email_verified_at` when an email changes remains a future workflow requirement; no trigger or application migration is included in this proposal-only step.
- No deviation from the owner-approved scope. The proposal remains explicitly unapproved pending review.
- Open owner decisions remain production frontend/API topology, issuer identities and permissions, and accountant input before Phase 8.

### Commit and next step
- Commit hash: pending.

## Phase 2 follow-on — v4.2 migration static checks

**Date/time:** 2026-10-10 12:52 +03:00

### Commands and actual results
- `php artisan test --filter=ApprovedSchemaArtifactTest` — **3 passed, 12 assertions**. The first test-runner tool attempt reported no tests found for the absolute file argument; using the repository's Artisan runner resolved the discovery mismatch.
- Initial `vendor/bin/pint --test` on the changed migration/test files — failed because the new code had formatting differences. Ran Pint on only those two files; rerun `vendor/bin/pint --test` — **passed**.
- Pre-migration state query on MySQL 8.4.3 `erp_scratch`: selected database/version were correct; v4.2 marker column and CHECK each existed from proposal validation; Laravel `migrations` table did not exist.
- Same query on MariaDB 13.0.2 `erp_scratch`: same state (v4.2 marker and CHECK exist; no migration repository). No `erp_test` schema was modified.
- Laravel migration up/down/up: **NOT VERIFIED** at this checkpoint.

### Problem and next step
- Fixed the Pint formatting findings using the project's formatter; all focused artifact tests pass. Before testing Laravel's migrator, drop only the known v4.2 marker/check from the two empty scratch schemas, establish the historical v4.1 migration record, and then test up/down/up. Guard every operation to `erp_scratch`; never rerun the original CREATE DDL there.
- Commit hash: v4.2 migration code `08f654d` (full hash pending hash addendum); this test/log update pending.

## Phase 4 — v4.2 approval commit hash addendum

**Date/time:** 2026-10-10 12:52 +03:00

- **Commit hash:** `97041d1078547eca3bac3ab6fb84a70b15f23e34` — records the owner's approval of v4.2 as the migration baseline and updates the proposal status/handoff.
- **Next step:** Preserve the v4.1 migration and add a forward-only v4.2 migration; verify on MySQL and MariaDB.

## Phase 2 follow-on — v4.2 additive Laravel migration authored

**Date/time:** 2026-10-10 12:52 +03:00

### What changed
- Added `backend/database/migrations/2026_10_10_000001_add_v4_2_email_verification_to_users.php`. It adds nullable `users.email_verified_at` plus the named CHECK using explicit SQL, supports the MySQL and MariaDB migration drivers, and has a forward rollback that drops the marker and its data.
- Kept the original v4.1 migration and v4.1 schema snapshot untouched.
- Added a focused artifact test binding the approved v4.2 proposal delta to the application migration.
- Updated the implementation/skeleton plans to reflect the owner-approved v4.2 forward baseline.

### Commands and actual results
- Inspected existing Laravel migration, schema-artifact test, database configurations, and plans before editing.
- Migration execution, rollback, and focused tests: **NOT RUN** at this checkpoint.
- No database was accessed for these code edits.

### Problems, deviations, and next step
- Existing `erp_scratch` schema already has the additive marker from proposal validation but no Laravel migration repository. Validation must first return only the two scratch schemas to their v4.1 shape and seed the already-applied v4.1 migration record, avoiding re-execution of its full CREATE/ALTER DDL.
- Rollback intentionally drops `email_verified_at`; this is recorded in code because verification timestamps would be lost on rollback.
- Next: validate the migration's up/down/up path on MySQL and MariaDB `erp_scratch`, then run focused tests. Do not touch `erp_test` or `system_end`.
- Commit hash: pending.
- Next step: inspect safe state and validate v4.2 only on MySQL/MariaDB `erp_scratch` or `erp_test`; then update this handoff with real counts/differences and stop for owner review.

## Phase 4 progress — safe validation-target inspection

**Date/time:** 2026-10-10 12:43 +03:00

### Commands and actual results
- `php artisan db:show --database=mysql --counts` from `backend` — succeeded; MySQL 8.4.3 connected to `erp_scratch`, 95 tables in the two allowed local databases, and all displayed `erp_scratch` tables had zero rows. `erp_test` contains existing Laravel/auth baseline data and was not selected for schema changes.
- `php artisan db:show --database=mariadb --counts` from `backend` — succeeded; MariaDB 13.0.2 connected to `erp_scratch`, 95 tables in the two allowed local databases, and all displayed `erp_scratch` tables had zero rows. `erp_test` contains existing Laravel/auth baseline data and was not selected for schema changes.
- Neither command accessed `system_end`; no credentials or environment-file contents were printed.
- Full v4.2 DDL reapplication into these existing, populated schemas would conflict with existing objects. Because `erp_scratch` is empty of rows but contains the validated v4.1 tables, the safe scoped validation is to apply only the new v4.2 field/constraint delta there and run the entire copied constraint suite. Fresh-instance DDL creation is therefore explicitly **NOT VERIFIED** by this approach; v4.1 base DDL had already passed on both engines.

### Problems, deviations, and next step
- No database error occurred. The deviation from clean-database full-DDL validation is necessary to avoid dropping/replacing existing schemas or touching non-approved database names.
- Next: apply the exact additive v4.2 schema delta to `erp_scratch` separately on each engine after guarding the selected database, run the v4.2 tests, and report all actual outcomes and behavior differences.
- Commit hash: pending.

## Phase 4 — v4.2 additive validation complete; owner review required

**Date/time:** 2026-10-10 12:43 +03:00

### What was built and validated
- v4.2 proposal files: `database/proposals/proposed-mysql-review-v4.2/precision_slate_proposed_mysql_v4_2.sql`, `PHASE1_CONSTRAINT_TESTS.sql`, and `SCHEMA_V4_2_CHANGE_LOG.md`.
- Schema delta: nullable `users.email_verified_at DATETIME`, documented administrator-confirmation semantics, and `chk_users_email_verification_requires_email`.
- The full v4.2 DDL was not reapplied as a fresh schema because the permitted database schemas already contain v4.1 tables; no drops/recreates were attempted. Instead, the exact additive column/comment/check delta was applied to each empty v4.1 `erp_scratch` and the full v4.2 copied constraint suite was executed.
- MySQL 8.4.3, port 3306, `erp_scratch`: **19/19 passed, 0 failed**.
- MariaDB 13.0.2, port 3307, `erp_scratch`: **19/19 passed, 0 failed**.
- All 19 functional accept/reject outcomes matched. MySQL returned `NULL` for expected rejection diagnostics in `observed_error`, whereas MariaDB provided its diagnostic messages; no acceptance/rejection behavior differed.
- Post-run verification on both engines: zero `phase1-*` users, zero `P1-*` customers, zero retained test procedures; marker is nullable `DATETIME` with the intended column comment and the named CHECK exists.
- `erp_test` was inspected but not modified. `system_end` was not accessed. `git check-ignore -v backend/.env` confirmed `backend/.gitignore:3:.env`; `git status --short -- backend/.env` was empty. No credentials were printed or added to the log.

### Commands run and actual outcomes
- `php artisan db:show --database=mysql --counts` — succeeded; connected to MySQL 8.4.3 `erp_scratch`; listed 95 tables across only the approved databases; displayed zero rows for each `erp_scratch` table.
- `php artisan db:show --database=mariadb --counts` — succeeded; connected to MariaDB 13.0.2 `erp_scratch`; listed 95 tables across only the approved databases; displayed zero rows for each `erp_scratch` table.
- First guarded `php artisan tinker --execute ...` attempts on each engine — failed with `InvalidArgumentException Unexpected end of input` before any database statement executed. A quoting-only retry failed with `Undefined constant "mysql"`; no schema changes occurred from these attempts.
- Used the installed MySQL client with explicit host/port/user/database, database-name preflight, marker-absence preflight, and `erp_scratch` target to apply the additive delta. MySQL and MariaDB both succeeded. The MariaDB client password was read into a process environment variable from the ignored backend `.env`; it was not output.
- `Get-Content -Raw database/proposals/proposed-mysql-review-v4.2/PHASE1_CONSTRAINT_TESTS.sql | mysql.exe ...` with explicit `erp_scratch`: MySQL output 19 `PASS`, `failed_tests=0`, exit 0; MariaDB output 19 `PASS`, `failed_tests=0`, exit 0.
- Post-run metadata/cleanup queries on each engine succeeded with zero residual fixtures/procedures and the expected marker/check metadata.
- `git check-ignore -v backend/.env` — ignored; `git status --short -- backend/.env` — empty.
- MariaDB 10.6 and MySQL 8.0.16 minimum behavior remain **NOT VERIFIED**. Fresh-instance full v4.2 DDL execution remains **NOT VERIFIED**; inherited complete v4.1 DDL was verified earlier on both local engines.

### Problems, deviations, and open decisions
- The Tinker CLI quoting issue was avoided by using explicit MySQL-client invocations with strict target guards; it caused no DB changes.
- Validation used the additive delta on the existing empty v4.1 scratch schemas instead of destructive reset/reapplication. This preserves prior data/schema objects and confirms the new feature/constraint on both engines; it does not establish fresh full-file execution.
- No observed v4.2 incompatibility required changing the proposal. No earlier version was edited.
- Owner review/approval of the v4.2 schema is now required. Production same-site/cross-site topology and issuer identities/permissions remain open; accountant input is required before Phase 8.

### Commit and next step
- v4.2 draft commit: `7ec269f20c4e50931ea6f1d0c2130e06f9cb4ca0`; validation evidence/change log: `13d53df47a2e997e0d8ceac98d66ae44e881facb`; handoff correction commit: pending.
- Next step: stop for owner review. Do not create an application migration or implement email reset until the owner decides on the proposal.

## Phase 0 — Environment and readiness

**Date/time:** 2026-10-10 10:57 +03:00

### What was built
- Added placeholder-only database settings for local MySQL and MariaDB to `.env.example`; no real credentials were read or recorded.
- Added this progress log and the Phase 0 compatibility/readiness report. No schema, application files, databases, tables, or endpoints were changed or created.

### Environment checks and actual results
- `git status --short; git log --oneline -15` — passed; only `PROJECT_STATUS_HANDOFF.md` was untracked before Phase 0. Recent history ends with `d6ed95d Add schema v4 proposal (unapproved)`.
- `Get-Content PROJECT_STATUS_HANDOFF.md` — read. It reports proposal/scaffold status; the v4 proposal is unapproved and no implementation phase is recorded as complete.
- `Test-Path .env` — `False`. `git check-ignore -v .env` — `.env` is ignored by `.gitignore:6`. `git status --short -- .env` — no result; `.env` is absent and not tracked.
- `php -v` using `C:\laragon\bin\php\php-8.3.33-Win32-vs16-x64\php.exe` — PHP 8.3.33, passed availability check.
- `php -m` using that PHP binary — all required extensions present: `pdo_mysql`, `mbstring`, `bcmath`, `intl`, `openssl`, `fileinfo`.
- Composer 2.10.2 invoked through Laragon's `composer.phar` — available.
- `mysqld.exe --version` — MySQL Community Server 8.4.3; binary path and running `mysqld` process identified. TCP listeners confirmed on ports 3306 and 3307.
- MariaDB Windows service/process inspection and `mysqld.exe --version` — service `MariaDB` is running; binary identifies MariaDB 13.0.2 on port 3307.
- Apache `httpd.exe -v` and process inspection — Apache 2.4.68; two `httpd` processes are running.
- `mysql` / `mariadb` command lookup — no client executable on PATH. A Laragon MySQL 8.4.3 client is present at `C:\laragon\bin\mysql\mysql-8.4.3-winx64\bin\mysql.exe`.
- Database connections and SQL were **NOT VERIFIED**: `.env` is absent, so no credentials were available. No connection was attempted, and neither `system_end` database was accessed.
- Production/Hostinger PHP, database engine/version, extensions, and shared-hosting routing were **NOT VERIFIED**.

### Framework selection and evidence
- Selected Laravel 12 for the PHP 8.2+ target: its official release notes list PHP 8.2–8.5 support. Laravel 13 requires PHP 8.3+, so it cannot support the stated PHP 8.2 production floor.
- Laravel 12's official database documentation lists MySQL 8.0+ and MariaDB 10.3+; therefore its documented database support includes the target MySQL 8.0+ / MariaDB 10.6+ floor. Laravel will use existing-schema mode; schema creation remains SQL-first, not ORM-generated.
- Official evidence: [Laravel 12 release notes](https://laravel.com/docs/12.x/releases), [Laravel 12 database documentation](https://laravel.com/docs/12.x/database), [Laravel 12 framework Composer requirements](https://raw.githubusercontent.com/laravel/framework/12.x/composer.json), [Laravel 13 framework Composer requirements](https://raw.githubusercontent.com/laravel/framework/13.x/composer.json).
- Lifecycle caveat: Laravel 12 security fixes end 2027-02-24. This is the compatible major for PHP 8.2, but hosting's PHP version and the framework lifecycle must be rechecked before implementation/go-live.

### Schema compatibility findings and feature/version report
- Static review of `database/proposals/proposed-mysql-review-v4/precision_slate_proposed_mysql_v4.sql` found explicit `utf8mb4_0900_ai_ci` on tables. MySQL 8.4 supports that collation; MariaDB does not provide the MySQL-specific collation. Replace it with the required `utf8mb4_unicode_ci` in a new v4.1 DDL only; do not edit v1–v4.
- The DDL contains JSON columns. MySQL's native JSON type and MariaDB's JSON alias/storage/validation behavior are not identical. v4.1 must use text-compatible storage as required, validate JSON in the application, and avoid engine-specific JSON behavior.
- Static review found CHECK constraints; target compatibility must rely only on enforced checks: MySQL 8.0.16+ and MariaDB 10.2.1+. The selected target floor (MySQL 8.0+ / MariaDB 10.6+) satisfies this only when MySQL is at least 8.0.16; confirm the exact MySQL minor version before claiming CHECK enforcement. MariaDB 10.6+ enforces them.
- Feature inventory for the portable DDL target (minimum versions below are the agreed compatibility floor, unless a constraint-enforcement minimum is stated separately):

| Feature relied on | Minimum MySQL | Minimum MariaDB | Compatibility note |
|---|---:|---:|---|
| InnoDB transactional tables, row locking, and foreign keys with RESTRICT/SET NULL/CASCADE actions | 8.0 | 10.6 | Required for atomic posting and referential integrity; validate on both engines. |
| Primary/unique/composite indexes; BIGINT UNSIGNED AUTO_INCREMENT keys | 8.0 | 10.6 | Identifier strategy remains an owner decision; these are proposed DDL constructs, not approved identity policy. |
| DECIMAL exact-money columns, ENUM columns, and utf8mb4 text | 8.0 | 10.6 | Avoid PHP floats; supported within the target floor. |
| `utf8mb4_unicode_ci` collation | 8.0 | 10.6 | Portable replacement for the current MySQL-only `utf8mb4_0900_ai_ci` reference. |
| `TIMESTAMP DEFAULT CURRENT_TIMESTAMP` and `ON UPDATE CURRENT_TIMESTAMP` | 8.0 | 10.6 | Used for create/update timestamps. |
| Enforced CHECK constraints | 8.0.16 | 10.2.1 | MySQL versions before 8.0.16 do not enforce CHECK constraints; MariaDB target 10.6+ does. The precise MySQL minor version must be confirmed. |
| JSON-compatible text storage (TEXT/LONGTEXT plus application JSON validation) | 8.0 | 10.6 | v4.1 must not depend on MySQL native JSON or MariaDB JSON-alias behavior. |

- No other feature newer than MariaDB 10.6 was identified in this static Phase 0 review. Full DDL parsing/execution and behavior comparisons on both engines are **NOT VERIFIED** and belong to Phase 1.

### Problems, fixes, and open questions
- Problem: `.env` is missing. Left open for the owner to create locally; `.env.example` contains placeholders only. `.env` remains git-ignored.
- Problem: v4 collation and JSON columns are portability risks. No earlier proposal was changed; v4.1 compatibility fixes are deferred to Phase 1.
- Open: exact Hostinger Premium MariaDB/PHP/extension versions; MySQL 8.4 exact server connection version; and the credentials needed to connect to the two local scratch engines.
- Open: Laravel 12's approaching security-support end date, to be revisited against the actual production PHP version.

### Commands/results and validation
- Environment/version and extension probes above returned the stated versions/results.
- Repository tests/builds: **NOT RUN**; Phase 0 is environment/readiness only and no backend implementation exists.
- Live engine SQL/schema/constraint checks: **NOT VERIFIED**; no credentials were available and no database was touched.

### Deviations from plan
- Did not connect to either database or inspect server variables because the required local `.env` credentials do not exist. This preserves the no-guessing credential rule and avoids touching the protected `system_end` databases.
- Phase 1 was not started; the owner requires gated phases and an explicit “continue”.

### Commit hash(es)
- This entry is written before the Phase 0 commit. Its commit hash will be recorded append-only in the next phase entry after the commit exists.

### Next step
- Owner creates `.env` locally using credentials for only `erp_scratch` and `erp_test` on the MySQL 8.4.3 and MariaDB 13.0.2 instances, then explicitly says “continue”. Phase 1 can then validate v4.1 on both scratch databases and must not connect to or modify either `system_end` database.

## Phase 0 — Readiness report addendum

**Date/time:** 2026-10-10 11:01 +03:00

1. **What changed:** Appended the required Phase 0 go-live caveat to this log; no schema, code, database, or endpoint changed.
2. **Commands/results:** `git status --short` showed only the owner-provided untracked `PROJECT_STATUS_HANDOFF.md` after the prior commit. `git check-ignore -v .env` confirmed `.env` remains ignored. No tests or database commands were run.
3. **Problems/fixes:** The Phase 0 report did not yet end with the explicitly required production engine/version warning. This addendum supplies it without altering the earlier entry.
4. **Deviations:** Append-only addendum instead of rewriting the original Phase 0 entry.
5. **Open questions:** Local `.env` credentials remain outstanding; production Hostinger engine/version remains unknown.
6. **Commit hash(es):** Prior Phase 0 commit: `d869d787976da91d11bfb058d50858b84a0ce506`. This addendum commit hash will be recorded in the next phase entry after the commit exists.
7. **Next step:** Owner creates `.env` for the approved scratch/test databases and says “continue”; then begin Phase 1 only.
8. **Required go-live caveat:** Engine and version on the real host must be confirmed before go-live

## Phase 0 — Framework target decision update

**Date/time:** 2026-10-10 11:06 +03:00

1. **What changed:** Owner changed the target to PHP 8.3 and Laravel 13. Official Laravel 13 release notes show PHP 8.3–8.5 support and security fixes through 2028-03-17. Official Laravel 13 database docs list MariaDB 10.3+ and MySQL 5.7+, so both required target floors (MariaDB 10.6+ and MySQL 8.0+) are included. Updated the root `.env.example` for the two explicitly allowed local scratch/test DBs with empty password values.
2. **Commands/results:** Opened `https://laravel.com/docs/13.x/releases` and confirmed the Laravel 13 PHP support range and support dates. Opened `https://laravel.com/docs/13.x/database` and confirmed its listed database minimums. Retrieved Laravel 13 framework `composer.json`; the PHP constraint is `^8.3`. The subsequent deployment config/test remains pending.
3. **Problems/fixes:** Previous Phase 0 selected Laravel 12 based on an 8.2 floor. This was superseded by the owner’s explicit PHP 8.3/Laravel 13 decision; Laravel 13 satisfies the official documented platform compatibility.
4. **Deviations:** None; no database connection or schema execution occurred in this decision update.
5. **Open questions:** Actual Hostinger PHP and DB versions remain to be confirmed before go-live.
6. **Commit hash(es):** Prior Phase 0 commits: `d869d787976da91d11bfb058d50858b84a0ce506`, `0e3634657bccb196e656e329cad6dc45c138644c`. This decision-update commit hash will be added in the next progress entry after the commit exists.
7. **Next step:** Prepare v4.1 and Laravel 13 skeleton plan without credentials; validate the scratch DDL on MySQL, then stop before MariaDB authentication for owner-supplied credentials.
8. **Evidence:** [Laravel 13 release notes](https://laravel.com/docs/13.x/releases), [Laravel 13 database documentation](https://laravel.com/docs/13.x/database), [Laravel 13 framework Composer requirements](https://raw.githubusercontent.com/laravel/framework/13.x/composer.json).

## Phase 1 — v4.1 preparation and MySQL checkpoint

**Date/time:** 2026-10-10 11:18 +03:00

### What was built
- Created `database/proposals/proposed-mysql-review-v4.1/precision_slate_proposed_mysql_v4_1.sql`, preserving the 47-table/3-alter v4 design while changing table collations to `utf8mb4_unicode_ci` and six JSON columns to application-validated `LONGTEXT`.
- Added `SCHEMA_V4_1_CHANGE_LOG.md` with the portable feature inventory and version minima, and `PHASE1_CONSTRAINT_TESTS.sql` covering the specified key constraints and Arabic utf8mb4 round-trip.
- Added `backend/docs/architecture/backend-design/LARAVEL_13_SKELETON_PLAN.md`; aligned the implementation plan, folder plan, architecture and hosting notes to PHP 8.3/Laravel 13 and shared hosting. No framework was installed or generated.
- Updated root `.env.example` for the local MySQL/MariaDB `erp_scratch` and `erp_test` databases. Created `backend/.env` from it with both password values empty. The local file is ignored and excluded from Git.

### Commands actually run and results
- Official docs fetched: `https://laravel.com/docs/13.x/releases` confirms PHP 8.3–8.5; `https://laravel.com/docs/13.x/database` confirms MariaDB 10.3+ and MySQL 5.7+; Laravel 13 framework Composer manifest requires PHP `^8.3`. The requested PHP 8.3 / MySQL 8.0+ / MariaDB 10.6+ target is supported.
- `git check-ignore -v backend/.env` — confirms `.gitignore:6:.env` ignores `backend/.env`. Password-field length probe returned 0 for both `DB_PASSWORD` and `DB_MARIADB_PASSWORD`; no environment contents or secrets were printed.
- MySQL client with `--no-defaults`, TCP port 3306, user `root`, empty password — created/confirmed only `erp_scratch` and `erp_test`. `SELECT VERSION(), DATABASE()` in `erp_scratch` returned MySQL `8.4.3` / `erp_scratch`.
- Piped v4.1 DDL into the `erp_scratch` connection — exit 0; all 47 tables and 3 `ALTER TABLE` statements completed.
- Piped `PHASE1_CONSTRAINT_TESTS.sql` into `erp_scratch` — **17 PASS, 0 FAIL**. Tests cover matching receipt container/product, delivery both/no source rejection and each single source accepted, negative balance rejection, duplicate customer phone, one inventory effect per source, unique document number, invoice posting once, FK RESTRICT and SET NULL, invoice revision shape/link/single successor, partial receipt follow-up, and Arabic utf8mb4 round-trip.
- First PowerShell result-check wrapper falsely flagged the string `failed_tests` due to a case-insensitive substring pattern despite SQL output showing all PASS. Corrected the wrapper and reran the SQL suite; it again returned **17 PASS, 0 FAIL**. This was a wrapper-only false alarm, not a database test failure.
- Follow-up `information_schema` query in `erp_scratch` — 47 tables, 46 check constraints, 1 distinct table collation, 0 residual test procedures. Customer fixture count was 0 after rollback.
- v4.1 transformation comparison — exact match with the expected v4-to-v4.1 collation/text-type/comment substitutions; 0 old collations and 0 JSON-typed columns. `git diff --check` — PASS.
- MariaDB connection, DDL and constraint tests: **NOT RUN**; no MariaDB credentials were guessed or used. `erp_test` was created/confirmed on MySQL but not populated. No `system_end` database was accessed.

### Problems found and resolution
- v4's MySQL-only `utf8mb4_0900_ai_ci` and native JSON types conflicted with the requested MariaDB portability boundary; v4.1 replaces them with `utf8mb4_unicode_ci` and `LONGTEXT` plus application-side JSON validation.
- No schema execution or constraint failure was found on MySQL 8.4.3. The test suite establishes only behavior on that local version, not on MySQL 8.0.16 minimum or MariaDB.
- MySQL CLI emits its standard warning when explicitly passed an empty command-line password option. No password value was present; subsequent database use remains restricted to scratch/test names.

### Deviations from the plan
- Stopped before MariaDB access because credentials must be supplied by the owner. Phase 1 remains incomplete until MariaDB validation is done and the owner reviews both-engine results.
- No migrations, seeders, API endpoints, Laravel source, or system software were created/installed.

### Open questions / owner action
- Before MariaDB validation, fill `DB_MARIADB_USERNAME` and `DB_MARIADB_PASSWORD` in local ignored `backend/.env`; `DB_MARIADB_HOST=127.0.0.1`, port `3307`, `DB_MARIADB_DATABASE=erp_scratch`, and test database `erp_test` are already set there.
- Existing v4 open business decisions remain open; no business rules were inferred or implemented. Hostinger engine/version remains unconfirmed.

### Commit hash(es)
- Previous decision-update commit: `ee6ec25` (Laravel 13 target and safe DB template).
- Phase 1 checkpoint files are recorded before commit; the resulting commit will be added by append-only log addendum.

### Next step
- Owner reviews the completed MySQL/MariaDB validation results and decides whether to approve Phase 1; do not begin Phase 2 before that review.

## Phase 1 — MySQL checkpoint commit record

**Date/time:** 2026-10-10 11:19 +03:00

1. **What changed:** Recorded the checkpoint commit containing the v4.1 DDL, change log, test SQL, Laravel 13 plan, environment template, and this progress entry.
2. **Commands/results:** `git diff --check` passed before commit. Commit `bb477099d3f38e3fc308c92025f45e8106b1be16` was created with per-command identity `Codex <codex@local.invalid>`. Post-commit `git status --short` showed only the pre-existing untracked `PROJECT_STATUS_HANDOFF.md`.
3. **Problems/fixes:** None. `backend/.env` remains ignored; it was not staged.
4. **Deviations:** This checkpoint is not Phase 1 completion; MariaDB remains untested pending owner credentials.
5. **Open questions:** Owner must fill `DB_MARIADB_USERNAME` and `DB_MARIADB_PASSWORD` in local `backend/.env`. No password should be sent in chat.
6. **Commit hash(es):** `bb477099d3f38e3fc308c92025f45e8106b1be16`. This log-only addendum commit will be recorded in the next phase entry.
7. **Next step:** MariaDB validation completed in the subsequent Phase 1 entry; owner review is required before Phase 2.

## Phase 1 — MariaDB validation and owner review gate

**Date/time:** 2026-10-10 11:27 +03:00

### What was built
- No schema DDL change was required. Updated the v4.1 change log with MariaDB execution and constraint-test results.
- `backend/.env` was populated only with the owner-provided local MariaDB connection values. It is ignored by Git (`git check-ignore backend/.env` returned `backend/.env`); it did not appear in `git status`. No credentials were copied into tracked files or output.
- MariaDB `erp_scratch` contains the 47 v4.1 tables and 46 CHECK constraints. `erp_test` remains empty. The test procedure and customer fixtures were not retained.

### Commands actually run and results
- MariaDB client connected to `127.0.0.1:3307`; `SELECT VERSION()` returned `13.0.2-MariaDB`.
- Created/confirmed only `erp_scratch` and `erp_test` with `utf8mb4_unicode_ci`; never accessed `system_end`.
- Ran `precision_slate_proposed_mysql_v4_1.sql` on MariaDB `erp_scratch`: **PASS**, DDL completed.
- Ran `PHASE1_CONSTRAINT_TESTS.sql` on MariaDB `erp_scratch`: client exit code 0; **17/17 assertions PASS, 0 failed**. This is the same suite and test coverage previously passed on MySQL Community Server 8.4.3 (17/17, 0 failed).
- Post-run inspection on MariaDB returned 47 base tables, 46 CHECK constraints, 0 tables in `erp_test`, 0 retained test procedures, and 0 residual `P1-*` customer fixtures.
- Comparison with MySQL: no tested constraint or workflow behavior difference. All 17 assertion outcomes matched. Expected-error diagnostic wording differs by engine (for example, MySQL/MariaDB CHECK and duplicate-key messages); the suite checks rejection/acceptance outcomes rather than matching engine-specific text.
- Initial PowerShell harness attempts did not provide usable test results (native stderr handling and an output-format guard); corrected execution produced the successful exit and the 17 explicit PASS rows above. A temporary client-options file was removed without displaying its contents; both known temporary paths were confirmed absent.
- `git check-ignore backend/.env` — ignored. `git status --short -- backend/.env` — empty.
- Laravel tests, migrations, application endpoints, and hosting integration: **NOT VERIFIED**; not part of Phase 1.

### Problems found and resolution
- No v4.1 incompatibility found on MariaDB 13.0.2; no DDL change or schema changelog fix was needed.
- The output guard incorrectly expected a bare `0` line instead of reading the suite's `failed_tests` result. Verified the actual client exit code, every assertion row, and `failed_tests = 0`; no test failure remains.
- Earlier failed client harness attempts created temporary option files with restricted ACLs. Restored access and removed the specifically identified files; verified both are absent. No credential value was emitted.

### MariaDB/MySQL feature minimums
- The v4.1 feature inventory in `SCHEMA_V4_1_CHANGE_LOG.md` remains authoritative: overall target MySQL 8.0.16+ / MariaDB 10.6+; InnoDB, indexes, integer/decimal and portable built-in types, `utf8mb4_unicode_ci`, timestamp defaults/updates, and scalar CHECK expressions use the stated MySQL 8.0 / MariaDB 10.6 compatibility floor; enforced CHECK constraints require MySQL 8.0.16+ / MariaDB 10.2.1+. The constraint-test harness uses transactions, temporary tables, stored procedures, handlers, and prepared statements (MySQL 8.0 / MariaDB 10.6 in the documented target inventory). Tested runtime versions: MySQL 8.4.3 and MariaDB 13.0.2; MariaDB 10.6 minimum was not run.

### Deviations and open questions
- MariaDB supplied for validation was 13.0.2, above the promised compatibility floor; no feature newer than MariaDB 10.6 was intentionally introduced, but MariaDB 10.6 itself remains **NOT VERIFIED**.
- Phase 1 is complete as a validation phase, but the schema remains explicitly **UNAPPROVED** until the owner reviews these results. No Phase 2 or Phase 3 work was started.
- Open: owner review/approval of v4.1 and all unresolved items in `SCHEMA_V4_OPEN_DECISIONS.md`; production Hostinger versions remain unconfirmed.

### Commit hash(es)
- No commit hash exists yet for this entry. The phase changes will be committed first; the resulting hash will be recorded in a subsequent append-only log addendum commit.

### Next step
- Stop for owner review of Phase 1 schema validation. After explicit approval, resume Phase 2 and then Phase 3, testing both database engines.

## Phase 1 — validation commit record

**Date/time:** 2026-10-10 11:27 +03:00

- **Commit hash(es):** `b127432e3827b261f1815e5a8b573fb535ee1ac3` — Phase 1 MariaDB validation results and this progress entry.
- **Command/result:** `git diff --check` passed before commit. Explicitly committed only `docs/development/BACKEND_PROGRESS_LOG.md` and `database/proposals/proposed-mysql-review-v4.1/SCHEMA_V4_1_CHANGE_LOG.md`. Post-commit `git status --short --untracked-files=all` showed only the pre-existing untracked `PROJECT_STATUS_HANDOFF.md`; `backend/.env` remained ignored and was not staged.
- **Next step:** Wait for the owner to review and approve Phase 1 schema validation; no Phase 2 work before that decision.

## Phase 2 — Laravel 13 migration baseline and seeders

**Date/time:** 2026-10-10 11:55 +03:00

### What was built
- Added the Laravel 13.35.0 / PHP 8.3 backend skeleton under `backend/`, with MySQL/MariaDB scratch and test connections, placeholder-only `backend/.env.example`, and a locally generated application key in ignored `backend/.env`. The real environment file remained ignored and was not staged.
- Bundled the approved v4.1 DDL byte-for-byte at `backend/database/schema/precision_slate_v4_1.sql` (SHA-256 `F0E290E972964E87F98DB8090D9D202A28FE3A83E3266AE23C1B56248972FCD9`), with one SQL-first migration containing its 47 `CREATE TABLE` and 3 `ALTER TABLE` statements.
- Added idempotent role-type seeding for `owner` and `designated_invoice_issuer` only, without users or `role_permissions` grants. Added `sales_tax` with `enabled=false` and `rate=null`.
- Recorded explicit owner approval in the v4.1 DDL header and change log. No earlier schema version was modified. The v4.1 change log retains the complete SQL feature/minimum-version inventory; the Laravel migration introduces no additional engine-specific DDL.
- Migration artifact: `2026_10_10_000000_create_approved_v4_1_schema.php`. No login, session, CSRF, or authorization behavior was added in Phase 2.

### Commands actually run and results
- Composer dependency setup had already completed with Laravel Framework `13.35.0`, PHPUnit `12.5.38`, and PHP `8.3.33`. `composer update --lock --no-install --no-scripts --no-interaction` — passed, no dependency changes; `composer validate --strict --no-check-publish` — valid; `composer check-platform-reqs` — all requirements passed.
- `php artisan --version` — Laravel Framework `13.35.0`. `php artisan test --testsuite=Unit` on the Phase 2 skeleton — **2 tests passed, 6 assertions**. PHP lint across `backend/app`, `bootstrap`, `config`, migrations, seeders, routes, and tests — **28 files, 0 syntax failures**. `git diff --check` — passed after removing one trailing-space issue.
- Before migration, each explicitly selected connection returned `SELECT DATABASE() = erp_test` and `information_schema` reported **0 tables**: MySQL 8.4.3 `mysql_test` at port 3306, and MariaDB 13.0.2 `mariadb_test` at port 3307. The migration command used the exact named connection (`--database=mysql_test` / `--database=mariadb_test`) and reported `2026_10_10_000000_create_approved_v4_1_schema ... DONE` on both. Each corresponding `db:seed --database=... --force --no-interaction` reported both seeders `DONE`.
- MySQL 8.4.3 `erp_test` post-migration direct SQL: **47 domain tables**, all **47** use `utf8mb4_unicode_ci`, **46 CHECK constraints**, and one Laravel migration metadata table. Seed invariants: **2** role types, **0** users, **0** role-permission grants; `sales_tax` is `{"enabled":false,"rate":null}`. Phase 1 constraint script rerun on MySQL `erp_test`: **17 PASS, 0 FAIL**, exit code 0; its transaction left **0** `P1-*` customer fixtures.
- MariaDB 13.0.2 migration and both seeders completed successfully on its explicitly selected `erp_test`; detailed post-seed row/collation/check counts and the Phase 1 constraint script on that test database are **NOT VERIFIED** in this Phase 2 run. The complete Phase 1 DDL and 17-test constraint suite had previously passed on MariaDB 13.0.2 `erp_scratch`; see Phase 1 entries.
- Both engines reported successful migration and seeding; no behavioral difference was observed in those command outcomes. MariaDB's migration took about 3 seconds versus under 1 second for MySQL in these local runs. This timing is not a compatibility/behavior difference. Minimum MariaDB 10.6 and minimum MySQL 8.0.16 remain **NOT VERIFIED**; tested versions were MariaDB 13.0.2 and MySQL 8.4.3.
- `git check-ignore -v backend/.env` — ignored by `backend/.gitignore`; `git status --short -- backend/.env` — empty. No secret was printed, logged, or staged. `system_end` was not selected or accessed.

### Problems found and how they were fixed
- Composer reported the lock metadata was stale after the project manifest was tailored. Refreshed lock metadata without changing packages; strict validation and all platform checks then passed.
- The SQL bundle had been copied before the approval-only DDL header change. Re-copied the canonical v4.1 file and verified identical SHA-256; the artifact unit test passed.
- The generated ignored `.env` lacked an `APP_KEY` variable, so Laravel's key-generation command initially reported that no variable existed. Added a blank local-only field and generated the key; verification confirmed it is populated without displaying it.
- `db:show --database=... --counts` displayed `erp_scratch` table rows despite identifying the selected connection/database as `erp_test`. Independent `SELECT DATABASE()` plus an `information_schema` count showed the actual `erp_test` databases were empty before migration. No writes were made by `db:show`; direct SQL was used as the authority.
- Removing Laravel's generated `withExceptions` bootstrap registration while separating phase commits made Artisan exit with status 255 and no useful output. Restored the required no-op registration; Artisan and unit tests passed afterward.
- One inline Tinker verification attempt failed PHP parsing due to command quoting; the same MySQL invariants were verified with a read-only MySQL SQL query. This was a command-wrapper issue, not a database/application failure.

### Deviations and open questions
- Owner-selected seeding is strictly role types only: no accounts or grants. Permission assignment is intentionally deferred.
- MySQL constraint tests were rerun on `erp_test`; the MariaDB Phase 1 suite's successful run is on `erp_scratch`, not the Laravel-migrated `erp_test`. This exact validation boundary is reported above.
- The full engine/version inventory is in `database/proposals/proposed-mysql-review-v4.1/SCHEMA_V4_1_CHANGE_LOG.md`: InnoDB/FKs/indexes/types/collation/timestamp features target MySQL 8.0 / MariaDB 10.6; enforced CHECK constraints require MySQL 8.0.16 / MariaDB 10.2.1. The full table also lists the basic expression and test-harness features and their floors. No feature newer than MariaDB 10.6 was intentionally introduced.
- Authentication/CSRF topology, token/session lifecycle, issuer identity details and exact permission scope remain open in `SCHEMA_V4_OPEN_DECISIONS.md`; no choice has been inferred. Other accountant/operations items also remain open. Hostinger production runtime and MariaDB 10.6 itself are not verified.
- No schema rollback was run; rollback behavior is **NOT VERIFIED**.

### Commit hash(es)
- Phase 2 changes and this entry are staged for commit; the resulting hash will be added by a later append-only commit record.

### Next step
- Commit the Phase 2 Laravel skeleton, approved SQL migration and agreed seeders. Then implement only decision-independent Phase 3 API foundation, test it, and pause before authentication/CSRF implementation to obtain the owner's security/topology choice.

## Phase 2 — append-only commit record

**Date/time:** 2026-10-10 11:56 +03:00

- **Commit hash(es):** `a531ecca67bcf466edd139a53bc95fa6b5eb67c1` — Phase 2 Laravel 13 migration baseline, schema approval state, seeders, and the detailed Phase 2 validation entry.
- **Commit creation:** GitKraken's commit request could not proceed because no Git author identity was configured. Created the commit with per-command identity `Codex <codex@local.invalid>`; the required `Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>` trailer is present. No persistent Git identity or environment setting was written.
- **Post-commit status:** The pre-existing untracked `PROJECT_STATUS_HANDOFF.md` and the deliberately unstaged Phase 3 API-foundation files remained outside the commit. `backend/.env` was ignored and not staged.
- **Next step:** Commit the decision-independent Phase 3 API foundation; stop before authentication/CSRF implementation and ask the owner to select the topology and clarify issuer identity/permission scope.

## Phase 3 — versioned API foundation and authentication decision gate

**Date/time:** 2026-10-10 12:03 +03:00

### What was built
- Added `GET /api/v1/health`, which checks database availability with `SELECT 1` and returns only a generic service status or a generic `503` response.
- Added a UUID request-ID middleware. Valid incoming `X-Request-Id` values are propagated; missing/invalid IDs are replaced, and the ID is included in API response metadata.
- Normalized API validation, HTTP, and unexpected-error responses into JSON envelopes. Internal exception details are withheld from clients. Validation's generic message uses the Arabic translation when the application locale is `ar`.
- Configured JSON-formatted single/daily logs with request-ID context and recursive redaction for sensitive context keys (password, token, secret, authorization, cookie, and API key variants). No request bodies are automatically logged.
- Added focused API and logging tests. No login, session, CSRF, user, role-grant, invoice, or other business endpoint was implemented.

### Commands actually run and results
- `php artisan test` — **8 tests passed, 46 assertions, 0 failures**. Covers approved SQL artifact checks, API health success/503 with mocked DB, valid/invalid request IDs, HTTP/validation/internal-error envelopes, Arabic validation envelope text, and recursive log-context redaction/request-ID enrichment.
- `php artisan route:list --path=api` — one route registered: `GET|HEAD api/v1/health`.
- PHP syntax check across `backend/app`, `bootstrap`, `config`, `lang`, `routes`, and `tests` — **26 files, 0 syntax failures**. `git diff --check` — passed.
- The API feature tests mock the DB facade; live health-query execution on each engine is **NOT VERIFIED** in this Phase 3 checkpoint. The explicit v4.1 migration/seed results per engine and MySQL constraint test results are recorded in Phase 2; MariaDB post-seed counts and Phase 1 constraint-suite rerun on its migrated `erp_test` remain **NOT VERIFIED**.
- No change to the phase 2 database behavior was made in this checkpoint. No `system_end` database was accessed. The ignored local `.env` remained unstaged.

### Problems found and how they were fixed
- A PHP namespace import for global `Throwable` emitted a warning; removed the ineffective import while retaining the global type reference.
- Arabic validation test initially used an English message; added a minimal Arabic JSON translation and made the renderer use Laravel's locale-aware translator. The Arabic generic message and supplied field detail now pass.
- No failing application tests remain. PHP line-ending notices from Git are informational; `git diff --check` passes.

### Deviations and open questions
- Authentication and CSRF implementation is intentionally paused. The open decision register still lacks cookie/session versus bearer-token topology, token/session lifecycle requirements, and issuer identity/permission details. No auth guard, login endpoint, token storage, or grants are guessed.
- Exact issuer names were unreadable in the source attachment and remain **NOT VERIFIED**. Owner must clarify who may create invoices versus post them, and the limited issuer read/export scope, before permissions are implemented.
- Per-field Arabic validator catalog coverage is **NOT VERIFIED** because no business input endpoints/rules exist yet; only the generic validation envelope and a supplied Arabic field message were tested.
- Accountant/controller decisions remain due before Phase 8. MariaDB 10.6 minimum and Hostinger runtime remain **NOT VERIFIED**.

### Commit hash(es)
- Phase 3 foundation and this entry are prepared for a separate commit; its hash will be added in a subsequent append-only commit record.

### Next step
- Stop for owner decision on API authentication/CSRF topology. After that choice, separately clarify authentication lifecycle and issuer identity/permission scope before writing login or authorization behavior.

## Phase 3 — API foundation commit record

**Date/time:** 2026-10-10 12:04 +03:00

- **Commit hash(es):** `78a75070d938c93ed480163526d4611f99423b9a` — versioned API health endpoint, request-ID middleware, JSON errors, Arabic validation message, structured/redacted logging, tests, and the Phase 3 validation entry.
- **Command/result:** The commit was created with per-command identity `Codex <codex@local.invalid>` and required `Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>` trailer. The `.env` file was not staged. The pre-existing untracked `PROJECT_STATUS_HANDOFF.md` remains untouched.
- **Next step:** Await the owner's authentication/CSRF topology choice and issuer permission clarifications before implementing authentication or authorization.

## Phase 3 — owner decision: session authentication topology

**Date/time:** 2026-10-10 12:04 +03:00

### What changed
- The owner selected **server-side sessions with same-site cookies and CSRF protection** for a same-site browser/API topology (the recommended option).
- Recorded this partial resolution in `database/proposals/proposed-mysql-review-v4/SCHEMA_V4_OPEN_DECISIONS.md`. No DDL, session middleware, login route, or authentication behavior has been added.

### Commands and validation
- Documentation-only decision recording. Tests and builds were not rerun for this text-only update: **NOT RUN**.
- No database was accessed; no secrets were printed or changed.

### Problems and deviations
- None. The selection resolves only the transport/topology, not session lifecycle or issuer permissions.
- No earlier schema DDL was changed.

### Open questions
- Still open: idle and absolute session expiry, session-ID rotation, logout/password-change revocation, password-reset behavior, retention, and whether production requires a cross-site frontend/API.
- Still open: issuer identities, create-versus-post permissions, and narrow read/export scopes; exact source names remain unreadable.

### Commit hash(es)
- This decision-register update and entry are prepared for a documentation commit; its hash will be appended after commit.

### Next step
- Ask the owner to select the session lifecycle policy before implementation; do not configure timeouts or retention by convention.

## Phase 3 — session-topology decision commit record

**Date/time:** 2026-10-10 12:04 +03:00

- **Commit hash(es):** Pending.
- **Next step:** Record the resulting hash append-only, then ask the owner for the still-open session lifecycle policy.

## Phase 3 — session-topology decision commit hash addendum

**Date/time:** 2026-10-10 12:05 +03:00

- **Commit hash(es):** `33674cb67c867e3c1a47ba7bb4d601a3712f6d4c` — records the owner's selected same-site server-side session and CSRF topology and the updated open-decision register.
- **Next step:** Ask the owner to choose the session lifecycle before implementation.

## Phase 3 — owner decision: session lifecycle

**Date/time:** 2026-10-10 12:05 +03:00

### What changed
- The owner selected the balanced session policy: 30-minute idle expiry, 12-hour absolute expiry, identifier rotation at login and permission change, revocation on logout/password reset, a single-use password-reset link valid for 30 minutes, and 90-day retention for revoked sessions.
- Recorded the selected policy and its existing-schema mapping in `database/proposals/proposed-mysql-review-v4/SCHEMA_V4_OPEN_DECISIONS.md`. No schema or application code changed.

### Commands and validation
- Documentation-only decision recording. Tests/builds: **NOT RUN**.
- No database was accessed; no credentials or environment values were changed.

### Problems and deviations
- None. The policy resolves session lifecycle values only; no login identifier, reset delivery channel, or cross-site deployment was inferred.

### Open questions
- Login identifier: username, email, or phone.
- Reset-link delivery channel and whether all user accounts are eligible.
- Whether production frontend/API deployment is same-site or cross-site.
- Issuer identities and exact create/post/read/export permissions remain open; do not grant privileges by inference.

### Commit hash(es)
- This decision-register update and progress entry are prepared for a documentation commit; its hash will be appended after commit.

### Next step
- Ask the owner to choose the staff login identifier. Authentication code remains paused until remaining identity and delivery questions are resolved.

## Phase 3 — session lifecycle decision commit hash addendum

**Date/time:** 2026-10-10 12:05 +03:00

- **Commit hash(es):** `efc198028bd895c6d1e67d00f46856f827dd85e9` — records the owner-selected session expiry, rotation, revocation, reset-token validity, and retention policy.
- **Next step:** Ask the owner to select the staff login identifier; no authentication behavior is implemented yet.

## Phase 3 — owner decision: login identifier

**Date/time:** 2026-10-10 12:06 +03:00

### What changed
- The owner selected a **unique username** as the only staff login identifier; phone and email remain optional and are not accepted for login.
- Updated the open-decision register to record this choice. No code, schema, seed data, or database changed.

### Commands and validation
- Documentation-only decision recording. Tests/builds: **NOT RUN**.
- No database was accessed; no environment values were changed.

### Problems and deviations
- None. No user-provisioning or username-reset workflow was inferred.

### Open questions
- Password-reset link delivery channel and account eligibility remain unresolved.
- Confirm whether production frontend/API deployment is same-site or cross-site before deployment configuration.
- Issuer names, creation/posting authority, and narrow read/export permissions remain unresolved; authorization work is gated on these decisions.

### Commit hash(es)
- This decision-register update and progress entry are prepared for a documentation commit; its hash will be appended after commit.

### Next step
- Implement only username/password session login/logout and session/CSRF enforcement if possible without deciding reset delivery or issuer authorization; pause before password-reset and business-permission endpoints.

## Phase 3 — login-identifier decision commit hash addendum

**Date/time:** 2026-10-10 12:06 +03:00

- **Commit hash(es):** `b7bccf01aec8c84334b329c053e6e8a6e908ac03` — records username-only login, with optional phone/email excluded from authentication.
- **Next step:** Implement session login/logout and CSRF using the approved lifecycle; do not implement password-reset delivery or issuer permissions.

## Phase 3 — username/password session authentication

**Date/time:** 2026-10-10 12:28 +03:00

### What was built
- Added `POST /api/v1/auth/login`, `GET /api/v1/auth/me`, and `POST /api/v1/auth/logout`.
- Login uses the approved unique-username identifier, throttles to five attempts per minute, returns a uniform credential failure, and stores only SHA-256 digests of opaque session and CSRF tokens.
- Added `api.session` and `api.csrf` middleware. Sessions use the approved 30-minute idle and 12-hour absolute expiry; logout requires the session-bound CSRF header. Session cookies are HttpOnly and SameSite=Lax; the CSRF cookie is readable by browser code. Cookies are secure by default in production.
- Aligned the Laravel `User` model with v4.1 fields, including `password_hash`, and hide password hashes from model serialization.
- Added `auth-sessions:prune`, scheduled daily at 02:00. It revokes expired/idle sessions and deletes already-revoked records only after the 90-day retention period. Newly discovered expiry is timestamped when the record is actually revoked so the full retention period is preserved.
- Added Arabic login validation/authentication messages and feature tests. No schema, table, seeder, or role grant changed; implementation uses existing v4.1 `users` and `auth_sessions`.

### Commands and validation
- `php artisan test` on the SQLite test environment — **20 passed, 112 assertions; 2 database-conditional tests skipped**. Those two tests were run explicitly against each supported local engine below.
- `AUTH_TEST_CONNECTION=mysql_test; php artisan test --filter=AuthenticationEngineTest` — MySQL Community Server **8.4.3**, explicitly guarded to `erp_test`: **2 passed, 10 assertions**.
- `AUTH_TEST_CONNECTION=mariadb_test; php artisan test --filter=AuthenticationEngineTest` — MariaDB **13.0.2**, explicitly guarded to `erp_test`: **2 passed, 10 assertions**.
- Executed the unchanged `database/proposals/proposed-mysql-review-v4.1/PHASE1_CONSTRAINT_TESTS.sql` through the local MySQL client with UTF-8 enabled and a database guard: MySQL 8.4.3 `erp_test` **17/17 passed**; MariaDB 13.0.2 `erp_test` **17/17 passed**. All named pass/reject outcomes matched; no behavioral difference was found in this suite.
- Post-test checks on both `erp_test` databases: `users=0`, `auth_sessions=0`; the temporary Phase 1 stored procedure was absent. No `system_end` connection was selected.
- PHP syntax check — **49 files checked, 0 errors**.
- Scoped Pint formatting check on files changed in this phase — **passed**. The initial workspace-wide `pint --test` also reported pre-existing formatting differences in untouched files; those files were left unchanged.
- `artisan schedule:list` with `CACHE_STORE=file` — passed; reports `auth-sessions:prune` at 02:00. Without the override, the command attempts to inspect the default database cache lock table, which is absent in local `erp_scratch`; it did not modify a database.
- `git diff --check` — passed. `git check-ignore -v backend/.env` confirmed it is ignored, and `git status --short -- backend/.env` returned no entry.

### Database feature compatibility
The authentication additions introduce no new DDL. They rely on the existing v4.1 compatibility floor and these database features:

| Feature | Minimum MySQL supported here | Minimum MariaDB supported here | Use |
|---|---:|---:|---|
| InnoDB transactions and standard indexed DML | 8.0 | 10.6 | Atomically create login sessions/update last-login time; revoke and prune sessions. |
| `BINARY(32)` values with unique-index/equality lookup | 8.0 | 10.6 | Persist and look up session/CSRF token digests without storing bearer tokens. |
| `DATETIME`/`TIMESTAMP` storage and comparison | 8.0 | 10.6 | Enforce expiry and 90-day retention using application-calculated cutoffs. |
| Temporary tables used by isolated engine integration tests | 8.0 | 10.6 | Shadow existing table names only on the test connection; no persistent fixtures are written. |

All listed capabilities are within the project target floors; no engine-specific SQL or feature newer than MariaDB 10.6 was introduced. The full v4.1 DDL feature/minimum-version inventory remains in `database/proposals/proposed-mysql-review-v4.1/SCHEMA_V4_1_CHANGE_LOG.md`. MariaDB 10.6 itself remains untested; only MariaDB 13.0.2 is locally available.

### Problems, fixes, and deviations
- The initial auth feature tests omitted Laravel's `withCredentials()` behavior for JSON requests, so cookies were not sent. The test harness was corrected; the final suite passes.
- A test intentionally nulled the optional CSRF hash but initially failed to restore the fixture before the positive logout case. The fixture is now restored, and middleware explicitly rejects a null stored CSRF hash with 419 rather than raising a type error.
- A one-off PHP statement-reconstruction attempt corrupted the Arabic SQL fixture while rebuilding lines and MySQL rejected that malformed input. The leftover temporary procedure was removed. The original SQL file was then streamed unmodified through the MySQL client with UTF-8 enabled; both engines passed 17/17, with no residual fixtures.
- The first default `schedule:list` validation tried to use the configured database cache lock table and failed because `cache_locks` is absent in `erp_scratch`. The scheduler listing was verified successfully using the configured file cache store; no cache table or application schema was added.
- No v4.1 incompatibility was found, so no earlier or approved schema file was edited. Authentication remains a database-backed opaque-token design using v4.1 `auth_sessions`; Laravel's framework session-driver table is not used by these API endpoints.

### Open questions
- Password-reset delivery channel and which account types are eligible remain owner decisions; no reset endpoint or delivery behavior was implemented.
- Confirm production frontend/API same-site versus cross-site deployment before deployment-specific cookie/CORS settings.
- Issuer identities and exact create/post/read/export permissions remain open; no business permissions were granted.
- MariaDB 10.6 and the production Hostinger PHP/database/runtime remain **NOT VERIFIED**.

### Commit hash(es)
- This implementation and progress entry are prepared for commit after verification. The resulting hash will be recorded append-only in the next log entry.

### Next step
- Commit the validated authentication implementation with this progress entry. Then request the still-open password-reset delivery/eligibility decision before implementing reset behavior; do not infer issuer permissions or production topology.

## Phase 3 — authentication implementation commit hash addendum

**Date/time:** 2026-10-10 12:29 +03:00

- **Commit hash(es):** `2709045b76634b99e28101115a904a4b83cef884` — adds username/password login, authenticated-user and logout endpoints, session/CSRF middleware, scheduled session pruning, schema-aligned user model, translations, tests, and the Phase 3 validation record.
- **Next step:** Ask the owner to choose the password-reset delivery channel and eligible account types before implementing reset behavior. Keep issuer permissions and production cross-site configuration gated on their outstanding decisions.

## Phase 3 — password-reset policy decision

**Date/time:** 2026-10-10 12:35 +03:00

### What changed
- The owner selected verified email as the only future reset-link delivery channel and requires the administrator to have manually confirmed ownership of the email address.
- The owner chose to keep v4.1 unchanged and defer self-service password reset; administrators handle resets out of band. No reset endpoint, email delivery, or schema change was implemented.
- Updated the authentication decision row in `database/proposals/proposed-mysql-review-v4/SCHEMA_V4_OPEN_DECISIONS.md`. v4.1 has no email-verification marker, so reset eligibility cannot be safely inferred from the optional `users.email` value.

### Commands and validation
- Documentation/decision-register update only. Tests/builds: **NOT RUN**.
- No database was accessed and no environment values were changed.

### Problems and deviations
- The approved v4.1 schema has no field indicating administrator-confirmed email ownership. The owner explicitly chose unchanged v4.1 and out-of-band resets, so no schema evolution or in-application reset authorization was inferred.

### Open questions
- Production frontend/API same-site versus cross-site deployment remains open.
- Issuer identities and exact create/post/read/export permissions remain open.
- MariaDB 10.6 and Hostinger runtime remain **NOT VERIFIED**.

### Commit hash(es)
- This decision-register update and progress entry are prepared for commit; the resulting hash will be recorded append-only in the next entry.

### Next step
- Do not implement self-service reset under v4.1. Resolve production cookie/CORS topology before deployment configuration and issuer permissions before business authorization/API work.

## Phase 4 — owner authorization for new email-verification schema version

**Date/time:** 2026-10-10 12:35 +03:00

### What changed
- The owner authorized creating a new schema-version proposal with an explicit email-verification marker so the selected manual email-ownership policy can later be enforced.
- Earlier schema folders, especially approved v4.1, must remain unchanged. The decision authorizes drafting and validation only; the new version still requires owner review and approval before application implementation or migration.
- Updated the authentication/CSRF decision in `database/proposals/proposed-mysql-review-v4/SCHEMA_V4_OPEN_DECISIONS.md` and added this handoff checkpoint.

### Commands and validation
- Decision/register update only. Tests/builds and database validation: **NOT RUN**; the v4.2 proposal has not yet been created.
- No database was accessed and no environment values were changed.

### Problems and deviations
- v4.1 has no email-verification state. The owner resolved this by authorizing a new schema-version proposal rather than changing the approved baseline.

### Open questions
- Production frontend/API same-site versus cross-site deployment remains open.
- Issuer identities and exact create/post/read/export permissions remain open.
- MariaDB 10.6 and Hostinger runtime remain **NOT VERIFIED**.

## Phase 7 — orders and full-only delivery

**Date/time:** 2026-10-10 23:18 +03:00

### What was built
- Added order APIs for list/show/create/confirm/full invoice and delivery APIs for list/show/create/status transitions. Routes enforce the existing owner permission, CSRF, and financial step-up middleware.
- Order confirmation records an audit event and returns a non-blocking stock-availability warning without reserving inventory. Full-order invoice posting is transactional/idempotent, calls the existing inventory issue path once, links every order line to its invoice line, and fulfills the order.
- Delivery creation accepts exactly one fulfilled order or posted invoice, copies only fully posted stock lines, and does not issue inventory again. Delivery status follows draft → preparing → in_transit → delivered, with cancellation allowed only before transit; every transition is audited.
- Added forward migration `2026_10_11_000007_enforce_delivery_source.php` for the missing header-level exactly-one-source CHECK. It refuses invalid existing rows before applying and was applied to `erp_test` on both local engines. No earlier schema version was edited.
- Protected cross-phase integrity: revising an order-linked invoice preserves its ordered products and quantities and transfers the order allocation to the new invoice line; revisions/cancellations are rejected after a delivery exists. Cancelling before delivery returns the order to confirmed so it can be invoiced again. Delivery source lookup ignores reversed invoice effects.
- Added owner grants, API contract and changelog updates, workflow tests, an engine test for the header CHECK, and two additional Phase 1 constraint cases. The v4.2 Phase 1 runner now expects **21** cases (the earlier 19 are retained plus two delivery-header cases).

### Commands and actual results
- Initial `php artisan test --colors=never` attempts — **NOT RUN** because `php` was not on PATH. Located and used PHP 8.3.33 at `C:\laragon\bin\php\php-8.3.33-Win32-vs16-x64\php.exe`; no installation was needed.
- Initial full tests on MySQL 8.4.3 `erp_test`: **61 passed, 679 assertions**; MariaDB 13.0.2 `erp_test`: **61 passed, 679 assertions**.
- Initial constraint-runner attempts on both engines stopped on `INSERT INTO deliveries (delivery_number)`, because the newly applied delivery-source CHECK correctly rejected the old fixture. Updated only the v4.2 constraint fixture and its runner to check no-source and two-source header rejection and use a valid source for line-level checks.
- Focused `SalesWorkflowEngineTest.php` after linked-invoice integrity additions: MySQL **14 passed, 89 assertions**; MariaDB **14 passed, 89 assertions**.
- Final full suite: MySQL 8.4.3 `erp_test` **63 passed, 687 assertions**; MariaDB 13.0.2 `erp_test` **63 passed, 687 assertions**.
- Final Phase 1 constraint suite: MySQL **21 passed, 0 failed**; MariaDB **21 passed, 0 failed**. All named pass/reject outcomes matched. MariaDB reports more specific engine-native CHECK/FK/unique-key messages; MySQL diagnostics differ in text only.
- Scoped Pint check after formatting the changed PHP files — **passed**. `git diff --check` — **passed**.
- Test commands run from `backend` with PHP 8.3.33:
  - MySQL: set `DB_CONNECTION=mysql_test`, `DB_TEST_DATABASE=erp_test`, `AUTH_TEST_CONNECTION=mysql_test`; run `artisan test --colors=never` and `scripts\run-phase1-constraints.php mysql_test`.
  - MariaDB: set `DB_CONNECTION=mariadb_test`, `DB_MARIADB_TEST_DATABASE=erp_test`, `AUTH_TEST_CONNECTION=mariadb_test`; run the same commands using `mariadb_test`.
- Database feature floor introduced by this phase: enforced SQL CHECK constraints require MySQL **8.0.16+** (the project target remains MySQL 8.0+) and MariaDB **10.2.1+** (the project target remains MariaDB 10.6+); InnoDB transactions and row-level locking are used for the invoice/order/delivery atomic workflows. Exact minimum versions were not runtime-tested; local validation used MySQL 8.4.3 and MariaDB 13.0.2.

### Problems, fixes, and deviations
- Constraint harness setup was incompatible with the new valid header CHECK. The v4.2-only fixture now expects both invalid header shapes to be rejected; the earlier v4.1 schema/test version was not changed.
- Review found a stale-allocation risk if a linked invoice were revised or cancelled after order invoicing. Added allocation transfer, cancellation/re-invoicing behavior, and a delivery barrier, then verified with integration tests on both engines.
- No business-rule deviation. Full-only fulfillment and no stock reservation follow the owner's decision. Cancellation before delivery restores the order to confirmed; a delivery record, including a cancelled one, blocks mutation of its source invoice so the delivery audit trail remains coherent.
- MySQL and MariaDB matched in pass/fail behavior; only database diagnostic wording varied.

### Open questions
- None blocks Phase 7b. Accountant decisions remain required before Phase 8: journal entries, tax method, included container-cost types, and report formulas.
- MySQL 8.0/MariaDB 10.6 minimum-runtime compatibility and production hosting remain **NOT VERIFIED**.

### Commit hash(es)
- Phase 7 implementation and this log entry are prepared for commit after final review; the resulting hash will be recorded append-only in a hash addendum.

### Next step
- Commit Phase 7. Then implement and validate Phase 7b only; stop with **CHECKPOINT WRITTEN** before Phase 8 and frontend work.

## Phase 7 — implementation commit hash addendum

**Date/time:** 2026-10-10 23:19 +03:00

- **Commit hash:** `e3578558d1118a14b166a64a8a6141cf4a60a796` — completes orders, full-only deliveries, migration `2026_10_11_000007`, cross-phase invoice/order safeguards, dual-engine tests, and the Phase 7 validation record.
- **Next step:** Implement Phase 7b only; stop before Phase 8 and frontend work.

## Phase 7b — handoff implementation started

**Date/time:** 2026-10-10 23:20 +03:00

### What was built / inspected
- Began Phase 7b after Phase 7 was committed. Confirmed `backend/docs/openapi.yaml` exists but is empty; Laravel lists **63 API routes** at `/api/v1`.
- Confirmed the local MySQL 8.4.3 client and `mysqldump` are installed. OpenSSH `scp`/`ssh` exist, but no off-host target or SSH key is configured in tracked files; off-host transfer cannot be verified until an operator supplies deployment settings.
- Read-only inspection found the MySQL and MariaDB `erp_scratch` databases each contain the migrated 48-table schema; approximate engine statistics show only the migrations table with one row and other table counts zero. A guarded restore test is explicitly scoped to MySQL `erp_scratch`; it must capture a verified dump first and must never target any other database.

### Commands and actual results
- `artisan route:list --path=api/v1 --no-ansi` — **63 routes**. An attempted unsupported `--columns` option failed; rerunning with supported options succeeded.
- MySQL and MariaDB `erp_scratch` read-only table enumeration — **48 tables per engine**; information-schema approximate row counts show migrations=1 and remaining tables=0.
- `mysqldump --version` and `mysql --version` — MySQL client **8.4.3** available at the Laragon installation path.
- Off-host credentials/configuration and live copy: **NOT VERIFIED**; no off-host destination supplied.

### Problems, deviations, open questions
- Restore test cannot use a different staging schema because only `erp_scratch`/`erp_test` are authorized targets. It will be guarded to restore only into the explicitly requested `erp_scratch` and run only after making a fresh local backup; execution will be documented with exact before/after schema evidence.
- No deviation from Phase 7b requirements. No secrets will be written to documentation or tracked files.
- No owner input blocks documentation or local backup testing. Off-host copy configuration is deployment-specific; its live verification remains pending.

### Commit hash(es)
- This Phase 7b inspection checkpoint is prepared for commit; hash will be recorded append-only after commit.

### Next step
- Add complete OpenAPI coverage, backup/off-site commands and a scratch-only restore-test, production checklist, and accountant question list; validate Phase 7b on both engines before stopping prior to Phase 8/frontend.

### Commit hash(es)
- This decision, handoff, and decision-register update are prepared for commit; the resulting hash will be recorded append-only after the commit.

### Next step
- Inspect v4.1 DDL and version/change-log layout; draft v4.2 in a new folder with the approved verification marker, then validate and stop for owner review. Do not edit or migrate v4.1.

## Phase 4 — email-verification schema decision commit hash addendum

**Date/time:** 2026-10-10 12:40 +03:00

- **Commit hash(es):** `3b31fc0fb4fb91f729f162d861ab3201e189b3b6` — records the owner's authorization to propose a new schema version with an email-verification marker, preserving v4.1 unchanged, and updates the current handoff.
- **Next step:** Inspect the v4.1 DDL and change-log/version layout before creating the v4.2 proposal. Validation must use only approved scratch/test databases; stop for owner review before any application migration.

## Phase 4 — owner approval of v4.2 migration baseline

**Date/time:** 2026-10-10 12:52 +03:00

### Decision recorded
- The owner selected **“Approve v4.2 as the migration baseline”** after receiving the actual validation summary: 19/19 constraints passed on MySQL 8.4.3 and MariaDB 13.0.2; fresh full-file v4.2 installation and minimum engine-version validation remain unverified.
- This approves forward-only migration work to v4.2. It does not authorize editing v4.1, silently rewriting the already-applied Phase 2 v4.1 migration, production deployment, or guessing password-reset endpoint/delivery details.
- The handoff is updated to reconcile the initial v4.1 Laravel implementation with the newly approved v4.2 baseline.

### Commands and validation
- No additional commands or tests were run for the owner decision itself. Results remain those recorded above.

### Open questions and next step
- Production frontend/API topology, issuer identities and exact permissions remain open; accountant input remains required before Phase 8.
- Next: inspect Laravel migration conventions and Phase 2 v4.1 implementation; add a forward-only migration for the approved marker without rewriting the earlier migration, then run tests on both engines.
- Commit hash: pending.

## Phase 2 follow-on — focused static validation of the v4.2 migration

**Date/time:** 2026-10-10 12:52 +03:00

### Commands and actual results
- VS Code test tool attempt with the absolute test path — returned “No tests found”; this was a test-discovery invocation issue, not a test failure.
- `php artisan test --filter=ApprovedSchemaArtifactTest` — **3 passed, 12 assertions**.
- Initial `vendor/bin/pint --test` on the new migration and test — failed due formatting fixers. Applied Pint to only those two files; reran `vendor/bin/pint --test` — **passed**. Re-ran the focused Artisan test after formatting — **3 passed, 12 assertions**.
- Pre-migration query on MySQL 8.4.3 `erp_scratch`: selected database/version matched; marker column and CHECK existed from v4.2 proposal validation; `migrations` table absent.
- Same pre-migration query on MariaDB 13.0.2 `erp_scratch`: same results. `erp_test` was not modified.
- Laravel migration up/down/up on both engines: **NOT VERIFIED** at this checkpoint.

### Problem, fix, and next step
- Fixed the initial Pint findings with the project formatter. Before Laravel migrator testing, remove only the known proposal-test marker/check from each empty scratch schema, install the migration repository, and record the historical v4.1 migration as already applied.
- Then exercise migration up/down/up while guarding `erp_scratch`; never rerun the v4.1 CREATE/ALTER migration on these existing schemas. No `system_end` access.
- Migration code commit: `08f654d7c1e6e1a4a36d021898c720bb3ab5096`; static validation/log/formatting commit: pending.

## Phase 2 follow-on — static validation commit hash addendum

**Date/time:** 2026-10-10 12:52 +03:00

- **Commit hash:** `b169abe1215454395e1564b22d3daa32ad0fe8cb` — records focused schema artifact tests passing (3 tests/12 assertions), corrected formatting, and pre-migration scratch state.
- **Next step:** Exercise the new Laravel migration up/down/up on both allowed `erp_scratch` databases.

## Phase 2 follow-on — scratch schemas prepared for migration testing

**Date/time:** 2026-10-10 12:52 +03:00

### Commands and actual results
- On MySQL 8.4.3 `erp_scratch`, checked selected database and required preconditions (v4.2 column/check each present), then removed only `chk_users_email_verification_requires_email` and `users.email_verified_at`. Command completed successfully; scratch returned to v4.1 table shape.
- On MariaDB 13.0.2 `erp_scratch`, performed the same guarded precondition and removed only the v4.2 check/column using MariaDB `DROP CONSTRAINT` syntax. Command completed successfully; scratch returned to v4.1 table shape.
- `php artisan migrate:install --help` — confirmed `--database` is supported for explicit connection selection. No migration repository has been created yet.
- No user/business rows were modified; these schemas had previously been confirmed empty. `erp_test` and `system_end` were not modified or accessed.

### Next step
- Install Laravel's migration repository on each explicit scratch connection, insert the existing v4.1 migration as already applied, then exercise the approved v4.2 migration up/down/up. Do not rerun the original v4.1 DDL.
- Migration up/down/rollback validation: **NOT VERIFIED**.

## Phase 2 follow-on — migration loader issue found and fixed

**Date/time:** 2026-10-10 12:52 +03:00

### Commands and actual results
- Ran `php artisan migrate --database=mysql --force --no-interaction` and the equivalent with `--database=mariadb`, each after an explicit `SELECT DATABASE() = erp_scratch` check. Both failed before executing migration SQL with PHP `ErrorException`: `The use statement with non-compound name 'RuntimeException' has no effect`.
- Laravel treats that warning as an exception while loading the migration. The failure occurred before column/check alteration; no v4.2 migration row was recorded and both scratch schemas remained at the v4.1 shape. Their migration repositories and historical v4.1 baseline records had been prepared successfully in the prior step.
- Removed the ineffective global `use RuntimeException;` and fully qualified the two exceptions as `\RuntimeException`.
- Migration retry and up/down validation: **NOT VERIFIED** at this checkpoint.

### Next step
- Run the targeted migration again on MySQL and MariaDB `erp_scratch`, inspect marker/check and migration record, then test rollback and reapplication. If any additional failure occurs, stop only if reasonable repair attempts cannot resolve it.
- No `erp_test` or `system_end` database was accessed.

## Phase 2 follow-on — Laravel v4.2 migration up verified

**Date/time:** 2026-10-10 12:52 +03:00

### Commands and actual results
- After the loader fix, ran `php artisan migrate --database=mysql --force --no-interaction` with a guard confirming migration history in `erp_scratch`. Laravel reported `2026_10_10_000001_add_v4_2_email_verification_to_users` **DONE**.
- Ran the equivalent explicit `--database=mariadb` command with a password sourced privately from ignored `backend/.env`; Laravel reported the same migration **DONE**. No credentials or `.env` content were printed.
- Post-migration metadata queries confirmed on MySQL 8.4.3 and MariaDB 13.0.2: correct current database `erp_scratch`; nullable `DATETIME` with the intended comment; `chk_users_email_verification_requires_email` present; v4.1 migration recorded at batch 1 and v4.2 migration recorded at batch 2.
- `erp_test` and `system_end` were not modified or accessed.

### Remaining validation
- Migration up: **VERIFIED** on MySQL 8.4.3 and MariaDB 13.0.2.
- Constraint suite against the migration-created schema and down/up rollback cycle: **NOT VERIFIED** yet.
- Next: run all 19 constraints, then Laravel rollback and reapplication on each engine. The earlier migration-loader error and fix are recorded above.

## Phase 2 follow-on — constraints pass on Laravel-migrated v4.2 schemas

**Date/time:** 2026-10-10 12:52 +03:00

### Commands and actual results
- Streamed the complete `database/proposals/proposed-mysql-review-v4.2/PHASE1_CONSTRAINT_TESTS.sql` to the MySQL client after `SELECT DATABASE()` returned `erp_scratch`: **19/19 PASS, 0 failed**, client exit 0.
- Repeated on MariaDB 13.0.2 `erp_scratch` using the private ignored `.env` credential environment: **19/19 PASS, 0 failed**, client exit 0.
- All 19 acceptance/rejection outcomes matched. Expected-rejection `observed_error` values were `NULL` in MySQL output and diagnostic messages in MariaDB; this is diagnostic detail only, not a constraint behavior difference.
- The script rolls back transactional fixtures and removes its temporary stored procedure. Final cleanup inspection remains part of rollback verification.
- `erp_test` and `system_end` were not modified or accessed.

### Next step
- Exercise migration down then up on MySQL and MariaDB `erp_scratch`; verify column/check presence/absence and migration history after each transition.
- Migration up/constraint coverage is verified; down/up reapplication remains **NOT VERIFIED**.

## Phase 2 follow-on — Laravel v4.2 rollback verified

**Date/time:** 2026-10-10 12:52 +03:00

### Commands and actual results
- Guarded both targets with `SELECT DATABASE() = erp_scratch`, then ran `php artisan migrate:rollback --database=mysql --step=1 --force --no-interaction` and the equivalent for `mariadb`. Laravel reported the v4.2 migration rollback **DONE** on both.
- Post-rollback queries on each engine confirmed `email_verified_at` absent, the named CHECK absent, the v4.2 migration row absent, and the historical v4.1 migration row still present.
- The MariaDB rollback used its driver-specific `DROP CONSTRAINT`; MySQL used `DROP CHECK`. Both completed successfully.
- No persistent business/user rows existed or were changed. No `erp_test` or `system_end` access.

### Next step
- Reapply the v4.2 migration on both scratch databases and verify final v4.2 schema/history and fixture cleanup.
- Migration up and down: **VERIFIED**; reapplication after rollback remains **NOT VERIFIED**.

## Phase 3 — auth engine validation rerun (no code change)

**Date/time:** 2026-10-10 13:34 +03:00

### Commands and actual results
- `php artisan test --filter=AuthenticationEngineTest` with `AUTH_TEST_CONNECTION=mysql_test` — **2 passed, 10 assertions, 0 failed**.
- Repeated with `AUTH_TEST_CONNECTION=mariadb_test` — **2 passed, 10 assertions, 0 failed**.
- Existing SQLite run is intentionally skipped by the engine-specific test guard when a database target is not set; no SQLite assertion count was claimed beyond the earlier verified result.
- The environment values used to connect were the repo-local ignored `backend/.env` entries only; the password was not printed, logged, or committed.

### Problems and fix status
- No code or schema fix was required. The earlier engine tests remain valid and no behavior differences arose between MySQL and MariaDB beyond the same pass result.

### Next step
- Await the owner’s business decisions for production topology, issuer scope, and permissions before moving into the next implementation phase.
- No password-reset endpoint or broader reset flow is implemented or approved in this checkpoint.

## Full progress report checkpoint — 2026-10-10

**Date/time:** 2026-10-10 18:43 +03:00

### What has been built so far
- **Backend baseline:** Laravel 13 project using PHP 8.3; database connection configuration provides separate MySQL/MariaDB development and test connections intended to point only at `erp_scratch` and `erp_test`.
- **v4.1 schema:** Portable SQL baseline in `backend/database/schema/precision_slate_v4_1.sql`, copied into the Laravel migration foundation and retained as historical baseline. It declares 47 tables and 3 ALTER statements. The v4.1 proposal/change-log and 17 constraint cases are retained separately.
- **v4.2 schema:** Approved forward-only email-verification addition in `backend/database/migrations/2026_10_10_000001_add_v4_2_email_verification_to_users.php`; adds nullable `users.email_verified_at` plus `chk_users_email_verification_requires_email`. Earlier schema files were not edited.
- **Authentication:** `AuthController`, `AuthenticateApiSession`, `VerifyApiCsrfToken`, and API routes implement login, current-session lookup, logout/revocation, cookie session handling, CSRF checks, and throttled login. The current route file also exposes a health endpoint. Owner-approved topology is same-domain frontend/API under `/api`, same-site cookie session plus CSRF.
- **Authorization work in progress:** A `RequirePermission` middleware, role/permission seed migration, and `RolePermissionMatrixSeeder` are present in the worktree but untracked. The API routes currently do not apply that middleware, and no engine-backed role enforcement test has been added. Therefore deny-by-default authorization is **not yet verified or complete**.
- **Business policy recorded:** Owner alone edits/reverses/corrects documents, views costs/profit/markup, and manages users. Two named issuer accounts (`ابنوب` and `كراس`) create invoices and view customers/products; issuers currently cannot create customers, collections, or returns. Other users are read-only. Invoice issuer-name snapshot is required. Password reset is owner-only manual; email reset is out of scope.
- **ERP business modules:** No Phase 4 catalog/inventory, Phase 5 containers, or Phase 6–7 customer/invoice/return/receipt/order/delivery feature implementation is verified in this checkpoint. Phase 8 remains blocked pending accountant input.
- **Local credentials:** `backend/.env` is ignored by Git (`git check-ignore backend/.env` returned that path). No credential value is reproduced in this log.

### Commands actually run and results
- `git --no-pager status --short` — showed untracked `PROJECT_STATUS_HANDOFF.md`, `backend/app/Http/Middleware/RequirePermission.php`, `backend/database/migrations/2026_10_10_000002_seed_role_permission_matrix.php`, and `backend/database/seeders/RolePermissionMatrixSeeder.php`; no `backend/.env` entry.
- `git check-ignore backend/.env` — returned `backend/.env`, confirming it is ignored.
- Confirmed executables: PHP CLI **8.3.33**; MySQL client/server version reported by client **8.4.3**; MariaDB client/server version reported by client **13.0.2**.
- First attempt to run `php artisan ...` failed before starting tests because `php` was not on the current PowerShell PATH. Retried with the verified absolute PHP executable:
  `& "C:\laragon\bin\php\php-8.3.33-Win32-vs16-x64\php.exe" artisan test --filter=ApprovedSchemaArtifactTest --colors=never`
  Result: **3 tests passed, 12 assertions, 0 failed**.
- Previously recorded engine validation: v4.1 constraints **17/17 pass on MySQL 8.4.3 and 17/17 pass on MariaDB 13.0.2**; v4.2 constraints **19/19 pass on each engine**; auth integration **2 tests/10 assertions pass on MySQL `erp_test` and 2 tests/10 assertions pass on MariaDB `erp_test`**.
- Previously recorded v4.2 migration up and rollback completed on both `erp_scratch` databases. The specific requested **re-application after rollback remains NOT VERIFIED**.
- No test was run in this report step against MySQL/MariaDB for the current untracked authorization implementation. No minimum-version tests on MySQL 8.0 or MariaDB 10.6 were run.

### Problems, fixes, and remaining gaps
- Fixed the PHP PATH issue operationally by invoking the confirmed PHP executable directly; this was an environment command-resolution issue, not a test failure.
- v4.2 migration reapplication after rollback remains a required pending check under work-order A.
- Authorization code is present but uncommitted and not exercised: the API routes contain no `RequirePermission` application, and no role-denial/allowance test verifies actual enforcement. Keep this explicitly incomplete until tested on both engines.
- Work order A–E has not been completed. No new schema or source-code change was made for this report other than updating this progress log.

### Deviations and owner questions
- No deviation from the user’s approved business rules. This is a status-report checkpoint only.
- No additional business decision is required to execute A–E based on the work order. Accountant input is still required before Phase 8.

### Commit and next step
- Report/log commit hash: `1320aec` (hash addendum follows).
- **Next step:** execute work-order A by re-applying v4.2 on both allowed `erp_scratch` databases after rollback and verify column, CHECK, and migration history. Then complete, wire, and test the new-version permission matrix on both engines before starting Phase 4. Continue logging and committing at each required step.

## Full progress report — commit hash addendum

**Date/time:** 2026-10-10 18:43 +03:00

- The full status report and updated handoff were committed as `1320aec` (`docs: record complete backend progress report`).
- The report covered verified implementation, real test counts, outstanding v4.2 reapplication, uncommitted/untested permission work, and remaining work-order phases.
- Next step was work-order A: reapply v4.2 after rollback on MySQL and MariaDB `erp_scratch`.

## Phase 2 follow-on — Step A: v4.2 re-apply and verification

**Date/time:** 2026-10-10 19:16 +03:00

### What changed and was verified
- No schema/code files changed. Laravel's v4.2 migration was explicitly rolled back and reapplied, using `--path=database/migrations/2026_10_10_000001_add_v4_2_email_verification_to_users.php`, on MySQL and MariaDB `erp_scratch`.
- The first requested migrate attempt reported `INFO Nothing to migrate.` on both engines. Inspection showed the v4.2 migration row and schema were already present; history showed v4.2 at batch 2 after the v4.1 batch 1. To prove the requested rollback/re-apply cycle, only v4.2 was then rolled back using the same `--path`.
- Post-rollback verification on both engines: selected DB `erp_scratch`; `users.email_verified_at` absent (`false`); v4.2 migration row count `0`.
- Re-apply output on MySQL 8.4.3: `2026_10_10_000001_add_v4_2_email_verification_to_users .. DONE`.
- Re-apply output on MariaDB 13.0.2: `2026_10_10_000001_add_v4_2_email_verification_to_users .. DONE`.
- Post-apply verification on MySQL 8.4.3 `erp_scratch`: selected DB/version `erp_scratch / 8.4.3`; marker column `true`; named CHECK count `1`; v4.2 migration row count `1`.
- Post-apply verification on MariaDB 13.0.2 `erp_scratch`: selected DB/version `erp_scratch / 13.0.2-MariaDB`; marker column `true`; named CHECK count `1`; v4.2 migration row count `1`.
- MariaDB `erp_test` was empty (0 tables) before provisioning. Applied the Laravel v4.1 baseline and v4.2 migration there. Both reported `DONE`; this made the requested Laravel-migrated MariaDB test schema available for the Phase 1 validation script. MySQL `erp_test` was left unchanged.

### Commands and real results
- `artisan db:show --database=mysql` — confirmed MySQL 8.4.3, port 3306, database `erp_scratch`.
- `artisan db:show --database=mariadb` — confirmed MariaDB 13.0.2, port 3307, database `erp_scratch`.
- `artisan migrate:rollback --database=mysql --path=...000001... --force --no-interaction` — v4.2 **DONE**; MariaDB equivalent — v4.2 **DONE**.
- Post-rollback Laravel checks (each engine): `selected_db=erp_scratch`; `hasColumn(email_verified_at)=false`; migration row count `0`.
- `artisan migrate --database=mysql --path=...000001... --force --no-interaction` — v4.2 **DONE**; MariaDB equivalent — v4.2 **DONE**.
- Post-apply Laravel checks (each engine): `selected_db=erp_scratch`; expected server version; `hasColumn(email_verified_at)=true`; `chk_users_email_verification_requires_email` count `1`; migration row count `1`.
- First full-suite attempt on each engine path, with default Arabic `APP_LOCALE`: **21 passed, 2 failed, 125 assertions**. Both failures were English-string expectations in `ApiAuthenticationTest` while the app returned its configured Arabic translation. No database-engine-specific error occurred.
- Reran the full suite with `APP_LOCALE=en` and `AUTH_TEST_CONNECTION=mysql_test`: **23 passed, 128 assertions, 0 failed**. Repeated with `AUTH_TEST_CONNECTION=mariadb_test`: **23 passed, 128 assertions, 0 failed**.
- PHPUnit configuration explicitly forces non-engine tests to in-memory SQLite. The full suite was executed twice and the auth engine integration tests used the selected engine's `erp_test`; other tests remained on SQLite. This is the actual harness behavior, not a claim that every test ran against each SQL server.
- The MariaDB `erp_test` v4.2 Phase 1 constraint script output contained **19 PASS rows** and `failed_tests = 0`; command exit code `0`. All named tests passed, including email marker/check, FK restrictions, unique values, inventory checks, postings/revisions and delivery-source rules. MariaDB emitted a client warning that `--ssl-verify-server-cert` is disabled for this local login; it did not affect execution or validation results.
- All database operations in this step targeted only `erp_scratch` and `erp_test`. `system_end` was not accessed.

### Problems, fixes, deviations, and open questions
- `php` is not in the current shell PATH; absolute PHP 8.3.33 executable was used.
- The first full-suite run failed only because the local Arabic locale conflicted with tests asserting the English authentication message. Setting `APP_LOCALE=en` for test execution made all 23 tests pass on both engine paths; no production locale or application code was changed.
- The test suite's forced SQLite configuration limits SQL-engine coverage to the explicit engine integration tests. Full suite test cases were run twice, but tests other than the engine integration tests execute against in-memory SQLite. This harness limitation is documented rather than hidden.
- No new owner decision is needed. No deviation from the approved v4.2 schema; no earlier schema version was edited.

### Commit and next step
- Step A progress-log commit: `ab03f8a` (hash addendum follows).
- **Next:** Phase 3 — Step B: inspect untracked RBAC implementation, choose one matrix-seeding location, verify/add read-only role, wire deny-by-default permissions to protected API routes while leaving health/login public, add the specified allow/deny coverage, then run the full suite twice and MariaDB `erp_test` Phase 1 constraints. Review and commit Step B. Stop after Step B; do not start Phase 4.

## Phase 2 follow-on — Step A commit hash addendum

**Date/time:** 2026-10-10 19:16 +03:00

- Step A verification and its progress-log entry were committed as `ab03f8a` (`docs: record Phase 2 Step A v4.2 reapply results`).
- Next is Phase 3 — Step B: RBAC inspection, implementation, route enforcement, and tests on the approved local targets.

## Phase 3 — Step B: permission matrix and server-side enforcement

**Date/time:** 2026-10-10 19:16 +03:00

### What was built
- Selected `backend/database/seeders/RolePermissionMatrixSeeder.php` as the **single canonical** role/permission matrix source. The migration alternative `2026_10_10_000002_seed_role_permission_matrix.php` was not retained; it duplicated seed data and had a destructive rollback that deleted all role/user assignments. Removed the obsolete `RolesDevelopmentSeeder.php` from the active seed chain and made `DatabaseSeeder` call the matrix seeder instead.
- The v4.1 schema defines `roles.code` as a generic `VARCHAR(80)` with no enum/check limiting role types. The earlier development seeder contained `owner` and `designated_invoice_issuer`, but no read-only type. Added `read_only`; retained the approved issuer code `designated_invoice_issuer` (not the inconsistent `issuer` alias). No earlier schema version was edited.
- Seeded 3 roles and 17 permissions. Grants: owner 17; designated issuer 5 (profile/session-self plus invoice-create, customer-view, product-view); read-only 5 (profile/session-self plus standard invoice/customer/product views). Both issuers ابنوب and كراس use the same role; accounts/passwords are not created by this seeder.
- `RequirePermission` is registered as `api.permission`, checks active assigned roles, denies requests without a permission code, and returns 403 if a role has no matching grant. Unauthenticated requests return 401.
- Applied explicit permission middleware to every current protected route in `routes/api_v1.php`: `auth.me` requires `users.view_self`; `auth.logout` requires `sessions.revoke_self` and CSRF. Health and login remain public. There are no business API routes yet; integration tests register test-only protected routes to exercise business permission codes.
- Added engine authorization coverage for the owner; both named issuers; a read-only user; unauthenticated calls; and a protected route with no permission declaration. Issuers are denied invoice-view, customer-create, collections, returns, document edit/cancel/reverse/correct, user management, costs, profit and markup.
- Updated `phpunit.xml` so SQLite remains the default but `DB_CONNECTION` can be overridden. MySQL/MariaDB auth tests use temporary tables and assert the target is `erp_test`, so the complete suite can run on each engine without dropping persistent test-schema tables.
- Added `PROPOSED_ROLE_PERMISSION_MATRIX_V2.md` and updated the current authentication/authorization guide.

### Commands and actual results
- Ran `artisan db:seed --class=RolePermissionMatrixSeeder --database=mysql --force --no-interaction` — `DONE`. Repeated with `--database=mariadb` — `DONE`.
- Verified on MySQL 8.4.3 `erp_scratch` and MariaDB 13.0.2 `erp_scratch`: role grant counts `designated_invoice_issuer=5`, `owner=17`, `read_only=5`; 3 roles; 17 permissions; 0 grants of customer creation, collections, returns, document mutations, user management, costs, profit or markup to either non-owner role. Results matched across engines.
- Focused engine tests during development passed: **6 passed, 78 assertions** on MySQL and **6 passed, 78 assertions** on MariaDB. API route/auth checks passed on SQLite. Pint initially identified style changes; after running Pint the focused changed-PHP check returned **passed**.
- Final full suite on MySQL `erp_test`, command `artisan test --colors=never` with `DB_CONNECTION=mysql_test`, `DB_DATABASE=erp_test`, `AUTH_TEST_CONNECTION=mysql_test`, `APP_LOCALE=en`: **28 passed, 207 assertions, 0 failed**.
- Final full suite on MariaDB `erp_test`, same command with both connection selectors set to `mariadb_test`: **28 passed, 207 assertions, 0 failed**.
- After those suites, the Phase 1 v4.2 constraint script was rerun on Laravel-migrated MariaDB 13.0.2 `erp_test`: **19 named PASS rows; `failed_tests=0`; client exit 0**. Results: `container_delete_restricted_by_receipts`, `customer_delete_restricted_by_documents`, `delivery_accepts_each_single_source`, `delivery_rejects_no_source`, `delivery_rejects_two_sources`, `email_verification_marker_with_email`, `email_verification_requires_email`, `foreign_key_set_null_on_delete`, `invoice_revision_link_valid`, `invoice_revision_shape`, `later_partial_receipt_allowed`, `negative_on_hand_check`, `one_inventory_effect_per_source`, `one_posting_effect_per_invoice`, `one_revision_successor_per_predecessor`, `receipt_line_container_and_product_match`, `unique_customer_phone`, `unique_document_number`, `utf8mb4_arabic_round_trip`.
- `vendor/bin/pint --test` on all changed PHP files — **passed**. `git diff --check` — no whitespace errors (Git emitted only expected LF-to-CRLF notices).
- Every test-suite engine run was explicitly set to `erp_test`; seed validation and Step A migration work used only `erp_scratch`. `system_end` was not accessed.

### Problems, fixes, deviations, and open questions
- No Step B test failures remained. The seeder was consolidated into one transactional source rather than keeping both the previous untracked migration and seeder.
- Read-only scope is concretized conservatively as standard invoice/customer/product read access only; it has no mutation or sensitive financial permissions. This interpretation is documented in matrix v2.
- PHPUnit's SQLite default is preserved for normal local runs, but external connection overrides are now supported for real full-suite engine runs. Temporary engine tables avoid changing existing test schema data.
- No new schema or schema-version change was required. Permission assignments use the existing v4.1 role/permission tables.
- No additional owner decision is needed at this checkpoint. Accountant input remains required before Phase 8.

### Commit and next step
- Step B implementation commit: `86b0bf5a96653ffec2033385cadeb0dfc74efade`.
- **Next:** Stop for owner review as requested. Do not begin Phase 4 (products/stock) in this checkpoint.

## Phase 3 — Step B implementation commit hash addendum

**Date/time:** 2026-10-10 19:20 +03:00

- **What changed:** Committed the Step B permission matrix, role seeder, deny-by-default middleware, route enforcement, tests, documentation, and corresponding progress record.
- **Commands and actual results:** `git diff --cached --check` — passed before commit; `git check-ignore backend/.env` — confirmed ignored; `git status --short` showed only the intended Step B staged files plus the pre-existing untracked `PROJECT_STATUS_HANDOFF.md`, which was left untouched. `backend/.env` was not staged.
- **Problems:** An initial staged diff check found trailing whitespace in the new matrix document; removed it, restaged, and the subsequent check passed.
- **Deviations/open questions:** None. Phase 4 was not started. Owner review is the next required action.
- **Commit hash(es):** Step B implementation `86b0bf5a96653ffec2033385cadeb0dfc74efade`. This addendum is committed separately; its own commit hash is available in Git history.
- **Next step:** Await owner review/instruction; do not begin Phase 4.

## Phase 4 — Step A2: test-schema cleanup and locale-independent validation

**Date/time:** 2026-10-10 19:47 +03:00

### What changed
- Inspected only the explicitly selected `erp_test` databases. Before migration, MySQL 8.4.3 had two legacy tables (`users`: 1 row; `auth_sessions`: 4 rows), no v4.1/v4.2 schema and no migration table. MariaDB 13.0.2 already had the complete 48-table v4.1/v4.2 schema, two migration rows, and zero rows outside migrations.
- Before applying the schema on MySQL, preserved the existing tables and all five rows by renaming them to `legacy_step_a2_users` and `legacy_step_a2_auth_sessions`; no user/session values were printed, copied to tracked files, or deleted. Laravel's migrator then created the v4.1 schema and applied the v4.2 verification migration to `mysql_test` (`erp_test`) only.
- Set `APP_LOCALE=en` with `force="true"` in `phpunit.xml`, making message-based assertions independent of machine locale.
- Final exact-database inspection: MySQL `erp_test` has 50 tables and 7 rows total (48 schema/migration tables including two migration rows plus the two preserved legacy tables with 1 and 4 rows). Every new ERP table is empty. Migration rows: v4.1 and v4.2, both batch 1. MariaDB `erp_test` has 48 tables and 2 rows total, both migration rows (v4.1 batch 1; v4.2 batch 2); every other table is empty.

### Commands and actual results
- `php artisan migrate --database=mysql_test --force --no-interaction` — v4.1 migration **DONE**; v4.2 migration **DONE**. The configured `mysql_test` connection was verified to report database `erp_test`, MySQL 8.4.3 before changes.
- Temporary exact-scope inspection runner — selected database reported `erp_test` on both engines; listed all tables, per-table row counts, and migration rows as summarized above. Runner removed after use.
- Temporary Phase 1 SQL runner on MySQL `erp_test` — **19 constraints PASS, 0 failed; exit 0**.
- Same Phase 1 SQL runner on MariaDB `erp_test` — **19 constraints PASS, 0 failed; exit 0**.
- Full Laravel suite on MySQL `erp_test`, `DB_CONNECTION=mysql_test`, `AUTH_TEST_CONNECTION=mysql_test` — **28 passed, 207 assertions, 0 failed**.
- Full Laravel suite on MariaDB `erp_test`, `DB_CONNECTION=mariadb_test`, `AUTH_TEST_CONNECTION=mariadb_test` — **28 passed, 207 assertions, 0 failed**.
- Inspection attempts using `artisan db:show` / schema table listing initially included other schemas on the same server; corrected to enumerate `SHOW FULL TABLES FROM erp_test` and explicitly qualify row-count queries. Initial Tinker inline invocations also failed argument parsing; replaced by temporary PHP inspection/validation runners, then removed. No other database was queried for contents.
- `system_end` was not accessed. No password or `.env` content was emitted.

### Problems, fixes, deviations, and open questions
- MySQL's previous `erp_test` was not a clean empty database: two non-v4.1 legacy tables contained five rows. Rather than dropping or overwriting them, both tables were preserved under explicit legacy names, then the approved Laravel migrations were applied. The preserved legacy records were not imported into the new v4.1 schema.
- Earlier reports' impression of MySQL `erp_test` migration state was incorrect: exact-schema inspection showed only the two legacy tables and no exact-database migration table before this step. Actual post-migration state is now directly verified.
- Both-engine full suites and constraint suites passed. No unresolved Step A2 failure remains.
- New owner decision recorded: ابنوب and كراس are both full-access owners; this supersedes earlier issuer/read-only access limits. Step B2 must implement that updated matrix without editing prior schema versions.
- No other owner decision is needed to proceed. Phase 4 inventory implementation remains unstarted.

### Commit hash(es)
- Step A2 implementation commit: `e486f26`.

### Next step
- Perform Phase 3 — Step B2: owner permissions, interactive `users:create-owner`, other-owner password reset policy, V3 permission-matrix history, updated authorization tests, and both-engine validation. Do not start inventory implementation before Step B2 completes.

## Phase 4 — Step A2 implementation commit hash addendum

**Date/time:** 2026-10-10 19:56 +03:00

- **What changed:** Recorded the Step A2 commit hash for the locale setting and test-database verification.
- **Commands and actual results:** Step A2 was committed after `git diff --cached --check` passed. `git check-ignore backend/.env` confirmed it remains ignored; only `backend/phpunit.xml` and this progress log were staged.
- **Problems/deviations/open questions:** None beyond the Step A2 entry above. Step B2 is next; Phase 4 inventory implementation has not begun.
- **Commit hash(es):** Step A2 implementation `e486f26`.
- **Next step:** Phase 3 — Step B2, then stop only at the owner-specified Phase 4 checkpoint.

## Phase 3 — Step B2: two-owner permissions and manual password management

**Date/time:** 2026-10-10 20:10 +03:00

### What changed
- Updated the single canonical `RolePermissionMatrixSeeder`; no duplicate permission migration was added. Both owner accounts receive every current permission. `designated_invoice_issuer` and `read_only` remain future templates only; no real accounts were created or assigned them.
- Added the console command `users:create-owner`. It takes no arguments, asks for username/display name, prompts for the password and confirmation using hidden console input, hashes the value, and assigns the new account the active `owner` role. It was tested only with a throwaway test identity on the `erp_test` test connection (temporary test tables); persistent owner accounts were not created.
- Added the CSRF-protected `POST /api/v1/users/{userId}/password` route protected by `users.manage`. An owner can manually reset another owner's password; the operation stores no password in the audit record and revokes all of the target's active sessions. No email-reset workflow was added.
- Kept V2 as historical documentation and added `PROPOSED_ROLE_PERMISSION_MATRIX_V3.md`; updated the current authentication/authorization guide. API routes remain permission-checked; unknown paths return 404 without an application handler; declared routes with empty permissions are forbidden.
- Added tests for both named owners' full permission sets, roleless users denied every permission, unauthenticated users, unknown paths, empty permission declarations, both directions of owner-to-owner manual password reset, and the interactive owner-creation command. Added a reusable exact-`erp_test` v4.2 constraint-suite runner.

### Final permission matrix

| Permission | `owner` | `designated_invoice_issuer` (future template) | `read_only` (future template) |
|---|---:|---:|---:|
| `users.view_self` | Yes | Yes | Yes |
| `sessions.revoke_self` | Yes | Yes | Yes |
| `invoices.view` | Yes | No | Yes |
| `users.manage` | Yes | No | No |
| `invoices.create` | Yes | Yes | No |
| `customers.view` | Yes | Yes | Yes |
| `products.view` | Yes | Yes | Yes |
| `customers.create` | Yes | No | No |
| `collections.create` | Yes | No | No |
| `returns.create` | Yes | No | No |
| `documents.edit` | Yes | No | No |
| `documents.cancel` | Yes | No | No |
| `documents.reverse` | Yes | No | No |
| `documents.correct` | Yes | No | No |
| `costs.view` | Yes | No | No |
| `markup.view` | Yes | No | No |
| `profit.view` | Yes | No | No |

### Commands and actual results
- `artisan db:seed --class=RolePermissionMatrixSeeder --database=mysql_test --force --no-interaction` — **DONE**. MariaDB equivalent using `--database=mariadb_test` — **DONE**. Verified on MySQL 8.4.3 and MariaDB 13.0.2 `erp_test`: 3 roles, 17 permissions; grants `owner=17`, `designated_invoice_issuer=5`, `read_only=5`; persistent users=0 and user-role assignments=0.
- `artisan users:create-owner --help` — passed; usage has no username/password arguments. Feature test confirms hidden password prompts, owner-role assignment, and no real account creation.
- Focused authorization/password tests after final code — **6 tests passed, 38 assertions** with **2 expected engine-only tests skipped** under the SQLite focused run. The bidirectional owner password-reset test separately passed **1 test, 23 assertions**.
- Final complete Laravel suite on MySQL `erp_test` — **32 passed, 292 assertions, 0 failed**.
- Final complete Laravel suite on MariaDB `erp_test` — **32 passed, 292 assertions, 0 failed**.
- Final v4.2 Phase 1 constraints on MySQL `erp_test` — **19/19 PASS; failed_tests=0; exit 0**.
- Final v4.2 Phase 1 constraints on MariaDB `erp_test` — **19/19 PASS; failed_tests=0; exit 0**.
- `vendor/bin/pint --test` on all changed PHP files including the constraint runner — **passed**. `git diff --check` is required before commit.
- Test-only passwords were generated at runtime; no credential values or `.env` contents were printed or logged. All SQL validation targets were explicitly guarded to `erp_test`; `system_end` was not accessed.

### Problems, fixes, deviations, and open questions
- An initial focused assertion used a response helper unavailable in this Laravel test version; replaced it with an assertion against response content to verify the generated password is absent, then reran the tests successfully.
- No schema change was needed: v4.1 already has numeric user/role keys and audit fields sufficient for this feature. V2 remains unchanged as history; V3 is the active policy. The future role templates retain their earlier limited grant sets but are explicitly unassigned; this preserves reusable role definitions without treating either current owner as an issuer/read-only user.
- No unresolved Step B2 failures or owner decisions remain.

### Commit hash(es)
- Step B2 implementation commit: `c34d091`.

### Next step
- Begin Phase 4 by inspecting/mapping v4.1/v4.2 product, location/warehouse, inventory movement, and opening-stock tables. Do not start Phase 5.

## Phase 3 — Step B2 implementation commit hash addendum

**Date/time:** 2026-10-10 20:12 +03:00

- **What changed:** Recorded the Step B2 implementation commit and updated the handoff to Phase 4 schema inspection.
- **Commands and actual results:** `git diff --cached --check` — passed before the Step B2 implementation commit. The commit included only the reviewed RBAC, owner-password, documentation, tests, constraints runner, and progress-log files.
- **Problems/deviations/open questions:** None. No real accounts were created; Phase 4 has not started.
- **Commit hash(es):** Step B2 implementation `c34d091`; this hash addendum is committed separately.
- **Next step:** Inspect and map the v4.1/v4.2 inventory schema, then implement Phase 4 only.

## Phase 4 — Step 1 schema mapping and cost-scope decision gate

**Date/time:** 2026-10-10 20:14 +03:00

### What was inspected
- Read the HANDOFF section before continuing. Step A2 and Step B2 remain complete and committed; this entry is the first Phase 4 action.
- Mapped the approved v4.1 structures without changing earlier schema versions:
  - `product_categories`: hierarchical categories with optional unique code and active state.
  - `products`: numeric `BIGINT UNSIGNED` identity, unique SKU/barcode, category, integer unit/minimum-stock fields, optional default location, audit user references, and nonnegative company-price/minimum-stock checks.
  - `locations`: hierarchical location table with unique code, `main`/`sub`/`vehicle`/`damaged`/`other` types, active state, and notes. This is the schema's warehouse/location abstraction; no rename is needed for Phase 4.
  - `inventory_movements`: dated header with opening/receipt/sale/return/transfer/adjustment/damage/container-receipt/reversal types, draft/posted/reversed/cancelled status, optional paired source identity, reversal link, reason and posting metadata.
  - `inventory_movement_lines`: positive integer quantities, product, optional from/to locations, source/reversal links, and optional unit/extended EGP cost snapshots.
  - `inventory_balances`: projection keyed by `(product_id, location_id)`, integer on-hand/reserved values, `average_unit_cost_egp`, `inventory_value_egp`, and a nonnegative on-hand check.
  - Opening stock is represented by dated `inventory_movements` with type `opening`, not by a fixed master balance.
- The v4.1 DDL's application invariants require stable-order balance-row locking, atomic projection/ledger updates, and reconciliation of balances from posted movement lines. Existing types, keys, and tables appear sufficient for the requested Phase 4 scope; whether a forward schema migration is needed is NOT VERIFIED until implementation design is completed.

### Commands and actual results
- Read-only source inspection of `precision_slate_v4_1.sql`, its v4.1 change log, current schema-mapping documentation, the current V3 permission matrix, and the progress-log HANDOFF. **No database command or tests were run** for this mapping step.
- Phase 4 full suite and constraint suite: **NOT RUN**.
- Database targets: none accessed.

### Problems, decisions, deviations, and open questions
- Found a business-rule conflict that must not be guessed: the owner's latest Phase 4 request says weighted-average cost **per product**, while the approved v4.1 `inventory_balances.average_unit_cost_egp` explicitly says **per product/location** and the primary key is `(product_id, location_id)`. These choices produce different costs for the same product across locations and affect valuation/issue snapshots. Implementation is paused pending owner clarification.
- No earlier schema version was changed. `locations` is retained as the warehouse/location representation; no table rename or migration is proposed from this inspection alone.
- No deviation from the requested stop rule: this is a business decision not resolved in prior decisions.
- Other open questions: none newly identified in this step. Phase 8 accountant input remains outside current scope.

### Commit hash(es)
- This schema-mapping checkpoint and HANDOFF update are committed with this entry; the resulting hash will be recorded in a subsequent append-only hash addendum.

### Next step
- Wait for the owner to choose global per-product weighted-average cost or per-product/location weighted-average cost. Do not implement or alter schema until clarified. After the decision, resume Phase 4 only and stop after Phase 4.

## Phase 4 — Step 1 schema mapping commit hash addendum

**Date/time:** 2026-10-10 20:14 +03:00

- **Commit hash(es):** `bc062d9` — records the approved v4.1 catalog/inventory/opening-stock mapping, the cost-scope conflict, and the Phase 4 decision gate in the progress log.
- **Next step:** Wait for the owner's cost-scope decision before implementation.

## Phase 4 — cost-scope decision

**Date/time:** 2026-10-10 20:21 +03:00

### Decision recorded
- The owner selected weighted-average cost **per product/location**, matching the approved v4.1 `inventory_balances` primary key and `average_unit_cost_egp` field.
- The scope conflict recorded in the Step 1 mapping is resolved. No schema change is authorized or needed on this basis; v4.1 and v4.2 remain unchanged.

### Commands and actual results
- Owner decision received through the clarification tool. No command, test, migration, or database operation was run for this decision.

### Problems, deviations, and open questions
- No open Phase 4 business decision remains from the mapping conflict.
- No deviation from approved schema or business rules. Phase 4 remains bounded to catalog/inventory.

### Commit hash(es)
- This decision and HANDOFF update are committed in this log; the commit hash will be recorded by append-only addendum.

### Next step
- Inspect code patterns and build the Phase 4 inventory service/API. Test both configured engines on `erp_test`; do not start Phase 5.

## Phase 4 — cost-scope decision commit hash addendum

**Date/time:** 2026-10-10 20:21 +03:00

- **Commit hash(es):** `3db2c2b` — records the owner's per-product/location weighted-average costing decision and updates the HANDOFF.
- **Next step:** Inspect existing implementation patterns and proceed with Phase 4 only.

## Phase 4 — implementation pattern inspection

**Date/time:** 2026-10-10 20:23 +03:00

### What was inspected
- Confirmed there is no existing inventory service/controller/model or inventory route; application persistence currently uses Laravel query builder in controllers/services.
- Reviewed existing transaction, `lockForUpdate`, CSRF/permission route middleware, request validation, and `audit_logs` insertion patterns.
- Confirmed `audit_logs` supports actor snapshot, action/entity identity, reason, before/after JSON text, request ID, binary IP, user agent and timestamp.
- Confirmed the canonical seeder grants owners every listed permission, while issuer/read-only are templates only. Phase 4 requires explicit `products.manage`, `warehouses.manage`, `inventory.view`, and `inventory.manage` permissions; non-owner templates will not receive those permissions.
- Existing tests have engine-guard patterns for `mysql_test`/`mariadb_test` and `erp_test`; new inventory tests must enforce the same exact target and avoid permanent fixtures.

### Commands and actual results
- Source inspections only (`glob`, `rg`, and file reads). No test, style, build, migration, or database command was run in this inspection step.
- Full-suite and Phase 1 constraints: **NOT RUN**.

### Problems, deviations, and open questions
- No reusable audit helper exists; Phase 4 must insert explicit audit rows within the same transaction as each mutation.
- No schema change has been identified from the mapping/design review; migration need remains contingent on implementation.
- No new business decision is needed. Costing scope is approved as per product/location.

### Commit hash(es)
- This inspection checkpoint and HANDOFF update are committed with this entry; the hash will be recorded append-only.

### Next step
- Implement Phase 4 catalog/inventory service, API, permissions, audit records and dual-engine feature tests. Run all required full suites and constraints, then stop; do not start Phase 5.

## Phase 4 — implementation pattern inspection commit hash addendum

**Date/time:** 2026-10-10 20:23 +03:00

- **Commit hash(es):** `a66de2e` — records the implementation-pattern inspection and Phase 4 handoff.
- **Next step:** Implement and validate Phase 4 only.

## Phase 4 — initial full MySQL suite

**Date/time:** 2026-10-10 20:31 +03:00

### What was built
- Implemented the initial Phase 4 service/API/RBAC/test work in the working tree: exact decimal money helper, transactional inventory posting, audit logging, product/category/warehouse endpoints, inventory balance/history/adjustment/opening endpoints, new permission grants, costing documentation, and engine-backed tests. This implementation is not yet committed.

### Commands and actual results
- `php artisan test --colors=never` from `backend`, with `DB_CONNECTION=mysql_test`, `DB_TEST_DATABASE=erp_test`, and `AUTH_TEST_CONNECTION=mysql_test`: **38 tests, 36 passed, 2 failed, 372 assertions**.
- Both failures were formatting expectations: a direct database read returns `DECIMAL(19,4)` with four fractional digits, while API monetary fields should be serialized at the approved nearest-piastre scale of two digits. No schema/constraint error occurred.
- MariaDB full suite and Phase 1 constraints on either engine: **NOT RUN**.
- The engine tests use temporary shadow tables; no persistent Phase 4 records were created.

### Problems, fixes, deviations, and open questions
- Fix required: format company-price, balance-cost/value, and movement-cost/value API fields as exact two-decimal strings; keep the direct database assertion aligned with the column's native four-digit display scale.
- No business decision is open. No schema version was changed.
- The first Pint invocation used repository-root-relative paths and failed to locate `backend/vendor/bin/pint`; rerunning from `backend` succeeded and formatted the changed PHP files.

### Commit hash(es)
- The failing-test checkpoint is recorded and committed before applying the fix; hash will be recorded append-only.

### Next step
- Normalize API monetary serialization, fix the direct DECIMAL assertion, then rerun full suites and constraint tests on both test databases. Stop after Phase 4.

## Phase 4 — initial MySQL suite commit hash addendum

**Date/time:** 2026-10-10 20:31 +03:00

- **Commit hash(es):** `684816c` — records the initial MySQL full-suite result (36 passed, 2 precision-scale assertion failures) and the planned fix.
- **Next step:** Normalize API money output to two decimals and rerun validation.

## Phase 4 — MySQL suite after monetary serialization fix

**Date/time:** 2026-10-10 20:32 +03:00

### What changed
- Updated product, balance, and movement API money values to serialize at two decimal places using exact integer/string arithmetic. Corrected the direct database assertion to expect the DECIMAL column's native four-place representation.

### Commands and actual results
- `php artisan test --colors=never` from `backend`, with test connection set to `mysql_test` and database `erp_test`: **38 tests, 37 passed, 1 failed, 378 assertions**.
- The previous two scale-format failures now pass. The one remaining failure expected 403 on a read-only POST but received 419 because the test did not provide CSRF; the CSRF middleware correctly ran before permission authorization.
- MariaDB full suite and Phase 1 constraints: **NOT RUN**.
- Only temporary test tables were used; no persistent test fixtures remain.

### Problems, fixes, deviations, and open questions
- Update the read-only denial test to provide that user's valid CSRF token so it verifies the permission denial rather than failing earlier at CSRF.
- No application behavior defect was observed in this run. No schema version changed and no business decision is open.

### Commit hash(es)
- This test-result checkpoint is committed with the log; hash will be recorded append-only.

### Next step
- Fix the test request headers, rerun full MySQL/MariaDB suites, then run the Phase 1 constraint suite on both `erp_test` databases.

## Phase 4 — monetary serialization rerun commit hash addendum

**Date/time:** 2026-10-10 20:32 +03:00

- **Commit hash(es):** `4785b0a` — records the second MySQL full-suite result and the CSRF assertion setup fix needed.
- **Next step:** Correct the read-only request headers and continue dual-engine validation.

## Phase 4 — dual-engine full suite with expanded API coverage

**Date/time:** 2026-10-10 20:34 +03:00

### What changed
- Expanded engine-backed API coverage for dated opening stock, owner catalog management/audit logging, company-price piastre rounding, active-stock deactivation protection, and read-only denials. The read-only write test now supplies valid CSRF so permission middleware is exercised.
- The test cases exercise only temporary shadow tables in the configured test databases.

### Commands and actual results
- Full Laravel suite on MySQL 8.4.3 `mysql_test` / `erp_test`: **38 tests, 37 passed, 1 failed, 393 assertions**.
- Full Laravel suite on MariaDB 13.0.2 `mariadb_test` / `erp_test`: **38 tests, 37 passed, 1 failed, 393 assertions**.
- Both failures are the same test assertion: final request expected unauthenticated 401 but received 200 because the test client retained the preceding owner's cookie. This does not indicate an API authorization failure.
- Phase 1 constraints on MySQL and MariaDB: **NOT RUN**.

### Problems, fixes, deviations, and open questions
- Correct the test by explicitly sending a non-session cookie for the unauthenticated check; then rerun the full suite on both engines.
- No schema or business-rule change. No current owner decision is open.

### Commit hash(es)
- This dual-engine result checkpoint is committed before applying the test-isolation fix; hash will be recorded append-only.

### Next step
- Fix the cookie-isolation assertion, rerun both full suites, and run the Phase 1 constraint suite on both `erp_test` databases.

## Phase 4 — dual-engine test checkpoint commit hash addendum

**Date/time:** 2026-10-10 20:34 +03:00

- **Commit hash(es):** `7e12bed` — records the full-suite results on MySQL and MariaDB and the test-client cookie leakage diagnosis.
- **Next step:** Isolate the unauthenticated test request, then rerun dual-engine validation.

## Phase 4 — full suites and Phase 1 constraints pass on both engines

**Date/time:** 2026-10-10 20:37 +03:00

### What was built
- Completed the Phase 4 catalog/inventory implementation in the working tree: products and categories CRUD; warehouse/location management; current stock and movement history; signed manual adjustments; dated opening stock; transactional receive/issue; cost-field masking; and audit logging for all catalog and stock mutations.
- Added owner-only `products.manage`, `warehouses.manage`, `inventory.view`, and `inventory.manage` permissions. The owner receives all 21 seeded permissions; future issuer/read-only templates receive none of the new inventory permissions.
- No new migration was required. Approved v4.1/v4.2 schema files remain unchanged.
- Documented cost scope and rounding behavior in `backend/docs/architecture/backend-design/INVENTORY_COSTING.md`.

### Commands and actual results
- Full Laravel suite on MySQL 8.4.3 `mysql_test` / `erp_test`: **38 tests, 38 passed, 393 assertions**.
- Full Laravel suite on MariaDB 13.0.2 `mariadb_test` / `erp_test`: **38 tests, 38 passed, 393 assertions**.
- Phase 1 v4.2 constraints, MySQL 8.4.3 `erp_test`: **19 tests passed, 0 failed**.
- Phase 1 v4.2 constraints, MariaDB 13.0.2 `erp_test`: **19 tests passed, 0 failed**. Both engines passed the same accepted/rejected behaviors; expected constraint-error diagnostic text differs by engine.
- `vendor/bin/pint --test` on changed PHP files: **passed**. `git diff --check`: **passed**.
- `artisan route:list --path=api/v1 --except-vendor`: **22 routes listed** (public health/login plus authenticated endpoints). An initial attempt used unsupported `--columns`; rerunning without that option succeeded.
- All Phase 4 engine tests use temporary table shadows and verified `erp_test`; constraint runner also guards `erp_test`. No `system_end` access, secrets, or persistent Phase 4 fixture rows.

### Problems, fixes, deviations, and open questions
- Resolved money-scale assertions by serializing all exposed monetary fields as exact two-decimal strings while retaining v4.1 DECIMAL(19,4) storage. The movement ledger's net extended values remain equal to inventory value despite unit-average rounding residuals.
- Resolved permission test ordering by supplying valid CSRF to reach authorization; explicitly reset the test cookie for the unauthenticated case to prevent cookie state leaking between requests.
- Added checks preventing product/warehouse deactivation while on-hand/reserved stock exists. Inventory posting takes shared locks on product and location and an exclusive lock on the product/location balance row; balance and movement/audit changes share one transaction.
- No schema/business-rule deviation. Costing scope is per product/location, as explicitly approved. No owner decision remains open for Phase 4.
- **Concurrency stress testing remains NOT VERIFIED**; the transactional row-lock code is present, but this validation run did not yet exercise two independent processes against one balance.

### MariaDB/MySQL and PHP feature inventory
| Feature used | Minimum MySQL | Minimum MariaDB | Notes |
|---|---:|---:|---|
| InnoDB transactions, `SELECT ... FOR UPDATE`, shared row locks, unique-key conflict handling (`INSERT IGNORE`) | 8.0 | 10.6 project floor | Used for atomic stock posting and safe balance-row creation. Tested on MySQL 8.4.3 and MariaDB 13.0.2; minimum server versions NOT VERIFIED. |
| `DECIMAL(19,4)`, integer/boolean/date/string columns and existing indexes/FKs | 8.0 | 10.6 project floor | Inherited from approved v4.1; no Phase 4 DDL alteration. |
| Enforced CHECK constraints | 8.0.16 | 10.2.1 (project floor 10.6) | Existing v4.1 constraints; tested on MySQL 8.4.3/MariaDB 13.0.2, not at the floors. |
| PHP string/integer arithmetic, Laravel query builder, UUID generation | PHP 8.3 | n/a | Exact piastre math has no BCMath/GMP extension dependency; framework application behavior uses the existing PHP 8.3/Laravel 13 target. |

### Commit hash(es)
- Phase 4 implementation remains uncommitted while the concurrent-process validation gap is addressed. This progress checkpoint is committed with its own log hash addendum.

### Next step
- Add and run a two-process same-product/location movement test on both engines. Rerun all tests and constraints after that change, commit Phase 4 with this log, then stop without starting Phase 5.

## Phase 4 — dual-engine passes commit hash addendum

**Date/time:** 2026-10-10 20:37 +03:00

- **Commit hash(es):** `da9f112` — records 38/38 full-suite tests and 19/19 Phase 1 constraints passing on MySQL and MariaDB, plus the remaining concurrency validation task.
- **Next step:** Validate concurrent movement serialization on both engines, rerun final suites, then commit Phase 4.

## Phase 4 — first concurrent-receipt test

**Date/time:** 2026-10-10 20:41 +03:00

### What was built
- Added a real two-process integration test and a bounded worker script, both guarded to `erp_test`. The test holds the composite stock-balance row lock, starts two independent Laravel/PDO processes for receipts, releases the lock, and checks combined quantity, weighted average, inventory value, and movement count.

### Commands and actual results
- MySQL 8.4.3 targeted concurrency test: **1 test, 0 passed, 1 failed, 1 assertion**. One process failed with MySQL error 1213 (deadlock) at `SELECT ... FOR UPDATE` after both processes attempted to establish/use the same balance under the held lock.
- MariaDB concurrency test: **NOT RUN**.
- Persistent test fixtures are cleaned by the integration test teardown; fixture cleanup status after the failure: **NOT VERIFIED** until checked.

### Problems, fixes, deviations, and open questions
- The test uncovered a real contention path: both workers execute `INSERT IGNORE` on an already existing but locked balance, then race to upgrade locks. Fix by checking for an existing balance before issuing insert-ignore and allowing Laravel's transaction manager to retry deadlock victims; verify that retries preserve single-posting/ledger invariants.
- Attempted read-only fixture-count checks through two inline `artisan tinker`/`php -r` commands; both failed at PHP argument parsing before executing any query. No database write occurred. Cleanup remains **NOT VERIFIED**; the integration test teardown is expected to remove only rows matching its generated actor/product/location IDs, and the next test run will add a stale-fixture guard.
- No business decision or schema change is needed. This is a service reliability fix, not a change to stock or costing policy.

### Commit hash(es)
- The failing concurrency checkpoint is committed with this log before applying the service fix; hash will be recorded append-only.

### Next step
- Adjust balance-row initialization and transaction retry behavior; rerun the targeted concurrent test on MySQL and MariaDB. Then run full suites and constraints on both engines and stop after Phase 4.

## Phase 4 — concurrency fix and targeted dual-engine verification

**Date/time:** 2026-10-10 20:47 +03:00

### What changed
- Updated `backend/app/Services/InventoryService.php` to check for an existing product/location balance before attempting `insertOrIgnore`, avoiding the unnecessary insert lock on established balance rows. Laravel now retries transient deadlocks up to five transaction attempts.
- Added an `erp_test` stale-fixture guard to `backend/tests/Feature/InventoryConcurrencyEngineTest.php`.

### Commands and actual results
- MySQL 8.4.3 `erp_test`: `AUTH_TEST_CONNECTION=mysql_test DB_CONNECTION=mysql_test DB_TEST_DATABASE=erp_test php artisan test --colors=never --filter=InventoryConcurrencyEngineTest` — **1 test passed, 8 assertions**.
- MariaDB 13.0.2 `erp_test`: `AUTH_TEST_CONNECTION=mariadb_test DB_CONNECTION=mariadb_test DB_MARIADB_TEST_DATABASE=erp_test php artisan test --colors=never --filter=InventoryConcurrencyEngineTest` — **1 test passed, 8 assertions**.
- The repeated run on each engine passed the stale-fixture guard, establishing the prior test teardown left no matching generated user fixture. Database-wide cleanup was not independently queried.
- Two earlier read-only fixture inspection attempts using `artisan tinker --execute` failed with parser error `InvalidArgumentException: Unexpected end of input`; they did not execute a query or mutate data.
- Full Laravel suites and Phase 1 constraint suites after this fix: **NOT RUN yet**.

### Problems, fixes, deviations, and open questions
- The first MySQL concurrency run deadlocked. The service change avoids `INSERT IGNORE` against an existing locked row and applies bounded Laravel transaction retries; concurrent receipts now serialize and produce the expected quantity, average cost, inventory value and movement count on both engines.
- No schema or business-rule changes. The stale-fixture guard fails safely rather than deleting unidentified persistent rows.
- No open Phase 4 business decision.

### Commit hash(es)
- This fix and its test evidence will be committed with this entry; hash to be added append-only.

### Next step
- Run the full Laravel suite and Phase 1 constraints on both MySQL and MariaDB `erp_test`, then record actual results, commit Phase 4 and stop. Do not start Phase 5.

## Phase 4 — final dual-engine validation and completion

**Date/time:** 2026-10-10 20:51 +03:00

### What was completed
- Completed the approved v4.1/v4.2-compatible Phase 4 catalog and inventory implementation: categories, products, locations/warehouses, transactional dated opening/adjustment movements, current balance projection and movement history; per-product/location weighted-average costing; nonnegative stock enforcement; audit rows in each mutation transaction; permission-checked API; owner full-access and future role templates retained.
- Confirmed no forward migration was required. Earlier schema versions and decision rules were not changed.
- Committed the concurrency fix and its checkpoint as `fb2199d`; final Phase 4 application files and this completion checkpoint are being committed together next.

### Commands and actual results
- Final full Laravel suite on MySQL 8.4.3 `erp_test`: `artisan test --colors=never` — **39 tests passed, 401 assertions**.
- Final full Laravel suite on MariaDB 13.0.2 `erp_test`: `artisan test --colors=never` — **39 tests passed, 401 assertions**.
- Final Phase 1 constraint suite on MySQL `erp_test`: `php scripts\run-phase1-constraints.php mysql_test` — **19 passed, 0 failed**.
- Final Phase 1 constraint suite on MariaDB `erp_test`: `php scripts\run-phase1-constraints.php mariadb_test` — **19 passed, 0 failed**.
- Concurrent receipt test on both engines: **1 test passed, 8 assertions** each. Both engines produced the expected serialized on-hand quantity 5, average cost 1.6000, inventory value 8.0000, and two movement records.
- Pint on the Phase 4 PHP source/test set: passed. Its first check identified formatting in the new worker/concurrency test; Pint fixed those files and the final check passed.
- `artisan route:list --path=api/v1 --except-vendor --no-ansi`: succeeded and showed **22 API routes**.
- Constraint suite behavior was equivalent on both engines (19/19). MariaDB's runner displayed detailed FK/CHECK/unique constraint error messages for expected rejected writes; MySQL displayed the same cases as PASS without detail. No assertion outcome differed.
- Only the approved scratch/test databases were used; `system_end` was not accessed.

### Problems, fixes, deviations, and open questions
- Fixed the MySQL 1213 concurrency deadlock by avoiding insert-ignore on an existing product/location balance and enabling five-attempt transaction retries. Reproduced success on MySQL and MariaDB.
- Two earlier, non-mutating fixture inspection attempts did not parse; repeated integration tests passed the stale-fixture guard on both engines. No matching stale test actor remained at the next test startup.
- No deviations from approved business rules or schema. MariaDB 10.6/MySQL 8.0 minimum-version execution was not possible on the installed newer versions and remains explicitly NOT VERIFIED.
- Open question for this handoff: owner review before any Phase 5 work. No Phase 4 business decision remains open.

### MariaDB/MySQL and PHP feature inventory
| Feature used | Minimum MySQL | Minimum MariaDB | Notes |
|---|---:|---:|---|
| InnoDB transactions, row-level `SELECT ... FOR UPDATE` locks, shared row locks, unique-key conflict handling | 8.0 | 10.6 project floor | Used for atomic movement posting and balance-row initialization. Tested on MySQL 8.4.3 and MariaDB 13.0.2; minimum versions NOT VERIFIED. |
| `DECIMAL(19,4)`, integer/boolean/date/string columns, indexes and foreign keys | 8.0 | 10.6 project floor | Existing approved v4.1 DDL; no Phase 4 schema change. |
| Enforced `CHECK` constraints | 8.0.16 | 10.2.1 (project floor 10.6) | Existing v4.1/v4.2 constraints; tested on MySQL 8.4.3 and MariaDB 13.0.2. |
| PHP 8.3 string/integer arithmetic, Laravel query builder and UUID generation | PHP 8.3 | n/a | No BCMath/GMP requirement or engine-specific SQL added by Phase 4. |

### Commit hash(es)
- Phase 4 implementation and this completion entry are committed together; hash to be added append-only after commit.

### Next step
- Stop for owner review. Do not start Phase 5 until requested.

## Phase 4 — completion commit hash addendum

**Date/time:** 2026-10-10 20:51 +03:00

- **Commit hash(es):** `ff3dd5c` — commits Phase 4 catalog/inventory APIs, exact-cost calculations, weighted-average inventory posting and audit logging, permission updates, documentation, dual-engine tests, and the final 39-test/401-assertion plus 19-constraint validation checkpoint.
- **Next step:** Phase 4 is complete. Stop for owner review; do not start Phase 5 until requested.

## Phase 4b — unlimited warehouses, atomic transfers, roles, and step-up

**Date/time:** 2026-10-10 21:15 +03:00

### What was built
- Verified `locations` has no warehouse-count constraint: Laravel `artisan db:table locations --database=...` showed an auto-increment BIGINT, unique location code, type index, parent FK and ordinary columns; neither DDL nor controller validation limits the count.
- Added warehouse transfer as a single `transfer` movement and movement line with both source and destination locations. It locks both balances in stable location order, carries source average unit cost, debits/credits equal ledger value in one transaction, rejects same-location and insufficient source stock, and writes an audit row transactionally.
- Added authenticated `POST /api/v1/inventory/transfers` with CSRF, inventory permission, and step-up requirement.
- Added test coverage creating 25 locations for one product and receiving stock into each; transfer cost and destination weighted-average recalculation; negative/same-warehouse rejection; audit-failure rollback; API permission allow/deny.
- Implemented the previously missing driver role template (`driver`, display name `السواق`). It starts with self-profile/session permissions only, has no assigned account, and additional explicit `role_permissions` grants survive seeder reruns.
- Implemented forward-only session step-up: `POST /api/v1/auth/reauth` checks the current password, requires CSRF and `users.view_self`, records and audits a per-session marker transactionally, and expires it after 10 minutes. Added `RequireRecentStepUp`; current sensitive cost reads and catalog/inventory mutations require recent verification. All roles face the same step-up requirement before financial mutation permission evaluation.
- Added migration `2026_10_10_000002_add_step_up_authentication_to_sessions.php`; v4.1/v4.2 schema files are unchanged.
- Updated current authorization/matrix documentation. No real owner or driver accounts were created.

### Earlier items — evidence-based status
- **(a) Step A2 — DONE+TESTED.** MySQL `erp_test` Laravel migration status listed `2026_10_10_000000_create_approved_v4_1_schema [1] Ran` and `2026_10_10_000001_add_v4_2_email_verification_to_users [1] Ran`; Laravel `db:table locations` confirmed the v4.1 table. MySQL Phase 1 constraints: **19 passed, 0 failed**. MariaDB also lists v4.1/v4.2 Ran and its same constraint suite passed 19/19.
- **(b) Step B2 — DONE+TESTED for authorization and command behavior; production accounts not provisioned.** The canonical seeder gives `owner` every permission; engine tests verify both owner identities ابنوب and كراس pass all permission checks. `CreateOwnerUser` registers `users:create-owner`; `ApiAuthenticationTest::users_create_owner_prompts_for_a_hidden_password_and_assigns_the_owner_role` verifies interactive password/confirmation, hash persistence and owner assignment using a throwaway fixture. No real named accounts were created, and no password is recorded in this log.
- **(c) Driver + step-up — DONE+TESTED for current implemented surfaces.** Seeder tests verify `driver`/`السواق` exists, defaults least-privileged, and retains a new grant after reseeding. Inventory engine tests verify 428 `STEP_UP_REQUIRED` absent recent verification, successful reauth, permission denial after reauth for a role lacking inventory permission, and expiry after 11 minutes. Future Phase 5–7 financial endpoints must apply the same middleware when implemented.

### Commands and actual results
- MySQL migration status showed the step-up migration Pending, then `artisan migrate --database=mysql_test --force --no-ansi` completed it successfully. MariaDB status likewise showed it Pending, then `artisan migrate --database=mariadb_test --force --no-ansi` completed successfully. Both targets were `erp_test`; post-migration `migrate:status` lists all three migrations Ran on both engines.
- `artisan db:table locations --database=mysql_test --no-ansi`: **9 columns**, InnoDB, `utf8mb4_unicode_ci`, unique code, no count cap. MariaDB showed the same structure with **9 columns** and no count cap.
- Targeted MySQL `artisan test --colors=never --filter=InventoryEngineTest`: **9 passed, 77 assertions**. MariaDB: **9 passed, 77 assertions**.
- Targeted `AuthenticationEngineTest|ApiAuthenticationTest` first run: **23 passed, 1 failed** because `auth/reauth` lacked the explicit permission required by the route policy. Added `users.view_self`; final full suites passed.
- Final MySQL full suite: `artisan test --colors=never` — **43 passed, 446 assertions**. MariaDB full suite: **43 passed, 446 assertions**.
- Final MySQL constraints: `php scripts\run-phase1-constraints.php mysql_test` — **19 passed, 0 failed**. MariaDB: `php scripts\run-phase1-constraints.php mariadb_test` — **19 passed, 0 failed**.
- Pint initially identified formatting in AuthController, step-up middleware and the migration; applied formatting and final Phase 4b Pint check passed.
- Tests/migrations used only `erp_test`; `system_end` was not accessed. No `.env` contents or password values were emitted.

### Problems, fixes, deviations, and open questions
- Corrected the transfer API test's expected source cost from 5.50 to 4.25 because opening stock had already recomputed that warehouse's weighted average.
- Fixed an AuthController syntax issue caught by targeted tests before any commit.
- The step-up middleware correctly returns 428 before the permission middleware. Tests were updated to assert step-up is required first, then a 403 for a role still lacking the permission.
- No business-rule or older schema change. Transfers use one movement/line to preserve atomic stock and audit state.
- Accountant questions remain open for subsequent work: cost-type inclusion, treasury/journal settlement, tax inclusion convention, and report formulas. Keep these configurable and do not invent a final policy.

### Commit hash(es)
- Phase 4b implementation and this entry will be committed together; hash will be recorded in an append-only addendum.

### Next step
- Begin Phase 5 containers and landed-cost workflows. Apply step-up and deny-by-default permissions to every financial route. After Phase 5, rerun full suites and constraints on both engines before Phase 6.

## Phase 4b — implementation commit hash addendum

**Date/time:** 2026-10-10 21:15 +03:00

- **Commit hash(es):** `b76ebbb` — commits unlimited-warehouse proof/test, atomic warehouse transfers, driver role with persistent configurable grants, 10-minute step-up authentication, forward-only session migration, and both-engine Phase 4b test/constraint results.
- **Next step:** Start Phase 5 containers and landed costs; do not skip full dual-engine suite and constraints at its completion.

## Phase 5 — forward schema foundation

**Date/time:** 2026-10-10 21:23 +03:00

### What was built
- Added forward migration `backend/database/migrations/2026_10_11_000003_add_container_cost_controls_and_status_history.php`. It snapshots `include_in_inventory_cost` on each container cost, adds configurable cost-type inclusion defaults, and adds append-only container status history with actor, time, and optional reason.
- Added `backend/database/schema/SCHEMA_CHANGELOG_FORWARD.md`. Approved v4.1/v4.2 schema files were not edited.
- Updated this HANDOFF with Phase 5 state and verified migration status.

### Commands and actual results
- Initial commands ran from the repository root and returned `Could not open input file: artisan` / migration path. Retried from `backend`; this was a working-directory mistake, not an application or database failure.
- PHP 8.3.33 `php -l database\migrations\2026_10_11_000003_add_container_cost_controls_and_status_history.php` — **no syntax errors**.
- Before migration, `artisan migrate:status --database=mysql_test` and `--database=mariadb_test` both showed this migration Pending and prior v4.1/v4.2/step-up migrations Ran.
- `SELECT DATABASE(), VERSION()` via Laravel connections confirmed MySQL `erp_test`, MySQL **8.4.3**; MariaDB `erp_test`, MariaDB **13.0.2**. No other database was targeted.
- `artisan migrate --database=mysql_test --force --no-interaction` — migration completed **DONE**.
- `artisan migrate --database=mariadb_test --force --no-interaction` — migration completed **DONE**.
- Phase 5 application tests, full suite, and Phase 1 constraint suite: **NOT RUN** at this schema-foundation checkpoint.

### Problems, deviations, and open questions
- No migration incompatibility occurred on either locally installed engine.
- The new inclusion snapshot prevents changing cost-type defaults from retroactively changing a cost record. Cost-type settings default to excluded until an owner-configured setting says otherwise; the final accounting treatment remains configurable pending accountant review.
- Treasury behavior will link recorded container-cost payments to existing treasury entries; no journal policy or new treasury record creation is inferred.
- Minimum versions MySQL 8.0 and MariaDB 10.6 remain **NOT VERIFIED**; only MySQL 8.4.3 and MariaDB 13.0.2 were available.
- No unresolved owner decision blocks the requested Phase 5 implementation. Accountant policy questions remain deferred, as requested.

### Commit hash(es)
- Migration, changelog, and this progress entry are staged for commit; exact hash will be added append-only after commit.

### Next step
- Implement container, line, cost, allocation, partial receipt/reversal, status history, and payment-link endpoints/services; enforce permission and step-up checks. Then run the complete suite and Phase 1 constraints on both `erp_test` engines before Phase 6.

## Phase 5 — schema foundation commit hash addendum

**Date/time:** 2026-10-10 21:24 +03:00

- **Commit hash(es):** `aa09256` — adds container-cost inclusion snapshot, configurable cost-type defaults, append-only container status history, the forward changelog, and this schema validation record.
- The preceding Phase 5 entry's "staged for commit" note was superseded: commit `aa09256` completed successfully.
- **Next step:** Implement Phase 5 container workflows; no Phase 6 work has started.

## Phase 5 — preserve entered container purchase value

**Date/time:** 2026-10-10 21:25 +03:00

### What changed and validation
- Added forward migration `2026_10_11_000004_add_container_line_purchase_value.php` and documented it in `backend/database/schema/SCHEMA_CHANGELOG_FORWARD.md`. The new nullable `DECIMAL(19,4)` retains a line's entered total purchase value independently from its rounded unit-cost snapshot.
- PHP 8.3.33 `php -l` — **no syntax errors**.
- `artisan migrate:status --database=mysql_test` and MariaDB equivalent — prior migrations Ran and this migration Pending; both configs were the approved `erp_test` targets.
- `artisan migrate --database=mysql_test --force --no-interaction` — **DONE**. Same MariaDB command — **DONE**.
- Full suite and Phase 1 constraints: **NOT RUN** during this schema-only step.

### Problems, decisions, and next step
- Existing schema stores unit cost but not the source line's total purchase value. The additive nullable field preserves the actual entered business value without changing prior schema files or inferring rounded totals. Existing rows remain valid.
- Minimum MySQL 8.0 and MariaDB 10.6 compatibility is **NOT VERIFIED**. No accountant decision is needed for this storage change.
- **Commit hash(es):** `a844ef9` — purchase-value schema change and log.
- **Next step:** Implement Phase 5 services/API and tests; no Phase 6 work has started.

## Phase 5 — purchase-value schema commit hash addendum

**Date/time:** 2026-10-10 21:26 +03:00

- **Commit hash(es):** `a844ef9` — adds `container_lines.purchase_value_egp`, forward changelog entry, dual-engine migration result, and progress record.
- **Next step:** Implement Phase 5 container workflows; Phase 5 validation is incomplete and Phase 6 has not started.

## Phase 5 — container and landed-cost implementation

**Date/time:** 2026-10-10 21:48 +03:00

### What was built
- Added `ContainerController` endpoints for container creation/list/detail, line entry, configurable cost-type inventory inclusion, container costs, allocation basis, status transitions, batched receipts, receipt reversal, and cost-payment links to existing treasury outflows.
- Added 11 `/api/v1` container-related routes. Mutations require CSRF, recent step-up authentication, and explicit permission middleware; reads and sensitive cost visibility are permission-checked.
- Extended `InventoryService` with atomic multi-line batch receiving. Product/warehouse balances are locked in deterministic product order, and stock/value projections are validated and recomputed using exact piastre arithmetic.
- Added owner permissions `containers.view`, `containers.manage`, `costs.manage`, and `costs.pay`; owner grants remain full-access.
- Added engine tests for allocation by value, quantity, and manual amount; partial receipt residuals; weighted-average inventory cost; non-retroactive costs added after receipt; receipt reversal; matching treasury outflows and payment totals; rollback; permissions; and unauthenticated access.
- Added validation that manual allocations are used only with the manual basis, reference included costs/current receipt lines, and contain bounded decimal strings. Added guards against inconsistent existing quantity/value projections and unsupported monetary totals.
- No earlier schema version was edited. Phase 5 schema changes were forward-only in migrations `2026_10_11_000003_add_container_cost_controls_and_status_history` and `2026_10_11_000004_add_container_line_purchase_value`, already applied to both `erp_test` databases.

### Commands actually run and results
- On MySQL 8.4.3 `erp_test`: `artisan test --colors=never` — **48 passed, 499 assertions**; `php scripts\run-phase1-constraints.php mysql_test` — **19 passed, 0 failed**.
- On MariaDB 13.0.2 `erp_test`: `artisan test --colors=never` — **48 passed, 499 assertions**; `php scripts\run-phase1-constraints.php mariadb_test` — **19 passed, 0 failed**.
- PHP 8.3.33 syntax checks for `ContainerController.php` and `InventoryService.php` — **no syntax errors**; Laravel container route listing — passed.
- `git diff --check` — passed.
- `artisan pint --test` — **NOT VERIFIED**: command unavailable (`Command "pint" is not defined`). Pint was not installed because no dependency manifest changed and formatting is not required to execute the code.
- Only `erp_test` was used for suite/constraint commands; no `system_end` database was selected.

### Engine comparison, problems, and fixes
- MySQL and MariaDB produced identical full-suite counts and identical 19/19 constraint outcomes; no behavior difference was found. MariaDB prints underlying constraint/FK error diagnostics for expected rejected cases, while the MySQL constraint runner reports the pass result without those diagnostic strings. This is output wording, not a behavioral difference.
- Initial assertions exposed differing DECIMAL serialization scales (`0.33`/`0.3300` and `11.00`/`11.0000`); assertions were aligned to actual stored DECIMAL scale.
- A rollback-test CHECK initially conflicted with pre-existing fixture rows; its predicate was narrowed to the test action. An unauthenticated-route test inherited a prior cookie; it now supplies an invalid session cookie and tests the expected unauthenticated response.
- One early validation attempt ran from the repository root and could not find `artisan`; it was rerun from `backend` successfully. No test or migration result was inferred from the failed attempt.
- No deviation from the approved receipt/allocation and weighted-average rules. Costs recorded after receipt remain visible but do not revalue posted inventory. Cost-type inclusion defaults to excluded until explicitly configured; accountant decisions remain open.

### Database feature floor report
| Feature relied on in this phase | Minimum MySQL | Minimum MariaDB | Verification |
|---|---:|---:|---|
| InnoDB transactions, row-level locks (`SELECT ... FOR UPDATE`), and transactional DML | 8.0 | 10.6 | Local versions pass; minimum versions NOT VERIFIED |
| `DECIMAL(19,4)` storage and decimal comparisons/arithmetic | 8.0 | 10.6 | Local migrations/tests pass; minimum versions NOT VERIFIED |
| `BIGINT`, `BOOLEAN`/`TINYINT(1)`, `VARCHAR`, `DATE`/`DATETIME`/`TIMESTAMP`, primary/foreign keys and ordinary indexes | 8.0 | 10.6 | Local migrations/tests pass; minimum versions NOT VERIFIED |
- No feature newer than MariaDB 10.6 was intentionally introduced. The feature floors above follow the approved v4.1 portability baseline and forward migration design; only MySQL 8.4.3 and MariaDB 13.0.2 were actually exercised.

### Open questions
- No owner decision blocks Phase 6.
- Accountant decisions still needed before Phase 8: journal-entry policy, tax method, which cost types are included in inventory valuation, and report formulas.
- MySQL 8.0, MariaDB 10.6, and the production Hostinger runtime remain **NOT VERIFIED**.

### Commit hash(es)
- Phase 5 application code and this progress entry are prepared for commit; the commit hash will be recorded in a separate append-only addendum after commit.

### Next step
- Begin Phase 6: inspect current customer/sales/returns/collections schema and API patterns, then implement with forward-only migrations as needed. Run the full suite and Phase 1 constraints on both `erp_test` engines before Phase 7.

## Phase 5 — implementation commit hash addendum

**Date/time:** 2026-10-10 21:49 +03:00

- **Commit hash:** `c70fd95` — completes container and landed-cost APIs, multi-line inventory receipt service, permission seeding, engine tests, and the Phase 5 validation/progress entry.
- **Next step:** Begin Phase 6 schema/API inspection. Do not begin Phase 7 until Phase 6 passes its dual-engine full-suite and constraint gates.

## Phase 6 — existing sales schema inspection

**Date/time:** 2026-10-10 21:54 +03:00

### What was inspected
- Confirmed the approved v4.1 schema already defines `customers` with unique nullable phone and optional nonnegative credit limit; `sales_documents` for invoices, credit notes and dated opening receivables; invoice-line tax enable/rate snapshots; issuer-name snapshots; revision/reversal references; `sales_receipts`, receipt allocations and allocation reversals; `sales_document_postings`; `idempotency_records`; `app_settings`; and field-level audit-log columns/checks.
- Confirmed `AppSettingsSeeder` seeds `sales_tax` disabled with a null rate. No Phase 6 sales/customer HTTP controllers or routes currently exist.
- Identified fields needed for the requested issue-time product-cost snapshot and tax calculation method snapshot; any additions must be new forward migrations. Customer balances and receipt unapplied amounts can be derived from posted documents, receipts, allocations, and allocation reversals; implementation must lock source rows and verify reconciliation.
- Confirmed the schema and service rules permit linked or free-form returns. A linked return has a sold line from which cost can be snapshotted; a free-form return has no such source line, so its inventory valuation is not determined by the current owner-approved rules.

### Commands and validation
- Repository reads/searches only; no PHP command, test, migration, or database connection was run for this inspection step. New Phase 6 implementation: **NOT VERIFIED**.
- Latest completed Phase 5 gate remains MySQL **48 tests/499 assertions and 19/19 constraints passed**, MariaDB **48 tests/499 assertions and 19/19 constraints passed**.

### Problems, deviations, and open questions
- No earlier schema file was changed. The Phase 6 implementation is paused before return valuation is coded to avoid guessing the cost basis for free-form returned stock.
- **Owner decision required:** For a free-form return without an original invoice line, should returned stock use the destination warehouse's current weighted-average cost, an owner-entered unit-cost snapshot, or should the return be recorded without restocking inventory?
- No other deviation. The tax calculation mode will remain configurable; if tax is enabled before its calculation method is configured, invoice issue must fail clearly rather than assume inclusive or exclusive behavior.
- No tests or database writes were performed in this step.

### Commit hash(es)
- This Phase 6 schema map and the current blocker handoff are prepared for a log-only commit; record the commit hash in the next log addendum.

### Next step
- Wait for the owner to choose the free-form return stock-valuation behavior, then implement Phase 6. Continue to use only `erp_scratch`/`erp_test`; do not start Phase 7 before the Phase 6 dual-engine gates pass.

## Phase 6 — sales schema inspection commit hash addendum

**Date/time:** 2026-10-10 21:55 +03:00

- **Commit hash:** `f32e64a` — records the Phase 6 v4.1 sales-schema map, exact implementation gaps, and current open business decision.
- **Next step:** Wait for the owner's return-valuation decision before implementing return stock effects.

## Phase 6 — free-form return valuation decision

**Date/time:** 2026-10-10 22:00 +03:00

### Decision recorded
- The owner decided that free-form returned stock uses the destination warehouse's current weighted-average cost when available.
- If the product has no cost at that warehouse (described by the owner as zero stock and no movement history), require the owner to enter a unit cost.
- Persist/log the valuation method used for each return. Linked returns continue to use the sold invoice line's cost snapshot.

### Commands and validation
- Owner decision only. No code, migration, database, or test changes were made. Phase 6 implementation remains **NOT VERIFIED**; latest tested result is Phase 5: each engine 48 tests/499 assertions and 19/19 constraints passed.

### Problems, deviations, and open questions
- One edge remains ambiguous: with zero stock but prior movement history, the balance has no current average cost; the owner specified a manual cost for zero stock and no history but did not state whether to restore the last historical warehouse cost or ask for manual unit cost in this case. No costing behavior is inferred.
- No deviation or earlier schema edit.

### Commit hash(es)
- This decision and blocker handoff are prepared for a log-only commit; the commit hash will be appended after commit.

### Next step
- Ask the owner to resolve the zero-stock-with-history case, then implement forward-only Phase 6 changes. Do not start Phase 7 until Phase 6 full-suite and Phase 1 constraint gates pass on both engines.

## Phase 6 — return-cost decision commit hash addendum

**Date/time:** 2026-10-10 22:01 +03:00

- **Commit hash:** `502847d` — records the owner's current-WAC/manual-cost rule for free-form returns and leaves the zero-stock-with-history edge explicitly open.
- **Next step:** Ask whether a warehouse with zero stock but prior movement history should use its last reconstructable weighted-average cost or require an owner-entered unit cost.

## Phase 6 — zero-stock return valuation clarification

**Date/time:** 2026-10-10 22:03 +03:00

### Decision recorded
- For a free-form return at a warehouse with zero current stock but prior movement history for the product, reconstruct and use that warehouse's last historical weighted-average cost.
- Combined rule: use current warehouse WAC when available; when current stock is zero but history exists, reconstruct the historical WAC; when zero stock and no history exists, require an owner-entered unit cost. Record the selected valuation method on each return.
- This resolves the free-form return valuation question. The valuation-history reconstruction must be deterministic, exact to piastres, and covered by tests.

### Commands and validation
- Owner decision only. No code, migration, database, or test changes were made. Phase 6 implementation remains **NOT VERIFIED**; latest tested result is Phase 5: each engine 48 tests/499 assertions and 19/19 constraints passed.

### Problems, deviations, and open questions
- No current owner decision blocks Phase 6. Accountant decisions remain deferred until before Phase 8.
- No deviation or earlier schema edit.

### Commit hash(es)
- This clarification and handoff update are prepared for a log-only commit; append the commit hash after it is created.

### Next step
- Implement Phase 6. Reconstruct historical warehouse WAC from posted inventory movement history only when current quantity is zero and history exists; otherwise require an explicit owner unit cost.

## Phase 6 — return valuation clarification commit hash addendum

**Date/time:** 2026-10-10 22:04 +03:00

- **Commit hash:** `5abff98` — records the owner's zero-stock-with-history decision and resolves the free-form return valuation policy.
- **Next step:** Begin Phase 6 implementation; retain the exact-cost and dual-engine test gates.

## Phase 6 — sales snapshot migration drafted

**Date/time:** 2026-10-10 22:05 +03:00

### What was built
- Added forward migration `2026_10_11_000005_add_sales_workflow_cost_and_tax_snapshots.php` for the invoice-time cost snapshot, issue-time inclusive/exclusive method snapshot, and per-return valuation-method snapshot on `sales_document_lines`.
- Added named CHECK constraints for allowed tax-method and return-valuation-method snapshot values.
- Updated `backend/database/schema/SCHEMA_CHANGELOG_FORWARD.md` with the new migration and feature floor. No earlier schema files were changed.

### Commands and validation
- MySQL 8.4.3 `erp_test` and MariaDB 13.0.2 `erp_test`: `artisan migrate:status --database=...` — existing migrations Ran; new Phase 6 migration Pending on both. This confirmed the approved targets before mutation.
- PHP 8.3.33 `php -l database\migrations\2026_10_11_000005_add_sales_workflow_cost_and_tax_snapshots.php` — **no syntax errors**.
- `git diff --check` — passed.
- Migration application, column/CHECK inspection, full suites and Phase 1 constraints: **NOT RUN** for this step.

### Problems, decisions, and deviations
- Laravel's installed Schema `Blueprint` has no CHECK-constraint builder; the migration uses explicit MySQL/MariaDB `ALTER TABLE ... ADD CONSTRAINT ... CHECK` statements and driver-specific drop syntax, following the existing v4.2 migration pattern. The first draft's unsupported builder calls were removed before execution.
- The migration adds only snapshot metadata; no sales data or earlier schema version is modified. Runtime SQL compatibility remains to be validated on the two local test engines.
- No open business decision blocks this migration.

### Database feature floors
- The new schema relies on nullable `DECIMAL(19,4)`, `VARCHAR`, `ALTER TABLE ADD COLUMN`, and named `CHECK` constraints: minimum target MySQL 8.0 and MariaDB 10.6. The minimum versions remain **NOT VERIFIED**; only local MySQL 8.4.3 and MariaDB 13.0.2 are available.

### Commit hash(es)
- Migration, forward changelog and this progress entry are prepared for commit; record the commit hash after commit.

### Next step
- Apply this forward migration only to MySQL and MariaDB `erp_test`, inspect the new fields/constraints on both, then run the required full suite and Phase 1 constraints before beginning the Phase 6 application layer.

## Phase 6 — sales snapshot migration applied and regression-tested

**Date/time:** 2026-10-10 22:10 +03:00

### What changed
- Applied `2026_10_11_000005_add_sales_workflow_cost_and_tax_snapshots` to approved MySQL and MariaDB `erp_test` databases; no earlier version was edited.
- The migration adds `unit_cost_egp_snapshot`, `tax_calculation_method_snapshot`, and `return_cost_method_snapshot` to `sales_document_lines`, plus two named CHECK constraints.

### Commands actually run and results
- Before applying, `artisan migrate:status --database=mysql_test` showed all previous migrations Ran and the new migration Pending; `mariadb_test` showed the same. Both configured database targets were `erp_test`.
- `artisan migrate --database=mysql_test --force --no-interaction` — **DONE**, then `migrate:status` showed batch 6 Ran.
- `artisan migrate --database=mariadb_test --force --no-interaction` — **DONE**, then `migrate:status` showed batch 5 Ran.
- `artisan db:table sales_document_lines --database=mysql_test` and MariaDB equivalent — **20 columns each**; both show all three new snapshot columns with expected DECIMAL/VARCHAR types.
- After migration, full Laravel suite on MySQL 8.4.3 — **48 tests passed, 499 assertions**; constraints — **19 passed, 0 failed**.
- After migration, full Laravel suite on MariaDB 13.0.2 — **48 tests passed, 499 assertions**; constraints — **19 passed, 0 failed**.
- A PHP `-r` attempt to query `information_schema` failed with a command-line parse error (`Unclosed '('`, line 5) due to PowerShell/PHP quoting. It was not treated as a schema result; `artisan db:table` verified columns. Dedicated CHECK behavior tests are still required.
- Databases accessed: only MySQL/MariaDB `erp_test`; `system_end` was not selected.

### Problems, deviations, and open questions
- Migration execution succeeded on both local engines with no compatibility failure. Existing full-suite and Phase 1 constraint behavior matched. MariaDB prints expected database error details for negative constraint cases; MySQL reports those cases as passing without the details.
- The failed one-off `php -r` inspection is left as a tooling/quoting issue; do not rely on it. Add engine tests that assert both named constraints exist and reject invalid method values.
- No deviation from the approved schema change. Minimum MySQL 8.0/MariaDB 10.6 compatibility remains NOT VERIFIED.

### Commit hash(es)
- Migration application was already committed as `f7ebee8`; this result entry is prepared for a separate progress-log commit, whose hash will be recorded in an addendum.

### Next step
- Implement the Phase 6 API/service layer and add tests for schema method constraints, tax snapshots, invoice cost snapshots, return valuation, allocations/unapplied amount, idempotency, permissions and audit history.

## Phase 6 — migration validation log commit hash addendum

**Date/time:** 2026-10-10 22:11 +03:00

- **Commit hash:** `6985583` — records dual-engine migration status, visible columns, full-suite and Phase 1 constraint results, and the unresolved CHECK-inspection command failure.
- **Next step:** Implement the Phase 6 API/service layer and dedicated sales-engine tests.

## Phase 6 — customer, invoice, return, and collection workflows

**Date/time:** 2026-10-10 22:38 +03:00

### What was built
- Added `SalesService` and `SalesController` workflows for dated customer opening-receivable documents, invoices, issue-time tax/cost snapshots, invoice idempotency, invoice reversal/revision and field-level history, linked/free returns, collections, allocations/reversals, and customer balance computation.
- Added the permission-checked `POST /api/v1/customers/{customerId}/opening-balance` endpoint. It creates a dated document rather than storing an editable customer balance. Added `customers.opening_balance`, granted only to `owner`, and documented it in Role Permission Matrix V3.
- Invoice responses include a `credit_limit_warning` when the computed debit balance exceeds the limit. Posting remains allowed; warning behavior is not a sale-blocking rule.
- Added forward migration `2026_10_11_000006_add_sales_receipt_unapplied_amount.php`, applied on both approved `erp_test` databases, with a backfilled explicit unapplied amount and a constraint preventing it exceeding the receipt amount. Updated the forward schema changelog.
- Updated the canonical permission seeder, non-overwriting tax defaults, authorization tests, and sales engine tests. The tests cover unapplied-amount reconciliation, reversal, revision/cancellation and history, returns, exact tax/cost snapshots, opening balances, and credit-limit warning behavior.

### Commands actually run and real results
- PHP 8.3.33 syntax check for `SalesService.php`, `SalesController.php`, `RolePermissionMatrixSeeder.php`, `api_v1.php`, and `SalesWorkflowEngineTest.php` — all **no syntax errors**. The first lint invocation used backend-relative paths while the working directory was the repository root and failed to locate files; the corrected invocation used `backend\...` paths and passed.
- Focused `AuthenticationEngineTest|SalesWorkflowEngineTest` on MySQL 8.4.3 `erp_test` — **17 passed, 231 assertions**.
- Focused `AuthenticationEngineTest|SalesWorkflowEngineTest` on MariaDB 13.0.2 `erp_test` — **17 passed, 231 assertions**.
- Initial MySQL full-suite attempt — **55 passed, 578 assertions, 2 errors**. Both errors were an unhandled `PUT` verb in the test request dispatcher after a PUT-protected permission case was included. Added PUT dispatch and tested the opening-balance permission case; no production behavior change was needed.
- Final MySQL 8.4.3 `erp_test` full suite — **57 passed, 612 assertions**.
- MySQL 8.4.3 `erp_test` Phase 1 constraint suite — **19 passed, 0 failed**.
- Final MariaDB 13.0.2 `erp_test` full suite — **57 passed, 612 assertions**.
- MariaDB 13.0.2 `erp_test` Phase 1 constraint suite — **19 passed, 0 failed**. Expected rejection diagnostics differ by engine (MariaDB prints constraint/duplicate/FK error text); outcomes match MySQL.
- `git diff --check` — passed; Git emitted only line-ending conversion warnings. `git check-ignore backend/.env` confirmed the environment file is ignored; it was absent from `git status`. `.env` contents were not read or printed.
- Both test runners and the constraint runner used the `*_test` connections and reported `erp_test`. No `system_end` database was selected.

### Problems, fixes, and deviations
- The authorization test harness did not dispatch `PUT`; added the missing test method dispatcher branch. The rerun on both engines passed.
- The explicit customer opening-balance endpoint and permission were added to honor the business rule that opening balances are dated documents, not fixed customer fields. No earlier schema version was edited.
- No business rule was changed. Invoice posting continues to use exact integer-piastre calculations and the existing InventoryService; customer credit limits warn but never block.
- Dedicated invalid-value insertion tests for the two Phase 6 invoice snapshot CHECK constraints remain NOT VERIFIED. MySQL 8.0 and MariaDB 10.6 minimum-version compatibility and the production hosting runtime also remain NOT VERIFIED.

### Open questions
- No owner decision blocks Phase 7 or 7b. Accountant input is required before Phase 8 for journal entries, tax method, included container-cost types, and report formulas.

### Commit hash(es)
- Phase 6 implementation, migration, tests, documentation, and this progress entry are prepared for commit after verification. Record the resulting hash in a subsequent append-only hash addendum; do not amend the implementation commit.

### Next step
- Commit Phase 6. Then implement Phase 7 orders linked to invoices and full-only deliveries, with status/audit behavior and dual-engine tests. Run the full suite and Phase 1 constraint suite on both engines before starting Phase 7b.

## Phase 6 — implementation commit hash addendum

**Date/time:** 2026-10-10 22:39 +03:00

- **Commit hash:** `9d3292f` — commits the customer, invoice, return, collection, opening-balance, unapplied-amount, permission, test, schema-changelog, and Phase 6 progress-log changes. `PROJECT_STATUS_HANDOFF.md` was pre-existing and intentionally excluded.
- **Next step:** Start Phase 7 orders and full-only deliveries.

## Phase 7 — stock reservation decision gate

**Date/time:** 2026-10-10 22:44 +03:00

### What was inspected
- Read the v4.1 `sales_orders`, `sales_order_lines`, `sales_order_invoice_allocations`, `deliveries`, and `delivery_lines` definitions. They provide order/invoice line quantity links, status fields, a required inventory-movement-line reference on delivery lines, and a CHECK requiring exactly one order-line or invoice-line source.
- Read `backend/docs/architecture/backend-design/API_CONTRACTS.md`: it requires full order invoicing/delivery and no double stock issue, while explicitly leaving order state/issue/reservation timing open.
- No code, schema, database, or test files were changed for this decision gate.

### Commands and actual results
- Repository inspection only using `rg` and bounded `view` reads. Tests/builds: **NOT RUN** because Phase 7 implementation has not started.
- No database was accessed. No `erp_scratch`, `erp_test`, or `system_end` state was changed.

### Problems, deviations, and open questions
- Implementing order confirmation without deciding reservation behavior would create an unapproved stock-availability rule. Phase 6 already issues stock at invoice posting; Phase 7 must preserve one stock effect and the approved no-partial-delivery rule.
- No deviation from scope. Await owner instruction on whether order confirmation reserves quantities or whether inventory remains untouched until invoice issue.

### Commit hash(es)
- This decision-gate update is prepared for a log-only commit; record its hash in a subsequent append-only addendum.

### Next step
- Wait for the owner's stock-reservation decision, then continue Phase 7. Do not start Phase 7b or Phase 8.

## Phase 7 — decision-gate commit hash addendum

**Date/time:** 2026-10-10 22:44 +03:00

- **Commit hash:** `21ba835` — records that order confirmation reservation behavior remains undecided and blocks Phase 7 implementation.
- **Next step:** Get the owner's stock-reservation decision.

## Phase 7 — order inventory policy decision

**Date/time:** 2026-10-10 22:50 +03:00

### What changed
- The owner decided that sales-order confirmation does **not** reserve stock. Confirmation must show a non-blocking warning when aggregate available stock is below the ordered quantity.
- Inventory remains unchanged at order confirmation. Posting the linked invoice remains the sole stock-issue event, preserving Phase 6 behavior and preventing a double issue. Reservation timing is no longer an open Phase 7 decision.

### Commands and actual results
- Owner decision only; no code, schema, database, or tests changed in this step. Tests: **NOT RUN**.

### Problems, deviations, and open questions
- This resolves the previously open Phase 7 order stock reservation decision. No other business decision blocks Phase 7.
- No deviation. Confirmation warnings do not prevent confirmation; invoice posting still enforces available stock.

### Commit hash(es)
- This decision and handoff update are prepared for a log-only commit; record its hash in a subsequent append-only addendum.

### Next step
- Implement Phase 7 order, invoice-link, delivery, permission, and audit behavior. Validate the existing schema invariant; if the delivery-header exactly-one-source invariant is absent, add a forward-only migration rather than editing v4.1.

## Phase 7 — order policy commit hash addendum

**Date/time:** 2026-10-10 22:50 +03:00

- **Commit hash:** `32e5243` — records the owner decision that orders do not reserve stock at confirmation, but show a non-blocking availability warning; invoice posting is the sole stock issue.
- **Next step:** Implement Phase 7 orders and deliveries.

## Phase 7b — API and operations handoff

**Date/time:** 2026-10-10 23:53 +03:00

### What was built
- Added `backend/docs/openapi.yaml` for every registered API method/path pair, documenting session/CSRF behavior, permission metadata, financial step-up requirements, request bodies, idempotency headers, and common error codes. It covers 67 registered methods with no missing path/method pair.
- Added `backup:mysql`, which writes a compressed MySQL logical dump to the configured private directory, and `backup:offsite`, which copies the newest backup using batch-mode SCP and strict SSH host-key checking.
- Added `backup:restore-test`, restricted to a MySQL connection selecting `erp_scratch`, requiring an explicit one-run confirmation value, and accepting only files under the configured backup directory. It compares exact base-table names and row counts before and after restore.
- Added `MysqlBackupSupport`, backup configuration, hourly local and daily off-site Laravel schedules, empty backup configuration placeholders in `backend/.env.example`, `backend/docs/operations/BACKUP_AND_RESTORE.md`, `backend/docs/operations/PRODUCTION_CHECKLIST.md`, and `backend/docs/operations/ACCOUNTANT_OPEN_QUESTIONS.md`.
- The MySQL dump and restore child processes receive the connection password through their process environment, never CLI arguments or output. The compressed writer rejects partial writes and removes incomplete dumps.
- No schema, table, endpoint, or earlier schema version changed in this phase.

### Commands and actual results
- OpenAPI route comparison against `artisan route:list --path=api/v1 --json`: **67 registered method/path pairs, 67 documented, 0 missing**. Static checks: **0 operations missing a permission or explicit public-security declaration; 282 component references checked, 0 unresolved; 67 unique operation IDs; 11 required idempotency-key annotations with 11 parameter references**. Full YAML parser validation: **NOT VERIFIED** because no YAML parser is installed; no dependency was added.
- `php artisan schedule:list`: passed; output registered `backup:mysql` hourly at minute 0 and `backup:offsite` daily at 03:00, in addition to the existing session-pruning schedule.
- MySQL 8.4.3 `erp_scratch`, configured MySQL 8.4.3 client paths: `php artisan backup:mysql --no-interaction` — **passed**, compressed dump created, **11,873 bytes**.
- MySQL 8.4.3 `erp_scratch`: `php artisan backup:restore-test <generated-backup> --no-interaction` with the required one-run confirmation — **passed**, **48 tables**, exact pre/post table names and row counts matched. This was a restore to `erp_scratch` only.
- MySQL 8.4.3 `erp_scratch`: `php artisan backup:offsite --no-interaction` without a configured remote target — expected safe failure, **exit code 1**, message stated the destination was not configured and no remote copy was attempted. No remote transfer was attempted.
- PHP 8.3.33 syntax checks on all changed PHP files — **7 files, 0 syntax errors**. Scoped Pint formatting and `pint --test` — **passed**. `git diff --check` — **passed**. `git check-ignore backend/.env` — returned `backend/.env`; `git status --short -- backend/.env` — empty.
- Final full suite, MySQL 8.4.3 `mysql_test` / `erp_test`: **63 tests passed, 687 assertions**. Phase 1 constraint suite: **21 passed, 0 failed**.
- Final full suite, MariaDB 13.0.2 `mariadb_test` / `erp_test`: **63 tests passed, 687 assertions**. Phase 1 constraint suite: **21 passed, 0 failed**.
- Engine behavior comparison: full-suite and constraint-suite pass/fail outcomes matched. MariaDB emitted explanatory FK/CHECK/duplicate-key rejection text where MySQL's constraint runner emitted only `PASS`; no behavior difference was observed in these suites. MariaDB backup/restore was not run.

### Database features and minimum versions
| Feature used | Minimum MySQL | Minimum MariaDB | Use and status |
|---|---:|---:|---|
| InnoDB consistent read transaction via `mysqldump --single-transaction` | 8.0 project floor | 10.6 project floor | Avoids table locks for transactional tables during logical dump. Executed on MySQL 8.4.3 only; MariaDB backup behavior is NOT VERIFIED. |
| `information_schema.TABLES` base-table enumeration and `COUNT(*)` | 8.0 project floor | 10.6 project floor | Exact scratch restore pre/post comparison; exercised on MySQL 8.4.3. |
| Standard MySQL logical dump/client restore and stored-object flags (`--routines`, `--triggers`, `--events`, `--hex-blob`, `--default-character-set=utf8mb4`, `--set-gtid-purged=OFF`) | 8.0 project floor | Not applicable to this MySQL-only command | Used by the tested MySQL 8.4.3 client. Server minimum behavior and MariaDB client compatibility are NOT VERIFIED at target floors. |

No new database DDL was introduced. The project minimums above are the compatibility targets from the approved schema documentation, not claims of testing on MySQL 8.0 or MariaDB 10.6.

### Problems, fixes, and deviations
- Review found that the first draft did not pass the Laravel connection password to the child MySQL client. Corrected by setting `MYSQL_PWD` only in the child process environment for dump and restore; no secret was printed, committed, or placed in arguments.
- Hardened compressed output against partial writes; failure removes the temporary partial dump.
- The local SCP destination and SSH key/known-host setup are not available, so an actual off-host copy could not be tested. Missing destination behavior was exercised and fails explicitly without attempting transfer.
- No YAML parser was available in the workspace/runtime. Used direct route coverage, permission/public-access, operation-ID, idempotency-parameter, and component-reference checks instead; YAML parser validity remains NOT VERIFIED. No package installation or manifest change was made.
- Restore verification was deliberately performed only on `erp_scratch`; no restore was run on either `erp_test` or `system_end`. No `.env` contents or password were read or printed.
- No deviation from business rules or approved schema versions. Accountant questions are consolidated in the new operations document; Phase 8 remains gated on accountant input.

### Open questions
- Accountant decisions before Phase 8 remain: journal entries/posting and period rules; tax enablement/rate/inclusive-vs-exclusive method; included container-cost types and late costs; allocation rounding; sales/profit and inventory valuation formulas; customer-balance signs and unapplied-receipt treatment; treasury settlement; corrections and period close.
- Live off-host target/key/host-key, production scheduler, Hostinger database/runtime capability, and MySQL 8.0/MariaDB 10.6 validation remain NOT VERIFIED.

### Commit hash(es)
- Phase 7b files and this progress entry are ready to commit after verification. The resulting commit hash will be recorded in the next append-only hash addendum.

### Next step
- Commit Phase 7b with this log; append and commit the resulting hash. Stop for owner review. Do not start Phase 8 or frontend work.

## Phase 7b — implementation commit hash addendum

**Date/time:** 2026-10-10 23:54 +03:00

- **Commit hash:** `df5c4d388d8247b891a3b9d6f6a5d3cc7d151eaa` — commits the Phase 7b OpenAPI contract, backup/off-site/restore-test commands, schedule/configuration, operations handoff documents, and the verified Phase 7b results.
- **Next step:** Owner reviews the completed Phase 7b handoff. Stop here; do not start Phase 8 or frontend work.

## Phase 7b — new-model takeover report and live state check

**Date/time:** 2026-10-11 00:06 +03:00

### What was built
- Added `docs/development/HANDOFF_FOR_NEW_MODEL.md`, a repository-grounded takeover report with live migration/test results, phase evidence/statuses, route groups, decisions, not-verified items, the exact next acceptance gate, test commands, and known issues/workarounds.
- Updated the mutable HANDOFF and CURRENT STATUS sections at the top of this append-only log to match the report and current live database state.
- No application code, database, migration, or feature changed.

### Commands actually run and real results
- `git branch --show-current` — `master`.
- Before documentation edits, `git status --short --untracked-files=normal` — exactly `?? PROJECT_STATUS_HANDOFF.md`; this pre-existing untracked file remains untouched.
- `git --no-pager log -1 --format="%H%n%s"` — `1cf46440f731788567de4b73916f4845769c4842`, `Record Phase 7b handoff commit hash` at state capture. Phase 7b implementation remains `df5c4d388d8247b891a3b9d6f6a5d3cc7d151eaa`.
- `git check-ignore backend/.env` — `backend/.env`; `git status --short -- backend/.env` — empty.
- `artisan migrate:status --database=mysql` (`erp_scratch`) and `--database=mysql_test` (`erp_test`): scratch has v4.1 and v4.2 Ran, six later migrations Pending; test has all eight migrations Ran.
- `artisan migrate:status --database=mariadb` (`erp_scratch`) and `--database=mariadb_test` (`erp_test`): same state; scratch has only v4.1/v4.2 Ran and six Pending; test has all eight migrations Ran.
- Fresh MySQL acceptance suites after confirming engine/database as `8.4.3|erp_test`: full suite **63 passed, 687 assertions**; constraints **21 passed, 0 failed**.
- Fresh MariaDB acceptance suites after confirming engine/database as `13.0.2-MariaDB|erp_test`: full suite **63 passed, 687 assertions**; constraints **21 passed, 0 failed**.
- `artisan route:list --path=api/v1 --json`: **63 route records**, grouped as auth, categories, collections, container-costs, container-cost-types, containers, customers, deliveries, health, inventory, invoices, orders, products, returns, settings, users, warehouses (**17 groups**).
- Inspected current test source for named inventory, transfer, container, sales, owner/driver/authorization, CSRF, and order/delivery scenarios. No new test or feature was added.
- Two first ad-hoc PowerShell `tinker --execute` information-schema summary commands failed in PowerShell parsing before application execution. Replaced them with supported read-only Laravel `artisan migrate:status`; all four database checks then succeeded. No database mutation was made by the failed shell commands.
- `git diff --check` and report/log consistency review: pending final pre-commit check in this documentation step.

### Problems, deviations, and open questions
- Live inspection corrected the older handoff implication that scratch was fully migrated: both scratch schemas currently show only two migrations Ran, with six Pending; both `erp_test` schemas have all eight Ran. This task intentionally made no migration changes.
- The requested final multi-workflow acceptance scenario, comprehensive secret/history/security checks, MariaDB restore, and YAML parser validation have not been run. They are explicitly marked pending/NOT VERIFIED in the report.
- Phase 7b remains partial at final acceptance because off-host destination, MariaDB restore, and parser validation are outstanding. Phase 8 remains blocked on the ten accountant topics listed in the report.
- No scope deviation: documentation and read-only validation only.

### Commit hash(es)
- Report, matching HANDOFF update, and this entry are prepared for a documentation-only commit. Record the resulting commit hash in an append-only addendum.

### Next step
- Commit the handoff report and log update. Then begin only the exact Final backend acceptance gate in the report, without starting Phase 8 or frontend work.

## Phase 7b — takeover report commit hash addendum

**Date/time:** 2026-10-11 00:06 +03:00

- **Commit hash:** `d10b77f8cb32166b8d278ddae1ad06566a1833ef` — adds `docs/development/HANDOFF_FOR_NEW_MODEL.md` and updates this HANDOFF with current migration states, fresh per-engine test counts, and the exact next acceptance gate. Documentation-only; no feature or database was changed.
- **Validation note:** The preceding entry's final `git diff --check` was marked pending while committing; it was then run successfully before commit (no whitespace errors). The first cached check found and prompted removal of trailing whitespace in the report; the successful check ran after that correction.
- **Next step:** Run the exact Final backend acceptance gate in `HANDOFF_FOR_NEW_MODEL.md`. Keep Phase 8 and frontend work stopped.

## Part 1 — driver grants and route reconciliation

**Date/time:** 2026-10-11 00:28 +03:00

### What was built
- Updated `backend/database/seeders/RolePermissionMatrixSeeder.php` so the configurable `driver` grant template allows self-session actions, invoice creation, customer/product/stock viewing, order use, and delivery use. The owner role remains fully granted the existing permission set; future role templates remain in place.
- Expanded `AuthenticationEngineTest` to verify owner and driver grants, denied permissions, financial permission denial after a valid step-up timestamp, and that driver grants remain configurable.
- Extended `InventoryEngineTest` to prove product and inventory responses omit company cost, average unit cost, and inventory value for the driver.
- Updated `backend/docs/openapi.yaml` with the route-count reconciliation, verified against Laravel's live route list.

### Commands actually run and real results
- Pint on the three changed PHP files, followed by Pint `--test` on those files — **passed**.
- Focused `artisan test --filter='AuthenticationEngineTest|InventoryEngineTest'` on MySQL 8.4.3 `mysql_test` / `erp_test` — **22 passed, 338 assertions**.
- Same focused test command on MariaDB 13.0.2 `mariadb_test` / `erp_test` — **22 passed, 338 assertions**.
- Full `artisan test --colors=never` on MySQL 8.4.3 `mysql_test` / `erp_test` — **63 passed, 719 assertions**.
- `scripts\run-phase1-constraints.php mysql_test` — **21 passed, 0 failed**.
- Full `artisan test --colors=never` on MariaDB 13.0.2 `mariadb_test` / `erp_test` — **63 passed, 719 assertions**.
- `scripts\run-phase1-constraints.php mariadb_test` — **21 passed, 0 failed**. The constraint names and pass/fail outcomes matched MySQL; only expected engine-specific error diagnostic wording differs.
- Route comparison: `route:list --path=api/v1 --json` — **63 records**, **88 total verb/path pairs**, including **21 implicit HEAD aliases**; **67 non-HEAD pairs**. `backend/docs/openapi.yaml` — **67 operations**, **0 missing**, **0 extra**.
- `git diff --check` — **NOT VERIFIED before this log entry; run before commit**.

### Problems found and resolution
- A first PowerShell route-count command was run from the repository root while using backend-relative paths and failed before route/OpenAPI comparison. Reran from `backend`; the successful counts above show exact parity.
- Initial full-suite test execution before the latest inventory assertions was only a baseline. The full suites and constraint suites were rerun after all Part 1 changes and passed with the counts above.
- No MySQL/MariaDB behavior difference was found in the tested Part 1 behavior.

### Deviations and open questions
- No deviation from the requested driver grant policy. The test proves permission to use the invoice-create operation through the authorization middleware; a complete end-to-end driver sale scenario remains part of final acceptance.
- No business decision is open for Part 1. The existing accountant decisions remain outstanding for Phase 8; they do not block Part 2a.

### Permission matrix printed for this step

| Role | Current grants |
|---|---|
| `owner` (both ابنوب and كراس) | All 34 currently seeded permissions: `users.view_self`, `sessions.revoke_self`, `invoices.view`, `users.manage`, `invoices.create`, `customers.view`, `customers.manage`, `customers.opening_balance`, `products.view`, `products.manage`, `warehouses.manage`, `inventory.view`, `inventory.manage`, `customers.create`, `collections.create`, `collections.view`, `returns.create`, `returns.view`, `documents.edit`, `documents.cancel`, `documents.reverse`, `documents.correct`, `costs.view`, `markup.view`, `profit.view`, `containers.view`, `containers.manage`, `costs.manage`, `costs.pay`, `sales_tax.manage`, `orders.view`, `orders.manage`, `deliveries.view`, `deliveries.manage`. |
| `driver` (السواق template; no real user created) | Allow: `users.view_self`, `sessions.revoke_self`, `invoices.create`, `customers.view`, `products.view`, `inventory.view`, `orders.view`, `orders.manage`, `deliveries.view`, `deliveries.manage`. Deny: invoice listing/view, customer creation/opening balances, inventory changes, collections, returns, document edits/cancellation/reversal/correction, user management, cost/profit/markup, and sales-tax administration. |

### Commit and next step
- Commit hash: pending; record the resulting hash in an append-only addendum.
- **Next step:** Part 2a — inspect and extend the existing treasury/expense schema and APIs without implementing journal rules.

## Part 1 — commit hash addendum

**Date/time:** 2026-10-11 00:29 +03:00

- **Commit hash:** `f042fc4` — implements the requested driver permission template, authorization and cost-masking assertions, OpenAPI route-count explanation, and Part 1 test evidence.
- **Next step:** Inspect the existing finance schema and services for Part 2a. Preserve all accountant-gated journal rules as unimplemented.

## Part 2a — treasury, expenses, and financial outbox

**Date/time:** 2026-10-11 11:56 +03:00

### What was built
- Inspected and reused the approved v4.1 tables: `treasury_accounts`, `treasury_entries`, `expenses`, `treasury_transfers`, `treasury_transfer_entries`, `container_cost_payments`, and `audit_logs`. The existing chart-of-accounts and journal tables remain unused; no journal entry or journal rule is created.
- Added forward-only migration `backend/database/migrations/2026_10_11_000008_add_financial_outbox_and_expense_categories.php`: informational owner-managed expense categories, nullable historical expense category link, reference-only `original_amount` and `exchange_rate`, and durable uniquely keyed `financial_outbox_events`. Details and minimum-version caveat are in `backend/database/schema/SCHEMA_CHANGELOG_FORWARD.md`.
- Added `TreasuryService`, `TreasuryController`, and 13 permission- and step-up-guarded endpoints for treasury account management, computed balances, cash entries, transfers, expense categories, and expenses. Outflows/expenses/transfers validate sufficient server-computed funds; transfers atomically create two treasury legs. All state changes are transactional and audit logged.
- Added financial outbox writes in the same transaction as treasury entries, expenses, transfers, issued sales documents, collections, returns, and container-cost payments. This is only an event hook; no accounting/journal processing was implemented.
- Added treasury/expense permissions to the canonical role matrix for owners; no finance permissions were granted to the driver. Added tests for cent rounding, EGP reference-only fields, computed balances, insufficient funds, transfer atomicity, audit/outbox rollback, and step-up/permission denial. Updated OpenAPI for all 13 endpoints.

### Commands actually run and real results
- `artisan migrate:status --database=mysql_test` and `--database=mariadb_test` — migration `2026_10_11_000008_add_financial_outbox_and_expense_categories` reported **Ran** on MySQL 8.4.3 and MariaDB 13.0.2; each target was `erp_test`.
- `artisan test --colors=never` on MySQL 8.4.3 `mysql_test` / `erp_test` — **69 passed, 812 assertions**.
- `scripts\run-phase1-constraints.php mysql_test` — **21 passed, 0 failed**.
- `artisan test --colors=never` on MariaDB 13.0.2 `mariadb_test` / `erp_test` — **69 passed, 812 assertions**.
- `scripts\run-phase1-constraints.php mariadb_test` — **21 passed, 0 failed**. Constraint pass/fail outcomes matched MySQL; rejection diagnostics differ by engine as expected.
- Focused finance/authentication/sales/inventory suite (reported by the implementation run) — **42 passed, 494 assertions** on each engine.
- Pint on changed PHP files and Pint `--test` — **passed**. `php -l` on each changed PHP source file — **no syntax errors**. `git diff --check` — **passed**.
- Route/OpenAPI comparison after adding the routes — Laravel `route:list --path=api/v1 --json`: **76 records**, **107 method/path pairs including 27 HEAD aliases**, **80 non-HEAD pairs**; OpenAPI contains **80 operations**, **0 missing**, **0 extra**.
- OpenAPI parser validation — **NOT VERIFIED**.
- Exact minimum-version compatibility on MySQL 8.0 and MariaDB 10.6 — **NOT VERIFIED**; local tests used MySQL 8.4.3 and MariaDB 13.0.2 only.

### Problems found and how resolved
- Whether treasury balances may go negative was unspecified. Implementation paused for owner input; the owner decided to reject any cash outflow, expense, or transfer that would make the source balance negative. Tests verify this policy.
- No incompatible behavior difference was found between the tested MySQL and MariaDB versions.
- Migration was run only against `erp_test` on the two configured test connections. No access to `system_end` was made.

### Deviations and open questions
- No journal-entry rules or accounting treatment were inferred or implemented. Category values are informational only; chart-of-account mapping remains accountant-gated.
- Off-host backup destination, minimum database versions, and Hostinger runtime remain NOT VERIFIED. No other Part 2a decision is open.

### Commit and next step
- Implementation commit: `cdc19f3`; full hash recorded in its append-only addendum.
- **Next step:** Part 2b — reports and dashboard, followed by full suite and constraint validation on both engines.

## Part 2a — implementation commit hash addendum

**Date/time:** 2026-10-11 11:56 +03:00

- **Commit hash:** `cdc19f3` — adds treasury and expense APIs, expense categories, financial outbox hooks and tests, forward migration, OpenAPI updates, schema change log, and Part 2a results.
- **Next step:** Part 2b — reports and dashboard. Continue testing on both engines' `erp_test` databases only.

## Part 2b — read-only reports and dashboard

**Date/time:** 2026-10-11 12:31 +03:00

### What was built
- Added report controller and service methods, routes, permission grants, and `ReportsEngineTest` coverage for eight read-only endpoints: customer balances; customer statement; stock; stock movements; sales list; container-cost summary; per-invoice profit/markup; and dashboard.
- Report lists are paginated and filterable by relevant customer/product/warehouse/date/status/number fields. Query counts are bounded by pages for stock movements, container costs, and invoice costs; no per-row query loop was added for those reports.
- Customer statements include dated opening documents and collection rows, show applied versus unapplied amounts, and keep unapplied collection amounts out of receivable balances. Dashboard fields are assembled only when the user has the corresponding source permission; every route requires an explicit permission and recent step-up.
- Cost fields are selected only for callers with `costs.view`; the driver is additionally prevented from seeing these fields even if that permission were assigned. Financial reports are denied to the driver. New permissions are owner-granted for customer balances, customer statement, and container costs; dashboard access is granted to owners and read-only users, with contents permission-filtered.
- Profit/markup is explicitly **PROVISIONAL**. Formula: revenue is posted invoice `total_amount` less stored tax (thus after invoice discounts, excluding tax); cost is quantity multiplied by each stored unit-cost snapshot, each extended line rounded half-up to piastres; profit is revenue minus cost; markup is profit/cost × 100 rounded half-up to two decimal places. Credit notes, returns, operating expenses, and overhead are not netted. Missing snapshots result in null cost/profit; zero cost results in null markup. Accountant confirmation remains open.
- Updated `backend/docs/openapi.yaml` for the eight routes and corrected its aggregate route count to 84 records / 123 method-path pairs including 35 implicit HEAD aliases / 88 non-HEAD operations.
- No schema or migration change was needed.

### Commands actually run and real results
- Focused `artisan test --colors=never --filter=ReportsEngineTest` on MySQL 8.4.3 `mysql_test` / `erp_test` — **6 passed, 57 assertions**.
- Same focused reports test on MariaDB 13.0.2 `mariadb_test` / `erp_test` — **6 passed, 57 assertions**.
- Full `artisan test --colors=never` on MySQL 8.4.3 `mysql_test` / `erp_test` — **75 passed, 885 assertions**.
- `scripts\run-phase1-constraints.php mysql_test` — **21 passed, 0 failed**.
- Full `artisan test --colors=never` on MariaDB 13.0.2 `mariadb_test` / `erp_test` — **75 passed, 885 assertions**.
- `scripts\run-phase1-constraints.php mariadb_test` — **21 passed, 0 failed**. The constraint names/pass outcomes match; expected diagnostics differ by engine.
- Pint and Pint `--test` on changed report PHP files — **passed**. `php -l` on changed PHP files — **no syntax errors**. `git diff --check` — **passed**.
- Route/OpenAPI comparison: Laravel `route:list --path=api/v1 --json` — **84 records**, **123 method/path pairs**, of which **35** are implicit HEAD aliases and **88** are non-HEAD; OpenAPI — **88 operations**, **0 missing**, **0 extra**.
- Database migration status: no Part 2b migration was added; nine existing migrations remain Ran on each `erp_test`.
- YAML/OpenAPI parser validation — **NOT VERIFIED**.

### Problems found and how resolved
- OpenAPI route-count prose was stale/internally inconsistent after prior routes were added. Recomputed from live `route:list` and operation declarations, verified 88 exact method/path pairs, and corrected the documented totals.
- No MySQL/MariaDB behavior difference was found in the tested reports.
- `docs/development/FRONTEND_STATUS_REPORT.md` appeared as an untracked file during inspection; it was not read, changed, staged, or committed as part of this task.

### Deviations and open questions
- No change to existing business rules and no accounting policy was inferred. The profit/markup formula remains provisional pending accountant approval.
- Off-host backup destination, minimum engine compatibility, Hostinger runtime, and all accountant questions remain open/NOT VERIFIED as previously recorded.

### Commit and next step
- Implementation commit: `fd75269`; full hash recorded in its append-only addendum.
- **Next step:** Part 2c — owner-only audit-log and invoice change-history reads, then full suite and constraints on both engines.

## Part 2b — implementation commit hash addendum

**Date/time:** 2026-10-11 12:32 +03:00

- **Commit hash:** `fd75269` — adds the read-only report/dashboard endpoints, permission-filtered data, provisional profit and markup outputs, report tests, updated OpenAPI route counts, and Part 2b verification results.
- **Next step:** Part 2c — owner-only audit-log and invoice change-history read endpoints.

## Part 2c — owner audit and invoice history reads

**Date/time:** 2026-10-11 12:43 +03:00

### What was built
- Added owner-permission- and step-up-protected, paginated audit-log and invoice field-change-history GET endpoints. The general audit endpoint filters by document, actor, and date range; invoice history is scoped to one invoice. Both return actor snapshots, timestamps, reason/action details, and decoded before/after values without changing audit records.
- Added `audit_logs.view` to the canonical owner grants and documented both operations and their permission/step-up requirements in `backend/docs/openapi.yaml`.
- Added three engine-backed audit history tests. No migration or earlier schema version was changed.

### Commands and actual results
- `artisan test --colors=never` on MySQL 8.4.3 `mysql_test` / `erp_test`: **78 passed, 944 assertions**.
- `scripts\run-phase1-constraints.php mysql_test`: **21 passed, 0 failed**.
- `artisan test --colors=never` on MariaDB 13.0.2 `mariadb_test` / `erp_test`: **78 passed, 944 assertions**.
- `scripts\run-phase1-constraints.php mariadb_test`: **21 passed, 0 failed**. All named constraint outcomes matched MySQL; engine-native rejection diagnostics differ in wording only.
- Live route/OpenAPI comparison using `artisan route:list --path=api/v1 --json`: **86 route records**, **127 method/path pairs**, including **37 implicit HEAD aliases**; **90 non-HEAD routes** and **90 OpenAPI operations**, **0 missing**, **0 extra**.
- Pint `--test` for changed PHP files: **passed**. `php -l` for the new controller and test: **no syntax errors**.
- An additional standalone filtered test invocation without the per-engine test environment was skipped (**3 skipped, 0 run**); it is not counted as a passing focused run. The full per-engine suites ran with the appropriate connection environment and passed.
- YAML/OpenAPI parser validation remains **NOT VERIFIED**. No migration was added; migration state was not changed.

### Problems found and how resolved
- The OpenAPI summary previously reflected the smaller route set. Updated its counts from the live route list, then compared every non-HEAD method/path pair and confirmed an exact match.
- No MySQL/MariaDB behavior difference was found in the Part 2c tests or constraint outcomes beyond engine-specific diagnostic text.
- No database mutation was required. Commands targeted only `erp_test`; `system_end` was not accessed.

### Deviations and open questions
- No deviation from the requested read-only audit/history scope. No accountant or business decision was required.
- OpenAPI parser validation, minimum supported database versions, MariaDB restore, off-host backup destination, Hostinger runtime, and accountant decisions remain NOT VERIFIED/open as previously recorded.

### Commit and next step
- Implementation commit: pending; record its hash in an append-only addendum after commit.
- **Next step:** Part 2d — revoked-session cleanup and backup/session scheduler entries, with full suite and constraint validation on both engines.

## Part 2c — implementation commit hash addendum

**Date/time:** 2026-10-11 12:43 +03:00

- **Commit hash:** `9902de9` — adds owner-only audit-log and invoice history reads, permission grant, OpenAPI operations/count reconciliation, engine tests, and dual-engine verification results.
- **Next step:** Part 2d — inspect and complete revoked-session cleanup plus hourly backup scheduler entries.

## Part 2d — session cleanup, scheduler, and timeout verification

**Date/time:** 2026-10-11 12:52 +03:00

### What was built
- Confirmed the existing `auth-sessions:prune` command revokes expired/idle sessions and deletes revoked sessions after the configured 90-day retention, and is scheduled daily at 02:00.
- Confirmed `backup:mysql` is scheduled hourly with `withoutOverlapping`; `backup:offsite` is scheduled daily at 03:00. Added engine-backed boundary coverage confirming a session expires at 30 minutes of inactivity and remains valid just before that boundary, plus a fixed 12-hour absolute lifetime unaffected by recent activity.
- The 30-minute idle, 12-hour absolute, 90-day retention configuration, and pruning test were already present. No runtime/session command or schedule changes and no schema migration were needed.
- Stabilized an existing step-up test assertion to calculate the expiry from the response's `verified_at` value rather than a later wall-clock read.

### Commands actually run and real results
- `artisan schedule:list --no-ansi`: printed daily `auth-sessions:prune` at 02:00, hourly `backup:mysql`, and daily `backup:offsite` at 03:00.
- Focused timeout/pruner tests on MySQL `mysql_test` / `erp_test`: **3 passed, 19 assertions**; same on MariaDB `mariadb_test` / `erp_test`: **3 passed, 19 assertions**.
- Full `artisan test --colors=never` on MySQL 8.4.3 `erp_test`: **80 passed, 956 assertions**; constraints: **21 passed, 0 failed**.
- Full `artisan test --colors=never` on MariaDB 13.0.2 `erp_test`: **80 passed, 956 assertions**; constraints: **21 passed, 0 failed**.
- The inventory step-up expiry test passed individually on both engines (**1 passed, 42 assertions** each). Pint was run on the changed PHP tests and `--test` passed; PHP syntax checks and `git diff --check` passed.
- The first full MariaDB run found a timing-sensitive assertion in the existing step-up test (expected expiry was recomputed after the response, crossing a second). It was fixed to derive expected expiry from response `verified_at`; reruns passed on both engines. An initial timeout-test draft conflated idle and absolute expiry; it now refreshes `last_seen_at` before asserting the absolute boundary, while the separate idle-boundary test checks the idle behavior independently.
- Database operations and tests targeted `erp_test`; `system_end` was not accessed. No schema/version compatibility claim follows from local tests on MySQL 8.4.3 and MariaDB 13.0.2.

### Problems, deviations, and open questions
- No missing session-prune command or scheduler entry was found; Part 2d was completed by proving the existing behavior with boundary tests and stabilizing the coupled timing assertion.
- No engine behavior difference was found. OpenAPI parser validation, MariaDB restore, off-host backup destination, minimum database versions, Hostinger runtime, and accountant questions remain NOT VERIFIED/open.

### Commit and next step
- Implementation commit: pending; record its hash in an append-only addendum after commit.
- **Next step:** Part 2e — audit pagination, sorting/search, query counts, and indexes across list/report endpoints; add forward migrations only if a concrete index gap is established.

## Part 2d — implementation commit hash addendum

**Date/time:** 2026-10-11 12:52 +03:00

- **Commit hash:** `1d29012` — records Part 2d timeout boundary coverage and the clock-stable step-up assertion, with full dual-engine verification results.
- **Next step:** Part 2e — inspect all list and report endpoints for pagination, sorting, search, query-count, and index coverage.

## Part 2e — list pagination, sorting, search, and query review

**Date/time:** 2026-10-11 13:30 +03:00

### What was built
- Added `backend/app/Support/ListQuery.php` as a shared helper for validated one-based pagination, bounded page sizes (1–100), substring search, allowlisted sort fields/directions, and stable tie-break columns.
- Applied those standards to collection endpoints for customers, invoices, returns, collections, categories, products, warehouses, inventory balances/movements, orders, deliveries, containers, treasury accounts/entries/transfers, expense categories/expenses, audit history, and report lists.
- Standardized list responses as top-level `data` arrays with `meta` pagination fields. Batched customer balance calculations over the requested page rather than issuing reads per customer. Added deterministic product/warehouse and movement-line tie-break ordering.
- Updated `backend/docs/openapi.yaml` with reusable list query parameters and endpoint filters; it contains 90 operation IDs and 26 list-parameter reference sets (the paginated collection operations plus invoice history). No route or schema migration was added.
- Added integration coverage for customer search, sorting, multi-page results, the top-level response shape, invalid page/sort rejection, and bounded balance-query count. Updated audit-history tests for the standardized response envelope.

### Commands and actual results
- Targeted `AuditHistoryEngineTest|ReportsEngineTest`: MySQL `erp_test` **10 passed, 132 assertions**; MariaDB `erp_test` **10 passed, 132 assertions**.
- Full `artisan test --colors=never`: MySQL 8.4.3 `mysql_test` / `erp_test` **81 passed, 976 assertions**; MariaDB 13.0.2 `mariadb_test` / `erp_test` **81 passed, 976 assertions**.
- `scripts\run-phase1-constraints.php mysql_test`: **21 passed, 0 failed**. `scripts\run-phase1-constraints.php mariadb_test`: **21 passed, 0 failed**. Both runners reported `DATABASE erp_test`; no `system_end` database was accessed.
- PHP syntax checks for all modified PHP files: **no syntax errors**. Pint `--test` for the new helper, modified controllers/service, and changed tests: **passed**. `git diff --check`: **passed**.
- Read-only `EXPLAIN` checks were run for customer/product search, invoices, stock balances/movements, treasury entries, and container-cost reports on both `erp_test` databases. Existing indexes were selected for customers, invoices, balances, treasury, and correlated container-cost lookup. The movement index was chosen by MySQL; MariaDB chose a line-table scan on the small test dataset. Product substring search uses an index scan on MySQL and a table scan on MariaDB because `%term%` search cannot use ordinary B-tree prefix lookup. No migration was justified by these plans. Query-plan differences are optimizer choices; API/test outcomes matched.
- Customer list query instrumentation observed two balance-source reads (`sales_documents`, `sales_receipts`) for a two-customer page, rather than per-row reads.
- YAML/OpenAPI parser validation: **NOT VERIFIED**; local checks found no Symfony YAML, Node YAML, or OpenAPI parser package installed. The contract parameter references were reviewed textually; no software was installed.

### Problems found and how resolved
- The first full-suite run after normalizing pagination returned three audit-history assertion failures because the tests still expected Laravel's nested paginator JSON shape. Updated those tests to the intentional top-level `data`/`meta` contract; the final full suites then passed on both engines.
- The MariaDB and MySQL optimizers chose different access paths for substring text search and movement history on the small local test databases. This does not change results. `%term%` retains substring behavior and is not accelerated by the existing B-tree indexes; no business-visible search behavior was narrowed.
- No N+1 balance loop or concrete missing index was found. No schema change or deviation from the approved business rules was needed.

### Open questions
- No new business decision is required for Part 2e.
- The CSV import formats will be explicitly documented with Part 2f. Accountant decisions, OpenAPI parser validation, MariaDB restore, off-host backup destination, minimum MySQL 8.0/MariaDB 10.6 compatibility, and Hostinger runtime remain open or NOT VERIFIED.

### Commit hash(es)
- Implementation commit: pending; record the hash in the next append-only addendum.

### Next step
- Part 2f — implement products, customers, opening stock, and customer opening-balance CSV import commands with dry-run validation, duplicate rejection, service-backed writes, and documented sample formats.

## Part 2e — implementation commit hash addendum

**Date/time:** 2026-10-11 13:37 +03:00

- **Commit hash:** `5398e1ec90c9a985606ba5a877a02797522ba7d7` — commits the Part 2e list-query helper and endpoint updates, OpenAPI query contract, related tests, and Part 2e verification entry.
- **Post-commit status:** Only the pre-existing untracked `PROJECT_STATUS_HANDOFF.md` and `docs/development/FRONTEND_STATUS_REPORT.md` remain untracked; neither was staged or modified by this commit.
- **Next step:** Part 2f — implement dry-run-capable import commands for products, customers, opening stock, and customer opening balances.

## Part 2f — CSV import tools

**Date/time:** 2026-10-11 13:53 +03:00

### What was built
- Added `MasterDataService` and routed the existing product/customer creation endpoints through it, preserving their API validation and audit behavior.
- Added the shared `CsvImportService` and four Artisan commands: `imports:products`, `imports:customers`, `imports:opening-stock`, and `imports:customer-opening-balances`. Apply mode is opt-in; default is dry-run. The full CSV is validated before any write, duplicate products/SKUs/barcodes and duplicate customer phones are rejected, and apply mode is atomic.
- Apply mode requires `--actor-id` for an active owner and records that owner in audit history. Product/customer writes use `MasterDataService`; opening stock posts dated inventory movements via `InventoryService`; customer opening balances create dated opening-receivable documents via `SalesService`. No fixed balance columns or schema changes were added.
- Documented exact CSV headers, column meanings, examples, dry-run/apply behavior, and owner audit attribution in `backend/docs/operations/CSV_IMPORTS.md`. These are console commands, not HTTP endpoints; `openapi.yaml` did not need changes.
- Added engine integration tests for dry-run, duplicate rejection, owner-attributed audited catalog writes, dated stock movement creation, and dated customer opening documents.

### Commands actually run and real results
- PHP 8.3.33 lint on every changed PHP source/test file: **no syntax errors**. `vendor/bin/pint --test` on those files: **passed** after running Pint once to apply the reported formatting fixes.
- `artisan list --raw` showed all four `imports:*` commands.
- Targeted `CsvImportEngineTest`: MySQL 8.4.3 `mysql_test` / `erp_test` **4 passed, 27 assertions**; MariaDB 13.0.2 `mariadb_test` / `erp_test` **4 passed, 27 assertions**.
- Full `artisan test --colors=never`: MySQL 8.4.3 `mysql_test` / `erp_test` **85 passed, 1003 assertions**; MariaDB 13.0.2 `mariadb_test` / `erp_test` **85 passed, 1003 assertions**.
- `scripts\run-phase1-constraints.php mysql_test`: **21 passed, 0 failed**, database confirmed `erp_test`; `scripts\run-phase1-constraints.php mariadb_test`: **21 passed, 0 failed**, database confirmed `erp_test`. Expected engine diagnostic wording differed, but constraint behavior and counts matched.
- `artisan migrate:status --database=mysql_test --no-ansi`: all nine applied migrations reported `Ran`. No migration was authored in this part. The MariaDB migration-status command was **NOT RUN** in Part 2f; the MariaDB full suite and constraints passed against the existing `erp_test` schema.
- `git diff --check`: **passed**. No command in this part targeted `system_end`.

### Problems found and how resolved
- Initial Pint check reported formatting differences in newly added PHP files. Ran Pint on only the touched PHP files; the subsequent focused Pint check and all syntax checks passed.
- No MySQL/MariaDB import-behavior difference was found in the integration tests.
- A valid apply requires an active owner ID so imported records have an accountable audit actor; apply remains opt-in and all rows commit or roll back together. No business-rule change or migration was required.

### Open questions and deviations
- No new business decision is required. CSV schemas are defined in `backend/docs/operations/CSV_IMPORTS.md`; customer import requires a phone for reliable identity and phone uniqueness, although the interactive/API customer creation flow may still accept nullable phone values.
- Import apply is intentionally limited to an active owner actor; this is an audit safeguard for console-only administrative writes.
- Accountant decisions, OpenAPI parser validation, MariaDB restore, off-host backup destination, minimum MySQL 8.0/MariaDB 10.6 compatibility, and Hostinger runtime remain open or NOT VERIFIED.

### Commit hash(es)
- Implementation and this phase entry: pending; record the commit hash in the next append-only addendum.

## Part 2f — implementation commit hash addendum

**Date/time:** 2026-10-11 13:55 +03:00

- **Commit hash:** `6e44803d8535a6bd61c14431016239f13dd73646` — commits all four CSV import commands, shared importer and master-data services, import format documentation, tests, and the Part 2f dual-engine verification entry.
- **Post-commit status:** Only the pre-existing untracked `PROJECT_STATUS_HANDOFF.md` and `docs/development/FRONTEND_STATUS_REPORT.md` remain untracked; neither was staged or modified.
- **Next step:** Part 3a — build and run the specified end-to-end business scenario on both `erp_test` engines.

### Next step
- Part 3a — implement and execute the complete end-to-end acceptance scenario on both `erp_test` engines before beginning Part 3b.

## Part 3a — final backend end-to-end acceptance scenario

**Date/time:** 2026-10-11 14:12 +03:00

### What was built
- Added `backend/tests/Feature/BackendAcceptanceEngineTest.php`, an engine-backed scenario covering two warehouses, two products, a value-allocated container with freight and customs, two receipt batches, sales from both warehouses, an invoice revision retaining the reversed original, linked and free-form returns, partially allocated collection, stock transfer, and payment/linkage of a container cost through treasury.
- The scenario prints JSON snapshots after each business step: stock quantities and average costs per warehouse, invoice numbers/status/totals, customer balance and unallocated collections, and provisional per-invoice profit.
- Assertions verify total allocated landed cost is EGP 10.00 and the deterministic rounding remainder produces EGP 3.34 / EGP 6.66 across the two product lines; invoice totals are EGP 20.00, EGP 40.00, then EGP 22.00 for the revised invoice; the free-form return uses the destination warehouse's current average cost; the EGP 20.00 unapplied receipt remains separate; treasury ends at EGP 144.00; no scenario product has negative stock; and owner/driver cost and profit visibility differs as required.
- No schema migration or new endpoint was needed. The test composes existing services and controllers directly; HTTP middleware, step-up, route coverage, and security configuration are part of Part 3b rather than this business-flow test.

### Commands actually run and real results
- PHP 8.3.33 Pint on `tests\Feature\BackendAcceptanceEngineTest.php`: **passed** after applying formatting.
- Targeted `artisan test --filter=BackendAcceptanceEngineTest` on MySQL `mysql_test` / `erp_test`: **1 passed, 35 assertions**; same on MariaDB `mariadb_test` / `erp_test`: **1 passed, 35 assertions**.
- Full `artisan test` on MySQL `mysql_test` / `erp_test`: **86 passed, 1038 assertions**; `scripts\run-phase1-constraints.php mysql_test`: **21 passed, 0 failed**.
- Full `artisan test` on MariaDB `mariadb_test` / `erp_test`: **86 passed, 1038 assertions**; `scripts\run-phase1-constraints.php mariadb_test`: **21 passed, 0 failed**.
- The printed final scenario snapshots on both engines show posted invoice totals EGP 22.00 and EGP 40.00, customer balance EGP 0.00 with EGP 20.00 unallocated, provisional invoice profits EGP 10.33 and EGP 16.67, positive stock only, and treasury EGP 144.00. No cross-engine behavior difference was found.
- The acceptance test guards the connected database name as exactly `erp_test` and rolls back its test transaction. No command in this part targeted `system_end`.

### Problems found and how resolved
- Fixed response access in the test to use the associative array returned by `JsonResponse::getData(true)`.
- Fixed the grouped allocation query to select a named aggregate alias. Corrected the initially assumed allocation split to the observed deterministic rounding result (EGP 3.34 / EGP 6.66); total allocation and landed unit costs remain exact.
- Supplied the required treasury entry and amount when linking the freight payment and asserted the resulting account balance directly.
- The first test attempt stopped at the aggregate query and made no committed changes; after these test corrections, targeted and full runs passed on both engines.

### Deviations and open questions
- No business rule, schema version, or API contract changed. The requested scenario is integration coverage through the already-existing controller/service layer, not a full HTTP-kernel traversal; Part 3b must still verify authentication middleware, authorization on every registered route, and step-up enforcement.
- No new accountant decision is needed. The profit figures remain explicitly provisional pending accountant approval. MariaDB restore, OpenAPI parser validation, off-host backup destination, minimum MySQL 8.0/MariaDB 10.6 compatibility, and Hostinger runtime remain NOT VERIFIED/open.

### Commit hash(es)
- Implementation and this phase entry: pending; record the hash in the next append-only addendum.

### Next step
- Part 3b — run repository/history secrets scans and verify/fix login rate limiting, CSRF, default-deny route authorization, production cookie flags, and minimum password length; rerun full and constraint suites on both engines.

## Part 3b — security acceptance checks

**Date/time:** 2026-10-11 14:29 +03:00

### What was built and verified
- Hardened authentication cookie issuance in `backend/app/Http/Controllers/AuthController.php`: production now always sets `Secure`, even if `SESSION_SECURE_COOKIE` is explicitly false. The session cookie remains `HttpOnly`; both cookies use the configured SameSite value (default `lax`), while the CSRF cookie remains JavaScript-readable by design.
- Updated `backend/tests/Feature/ApiAuthenticationTest.php` so the route authorization audit invokes `artisan route:list --path=api/v1 --json` and checks every returned API route: health and login alone are public; all other routes require a session and at least one explicit permission; every non-public state-changing route requires CSRF. It also checks that login is throttled.
- Added tests proving the sixth login attempt in one minute is rejected (429), production cookies remain secure/HttpOnly/SameSite=Lax as applicable even under a false secure-cookie override, and both `users:create-owner` and owner-initiated resets reject passwords shorter than 12 characters.
- Existing CSRF tests verify missing, malformed, and unmatched tokens are denied; the route-list test covers CSRF middleware on every mutating route.

### Commands actually run and real results
- `artisan route:list --path=api/v1 --json`: **86 route records**, **127 method/path pairs**, including **37 implicit HEAD aliases** and **90 non-HEAD routes**.
- Targeted `ApiAuthenticationTest` on MySQL `mysql_test` / `erp_test`: **19 passed, 349 assertions**; on MariaDB `mariadb_test` / `erp_test`: **19 passed, 349 assertions**.
- Full `artisan test` on MySQL `mysql_test` / `erp_test`: **89 passed, 1110 assertions**; `scripts\run-phase1-constraints.php mysql_test`: **21 passed, 0 failed**.
- Full `artisan test` on MariaDB `mariadb_test` / `erp_test`: **89 passed, 1110 assertions**; `scripts\run-phase1-constraints.php mariadb_test`: **21 passed, 0 failed**.
- Pint `--test` and PHP lint on the changed controller/test: **passed**; `git diff --check`: **passed**.
- Repository scan: the locally available dedicated scanners (`gitleaks`, `trufflehog`, `detect-secrets`) were not installed. A local high-confidence pattern scan examined **365 project files** (excluding `.venv`, vendor/dependency directories, and binary assets) and found **0 matches** for common private-key, provider-token, and credential-bearing-URL patterns. The same patterns were checked against **134 reachable Git commits**, with **0 matches**. This heuristic is not exhaustive for arbitrary or unknown credential formats; that broader assurance remains NOT VERIFIED.
- `git ls-files -- backend/.env .env`: **no tracked env files**; `git check-ignore -v backend/.env`: `backend/.gitignore:3:.env`, so the local config is ignored.
- The full and constraint-suite commands explicitly targeted only `erp_test`; the route/auth tests used the configured engine connections. `system_end` was not accessed.

### Problems found and how resolved
- The first production-cookie test changed only the config repository, not Laravel's runtime environment value; setting the test application's environment to `production` made the test exercise the actual production guard. The controller change and corrected test then passed on both engines.
- An initial broad scan matched URL parsing examples in the local Python virtual environment. Those non-project virtual-environment files were excluded from the project scan; the rescan over project files returned zero high-confidence matches.
- No MySQL/MariaDB behavior difference was found. No schema migration or API endpoint was added.

### Deviations and open questions
- No dedicated secrets-scanning executable was present. The pattern scan is documented above and is useful evidence, but it does not prove the absence of every unknown secret format; installing a dedicated scanner was not required to perform the available local checks.
- No business rule or accountant decision was required. OpenAPI parser validation, MariaDB restore, off-host backup destination, minimum MySQL 8.0/MariaDB 10.6 compatibility, Hostinger runtime, and accountant questions remain NOT VERIFIED/open.

### Commit hash(es)
- Implementation and this phase entry: pending; record the hash in the next append-only addendum.

### Next step
- Part 3c — run a MariaDB backup/restore test using `erp_scratch` only; validate `backend/docs/openapi.yaml` with an available local parser or explicitly record NOT VERIFIED; rerun full and constraint suites on both engines.

## Part 3b — implementation commit hash addendum

**Date/time:** 2026-10-11 14:32 +03:00

- **Commit hash:** `652d868` — hardens production cookie security and records the route-list authorization, CSRF, rate-limit, password-policy, and dual-engine verification results.
- **Post-commit status:** The only untracked files are the pre-existing `PROJECT_STATUS_HANDOFF.md` and `docs/development/FRONTEND_STATUS_REPORT.md`; neither was staged or modified.
- **Next step:** Part 3c — MariaDB restore and OpenAPI parser validation.

## Part 3a — implementation commit hash addendum

**Date/time:** 2026-10-11 14:14 +03:00

- **Commit hash:** `b1e7c71` — adds the Part 3a cross-engine acceptance scenario and records its targeted, full-suite, and constraint-suite results for both engines.
- **Post-commit status:** The only untracked files are the pre-existing `PROJECT_STATUS_HANDOFF.md` and `docs/development/FRONTEND_STATUS_REPORT.md`; neither was staged or modified.
- **Next step:** Part 3b — security acceptance checks.

## Part 3c — MariaDB restore, OpenAPI parser check, and cross-engine regression

**Date/time:** 2026-10-11 14:40 +03:00

### What was built
- Extended `backend/app/Support/MysqlBackupSupport.php` to use the configured MariaDB dump/restore clients when Laravel's selected driver is `mariadb`, while retaining the MySQL client path for `mysql`.
- MariaDB dump mode omits the MySQL-specific `--set-gtid-purged=OFF` option. Backup configuration, command descriptions, `backend/.env.example`, and `backend/docs/operations/BACKUP_AND_RESTORE.md` now document both client pairs.
- No schema version, migration, endpoint, or business rule changed.

### Commands actually run and real results
- MySQL `erp_scratch` backup/restore drill (server port 3306; MySQL client 8.4.3): **passed**. The restore command compared **48 base tables** and exact table names/row counts before and after; all matched. Compressed dump: **11,922 bytes**.
- MariaDB `erp_scratch` backup/restore drill (server port 3307; MariaDB client 13.0.2): **passed**. The restore command compared **48 base tables** and exact table names/row counts before and after; all matched. Compressed dump: **11,760 bytes**.
- Full Laravel suite on MySQL `mysql_test` / `erp_test`: **89 passed, 1110 assertions**. `php scripts\run-phase1-constraints.php mysql_test`: **21 passed, 0 failed**.
- Full Laravel suite on MariaDB `mariadb_test` / `erp_test`: **89 passed, 1110 assertions**. `php scripts\run-phase1-constraints.php mariadb_test`: **21 passed, 0 failed**.
- Pint `--test`: **passed** for the four changed PHP files. PHP syntax lint: **passed** for all three changed PHP source files. `git diff --check`: **passed** (Git emitted only LF-to-CRLF working-copy warnings).
- The first Pint invocation was issued from the repository root with a backend-relative vendor path and returned “Could not open input file”; rerunning from `backend` succeeded. This was a command working-directory error, not a code/test failure.
- Checked local PHP YAML support, Composer Symfony YAML availability, and Node YAML/OpenAPI parser packages; none was available. `backend/docs/openapi.yaml` parser validation: **NOT VERIFIED**. No dependency was installed.
- Removed only the generated compressed dumps and empty temporary directories created for these two `erp_scratch` restore drills.

### Problems found and how resolved
- Existing support rejected Laravel's `mariadb` driver and would apply a MySQL-only GTID option to the MariaDB dump client. Driver-specific client selection and option handling fixed both issues; actual scratch restore drills passed on both engines.
- No table-name or row-count difference was found in the two restored scratch schemas. Full-suite and constraint-suite counts also matched across engines.
- No `system_end` access occurred. Test suites targeted `erp_test`; destructive restore tests were guarded to `erp_scratch`.

### Deviations and open questions
- OpenAPI validation follows the requested fallback: no YAML/OpenAPI parser was locally available, so it remains **NOT VERIFIED** rather than installing new software.
- Compatibility with MySQL 8.0 and MariaDB 10.6 minimum versions remains **NOT VERIFIED**; observed test servers were MySQL 8.4.3 and MariaDB 13.0.2.
- The off-host backup destination, Hostinger runtime, and accountant's confirmation of provisional profit/markup and Phase 8 accounting rules remain open.

### Commit hash(es)
- Part 3c implementation and this entry: pending; record the commit hash in an append-only addendum.

### Next step
- Part 4 — write `docs/development/BACKEND_COMPLETE.md`, update the handoff, and create `backend-v1.0` only against the final closeout commit. State every NOT VERIFIED item explicitly; do not claim parser validation.

## Part 3c — implementation commit hash addendum

**Date/time:** 2026-10-11 14:42 +03:00

- **Commit hash:** `560eb7de41e2822733ce55b7d11753a19fd1f204` — implements MySQL/MariaDB-specific backup and restore client handling, records both successful `erp_scratch` restore drills, and logs the dual-engine test results and OpenAPI validation status.
- **Post-commit status:** Only the pre-existing untracked `PROJECT_STATUS_HANDOFF.md` and `docs/development/FRONTEND_STATUS_REPORT.md` remain; neither was staged or changed.
- **Next step:** Part 4 — prepare closeout documentation, update the handoff, then create the final tag on the closeout commit.

## Part 4 — backend closeout documentation and release contract

**Date/time:** 2026-10-11 14:49 +03:00

### What was built
- Created `docs/development/BACKEND_COMPLETE.md` with the endpoint groups, current route/OpenAPI counts, final permission matrix, approved decisions, exact per-engine test commands, owner-creation and CSV-import instructions, backup/scheduler instructions, live migration status, acceptance evidence, and every NOT VERIFIED/accountant-open item.
- Corrected `backend/docs/architecture/backend-design/PROPOSED_ROLE_PERMISSION_MATRIX_V3.md` to match the canonical seeder. The previous document incorrectly described the driver grants as self-profile/session only; it now reflects the seeded invoice, customer/product/stock, order, and delivery permissions.
- Updated this append-only log's current HANDOFF and CURRENT STATUS sections. No schema or runtime endpoint changed.

### Commands actually run and real results
- Read-only `artisan migrate:status --database=mysql_test --no-ansi`: all **9 migrations Ran** on MySQL `erp_test`.
- Read-only `artisan migrate:status --database=mariadb_test --no-ansi`: all **9 migrations Ran** on MariaDB `erp_test`.
- Full `artisan test --colors=never` on MySQL `mysql_test` / `erp_test`: **89 passed, 1110 assertions**. `php scripts\run-phase1-constraints.php mysql_test`: **21 passed, 0 failed**.
- Full `artisan test --colors=never` on MariaDB `mariadb_test` / `erp_test`: **89 passed, 1110 assertions**. `php scripts\run-phase1-constraints.php mariadb_test`: **21 passed, 0 failed**.
- The closeout document's **7 local Markdown links resolved**, and its permission table has **45 rows**, **45 owner grants**, and **10 driver grants**.
- `git diff --check`: **passed**. No doc parser was installed; OpenAPI parser validation remains **NOT VERIFIED** as allowed by the Part 3c fallback.
- No live database was modified by the read-only migration-status commands. The full and constraint suites targeted only `erp_test`; `system_end` was not accessed.

### Problems, deviations, and open questions
- Reconciled the V3 policy document with the canonical seeded driver grants rather than perpetuating its stale self-only description.
- No test or constraint-suite failure occurred. The seven local completion-document links and the matrix grant counts were checked.
- OpenAPI YAML syntax/schema conformance remains **NOT VERIFIED** because no local parser was available. Also unverified: arbitrary secret formats beyond the performed high-confidence scan, MySQL 8.0/MariaDB 10.6 minimums, Hostinger runtime, and a real off-host backup/restore. Accountant answers remain required before Phase 8.
- The requested final tag is not yet created; it will point to the closeout implementation commit. The separate follow-up commit will only record that hash/tag in this log.

### Commit hash(es)
- Closeout documentation, V3 matrix correction, and this entry: pending.
- `backend-v1.0` tag: pending.

### Next step
- Commit the closeout files and this entry, tag that closeout commit `backend-v1.0`, then append the commit/tag hash addendum. Final completion wording must retain the explicit NOT VERIFIED limitations above.

## Part 4 — closeout commit and release tag addendum

**Date/time:** 2026-10-11 14:50 +03:00

- **Closeout commit:** `81849a522296ece0df3f0db8015bba9610d971d6` — adds `docs/development/BACKEND_COMPLETE.md`, reconciles the active V3 permission matrix with the canonical seeder, and records Part 4 evidence.
- **Release tag:** annotated `backend-v1.0` points to `81849a522296ece0df3f0db8015bba9610d971d6` (verified with `git rev-parse backend-v1.0^{commit}`).
- **Post-closeout status:** The only untracked paths are the pre-existing `PROJECT_STATUS_HANDOFF.md` and `docs/development/FRONTEND_STATUS_REPORT.md`; neither was staged, modified, or included in the tag.
- **Remaining NOT VERIFIED / blocked items:** OpenAPI parser validation; non-high-confidence/arbitrary secret formats; MySQL 8.0 and MariaDB 10.6 compatibility; Hostinger deployment runtime and operations; live off-host backup/restore; accountant decisions before Phase 8. These are recorded in `docs/development/BACKEND_COMPLETE.md`.
- **Next step:** Backend scope is closed at `backend-v1.0`. Use the tagged `backend/docs/openapi.yaml` contract for separately authorized frontend work. Do not implement Phase 8 accounting until the accountant supplies the answers in `backend/docs/operations/ACCOUNTANT_OPEN_QUESTIONS.md`.

## Backend v1.1 commit and release tag addendum

**Date/time:** 2026-10-12 01:41:24 +03:00

- **Implementation commit:** `aa69bfaa591122f7edbbf7a1b71d69e693d5766a` — backend v1.1 code, migration, OpenAPI 1.1.0, completion documentation, tests, and the dual-engine acceptance record.
- **Release tag:** annotated `backend-v1.1` points to `aa69bfaa591122f7edbbf7a1b71d69e693d5766a` (verified using `git rev-parse 'backend-v1.1^{commit}'`).
- **Post-commit worktree:** only the pre-existing untracked `PROJECT_STATUS_HANDOFF.md` remains; it was not modified or staged. No frontend path was changed or committed on `master`.
- **Open limitations:** OpenAPI parser validation, unknown secret formats, minimum MySQL 8.0/MariaDB 10.6 runtime validation, Hostinger runtime, off-site backup destination/restore, and accountant answers before Phase 8 remain NOT VERIFIED or WAITING, as detailed in `docs/development/BACKEND_COMPLETE.md`.
- **Next step:** Use the tagged `backend/docs/openapi.yaml` as the v1.1 contract. Wait for accountant decisions before implementing journal/tax/accounting behavior.

## Backend v1.1 — missing API completion and dual-engine acceptance

**Date/time:** 2026-10-12 01:34 +03:00

### What was built
- Added write-free invoice, order, return, and container landed-cost previews, reusing posting calculations and returning line-level rounded totals and non-blocking warnings.
- Added owner-only, step-up protected, audited user list/create/update-disable/role assignment operations and general company/numbering settings endpoints. Reordered management permission checks ahead of step-up checks so unauthorized users are denied by permission first.
- Added product cost history and completed customer detail, container receipt list/detail, inventory adjustment list, audit history, and full effective permission output in `/auth/me`.
- Added migration `backend/database/migrations/2026_10_12_000009_add_optional_master_data_reference_fields.php` for customer salesperson/tax/payment fields and product default tax rate/reference purchase price. The existing product `default_location_id` already represents its optional default warehouse; it was not duplicated. Reference purchase price remains hidden and write-protected without `costs.view`.
- Corrected OpenAPI response/request definitions and versioned the contract `1.1.0`; corrected duplicate customer fields and route counts. Added owner-admin and optional-metadata visibility tests.
- Preserved the separate frontend-only commit `fe94f8d` on `integration`; did not modify or stage frontend files or `PROJECT_STATUS_HANDOFF.md`.

### Commands actually run and real results
- Fresh install on MySQL 8.4.3 `mysql_test` / `erp_test`: `artisan migrate:fresh --database=mysql_test --seed --force` — **10 migrations passed; RolePermissionMatrixSeeder and AppSettingsSeeder passed**.
- Fresh install on MariaDB 13.0.2 `mariadb_test` / `erp_test`: `artisan migrate:fresh --database=mariadb_test --seed --force` — **10 migrations passed; RolePermissionMatrixSeeder and AppSettingsSeeder passed**.
- Final full suite after fresh install: MySQL **94 passed, 1208 assertions**; MariaDB **94 passed, 1208 assertions**.
- Final constraint suite after fresh install: MySQL **21 passed, 0 failed**; MariaDB **21 passed, 0 failed**.
- `ApiAuthenticationTest`: MySQL **20 passed, 407 assertions**; MariaDB **20 passed, 407 assertions**.
- `BackendAcceptanceEngineTest`: MySQL **2 passed, 53 assertions**; MariaDB **2 passed, 53 assertions**. This includes the two-warehouse container/sales/return/collection/transfer/treasury scenario and optional catalog/customer metadata visibility.
- MySQL and MariaDB `erp_scratch`: backup and restore each passed; **52 base tables** and exact pre/post table row counts matched. The default MySQL dump-client lookup failed because the client was not on PATH; rerunning with its explicit local executable succeeded. MariaDB used its explicit local dump/restore executables. No password or secret was printed.
- Route/OpenAPI static audit: **102 route records, 150 verb/path pairs including 44 HEAD aliases; 106 non-HEAD pairs**. OpenAPI has **106 operations**, **0 undocumented routes**, **0 extra operations**. No registered protected API route was missing `api.permission`; health and login are the permitted public exceptions.
- High-confidence secret-pattern scan: **354 tracked files and all 183 reachable commits**, zero detected matches. `gitleaks`/`trufflehog` are unavailable; unrecognized formats remain NOT VERIFIED.
- Final PHP Pint `--test`: **passed**. Final `git diff --check`: **passed**.
- OpenAPI YAML parser validation: **NOT VERIFIED**; no local parser was available and no software was installed.
- Engine difference: no test, constraint, route-coverage, or restore behavior difference was observed between installed MySQL and MariaDB. Minimum-version execution on MySQL 8.0/MariaDB 10.6 remains NOT VERIFIED.

### Problems found and how resolved
- Full-suite runs found legacy product fixtures without migration-009's optional reference field; resource formatting now checks column presence before accessing it.
- Step-up-enforced password reset tests initially lacked a verified session and the temporary audit schema lacked `before_data`; tests now execute/establish the required step-up and model the audit schema. Unauthorized users are checked for permission before step-up. User API responses now serialize `is_active` as a boolean.
- The first optional-metadata test expected an object while Laravel's `getData(true)` returns an array; the assertion was corrected and passed on both engines.
- The first local MySQL backup attempt used the default binary name not available on PATH; explicit executable configuration fixed and passed the restore. MariaDB backup/restore passed on its first explicitly configured run.

### Deviations and open questions
- No journal entries, tax-method choices, or accountant-dependent formulas were added. The provisional profit/markup formula remains clearly marked and awaits accountant approval.
- Existing default warehouse storage (`products.default_location_id`) was reused; no duplicate column was introduced.
- No minimum-version services were available to test MySQL 8.0/MariaDB 10.6. OpenAPI parser and dedicated secret scanners were not installed; those validations are not claimed.
- Remaining external questions: accountant answers in `backend/docs/operations/ACCOUNTANT_OPEN_QUESTIONS.md`; off-site destination/credentials and Hostinger runtime/capabilities. No decision from the owner is required to complete current-engine v1.1 scope.

### Commit hash(es)
- Backend implementation/docs and this progress entry: pending.
- Backend v1.1 release tag: pending.
- Preserved frontend-only commit on `integration`: `fe94f8d`.

### Next step
- Run final format/diff/status checks, commit only backend and development documentation files on `master`, append the resulting commit/tag hashes, and tag the released API contract as `backend-v1.1`. Keep the named NOT VERIFIED and accountant-waiting items explicit.

## Backend v1.2 mobile API — Step 1: schema and permissions

**Date/time:** 2026-10-12 10:55 +03:00

### What was built
- Added forward-only migration `backend/database/migrations/2026_10_12_000010_create_mobile_companion_schema.php` creating `mobile_devices`, `mobile_channels`, `mobile_sources`, `mobile_categories`, `mobile_messages`, `mobile_sync_events`, and `mobile_idempotency_records`. The schema stores only a hash of mobile bearer tokens, links channels to existing treasury accounts and messages to their sources/channels, supports archived/needs-review message states, captures idempotency responses, and adds indexes for paginated device/channel/source/message/sync queries.
- Added the nine canonical permissions: `mobile.use`, `mobile.balances.view`, `mobile.messages.view`, `mobile.deposits.register`, `mobile.withdrawals.register`, `mobile.channels.manage`, `mobile.categories.manage`, `mobile.customers.create`, and `mobile.devices.manage`. The owner role receives all nine; the driver and other roles receive none by default. Existing role-permission records remain configurable.
- Added `MobileSchemaEngineTest` to assert table/field availability and the owner/driver grant boundary against each engine.

### Commands and actual results
- Preflight full suite and constraint suite, with explicit `DB_CONNECTION` and `AUTH_TEST_CONNECTION` set to each `*_test` connection and both configured database names set to `erp_test`: MySQL full suite **94 passed, 1208 assertions**; constraints **21 passed, 0 failed**. MariaDB full suite **94 passed, 1208 assertions**; constraints **21 passed, 0 failed**.
- Initial preflight invocation omitted `DB_CONNECTION`; PHPUnit used its in-memory SQLite default and reported **91 passed, 3 errors** in existing step-up auth tests because their SQLite fixture lacked `step_up_verified_at`. No MySQL/MariaDB constraint command ran in that invocation, and no engine database was changed by that failed test run. Rerunning with the explicit connection above passed.
- MySQL migration: `artisan migrate --database=mysql_test --force` — migration `2026_10_12_000010_create_mobile_companion_schema` **DONE**. `artisan db:seed --class=Database\Seeders\RolePermissionMatrixSeeder --database=mysql_test --force` — **DONE**. Full suite **95 passed, 1218 assertions**; constraint suite `scripts\run-phase1-constraints.php mysql_test` — **21 passed, 0 failed**; runner confirmed MySQL **8.4.3**, database `erp_test`.
- MariaDB migration: `artisan migrate --database=mariadb_test --force` — migration `2026_10_12_000010_create_mobile_companion_schema` **DONE**. `artisan db:seed --class=Database\Seeders\RolePermissionMatrixSeeder --database=mariadb_test --force` — **DONE**. Full suite **95 passed, 1218 assertions**; constraint suite `scripts\run-phase1-constraints.php mariadb_test` — **21 passed, 0 failed**; runner confirmed MariaDB **13.0.2**, database `erp_test`.
- PHP syntax checks for the migration, seeder, and test **passed**; `git diff --check` **passed**.

### Problems found and how resolved
- The new permission test initially called `all()` on the array fallback returned by `Collection::get()`. Corrected the assertion to compare the stored array directly; final full suites passed on both engines.
- No MySQL/MariaDB schema behavior difference was observed.

### Deviations and open questions
- The initial test command setup omission was corrected before proceeding. It did not require code or database repair.
- The mobile schema also includes dedicated monotonic sync-event and per-device idempotency tables, needed by later API steps; no database feature newer than the established MySQL/MariaDB support level was introduced.
- Open questions needing owner decision: none for Step 1. Real bank-message parsing remains unverified until anonymized samples are supplied; accountant-dependent accounting rules remain out of scope.

### Commit hash(es)
- Step 1 implementation, test, seeder, and this log entry: `cceff71`.

### Next step
- Step 2: implement isolated mobile bearer-token authentication and owner device administration; do not expose mobile tokens to web routes or browser sessions to mobile-only routes.

### Step 1 commit hash addendum
- Implementation commit: `cceff71` — `Backend mobile Step 1 schema and permissions`.

## Backend v1.2 mobile API — Step 2: device authentication and administration

**Date/time:** 2026-10-12 11:16 +03:00

### What was built
- Added mobile bearer-token authentication in `AuthenticateMobileToken`, separate from `AuthenticateApiSession`: 256-bit random tokens are returned once, only SHA-256 hashes are stored, tokens expire by configuration (default 720 hours), inactive users/password changes invalidate access, and device last-seen time is updated.
- Added `/mobile/auth/login`, `/mobile/auth/me`, `/mobile/auth/confirm-password`, and `/mobile/auth/logout`. Login checks `mobile.use`, enforces a configurable active-device limit (default 10), is rate-limited, and writes an audit record without recording the token. Password confirmation is audited and valid for 10 minutes. Logout revokes the device token immediately.
- Added owner web endpoints for paginated device/source listing, device rename, and immediate revocation. These require browser session, `mobile.devices.manage`, step-up re-authentication, and CSRF on writes.
- Added the forward-only migration `2026_10_12_000011_add_mobile_password_confirmation.php`; updated auth configuration and `.env.example` with non-secret TTL/device-limit settings.
- Updated route-security regression coverage to require exactly one protected auth scope (`api.session` or `api.mobile`), permission middleware, and CSRF for cookie-authenticated writes.
- Added five MySQL/MariaDB integration tests for token scope, driver denial, expiry/password change, ten-minute confirmation, logout, rate limiting, device administration, and revocation.

### Commands and actual results
- MySQL `erp_test`: `artisan migrate --database=mysql_test --force` — migration `2026_10_12_000011_add_mobile_password_confirmation` **DONE**. Focused suite `artisan test --filter=MobileAuthenticationEngineTest --colors=never`: **5 passed, 49 assertions**. Final full `artisan test --colors=never`: **100 passed, 1393 assertions**. Constraint suite `scripts\run-phase1-constraints.php mysql_test`: **21 passed, 0 failed**; runner confirmed MySQL **8.4.3**, database `erp_test`.
- MariaDB `erp_test`: `artisan migrate --database=mariadb_test --force` — migration `2026_10_12_000011_add_mobile_password_confirmation` **DONE**. Focused suite: **5 passed, 49 assertions**. Final full suite: **100 passed, 1393 assertions**. Constraint suite `scripts\run-phase1-constraints.php mariadb_test`: **21 passed, 0 failed**; runner confirmed MariaDB **13.0.2**, database `erp_test`.
- Focused route-audit plus mobile-auth tests after adapting the existing route test: **6 passed, 443 assertions** on each engine.
- `artisan route:list --path=mobile` — **7 registered routes**; PHP syntax checks for all touched PHP files and `git diff --check` **passed**.

### Problems found and how resolved
- The first target-test invocation lacked `AUTH_TEST_CONNECTION`, causing the new test's skipped setup to fail in `tearDown`; the fixture now safely handles skipped engines and commands set the connection explicitly.
- Initial route tests used the unversioned `/api/mobile` URL. Laravel's API route group is versioned under `/api/v1`, so tests now exercise `/api/v1/mobile/...` (OpenAPI paths will remain relative to the `/api/v1` server in Step 7).
- The route-audit test expected `api.session` on every protected route. It now verifies mutually exclusive cookie/mobile authentication scopes and applies CSRF requirements only to cookie-authenticated writes. The initial full suite then passed on both engines.
- A password-change timestamp was initially omitted from the login query; it is now captured on token issuance and compared against the current user record so tokens issued before a password change are invalidated even when database timestamps share a second.
- A diagnostic `route:list --columns=...` option was unsupported by this Laravel version; the supported `route:list --path=mobile` command returned all seven routes.

### Deviations and open questions
- Password change invalidation uses a per-device snapshot of the user's password-change timestamp; no token secret or password hash is stored in audit data.
- No mobile token is accepted by browser-session routes, and browser cookies do not authenticate mobile-only routes. Owner web device routes remain session-only.
- No owner decision is needed for this step. Token lifetime and device limit remain configurable through the new environment values; current defaults are 720 hours and 10 active devices.

### Commit hash(es)
- Step 2 implementation, migration, tests, and this log entry: `40f4612`.

### Next step
- Step 3: build the payment-channel, source, and category APIs with audited mutations; high-risk channel/category creation and opening-balance operations must require the mobile password-confirmation window.

### Step 2 commit hash addendum
- Implementation commit: `40f4612` — `Backend mobile Step 2 device authentication`.

## Mobile Step 3 — payment channels, sources, and categories

**Date/time:** 2026-10-12 11:48 +03:00

### What was built
- Added treasury-backed mobile channel list/create/update/pause/archive endpoints. Opening balances are posted through the existing treasury service as dated `opening` entries; channel creation and archival require the device's ten-minute password-confirmation window.
- Added per-device SMS/notification source list/create/update/pause/archive endpoints. Sources are owned by their registering device, require at least one enabled direction, retain versioned parser settings and redacted samples, and cannot be moved or edited by another device. Archiving a channel/source archives unregistered messages; each changed source/message gets an audit and sync event, and message text is excluded from audit data.
- Added mobile category list/create/update/deactivate endpoints. Expense categories reuse `expense_categories`; transfers reference existing treasury accounts. The canonical seeder provisions the system drawer account/category and the three expense categories, with notes mandatory for `مصاريف أخرى`.
- Added device-scoped mobile idempotency records for all new write routes, mobile balance output only through permission-checked channel listing, and mobile bearer security to the OpenAPI contract.
- Caught up the missing Step 2 auth/device OpenAPI entries and documented all Step 3 routes. Contract comparison reports 125/125 registered non-HEAD operations documented, with no extras or duplicate path keys.

### Commands and actual results
- PHP 8.3.33 `php -l` on the changed PHP files — **all syntax checks passed**.
- Direct project-PHP Pint formatter on changed PHP files — **passed**. `pint --test` on the same files — **passed**.
- Focused `MobileAdministrationEngineTest|MobileAuthenticationEngineTest|ApiAuthenticationTest`: MySQL `erp_test` **28 passed, 672 assertions**; MariaDB `erp_test` **28 passed, 672 assertions**.
- Full `artisan test`: MySQL 8.4.3 `erp_test` **103 passed, 1483 assertions**; MariaDB 13.0.2 `erp_test` **103 passed, 1483 assertions**.
- `scripts/run-phase1-constraints.php mysql_test`: **21 passed, 0 failed**; `scripts/run-phase1-constraints.php mariadb_test`: **21 passed, 0 failed**.
- `route:list --path=mobile`: **19 route records**. OpenAPI route comparator: **125 registered non-HEAD operations, 125 documented, 0 missing, 0 extra, 0 duplicate paths**.
- `git diff --check` — **passed**. No MariaDB/MySQL behavior difference observed in this phase's focused/full suites or constraint suite.
- First formatter attempts: `php artisan pint ...` returned `Command "pint" is not defined`; `vendor/bin/pint.bat` selected PHP 8.2.33 and failed its PHP 8.3/mbstring requirements. Resolved by invoking `vendor/bin/pint` with the configured PHP 8.3.33 executable; formatting and `--test` then passed.

### Problems found and how resolved
- Step 2 auth/device routes were not documented in the prior contract; added them alongside Step 3 and verified route/method coverage against Laravel's registered route JSON.
- Balance data was removed from channel write responses to prevent replaying a cached balance to a caller whose balance permission was later revoked. Channel balance listing checks `mobile.balances.view`.
- Category updates now reject disabling the mandatory-notes rule for `مصاريف أخرى`. Source/channel archival records each status change without writing original message text to audit logs.
- The canonical drawer seeder reuses one active cash account named `الدرج`, creates a designated account if absent, and fails explicitly if the designated account is ambiguous/inactive or has an incompatible type.

### Deviations and open questions
- Step 2 OpenAPI coverage was a known overdue item and was completed here; this is a catch-up deviation with no API behavior change.
- No schema migration was needed for Step 3 because the mobile channel/source/category and idempotency tables already exist from Step 1. Added the `opening` entry type through the existing `TreasuryService`.
- No blocking business decision remains for Step 3. MySQL 8.0 and MariaDB 10.6 minimum-version execution remains NOT VERIFIED.

### Commit hash(es)
- Step 3 implementation and this entry: pending final commit; the resulting full hash will be appended separately.

### Next step
- Implement Step 4: message ingestion from registered sources, OTP/verification hard-blocking, payload limits, cross-device duplicate detection, needs-review status, and permission-filtered message reads.

## Mobile Step 3 — final dual-engine validation addendum

**Date/time:** 2026-10-12 11:57 +03:00

- Final full `artisan test` after the last permission-boundary regression assertion: MySQL 8.4.3 `erp_test` **103 passed, 1485 assertions**; MariaDB 13.0.2 `erp_test` **103 passed, 1485 assertions**.
- Final constraint runner results: MySQL **21 passed, 0 failed**; MariaDB **21 passed, 0 failed**.
- This final run supersedes the earlier Step 3 entry's assertion totals. Functional pass/fail outcomes match on both engines. MariaDB's constraint runner additionally prints its native foreign-key/CHECK rejection diagnostics for expected-negative cases; all such cases pass on both engines.
- No minimum-version test on MySQL 8.0 or MariaDB 10.6 was run. Implementation commit hash remains pending.

## Mobile Step 3 — parser-rule invariant verification addendum

**Date/time:** 2026-10-12 12:01 +03:00

- Source PATCH now validates the combined persisted/new parser rule and version, preventing a non-null rule from being left without its required version when a client clears only the version.
- Final full suite after adding that regression case: MySQL 8.4.3 `erp_test` **103 passed, 1486 assertions**; MariaDB 13.0.2 `erp_test` **103 passed, 1486 assertions**.
- Final constraint suites after the change: **21 passed, 0 failed** per engine. Pint `--test` passed. Commit hash remains pending.

## Mobile Step 3 — implementation commit hash addendum

**Date/time:** 2026-10-12 12:02 +03:00

- Step 3 implementation, OpenAPI updates, tests, and validation log: `96af82d69fb085df89fad6039a5f56387b46a132` (`Implement mobile channels sources and categories`).
- Next step: implement Step 4 message ingestion and duplicate detection.

## Mobile Step 4 — message ingestion, duplicates, and review

**Date/time:** 2026-10-12 12:21 +03:00

### What was built
- Added mobile message batch ingestion for 1–100 messages per request, limited to 5,000 characters of raw text per message. Sources must belong to the authenticated device, be active, have an active channel, allow the direction, match the exact SMS sender or notification package, and match a configured keyword when that direction has keywords.
- Added hard rejection for the specified OTP/verification markers before storage, EGP decimal-string validation to exact piastres, needs-review status for missing/unclear amounts, and a database-unique duplicate hash across devices using sender, normalized amount, device time, and a hash of the original text. Every write is device-scoped and idempotent. Audit/sync records omit original text.
- Added paginated, filterable, sortable message listing restricted to the authenticated user's devices. `raw_text` and text search are available only when the effective roles grant `mobile.messages.view`.
- Added idempotent manual amount review for `needs_review` and `archived` messages. Reviewed active messages become `new`; archived messages remain archived. Amount changes produce an audit record and sync event.
- Added the three message operations to `backend/docs/openapi.yaml`. No migration was needed: the existing Step 1 schema already provides the fields, hash uniqueness, ownership/status/date indexes, audit/sync, and idempotency tables.
- Added two engine integration tests covering message validation, Arabic/English verification block phrases, disabled directions, unknown sources, duplicate replay and cross-device duplicate detection, raw-text permission filtering, and amount review.

### Commands and actual results
- PHP 8.3.33 syntax checks on the new controller/test and updated routes: **passed; no syntax errors**. Pint format and `--test`: **passed**. `git diff --check`: **passed**.
- Focused `MobileMessageEngineTest`: MySQL 8.4.3 `erp_test` **2 passed, 37 assertions**; MariaDB 13.0.2 `erp_test` **2 passed, 37 assertions**.
- Final full `artisan test --colors=never`: MySQL 8.4.3 `erp_test` **105 passed, 1532 assertions**; MariaDB 13.0.2 `erp_test` **105 passed, 1532 assertions**.
- Final `scripts/run-phase1-constraints.php`: MySQL `erp_test` **21 passed, 0 failed**; MariaDB `erp_test` **21 passed, 0 failed**. Rejection diagnostics use engine-native wording on MariaDB; all constraint outcomes matched.
- Static route/OpenAPI comparison: **128 registered non-HEAD method/path pairs, 128 documented, 0 missing, 0 extra**. Route permission audit: **121 protected route records, 0 missing `api.permission` middleware**. Full YAML/OpenAPI parser validation: **NOT VERIFIED**.
- An initial full-suite attempt omitted the default engine connection and ran three browser-auth tests against their SQLite fallback schema, which lacks the later step-up column. Reran with `DB_CONNECTION` and `AUTH_TEST_CONNECTION` explicitly set to each approved `*_test` connection; both final engine suites passed. No application/schema change was made for the misconfigured invocation.
- The engine integration tests and constraint runners confirmed `erp_test`. No code or test in this step accessed `system_end`, frontend files, or other worktrees.

### Problems, deviations, and open questions
- Initial keyword filtering was refined to enforce configured per-direction keywords in addition to device/source/channel/direction/sender matching.
- Duplicate conflicts are converted to a duplicate result only for the named unique-hash constraint; unrelated database errors continue to surface. Raw message content is not added to application audit records.
- No schema change, index migration, business-rule deviation, or owner decision was needed. Test execution on minimum MySQL 8.0/MariaDB 10.6 and formal OpenAPI parser validation remain NOT VERIFIED.

### Commit hash(es)
- Step 4 implementation and this phase entry: `f7b5adc8599bcc6c64a9597762cba5d453e84f74` (`Backend mobile Step 4 message ingestion`).

### Next step
- Step 5 — implement transaction-safe, idempotent deposits and withdrawals using existing collections, treasury, and expense services.

## Mobile Step 4 — implementation commit hash addendum

**Date/time:** 2026-10-12 12:21 +03:00

- Step 4 controller, routes, OpenAPI contract, tests, and validation entry: `f7b5adc8599bcc6c64a9597762cba5d453e84f74`.
- Next step remains Step 5: register deposits, manual deposits, and withdrawals through existing financial services.

## Mobile Step 5 — finance registration and receipt provenance

**Date/time:** 2026-10-12 12:45 +03:00

### What was built
- Added a forward migration for receipt recording source and unverified-message provenance. Message deposits create full-amount unapplied collections and channel treasury entries via the existing collection service; manual deposits are restricted to active post-office channels.
- Added category-based message withdrawals through the existing treasury expense and transfer services. Required notes are enforced for categories configured to require them. Registration changes message status, writes an audit record without raw message text, and emits a sync event in the same idempotent transaction.
- Exposed message/manual deposit provenance in customer statements and added the three finance operations to `backend/docs/openapi.yaml`, including required Idempotency-Key headers and permission declarations.
- Added dual-engine tests for posted/unapplied and manual deposits, expense and transfer withdrawals, balances, audit/message state, idempotent replay, required fallback notes, and customer-statement provenance.

### Commands and actual results
- Focused `MobileFinanceEngineTest` on MySQL 8.4.3 `erp_test`: **2 passed, 53 assertions**; MariaDB 13.0.2 `erp_test`: **2 passed, 53 assertions**.
- Final full `artisan test --compact --colors=never`: MySQL 8.4.3 `erp_test` **107 passed, 1594 assertions**; MariaDB 13.0.2 `erp_test` **107 passed, 1594 assertions**.
- Final `scripts/run-phase1-constraints.php`: MySQL `erp_test` **21 passed, 0 failed**; MariaDB `erp_test` **21 passed, 0 failed**.
- Route/OpenAPI comparison: **131 registered non-HEAD method/path pairs, 131 documented, 0 missing, 0 extra**. Permission audit: **124 protected route records, 0 session/mobile-authenticated routes missing permission middleware**.
- PHP 8.3.33 lint on all changed PHP files, Pint formatting and Pint `--test`, and `git diff --check` passed. Formal YAML parser validation remains **NOT VERIFIED**.
- First test invocation selected PHP 8.2.33 and failed Composer's PHP >=8.3 platform check; subsequent test runs used installed Laragon PHP 8.3.33. Initial MariaDB statement testing found an illegal collation mix in the new customer-statement UNION; the NULL source expression now explicitly uses the schema collation and ReportsEngineTest passed on both engines. Initial full-suite runs exposed missing `step_up_verified_at` and `before_data` columns in the SQLite-only authentication test fixture; the fixture was corrected and the final suites passed on both engines.
- After those fixes, no MySQL/MariaDB behavior difference remained in finance, report, full-suite, or constraint outcomes. MariaDB's expected-negative constraint diagnostics use native error wording. Only `erp_test` was used; `system_end`, frontend, and mobile worktrees were not accessed.

### Problems, deviations, and open questions
- The new UNION field required an explicit `utf8mb4_unicode_ci` cast collation for MariaDB compatibility; MySQL behavior remained unchanged.
- Two test-only authentication fixture columns were added because the final full-suite run exercised step-up/audit paths against SQLite as well as the selected SQL engine.
- No schema/business-rule deviation or blocking owner decision. Accountant-dependent journal/tax/report rules remain out of scope. Minimum MySQL 8.0/MariaDB 10.6 execution and formal OpenAPI/YAML parsing remain **NOT VERIFIED**.

### Commit hash(es)
- Step 5 implementation and this entry: pending final commit; the implementation hash will be appended in a follow-up log-only commit.

### Next step
- Step 6 — implement mobile customer search/create, sync deltas, and ping, then continue to Step 7 contract completion and final acceptance.

## Mobile Step 5 — implementation commit hash addendum

**Date/time:** 2026-10-12 12:45 +03:00

- Step 5 implementation, OpenAPI updates, tests, and phase evidence: `6cb31629c85a65435377d6122b77571021fcc64a` (`Implement mobile finance registration`).
- Next step: Step 6 — mobile customer search/create, sync deltas, and ping.

## Mobile Step 6 — customers, synchronization, and ping

**Date/time:** 2026-10-12 13:04 +03:00

### What was built
- Reused `GET /customers` for the customer picker with a dedicated authentication boundary: browser callers retain session, step-up, and `customers.view` enforcement; mobile callers use a mobile token and `mobile.use`.
- Added owner-permission-gated, idempotent `POST /mobile/customers`, reusing existing customer validation and audit behavior.
- Added `GET /mobile/sync` with cursor-based initial snapshots and bounded deltas for customers, channels, categories, device-owned sources, and the caller's message statuses; raw text is excluded and balances are omitted without `mobile.balances.view`.
- Added `GET /mobile/ping` and sync events for customer create/update and channel balance-affecting treasury operations. Updated the OpenAPI contract and added dual-engine customer/sync tests.

### Commands and actual results
- Focused authentication, mobile-administration, and customer/sync tests on each engine: **23 passed, 654 assertions**.
- Full `artisan test --compact --colors=never`: MySQL 8.4.3 `erp_test` **109 passed, 1656 assertions**; MariaDB 13.0.2 `erp_test` **109 passed, 1656 assertions**.
- `scripts/run-phase1-constraints.php`: MySQL `erp_test` **21 passed, 0 failed**; MariaDB `erp_test` **21 passed, 0 failed**. All 21 constraint outcomes matched; MariaDB reports its native engine-specific rejection diagnostics.
- Static route/OpenAPI method-path comparison: **134 registered operations, 134 documented, 0 missing, 0 extra**. Route permission middleware audit: **0 gaps**.
- PHP 8.3.33 syntax checks, Pint formatting and `--test`, and `git diff --check`: passed. Formal YAML/OpenAPI parser validation: **NOT VERIFIED**.
- Tests used only `erp_test`; `system_end`, frontend files, and other worktrees were not accessed.

### Problems, deviations, and open questions
- The route-auth audit test initially assumed each protected route directly declares either browser or mobile auth middleware; the shared customer-picker route intentionally uses `api.customer_picker`. Updated the test to explicitly recognize that boundary and assert it is present.
- Opening a channel with a dated balance emits one sync event for the balance update and one for channel creation; updated the idempotency assertion to verify the two expected events are not duplicated on replay.
- No schema or business-rule deviation. No blocking business decision. Minimum-engine compatibility, formal parser validation, Hostinger runtime, off-site backup, and accountant-dependent rules remain unverified or out of scope.

### Commit hash(es)
- Step 6 implementation and this entry: pending at entry time; exact hash to be recorded in the immediately following addendum commit.

### Next step
- Step 7 — finish and audit the OpenAPI contract, then perform final backend v1.2 acceptance.

## Mobile Step 6 — implementation commit hash addendum

**Date/time:** 2026-10-12 13:10 +03:00

- Step 6 implementation, tests, OpenAPI updates, and phase evidence: `ad850c1` (`Implement mobile customer sync and ping`).
- Next step: Step 7 — finish and audit the OpenAPI contract, then perform final backend v1.2 acceptance.

## Mobile Step 7 — OpenAPI contract review and integration verification

**Date/time:** 2026-10-12 13:29 +03:00

### What was built
- Added `POST /mobile/messages/{messageId}/ignore`. It accepts only new or needs-review messages, uses the durable per-device idempotency service, writes an audit record without raw text, and emits a sync event.
- Normalized sync source parser JSON and direction flags, category flags, mobile customer `is_active`, and synchronized message amounts to explicit JSON values and exact two-decimal EGP strings. The customer-create controller retains the existing validated/audited creation service.
- Completed mobile API response schemas and synthetic examples for customer creation and message ignore, and documented the intended idempotency scope: offline-replayable business writes require `Idempotency-Key`; authentication lifecycle and browser-only device administration are control-plane operations rather than offline queue writes.
- Added cross-engine regression assertions for normalized types, ignore idempotency/audit/sync behavior, and a combined mobile login → channel/source → ingest → deposit/withdrawal → sync flow.

### Commands and actual results
- Focused message, customer/sync, and administration tests on MySQL 8.4.3 `erp_test`: **8 passed, 169 assertions**; MariaDB 13.0.2 `erp_test`: **8 passed, 169 assertions**.
- Combined mobile flow test on MySQL and MariaDB `erp_test`: **1 passed, 22 assertions** per engine.
- Full `artisan test`: MySQL 8.4.3 `erp_test` **111 passed, 1704 assertions**; MariaDB 13.0.2 `erp_test` **111 passed, 1704 assertions**.
- `scripts/run-phase1-constraints.php`: MySQL **21 passed, 0 failed**; MariaDB **21 passed, 0 failed**. Pass/fail behavior matched; MariaDB emitted its native CHECK/FK/unique-key diagnostic wording.
- Route/OpenAPI method-path text comparison: **135 registered API operations, 135 documented, 0 missing, 0 extra**, including **29/29 mobile operations**. Dedicated route-auth audit: MySQL and MariaDB **1 passed, 461 assertions** each.
- PHP 8.3.33 syntax checks, Pint `--test`, and `git diff --check`: **passed**. Initial focused test runs exposed unnormalized decimal scale in sync; normalized via the existing exact-money helper, then both engines passed.
- Formal OpenAPI/YAML parser validation, secrets scan, and scratch backup/restore: **NOT RUN** at this phase checkpoint. No frontend files or databases outside `erp_test` were accessed.

### Problems, deviations, and open questions
- The sync response had returned the database's `DECIMAL` scale (`5.0000`) rather than the API's exact-piastre form (`5.00`). Normalized the value at the response boundary and added a regression test.
- Offline replay idempotency is documented for business-data mutations. Auth lifecycle calls and browser-only owner device administration are explicitly not offline-queue operations and remain outside this idempotency contract.
- No schema or finance-rule changes were made. Formal YAML parser validation, minimum-version runtime tests, hosting, off-site backup, and accountant-dependent rules remain unverified or waiting.

### Commit hash(es)
- Step 7 implementation and this entry are prepared for commit; exact hash will be recorded in the immediately following addendum entry.

### Next step
- Commit Step 7, then perform final release acceptance: secrets scan, safe `erp_scratch` backup/restore, final route/OpenAPI and permission checks, and close/tag only if every required check passes.

## Mobile Step 7 — implementation commit hash addendum

**Date/time:** 2026-10-12 13:31 +03:00

- Step 7 implementation, tests, OpenAPI updates, and validation entry: `216204b9f52a04403109195bc2985fe2b8ff0148` (`Complete mobile OpenAPI contract review`).
- Next step: Finish final release acceptance; do not create the release tag unless all mandatory checks pass.

## Backend v1.2 — final acceptance

**Date/time:** 2026-10-12 13:41 +03:00

### What was completed
- Completed `docs/development/BACKEND_COMPLETE.md` for backend v1.2 and added `docs/development/MOBILE_API_NOTES.md` with API decisions, limits, verification evidence, and NOT VERIFIED items.
- Fresh-installed the current schema from zero on both approved test databases and seeded the canonical role, settings, and mobile-category data.
- Completed local `erp_scratch` backup/restore drills for both engines; both drills restored the same 52 base tables and matched schema/data fingerprints.

### Commands and actual results
- `artisan migrate:fresh --seed --force --database=mysql_test`: **13 migrations and 3 seeders passed** on MySQL 8.4.3 `erp_test`.
- Same fresh install command with `--database=mariadb_test`: **13 migrations and 3 seeders passed** on MariaDB 13.0.2 `erp_test`.
- Full `artisan test` rerun after fresh install: MySQL **111 passed, 1704 assertions**; MariaDB **111 passed, 1704 assertions**.
- `scripts/run-phase1-constraints.php mysql_test` and `mariadb_test`: **21 passed, 0 failed** per engine. Pass/fail behavior matched; only native diagnostic wording differed.
- Route/OpenAPI text comparison: **135/135 registered operations documented**, 0 missing, 0 extra; mobile operations **29/29**. Dedicated route-auth audit: **1 passed, 461 assertions** on each engine, with no permission gaps.
- Mobile combined-flow test included in both full-suite runs: **1 passed, 22 assertions** per engine.
- Targeted high-confidence credential-pattern scan across backend and completion/progress documentation found one pattern match in an existing authentication test: a deliberately short password-policy fixture, manually reviewed and not a credential. No private-key, common API-token, AWS-key, credential-bearing database URL, or actual secret was identified. `gitleaks` and `trufflehog` were unavailable; arbitrary secret formats remain **NOT VERIFIED**. `backend/.env` remains git-ignored and was absent from Git status.
- Temporary local logical dump/restore check: MySQL `erp_scratch` **52 tables, schema/data fingerprint matched**; MariaDB `erp_scratch` **52 tables, schema/data fingerprint matched**. The temporary helper and successful dump files were removed. Only the named scratch and test databases were used; `system_end` was not accessed.
- PHP syntax/Pint/diff checks passed for the Step 7 code. Formal YAML/OpenAPI parser validation remains **NOT VERIFIED** because no parser was available.

### Problems, fixes, and deviations
- The first temporary backup helper invocation lacked Composer autoload; it was corrected before any database operation. A subsequent metadata-column casing issue was corrected; the generated zero-byte temporary file was removed. Both final restore drills then completed and fingerprints matched.
- The only documented scope distinction is that idempotency applies to offline-replayable business-data mutations; authentication lifecycle and browser-only owner device administration are control-plane requests, not offline queue writes.
- MySQL and MariaDB behavior matched across tests and constraints. MariaDB reports its own CHECK/FK/unique-key diagnostic text.

### Open questions / NOT VERIFIED
- No item blocks the local v1.2 API acceptance checklist. Formal OpenAPI parser validation, dedicated secret-scanner results, minimum-version runtime tests, Hostinger deployment, off-site backup/restore, and accountant-dependent journals/tax/report formulas remain NOT VERIFIED or WAITING as documented.

### Commit hash(es)
- Final documentation and this acceptance entry: `5626b66` (`Complete backend mobile API v1.2 acceptance`).
- Hash addendum: `4da43d2` (`Record backend v1.2 release commit hash`).

### Next step
- Commit this addendum and tag the final release commit `backend-v1.2`.

## Repository reorganization — layout and verification

**Date/time:** 2026-10-12 15:05 +03:00

### What changed
- Recorded the root/backend inventory and keep/move/review/ignore plan in `docs/REORG_PLAN.md` before moving files.
- Moved root database reference proposals and schema documentation to `data/schema/`; added `data/README.md`. Updated the schema artifact tests and constraint runner to the new paths.
- Moved backend architecture and operations documentation under `docs/backend/`; preserved the duplicate design snapshot under `docs/_to_review/`; moved completion notes, readiness audit, and handoffs into `docs/backend/`, `docs/project/`, and `docs/handoff/`. The append-only progress log remains under `docs/development/`.
- Replaced the root README with the project map and both-engine test instructions; added only `frontend/README.md` under the existing frontend; updated root/backend ignore rules for local environments, logs, caches, SQL dumps, scratch output, and `data/backups/`.
- No endpoint, schema, or application behavior was changed. The only PHP edits repair file paths consumed by schema tests and the constraint runner.
- Full safety copy: robocopy exit code **1** (files copied), `.git` present, source and destination each **25,910 files**. Its HEAD matches `pre-reorg-backup` (`f38ad6d`). The copy is outside the repository at `D:\system karas\_backup_pre_reorg`.

### Commands and actual results
- Required worktree check before work: `git status --short` showed only `PROJECT_STATUS_HANDOFF.md`; after the secret-pattern scan returned **NO MATCHES**, that file was committed alone as `f38ad6d`. `git status --short` was empty afterward.
- `git branch --show-current` — `master`. `git tag pre-reorg-backup` — points to `f38ad6dfebc78c7ce6034f2769f7aba5a4e2d6cd`.
- `php artisan route:list --json` and static OpenAPI path/method counting: **135 registered operations**, **135 documented**, including **29/29 mobile**.
- MySQL 8.4.3, `mysql_test` / `erp_test`: `php artisan test --colors=never` **111 passed, 1,704 assertions**; targeted route audit `--filter=route_list_shows_only_health_and_login_as_public_and_protects_all_other_routes` **1 passed, 461 assertions**; `php scripts\run-phase1-constraints.php mysql_test` **21 passed, 0 failed**.
- MariaDB 13.0.2, `mariadb_test` / `erp_test`: the same full suite **111 passed, 1,704 assertions**; targeted route audit **1 passed, 461 assertions**; `php scripts\run-phase1-constraints.php mariadb_test` **21 passed, 0 failed**.
- Markdown local-link check over current `docs/` and `data/` docs (excluding preserved duplicate snapshot and append-only historical log): **0 broken links**.
- `git check-ignore` confirmed ignores for `backend/.env`, `vendor`, `node_modules`, backend logs/backups, SQL dump examples, and scratch paths; schema-reference SQL remains trackable. `backend/.env` was not read, printed, moved, or staged.
- `git diff --check` passed. Final `git status --short` and `git diff --stat pre-reorg-backup` are **NOT VERIFIED** until the final documentation commit is made.

### Problems, fixes, deviations, and open questions
- Initial `git mv` of the backend design folder failed because its destination parent had not been created. Created the destination directory and completed the move; no source files were lost.
- The first Markdown-link scan found four stale relative paths in schema reference documents; those links were repaired and the repeated check found zero broken links.
- Two initial PowerShell counting attempts had a regex/JSON-shape error; corrected the count script. The final route/OpenAPI counts above are from the successful run.
- Existing `.env`, vendor files, runtime logs, and three local SQL backup archives remain in backend storage and are ignored; they were not moved to `data/`. `system_end` and `erp_scratch` were not accessed. The permitted suites targeted only `erp_test`.
- Historical link text in this append-only log was not rewritten; this entry records current paths. The archived duplicate design snapshot was intentionally preserved without editing. No `mobile/` directory existed in the checkout, so none was created or inspected.
- No open business decision. This task did not create a release tag; the pre-existing backend release tag was left unchanged.

### Commit hash(es)
- `f38ad6d` handoff; `3261ec0` inventory/plan; `0735fc7` schema references; `5ca4488` documentation moves; `b4d70a2` root layout; `82aa575` PHP test prerequisite.
- Final acceptance record commit: pending; its hash will be recorded in a following addendum.

### Next step
- Commit this append-only entry and five-line handoff, verify the final status and rename statistics, then report the final commit hash without creating a release tag.

## Repository reorganization — final closeout

**Date/time:** 2026-10-12 15:10 +03:00

### Final verification results
- Commit `f23767f` recorded the reorganization acceptance entry and updated handoff.
- Immediately after that commit, `git status --short` was empty (**clean**) and `git diff --check` passed.
- `git diff --name-status --find-renames pre-reorg-backup`: **75 renames, 6 modified, 3 added, 0 deleted**. `git diff --stat --find-renames pre-reorg-backup`: **84 files changed, 307 insertions(+), 102 deletions(-)**. The modifications are README/layout guidance, path repairs, and documentation/handoff updates; no functional code or schema behavior changed.
- `pre-reorg-backup` and the external backup HEAD both remain `f38ad6dfebc78c7ce6034f2769f7aba5a4e2d6cd`; branch is `master`. No release tag was created.

### Commit hash(es)
- Final acceptance record: `f23767f`; earlier logical commits are listed in the HANDOFF above.

### Next step
- Handoff to the owner; no additional repository reorganization work is pending.

## Part B - Android mobile API coverage audit

**Date/time:** 2026-10-12 17:00 +03:00

### What changed
- Added forward migrations `2026_10_12_000012_share_mobile_source_definitions.php` and `2026_10_12_000013_allow_ambiguous_mobile_message_type.php`. The schema now has shared source defaults, per-device source settings in `mobile_device_sources`, and the `ambiguous` message type. Existing sources are backfilled to their creator device, with global sync events for existing definitions.
- Updated mobile source administration and synchronization so definitions/keywords are shared, device opt-in and direction switches are local, and shared-definition deltas reach every authorized device.
- Updated message ingestion to normalize numeric/name senders, classify by both keyword sets, reject no-match/empty-keyword messages without persistence, return the server-classified type, and audit cross-user/device duplicates without raw text.
- Removed the ten-device cap from mobile login/configuration. No API route was added.
- Updated `backend/docs/openapi.yaml`, `docs/backend/MOBILE_API_NOTES.md`, and added `docs/backend/MOBILE_SPEC_GAP_REPORT.md`; removed the obsolete cap from `.env.example`.
- Added/updated coverage for 60-channel list/sync query counts, 10 owners x 2 devices registering, more than 10 devices for one owner, cross-user/device duplicates, sibling-device revocation, source settings shared through sync, sender formats, keyword overlap/no-match, and schema migration state.

### Commands run and results
- PHP 8.3.33 Pint format/check and `php -l` on all 11 changed PHP files: **passed**.
- Focused mobile suite, MySQL 8.4.3 `mysql_test` / `erp_test`: **18 passed, 471 assertions**.
- Focused mobile suite, MariaDB 13.0.2 `mariadb_test` / `erp_test`: **18 passed, 471 assertions**.
- `php artisan migrate --database=mysql_test --force` and `--database=mariadb_test --force`: migrations 000012 and 000013 applied successfully on their respective `erp_test` databases.
- Full suite, MySQL `erp_test`: `php artisan test` **115 passed, 1,947 assertions**.
- Full suite, MariaDB `erp_test`: `php artisan test` **115 passed, 1,947 assertions**.
- Constraint suite, MySQL `erp_test`: `php scripts\run-phase1-constraints.php mysql_test` **21 passed, 0 failed**.
- Constraint suite, MariaDB `erp_test`: `php scripts\run-phase1-constraints.php mariadb_test` **21 passed, 0 failed**.
- Route-permission audit on each engine: `php artisan test --filter=route_list_shows_only_health_and_login_as_public_and_protects_all_other_routes` **1 passed, 461 assertions** on each.
- Full `php artisan route:list --json` on each engine: **133 route rows**; API method/path operations **135**, mobile **29**. Static OpenAPI comparison on each: **135 registered / 135 documented, 0 missing, 0 extra**.
- `git diff --check`: **passed**. `git check-ignore backend\.env`: confirmed ignored; `.env` contents were not read or logged.
- Formal YAML/OpenAPI schema parser: **NOT VERIFIED** (no parser installed). Fresh database rebuild from zero after migrations 000012/000013: **NOT VERIFIED**.
- The first MySQL focused run preceded migration application and had expected missing-column failures; the first MariaDB run exposed the enum-driver difference, both fixed before the passing runs. An initial unsupported `--no-interaction` test flag and a temporary test-string parse error were corrected.

### Problems, fixes, and engine comparison
- Migration loading initially raised PHP's warning for an ineffective global `RuntimeException` import; removed the import and migration 000012 applied successfully. MariaDB's Laravel driver reports `mariadb`, so migration 000012's MySQL-only enum alteration did not add `ambiguous`. Added forward migration 000013, which checks the column type and safely alters either MySQL or MariaDB; both engines now pass the same message tests.
- Removed the old device cap and its environment/config response path. The 11-device test disables only request throttling to test capacity independently of abuse controls.
- An initial device-admin assertion assumed result order; changed it to assert the device record independent of ordering.
- Both engines have identical full/focused test counts and behavior. Constraint checks all pass; MariaDB emits its native CHECK/FK/unique error wording, while MySQL did not print those caught errors in this run.
- No earlier schema version was edited. No database other than `erp_test` was accessed for this phase, and no secrets were read.

### Deviations
- Added migration 000013 instead of changing the already-applied 000012 migration, preserving the forward-only migration rule and supporting both MySQL and MariaDB driver names.
- OpenAPI operation count is unchanged; only contract descriptions, source fields, and message semantics/response typing changed.
- Part C was skipped because Part A found an Expo/React Native project; it is unrelated to the ERP companion, and the user required Part C only if no app was found.

### Open questions
- None requiring a decision to complete this audit. The frontend must adopt shared source definitions/device-local switches, optional client message type, and returned `ambiguous` type. Formal OpenAPI schema validation remains unverified.

### Commit hash(es)
- Pending: this entry is included in the upcoming Part B commit. The resulting hash will be recorded in the handoff follow-up.

### Next step
- Commit the verified Part B changes and this log entry on `master`, update the five-line handoff with the resulting hash, then report the checkpoint. Do not tag a release.

## Part B — commit hash addendum

**Date/time:** 2026-10-12 17:04 +03:00

- **What was built:** The Part B API, schema, contract, regression-test, gap-report, and handoff changes described in the preceding entry are committed.
- **Commands and results:** `git rev-parse HEAD` returned `461347a24a8c38490d941c20214c61d235479284`; `git status --short` returned no entries. The prior Part B entry contains the executed test results; tests were not rerun for this hash-only addendum.
- **Problems:** No new failures. Formal OpenAPI parser validation and fresh-from-zero database rebuild remain NOT VERIFIED as recorded above.
- **Deviations:** No additional deviation; Part C remains skipped because Part A found an existing app project.
- **Open questions:** No decision is required to close this checkpoint. The frontend must adopt the shared-source/device-local-switch and server-classified-message contract.
- **Commit hash(es):** `461347a24a8c38490d941c20214c61d235479284`.
- **Next step:** Handoff to the owner; do not start Part C unless a later request changes scope.

## Android companion — specification phases 1 and 2

**Date/time:** 2026-10-12 17:48 +03:00

### What was built
- Added `mobile-application/` as a native Kotlin/Jetpack Compose Android project, with Gradle Android configuration, HTTPS-only manifest/network API client, Android Keystore-backed encrypted device-token storage, Room cache and ordered durable write outbox.
- Implemented first-launch server URL, system-account login, home account cards, account creation (channel plus source configuration), pause/resume, cursor-based `/mobile/sync`, and foreground `/mobile/ping` polling at approximately 15 seconds.
- Added unit-test source for Egyptian sender matching (`+20`, `0020`, local leading-zero formats, spaces/dashes, and case-insensitive names) and outbox retry/idempotency/sequence ordering.
- Added `mobile-application/docs/DESIGN.md`, `mobile-application/README.md`, and the required search report `docs/mobile/MOBILE_SEARCH_REPORT.md`; updated the root README folder map and this five-line handoff.
- Deleted only `D:\system karas\mobile-application\zaffa-live` after confirming its 34,793 files / 5,823 directories / 363,824,638 bytes matched the pre-existing backup. The backup and original location were not modified. No database was accessed.

### Commands actually run and results
- Initial `git status --short` was empty; branch was `master`, HEAD `1ff11f544914a475b1943d5b4030fe17589544e0`. Created `pre-mobile-app` at that clean HEAD.
- Read-only filesystem inventory: found the unrelated Expo demo and ordinary tracked Laravel/React `app` directories; no native Android manifest/Gradle project, Flutter manifest, APK, or mobile-platform path in either ERP repository's all-ref Git history.
- The requested Kotlin/Java source scan found only the new app's two `sms` source-kind labels; no Android SMS permission, receiver, or notification-listener code. Both repositories had no stashes.
- Backup/source comparison before deletion: both had **34,793 files, 5,823 directories, 363,824,638 bytes**.
- Cleanup verification: moved demo path absent; backup path present; original source path was absent and not accessed. No candidate files were found inside `system end` or `erp-frontend`.
- Toolchain probe: `java`, `javac`, `gradle`, `sdkmanager`, `adb`, and `kotlinc`: **NOT INSTALLED** on command lookup. `ANDROID_HOME` and `ANDROID_SDK_ROOT`: unset. Android SDK found at the standard local path with **Platform 37.0** and **Build Tools 36.0.0**; Platform 35, command-line tools, and platform-tools were not found.
- Android build and unit tests: **NOT VERIFIED / NOT RUN** because JDK and Gradle are absent and the configured compile platform 35 is not installed.
- Android manifest XML parse: **passed**. `git diff --check`: **passed**. Available Problems check reported no errors for the Markdown files; Kotlin diagnostics were not available through that check. Static source search found no floating-point amount types, SMS-reading permissions, notification listener, Android logging, or literal embedded server URL.
- `erp-frontend` already had `docs/frontend/FRONTEND_PROGRESS_LOG.md` modified; left it untouched. `system_end` and `erp_scratch` were not accessed.

### Problems found and disposition
- The previous run had moved an unrelated Expo demo outside the repository. Its backup matched by file count, directory count, and total bytes; only the moved copy was removed after the search report was saved.
- Build/test execution is blocked by missing JDK/Gradle and missing targeted Android SDK Platform 35. Source was written as requested; no build or test pass is claimed.
- Android API source settings are device-local in the backend, unlike the desired same-settings-on-every-device behavior. This remains open and is not silently rewritten by the client.
- An initial backup-count PowerShell pipeline had a parser error; a corrected count script verified matching source/backup inventory before deletion.

### Deviations
- The API requires `source_kind` (`sms` or `notification`) although the supplied form does not specify it for every account type. Wallets use the explicitly specified SMS source, Post Office has no reader, and other account types show a required explicit source choice. No source-kind inference is made.
- High-risk channel creation requires server password step-up. Offline account commands remain queued without storing the password and require re-entry when online.
- Only phases 1 and 2 were implemented. SMS/notification capture and specification phases 3–8 were not built.

### Open questions
- Should device-local capture switches become synchronized/shared, as the owner specification requests?
- Are both capture switches-off defaults acceptable?
- Should the backend-required source-kind choice be included in the account form for bank, InstaPay, and other channels?
- Is the offline step-up/re-entry behavior acceptable for queued account creation?
- Should deployments with a nonstandard API path be supported, and should the API base URL remain limited to the OpenAPI `/api/v1` path?

### Commit hash(es)
- Implementation commit hash addendum follows below.

### Next step
- Handoff to the owner for open contract decisions; do not implement phases 3–8 or create a release tag.

## Android companion — implementation commit hash addendum

**Date/time:** 2026-10-12 17:50 +03:00

- **What was built:** The mobile search report, Android design/project source for phases 1 and 2, root folder-map update, and handoff are committed.
- **Commands and results:** `git rev-parse HEAD` returned `5f894400df2054acbecd25ec50bbd0b62fb18ca3`; `git status --short` returned no entries. The preceding phase record lists the actual validation output. Build/tests were not rerun; they remain NOT VERIFIED.
- **Problems:** No new failures. Android build/unit tests remain NOT VERIFIED because JDK/Gradle are absent and Android SDK Platform 35 is unavailable.
- **Deviations:** No change from the preceding phase record; only phases 1 and 2 were implemented.
- **Open questions:** Capture-switch sharing/defaults, source-kind UI for non-wallet channels, offline step-up prompt, and nonstandard API paths remain owner questions.
- **Commit hash(es):** `5f894400df2054acbecd25ec50bbd0b62fb18ca3`.
- **Next step:** Wait for owner review of the open questions before changing those behaviors. No database was accessed and no release tag was created.

## Frontend Figma Phase 1 — measured tokens and shared shell

**Date/time:** 2026-10-13 05:55 +03:00

### What was built
- Measured page-4 raster colors and shell geometry; added `docs/frontend/FIGMA_TOKENS.md`.
- Updated `frontend/src/styles/design-tokens.css` and shared shell styles for the 196px sidebar, compact navigation, and accessible text contrast.
- Updated `frontend/src/app/layouts/AppShell.tsx` and Arabic accessibility label; dashboard and audit routes now appear as existing-route shortcuts below the top bar.
- Updated `docs/frontend/FIGMA_PARITY_REPORT.md` and `docs/frontend/FIGMA_PROGRESS.md`. Page 4 is DIFFERENT at screen level: shell geometry matches, dashboard body does not.

### Commands and actual results
- `npm run typecheck` — PASS, exit 0.
- `npm run lint` — PASS, exit 0.
- `npm test` — first run after the final shared-component edits: 1 failed, 73 passed; `finance-reports.test.tsx` could not find heading `حسابات الخزينة`. Immediate full-suite rerun: 22 files; **74 passed, 0 failed**. Failure did not reproduce, per the project test rule.
- `npm run build` — PASS; Vite production build succeeded; external-URL check scanned 67 files, no unapproved URL literals.
- Initial `npm run a11y` — failed because the configured Playwright Chromium executable was absent. Retried with installed Microsoft Edge via `PLAYWRIGHT_CHROMIUM_EXECUTABLE`; **34 views, 0 axe violations**. No browser was downloaded or installed.
- Browser comparison: Figma page 4 and live MSW `/dashboard` captured at 1440 × 1258; measured shell 196px / 52px / 37px. Responsive overflow checks at 1440, 1100, 768, and 600px all had document width equal to viewport width. Integrated dark/light axe spot checks: 0 violations.
- `git diff --check` — PASS. Database: NOT ACCESSED.

### Problems, fixes, deviations, and open questions
- Baseline axe on the dashboard found 18 color-contrast failures, including 2.75:1 white-on-blue and 3.54:1 dim text. Dark-theme text-on-accent is now `#111415` (6.72:1); dim-text tokens were increased. Full axe rerun passed across 34 views.
- First final full-suite run had one `finance-reports.test.tsx` heading lookup failure; immediate rerun passed 74/74, so the failure did not reproduce. No test fix was made; it remains subject to the established flaky-run rule.
- No Figma mobile/tablet frames exist. Existing 1100/768/600px behavior is retained; visual parity at those widths is NOT VERIFIED.
- Exact font family, type scale, and same-content modal/toast/dropdown/notification-panel visual states are NOT VERIFIED. Page 152 button/input and page 169 modal dimensions/surface were measured and applied.
- The reference shortcut destinations for control center, deleted items, and shipping-company drivers have no matching routes; they were not invented. Existing dashboard and audit routes only are shown.
- MSW remains enabled; no live API work, backend/mobile edits, or database access occurred.

### Commit hash(es)
- Implementation and this phase record are prepared for commit; hash addendum will follow.

### Next step
- Part 2: begin the screens on PDF pages 1–15 in order, keeping MSW and recording per-screen comparisons. Resolve missing shortcut/API questions before implementing those destinations.

## Frontend Figma Part 1 — commit hash addendum

**Date/time:** 2026-10-13 05:55 +03:00

- **Commit hash:** `5263b9bb1924a5f81942788acb227514facfce68` — measured Figma tokens and updated shared shell, button/input/modal dimensions, contrast, and parity documentation.
- `git status --short` after the implementation commit showed only the supplied untracked `Untitled (3).pdf`; it was not staged or modified.
- **Next step:** Continue with Part 2 screens in PDF order, keeping MSW enabled and recording comparisons.

## Frontend Figma Part 2A — pages 1–8

**Date/time:** 2026-10-13 10:57 +03:00

### What was built
- Updated `frontend/src/features/sales/InvoiceFormPage.tsx`, `frontend/src/features/orders/OrdersPage.tsx`, `frontend/src/features/orders/OrderFormPage.tsx`, and `frontend/src/features/orders/OrderDetailPage.tsx` to align available UI with PDF pages 1–8 while keeping MSW as the runtime source.
- Updated `frontend/src/shared/components/DataTable.tsx`, `frontend/src/shared/i18n/ar.ts`, and `frontend/src/styles/global.css` for single-message empty tables, order filter/form/detail presentation, and detail tabs.
- Updated `frontend/tests/integration/orders-deliveries.test.tsx` to cover the reservations, deliveries, and invoices tabs.
- Updated `docs/frontend/FIGMA_PARITY_REPORT.md` with the page 1–8 results, status counts, and API gaps; updated `docs/frontend/FIGMA_PROGRESS.md` to record the Part 2A boundary and next group.
- No database tables, API endpoints, backend files, or mobile files were changed.

### Commands and actual results
- `npm ls --depth=0` — PASS, exit 0; declared frontend packages are installed.
- `npm run typecheck` — PASS, exit 0.
- `npm run lint` — first run found an unused `FormEvent` import; it was removed. Final run — PASS, exit 0.
- `npm test` — first run after empty-table rendering changes: 1 failed / 73 passed because the empty message rendered twice. The duplicate mobile message was removed. Rerun: 22 files and 74/74 passed. A later full run had a non-reproducing finance-report heading timeout (1 failed / 73 passed); the immediate full-suite rerun passed 22 files and 74/74, as required by the project rule.
- `npm run build` — PASS; Vite transformed 173 modules, and the external-URL check scanned 67 files with no unapproved URL literals.
- `npm run a11y` with the installed Microsoft Edge executable — PASS; 34 views, 0 axe violations. Dashboard width checks: 390px viewport/document and 768px viewport/document. `/orders/:orderId` is not included in this scanner and its axe result is NOT VERIFIED.
- Browser screenshots at 1440px viewport width compared against pages 1, 3, 5, 6, 7, and 8; all six differ. Pages 3 and 7 are taller than the 1000px browser viewport, so their remaining full-page vertical content is NOT VERIFIED. Page 4 remains DIFFERENT from Part 1.
- `git diff --check` — PASS after all source/documentation changes. MySQL, MariaDB, and any other database engines — NOT RUN; database was not accessed.

### Problems, fixes, deviations, and open questions
- Fixed duplicate empty-state text by retaining one status message in the empty table row; on mobile the empty table itself remains horizontally scrollable.
- Removed the obsolete cancellation-unavailable hint after confirming `POST /orders/{orderId}/cancel` exists in the read-only OpenAPI contract.
- Initial screenshot and implementation differences are retained where the contract lacks data; no unsupported fields or operations were invented. The owner-approved username/password login remains despite the phone-only reference.
- Page 2's invalid-credential view could not be produced because default MSW accepts non-empty credentials. Reference/API gaps for pages 3, 5, 6, 7, and 8 are documented in `docs/frontend/FIGMA_PARITY_REPORT.md`.
- No deviation from the frontend-only, mock-only scope. The only test instability was a non-reproducing full-suite finance heading timeout; the rerun passed.
- Open questions: whether to use a test-only MSW rejection override for page 2; whether the invoice/customer/order fields and aggregates missing from existing contracts are intended for future backend work; which reference order-list bulk/export controls are supported; whether page 8 tracking/contract/financial details belong in the order API.

### Commit and next step
- Commit hash: pending at this pre-commit progress entry; record the actual hash in an append-only addendum after commit.
- Next: Part 2B, pages 9–15. Continue only with existing contract behavior; keep unsupported states listed as open questions.

## Frontend Figma Part 2A — commit hash addendum

**Date/time:** 2026-10-13 11:02 +03:00

- **Commit hash:** `b3f36e28248944d67522a4200ec1ec4397ba6f38` — Part 2A pages 1–8 implementation, verification, and phase documentation.
- **What was built:** No additional code or files; records the commit for the Part 2A work above.
- **Commands and actual results:** `git status --short` after commit showed only the supplied untracked `Untitled (3).pdf`; the PDF was not staged. `git diff --check` passed before the commit. MySQL/MariaDB and any other database engines — NOT RUN.
- **Problems:** No new problems. Existing parity differences and NOT VERIFIED items remain as listed above.
- **Deviations:** None.
- **Open questions:** Unchanged; see the Part 2A entry above and `docs/frontend/FIGMA_PARITY_REPORT.md`.
- **Next step:** Begin Part 2B, pages 9–15, only after this completed part is recorded.
