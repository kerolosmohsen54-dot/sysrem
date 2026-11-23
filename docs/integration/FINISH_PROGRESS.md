# ERP finish progress

Continuation run: 2026-10-15 (Africa/Cairo)

## Status against the eight finish criteria

| # | Required result | Status | Current evidence |
|---:|---|---|---|
| 1 | Backend runs on PHP 8.3+ and the full PHPUnit suite passes on MySQL and MariaDB against `erp_test`. | PASS | PHP 8.3.33 / Composer 2.10.2. Both engines: 188 tests, 2,641 assertions, zero failures, errors, or skips. XML: `../evidence/backend/session2-mysql-erp-test.xml`, `../evidence/backend/session2-mariadb-erp-test.xml`. |
| 2 | Migrations are applied and verified on `erp_test` and `erp_scratch`; no pending migrations. | PASS | Status checked via `mysql_test` and `mariadb_test` on `erp_test`, and `mysql` on `erp_scratch`; all migrations show Ran. The pending read-only mobile grant migration was applied forward to both test engines. `../evidence/migrate-status-session2.txt`. |
| 3 | Laravel routes match `backend/docs/openapi.yaml`; both OpenAPI YAML files parse. | PASS | Route list 176 rows / 180 API operations; OpenAPI 180 operations; 180 matched, 0 missing, 0 orphan. Symfony YAML parse: v1 129 paths / 180 operations / 78 schemas; v2 110 paths / 151 operations / 41 schemas. `../evidence/route-openapi-diff-session2.txt`. |
| 4 | All listed frontend checks pass. | PASS | Typecheck, lint, Vitest 43 files / 174 tests, build, API contract 103 unique calls / 0 missing, axe 51 views / 0 violations. Axe used Edge 155.0.4283.45 because pinned Chromium was absent. |
| 5 | Every core and operational live web flow is performed in a browser against the live API, reloaded, and DB checked after writes. | INCOMPLETE | Live browser tally: 8 core PASS, 1 FIXED-AND-PASS (linked return), 0 FAIL, 0 BLOCKED; 10 operational PASS, 0 FAIL, 5 BLOCKED. Core evidence includes return POST 201/reloaded GET 200 and verified source line; expense POST 201 and reloaded row; read-only invoice GET 200 and visible create denial. Ten operations have completed live write/reload/DB checks. Remaining: empty recycle-bin restore; container-funds selector did not expose the new test container; treasury inbox/withdrawal/movement persistence is unverified. The temporary credentials file is missing and the account setup script refuses to overwrite existing accounts, so no further authenticated session was attempted. `../integration/LIVE_WEB_VERIFICATION.md`. |
| 6 | APK builds/installs on Pixel_9_Pro emulator; owner login and all 14 mobile flows pass with server checks. | INCOMPLETE | APK built and installed; owner login/channel load, E2E channel create/pause/resume and read-only login plus API 403 denial were verified; the logout substep passed, but its combined PIN-lock flow remains incomplete. Android 17 `ACCESS_LOCAL_NETWORK` prompt appeared and was granted; the app then reached `10.0.2.2:8000`. Remaining SMS, notification, withdrawal, manual deposit, offline replay, PIN lock, and web linkage flows remain unrun. `../mobile/E2E_ANDROID_REPORT.md`. |
| 7 | Each fix and documentation change is committed as a logical Git commit. | PASS for this continuation | Source fixes are committed individually; final verification reports and evidence are committed together as one closeout documentation commit. Existing unrelated working-tree changes from before this continuation remain outside the changes recorded here. |
| 8 | Final report says COMPLETE only if all prior criteria pass, otherwise lists exact blockers. | PASS | `FINAL_SYSTEM_REPORT.md` records INCOMPLETE and lists remaining live web and mobile work. |

## Current execution details

- Live API: `127.0.0.1:8000`, process-only settings target `erp_scratch`; `GET /api/v1/health` returned `ok`. The browser is Edge/Playwright with live mode enabled. The owner dashboard loaded and its 428 step-up was reauthenticated successfully.
- Test accounts: `manual_owner` and `manual_readonly` were found active with owner/read-only roles on `erp_scratch`. Credential values remained in `%TEMP%\test-accounts.local.txt` and were not printed.
- API auth status-only check: mobile owner login 201/logout 200; mobile read-only login 201, prefixed write denial 403, logout 200.
- Emulator: Pixel_9_Pro API 37 x86_64 (`emulator-5554`). APK SHA-256 `998F7049F174FB0BD93E5DA0A2D1BD2395141000674609E23E5D1F1D85B6C122`. Channel id 2, `E2E-TEST-Android-Channel`, was DB-checked after create (`paused=0`), pause (`paused=1`), and resume (`paused=0`). Screenshots are in `../evidence/android-session2-*.png`.
- Tool versions: `../evidence/toolchain.txt`; command/result ledger: `../evidence/finish-command-log-session2.md`.
- Starting and final Git snapshots: `../evidence/finish-start-status-session2.txt`, `../evidence/finish-start-log-session2.txt`, `../evidence/finish-final-status-session2.txt`, and `../evidence/finish-final-log-session2.txt`.

## NOT IN SCOPE

Budgets, recurring expenses, month-over-month comparison, cash forecast, daily summary, Excel import, chart of accounts, financial adjustments, currency persistence, and iOS runtime.

## OPEN QUESTIONS / BLOCKERS

1. `%TEMP%\test-accounts.local.txt` is missing. The permitted setup script refuses to overwrite existing acceptance users and has no credential recovery mode; no password reset was attempted.
2. Operational: recycle bin has no deleted row to restore; container-funds selector did not expose the created E2E container; treasury inbox/withdrawals/movements persistence checks remain unverified.
3. Ten mobile entries remain unverified: SMS deposit/duplicate/unknown/ambiguous, withdrawal validation/retry, allowed/unlisted notifications, postal deposit, offline replay, PIN timeout, and web linkage. The Android local-network permission is required on this API 37 emulator and has been granted.

## Latest results

See `FINAL_SYSTEM_REPORT.md` for per-step counts and disposition. Overall project status remains **INCOMPLETE** until the live web and remaining device flows are run and verified.
