# Finish-run command and result ledger

Date: 2026-10-15. Database credentials and bearer tokens are intentionally omitted. Each database operation below had its `TARGET DB` printed first and used process-only connection settings. No real `.env` was opened.

## State / toolchain

| Command or action | Result |
|---|---|
| `git status --short` | Saved initial and continuation status snapshots under `docs/evidence/finish-start-status*.txt`; working tree contained pre-existing reorganization changes. |
| `git log --oneline -10` | Saved initial and continuation history snapshots under `docs/evidence/finish-start-log*.txt`; latest relevant commits include `645fc86` and `762b470`. |
| Laragon PHP `php.exe -v` | PHP 8.3.33. |
| `composer -V` with Laragon Composer | Composer 2.10.2. |
| `composer check-platform-reqs --no-interaction` | All platform requirements satisfied under PHP 8.3.33. |
| JDK 17 `java.exe -version` | Temurin/OpenJDK 17.0.20.1. |
| `sdkmanager.bat --licenses` | Installed SDK licenses accepted. Existing SDK verified: adb 37.0.1, emulator 37.2.12, Android API 37, Build Tools 36.0.0, NDK 27.1.12297006 with `source.properties`. |
| `node --version`; `npm --version` | Node v26.8.2; npm 12.0.2. |

## Backend and databases

| Command or action | Target / result |
|---|---|
| `php artisan migrate:status --env=codex-no-env` | `erp_test` via `mysql_test`: all Ran; `erp_test` via `mariadb_test`: all Ran; `erp_scratch` via `mysql`: all Ran. Saved in `docs/evidence/migrate-status-session2.txt`. |
| `php artisan migrate --env=codex-no-env` | Printed `TARGET DB = erp_test`; applied `2026_10_15_000001_allow_read_only_mobile_viewing` forward through `mysql_test`, then through `mariadb_test`. No destructive migration ran. |
| Full `php vendor/bin/phpunit` suite | `TARGET DB = erp_test`, `DB_CONNECTION=mysql_test`: 188 tests / 2,641 assertions passed, zero failures/errors/skips. |
| Full `php vendor/bin/phpunit` suite | `TARGET DB = erp_test`, `DB_CONNECTION=mariadb_test`: 188 tests / 2,641 assertions passed, zero failures/errors/skips. XML output is under `docs/evidence/backend/session2-*.xml`. |
| `php artisan route:list --json --except-vendor --env=codex-no-env` | 176 route rows; expanded to 180 API operations. Saved JSON under `docs/evidence/laravel-route-list-session2.json`. |
| Symfony YAML parser against both OpenAPI files | v1: 129 paths / 180 operations / 78 schemas. v2: 110 paths / 151 operations / 41 schemas. Both parsed successfully; route diff 180 matched / 0 missing / 0 orphan. |
| `php scripts/acceptance-test-accounts.php inspect --host=127.0.0.1 --port=3306 --database=erp_scratch --user=root --credential-file=%TEMP%\test-accounts.local.txt` | `TARGET DB = erp_scratch`; owner and read-only roles active; `manual_owner` and `manual_readonly` active; existing_count=2. Values not printed. |
| `GET /api/v1/health` | `erp_scratch` API returned `ok`. |
| Mobile bearer login/logout HTTP check | Owner login 201, logout 200. Read-only login 201, prefixed create attempt 403, logout 200. Passwords/tokens omitted. |

## Frontend

| Command | Result |
|---|---|
| `npm run typecheck` | PASS. |
| `npm run lint` | PASS; the `URL` global lint failure was fixed with an explicit `node:url` import and committed as `645fc86`. |
| `npm test` | PASS: 43 files / 173 tests. Initial sandbox `spawn EPERM` was resolved by rerunning in the approved local execution context. |
| `npm run build` | PASS; 84 output files passed external URL scan. Initial sandbox `spawn EPERM` was resolved by rerunning in local execution context. |
| `npm run contract:check` | PASS: 103 unique method/path calls from 13 API modules; zero missing. |
| `PLAYWRIGHT_CHROMIUM_EXECUTABLE='C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe' npm run a11y` | PASS: Edge used because pinned Chromium was absent; 51 views, zero axe violations; responsive dashboard checked at 390px and 768px. |

