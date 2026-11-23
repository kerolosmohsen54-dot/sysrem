# Proposed MySQL/MariaDB Schema v4.2 Change Log

**Status:** Owner-approved on 2026-10-10 as the migration baseline; production deployment still requires environment validation.
**Base:** Owner-approved v4.1 schema.
**Target:** MySQL 8.0.16+ and MariaDB 10.6+.
**Decision scope:** Add an explicit marker for administrator-confirmed email ownership. All other v4.1 decisions and unresolved items remain unchanged.

## Changes from v4.1

1. Added nullable `users.email_verified_at DATETIME`. A non-NULL value records that an administrator confirmed ownership of the current email address. `NULL` means the address is not verified and is not eligible for account recovery.
2. Added `chk_users_email_verification_requires_email`, which prevents marking a user verified when no email address is present.
3. The application must set the marker only after administrator confirmation and clear it whenever the email address changes. These workflow rules are not fully expressible with this portable schema and are not enforced by a trigger.
4. Updated proposal version/header metadata and added focused positive and negative cases to the copied constraint suite.

No earlier schema version was edited. This proposal does not authorize a migration, password-reset endpoint, reset delivery, or changing the login identifier; username-only login remains unchanged. Until this proposal is reviewed and approved, resets remain out of band under v4.1.

## Feature compatibility inventory

The v4.1 feature inventory is inherited unchanged except for the additions below.

| Feature used | Minimum MySQL version | Minimum MariaDB version | Scope / note |
|---|---:|---:|---|
| `DATETIME` nullable column | 8.0 | 10.6 | Stores the administrator-confirmation timestamp; portable built-in type. |
| `CHECK` constraint on `IS NULL` | 8.0.16 | 10.2.1 | Prevents a verification timestamp without an email; MySQL before 8.0.16 does not enforce CHECK constraints. |

The complete inherited feature inventory is in `../proposed-mysql-review-v4.1/SCHEMA_V4_1_CHANGE_LOG.md`: InnoDB transactions/locks/FKs, indexes, unsigned integer identifiers, portable scalar types, `utf8mb4_unicode_ci`, timestamp defaults/update clauses, enforced checks and scalar expressions, and the stored-procedure/prepared-statement constraint-test harness. Its stated minimums are MySQL 8.0 overall (8.0.16 for enforced CHECK) and MariaDB 10.6 overall (10.2.1 for enforced CHECK). No feature newer than MariaDB 10.6 is intentionally introduced.

## Validation status

- MySQL Community Server 8.4.3, port 3306: the existing empty `erp_scratch` v4.1 schema received only the additive v4.2 `users.email_verified_at` column, column comment and CHECK constraint. The full v4.2 constraint suite reported **19/19 PASS, 0 failed**.
- MariaDB 13.0.2, port 3307: the existing empty `erp_scratch` v4.1 schema received the same additive v4.2 delta. The full v4.2 constraint suite reported **19/19 PASS, 0 failed**.
- All 19 named acceptance/rejection outcomes matched between these engines. In `observed_error`, MySQL returned `NULL` for expected rejected statements while MariaDB returned diagnostic text; this is test-output/diagnostic-detail variation, not a difference in whether the constraints accepted or rejected the statements.
- Post-run checks on both engines confirmed the marker column is nullable `DATETIME` with the documented comment, the named CHECK exists, there are no `phase1-*` user or `P1-*` customer fixtures, and the test procedure was removed.
- The full v4.2 DDL was **NOT VERIFIED as a fresh clean-schema installation**: the approved database names already contain the v4.1 schema, and replacing schemas would be destructive. The v4.1 base DDL itself was previously executed and validated on both engines; v4.2 validation applied and tested the exact added column/constraint on top of that base. No `system_end` database was used.
- MariaDB 10.6 minimum-version behavior remains **NOT VERIFIED**; the available MariaDB server is 13.0.2. MySQL 8.0.16 minimum-version behavior also remains unverified; the available MySQL server is 8.4.3.
- The owner approved v4.2 as the migration baseline on 2026-10-10. This authorizes forward-only application migration work; it does not approve editing v4.1, production use, or inferring password-reset delivery/endpoint requirements.
