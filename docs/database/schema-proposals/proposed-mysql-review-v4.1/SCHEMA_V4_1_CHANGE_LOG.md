# Proposed MySQL/MariaDB Schema v4.1 Change Log

**Status:** Approved by the owner on 2026-10-10 as the Phase 2 migration baseline.
**Base:** `../proposed-mysql-review-v4/precision_slate_proposed_mysql_v4.sql`.  
**Target:** MySQL 8.0.16+ and MariaDB 10.6+.  
**Decision scope:** Portability fixes only; owner decisions OD-1..OD-20 and unresolved decisions are not changed.

## Changes from v4

1. Replaced every table-default `utf8mb4_0900_ai_ci` collation with `utf8mb4_unicode_ci`, as required for MariaDB portability while retaining utf8mb4 Arabic text support.
2. Replaced the six native `JSON` column types with `LONGTEXT`: `app_settings.setting_value`, `idempotency_records.response_body`, and `audit_logs.old_value`, `new_value`, `before_data`, and `after_data`. Column comments identify JSON-encoded text and require application validation. SQL must not rely on MySQL JSON validation, MariaDB's JSON alias behavior, or engine-specific JSON functions.
3. Updated the DDL header and explanatory comments to state the portable target and remaining validation boundary.

No tables or business columns were added or removed. The proposal retains 47 `CREATE TABLE` statements and 3 post-creation `ALTER TABLE` statements. Keys, checks, foreign keys, enum vocabularies, precision, workflows, and service-level rules otherwise remain as proposed in v4.

## Feature compatibility inventory

The SQL uses only the following cross-engine features. The MySQL floor is 8.0.16 overall so declared CHECK constraints are enforced; the MariaDB floor is the owner's required 10.6, which includes its enforced CHECK support.

| Feature used | Minimum MySQL version | Minimum MariaDB version | Scope / note |
|---|---:|---:|---|
| InnoDB transactions, row locks, foreign keys and referential actions (`RESTRICT`, `SET NULL`) | 8.0 | 10.6 | Transactional posting, locking and relationship integrity. |
| Primary, unique and composite indexes; composite foreign-key mappings | 8.0 | 10.6 | Includes unique source-once and revision-successor keys. |
| `BIGINT UNSIGNED` / `INT UNSIGNED` auto-increment and identifiers | 8.0 | 10.6 | Candidate identifier type only; identifier policy remains open. |
| `DECIMAL`, integer types, `BOOLEAN`, `ENUM`, `BINARY`, `VARBINARY`, `TEXT`, `LONGTEXT`, `DATE`, `DATETIME`, `TIMESTAMP` | 8.0 | 10.6 | Portable built-in types; `BOOLEAN` is an integer alias in these engines. |
| `utf8mb4` character set and `utf8mb4_unicode_ci` collation | 8.0 | 10.6 | UTF-8 text and Arabic storage/comparison. |
| `CURRENT_TIMESTAMP` defaults and `ON UPDATE CURRENT_TIMESTAMP` | 8.0 | 10.6 | Created/updated timestamps. |
| Enforced `CHECK` constraints | 8.0.16 | 10.2.1 | SQL deliberately targets MySQL 8.0.16+; MySQL before 8.0.16 must not be treated as enforcing these checks. |
| Basic scalar expressions/functions: comparison, boolean operators, `IS NULL`, `TRIM`, `CHAR_LENGTH`, `CAST(... AS SIGNED)` | 8.0 | 10.6 | Used by declared CHECK expressions; no engine-specific JSON functions. |
| Constraint-test harness: transactions, temporary tables, stored procedures, exception handlers and prepared statements | 8.0 | 10.6 | Test-only constructs; the suite ran successfully on MySQL 8.4.3. It requires routine-creation permission in the selected scratch schema. |

No generated columns, expression indexes, triggers, stored procedures, native JSON operations, MySQL 8.4-only syntax, or MariaDB features newer than 10.6 are introduced by this revision. DDL execution is still required on both target engines to establish actual compatibility.

## Validation status

- Static comparison and count: 47 tables and 3 alters inherited from v4. This is a source inventory, not evidence the DDL executes.
- MySQL Community Server 8.4.3, port 3306: `erp_scratch` and `erp_test` were created/confirmed (no other database was used); the v4.1 DDL executed successfully in `erp_scratch`, creating all 47 tables and completing all 3 alters.
- MySQL constraint test script: **17/17 passed, 0 failed** in `erp_scratch`, covering container-line container/product matching, exactly-one delivery source (both invalid combinations rejected and valid single sources accepted), nonnegative on-hand CHECK, duplicate customer phone, inventory source-once, posting-effect-once, unique document number, FK RESTRICT and SET NULL behavior, invoice revision shape/link/single-successor constraints, later partial receipt acceptance, and an Arabic utf8mb4 round trip.
- Post-run inspection found 47 tables, 46 declared checks, one distinct table collation, and no retained test procedure. Test fixtures were rolled back; follow-up queries returned 0 residual `P1-*` customer fixtures and 0 test stored procedures.
- MySQL constraint behavior above was confirmed on MySQL 8.4.3; the MySQL minimum supported version was not tested.
- MariaDB 13.0.2, port 3307: the v4.1 DDL executed successfully in `erp_scratch`; inspection found 47 base tables, 46 CHECK constraints, and one portable schema collation. `erp_test` remained empty.
- MariaDB constraint test script: **17/17 passed, 0 failed** in `erp_scratch`. All acceptance/rejection outcomes matched MySQL 8.4.3. Error-message wording varies by engine; tests verify behavior rather than exact diagnostic text. Post-run inspection found no retained test procedure or residual `P1-*` customer fixture.
- MariaDB 10.6 minimum behavior remains **NOT VERIFIED**; the available test server was MariaDB 13.0.2. No MariaDB-specific incompatibility was found, and no DDL alteration was required.
- Validation alone did not settle any item in `SCHEMA_V4_OPEN_DECISIONS.md`; the owner's separate schema approval is recorded below.

## MariaDB validation addendum — 2026-10-10

- The validated target databases were only `erp_scratch` and `erp_test`; no `system_end` database was accessed.
- DDL and the shared Phase 1 test suite both completed on MariaDB 13.0.2. The test client returned exit code 0, 17 named assertions reported `PASS`, and `failed_tests` returned 0.
- The first wrapper attempts were inconclusive due to PowerShell native-stderr handling and an overly strict output parser. The corrected run captured the client exit code, all test rows, and the zero-failure result. These wrapper issues did not require any schema change.
- Comparison with MySQL 8.4.3: no tested functional/constraint behavior difference; only engine-specific diagnostic phrasing differs on expected constraint violations.
- The portable feature/version inventory above remains unchanged. Testing MariaDB 10.6 itself is still outstanding. At the time of this validation addendum, the schema had not yet received owner approval; approval is recorded in the later section below.

## Owner schema approval — 2026-10-10

- The owner explicitly approved v4.1 as the schema baseline for Phase 2 Laravel migrations after reviewing both-engine validation results.
- Approval changes the authorization/status only; no schema definitions, constraints, values, or behaviors were changed in this approval entry.
- MariaDB 10.6 minimum behavior remains unverified; validation was performed on MariaDB 13.0.2 and MySQL 8.4.3.