## Live web

| Command or action | Result |
|---|---|
| Start Laravel with `php artisan serve --host=127.0.0.1 --port=8000 --env=codex-no-env` and process-only DB settings | Server started on 127.0.0.1:8000, target `erp_scratch`; health returned `ok`. |
| Start Vite with `VITE_MOCK_API=false VITE_API_TARGET=http://127.0.0.1:8000 npm run dev -- --host 127.0.0.1 --port 5173` | Vite ready at 127.0.0.1:5173. |
| `node scripts/acceptance-browser.mjs manual_owner /dashboard` | Edge/Playwright owner login passed; dashboard read first returned 428, reauthentication returned 200, dashboard retry returned 200. Screenshot `acceptance-manual_owner-dashboard.png`. |
| Prior live core flow commands and read-only SQL checks | 6 core flows passed; 3 core items remain blocked as detailed in `LIVE_WEB_VERIFICATION.md`. Operational create/update/reload/database checks remain 0/15. |

## Android

| Command or action | Result |
|---|---|
| Android Gradle `assembleDebug` with JDK 17 / Android SDK / NDK 27.1.12297006 | First attempt failed on Windows 260-character CMake path. Retried with temporary `subst R:` and short `GRADLE_USER_HOME`; build passed and mapping was removed. |
| `adb install -r mobile-app/android/app/build/outputs/apk/debug/app-debug.apk` | `Success` on Pixel_9_Pro API 37 x86_64 emulator `emulator-5554`. APK SHA-256 is in `FINAL_SYSTEM_REPORT.md`. |
| Launch app; handle Android 17 system prompt | `ACCESS_LOCAL_NETWORK` prompt appeared; tapped Allow on emulator. Subsequent app requests to `10.0.2.2:8000` loaded mobile auth/channels/sync. No manifest permission was removed. |
| Owner mobile login and channel flow | App loaded owner home; created `E2E-TEST-Android-Channel`; paused and resumed it. Read-only DB checks after each write showed id 2 `paused=0`, then `1`, then `0`. |
| Mobile logout/read-only checks | App logout returned to login. Read-only login showed no add/pause/resume controls; API write returned 403. Screenshots are `docs/evidence/android-session2-*.png`. |
| Remaining Android scenarios | SMS/notification injection, deposit/withdrawal capture, offline replay, PIN lock, and mobile-to-web linkage were not run. No real device or real message was used. |

## Fixes, reports, and commits

| Change | Result |
|---|---|
| `git commit` URL import fix | Created `645fc86 fix: declare URL in acceptance browser script`. |
| `git commit` relocated proposal artifact test paths | Created `762b470 test: resolve moved schema proposal paths`; focused artifact test passed 3/3, 12 assertions. |
| Final progress/report/mobile evidence updates | Committed as the final closeout documentation commit. |

Other startup diagnostics: initial emulator launch using the original AVD failed due to insufficient C: free space (about 1.39 GB); a project-local AVD copy ran on D:. The earlier AVD was left unchanged. JDK 25 was auto-provisioned by Gradle daemon criteria; build process used JDK 17. Full device-flow work remains incomplete, not hardware-blocked.

## Second live web pass (2026-10-15)

- Microsoft Edge + Playwright against Vite live mode and Laravel API on `erp_scratch`.
- `POST /api/v1/customers`: HTTP 201; reloaded list and SQL row checked for `E2E-TEST Customer 2`.
- `POST /api/v1/products`: HTTP 201; reloaded list and SQL row checked for `E2E-TEST-PRODUCT-2`, price `100.0000`.
- Warehouse first request: HTTP 428. A successful UI retry appeared after reload and its row was queried, but the retry status was not captured.
- `POST /api/v1/inventory/opening-stock`: HTTP 201 twice from duplicate automation submission; both E2E-prefixed rows and resulting quantity/value balance were checked afterward.
- `POST /api/v1/invoices`: HTTP 201; `POST /api/v1/invoices/1/issue`: HTTP 200. Invoice/detail and stock were checked after reload.
- Collection page step-up recovery did not yield a stable form; no new collection request was submitted. Existing previously verified collection result is retained.
- Evidence screenshots: `acceptance-session2-customer.png`, `acceptance-session2-product.png`, `acceptance-session2-warehouse.png`, `acceptance-session2-opening-stock.png`, `acceptance-session2-invoice-draft.png`, `acceptance-session2-invoice-issued.png`.
- Database target for all read-only row checks in this pass: `erp_scratch`. No deletes were performed.

## Linked return route fix and live result (2026-10-15)

- The Edge page revealed `/returns/new` was routed to a separate linked-mode form that never selected/fetched a source invoice and disabled save. Routed it to the existing linked-capable invoice form and added a regression test asserting `original_document_id` and `original_document_line_id` are sent.
- `npm run typecheck`: passed. `npx vitest run tests/integration/invoice-form.test.tsx`: 1 file / 3 tests passed.
- Edge live browser: source invoice detail GET 200; linked return POST 201; reloaded returns list GET 200 and displayed the document number.
- `TARGET DB = erp_scratch`; read-only SQL using Laragon PHP 8.3.33 PDO confirmed `sales_documents` id 2 was a posted credit_note linked to original document id 1, and `sales_document_lines` id 2 referenced original line id 1, quantity 1. No deletes or other database writes were made by the query.
- Return evidence screenshots: `acceptance-session2-linked-return.png` and `acceptance-session2-linked-return-reloaded.png`.

## Final frontend rerun after linked-return route fix

- `npm run typecheck`: exit 0.
- `npm run lint`: exit 0.
- `npm run build`: exit 0; 83 production files checked for external URL literals.
- `npm run contract:check`: exit 0; 103 unique API calls / 0 missing.
- `npm test`: isolated run exit 0; 43 files / 174 tests passed. An earlier run concurrent with lint/build had one unrelated admin navigation assertion fail (173 pass / 1 fail); the test passed alone and the isolated full rerun passed it.
- `npm run a11y`: default Chromium attempt could not launch because the pinned headless executable was absent. Reran with process-only `PLAYWRIGHT_CHROMIUM_EXECUTABLE` pointing to installed Microsoft Edge; exit 0, 51 views / 0 axe violations.

## Latest live completion and final limits (2026-10-15)

- Linked return route fix committed as `5fc0842 fix: route linked returns through invoice flow`. Regression test and full frontend rerun: 43 files / 174 tests passed.
- Collection POST 201; receipt/allocation verified after reload in `erp_scratch`. Expense POST 201 after a funding collection; expense list reload showed the posted `E2E-TEST Expense 2` row, SQL checked. Read-only invoice list GET 200 and invoice-create permission denial were captured.
- Additional live operations with write/reload/SQL checks: governorate (201), driver (201), minimum stock (200), periodic count (201 create / 200 approve), partner (201), partner payment (201), damaged stock (201), container transfer (201), warehouse return (201), and customer liquidation read (200). Screenshots are `acceptance-session2-*.png`.
- Remaining five operational checks: recycle restore cannot be exercised because the bin is empty and deletion is prohibited; container fund selector did not expose the created E2E container; treasury inbox/withdrawal/movement persistence checks are unverified.
- The temporary credential file is missing. The approved account setup script refuses to overwrite existing accounts and has no recovery mode; no password reset or account mutation was attempted.
- Mobile remains 4/14 passed, 10/14 unverified; no additional SMS/notification injection or mobile financial write was performed.
- MySQL 8.4.3 was started via the installed Laragon `my.ini` as a process after it was stopped; MariaDB was left running and untouched.
