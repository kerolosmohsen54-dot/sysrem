# React Native Companion E2E Report

Date: 2026-10-14

## Environment

- Local backend probe: `Invoke-WebRequest -UseBasicParsing -Uri http://127.0.0.1:8000/api/v1/mobile/ping -TimeoutSec 5` returned `Unable to connect to the remote server`.
- ADB at `C:\Users\s\AppData\Local\Android\Sdk\platform-tools\adb.exe` starts after elevation, but `adb devices -l` listed no connected devices. The available AVD is `Pixel_9_Pro`; it was not started.
- No app was installed or started. The debug build did not reach APK generation because Gradle stalled while preparing the missing NDK 27.1 installation. Gradle 9.4.1 downloaded successfully.
- No `.env` file was read. No database command was run for E2E. The separate Phase 12 mobile backend tests used only `erp_test`.

## Scenario results

| Scenario | Status | Result |
| --- | --- | --- |
| Login with manual_owner | BLOCKED | Backend unavailable at `127.0.0.1:8000`; no login request was sent. |
| Create a capture channel | BLOCKED | Requires an app build and backend. |
| Inject deposit SMS, inbox, customer selection, collection and treasury verification | BLOCKED | No emulator/device and no backend; no SMS was injected. |
| Withdrawal to other without notes, then with notes; verify expense/outflow and drawer balance | BLOCKED | No emulator/device and no backend; no finance operation was submitted. |
| Manual postal deposit and MANUAL source verification | BLOCKED | No app/backend. |
| Airplane-mode queue/reconnect and exactly-once checks | BLOCKED | Outbox unit tests pass; real network transition not exercised. |
| Duplicate SMS and duplicate notice | BLOCKED | Dedupe unit tests pass; no device injection. |
| Unknown sender dropped | BLOCKED | Matcher unit tests pass; Android receiver not run. |
| Read-only account receives visible 403 | BLOCKED | Backend authorization test passes; app/backend UI path not run. |
| Synthetic notification from an allowed package | BLOCKED | No emulator; no notification was injected. |
| iOS manual flows | NOT VERIFIED | Windows host has no iOS simulator; iOS API base URL native module is not implemented. Automatic capture is not applicable on iOS. |

## Backend and app checks completed outside E2E

- React Native TypeScript: PASS.
- Jest: 11 suites, 81 tests PASS.
- Backend mobile suites on `mysql_test` targeting `erp_test`: 32 tests, 749 assertions PASS.
- Backend mobile suites on `mariadb_test` targeting `erp_test`: 32 tests, 749 assertions PASS.
- Android manifest XML parse: PASS.
- Android debug APK: NOT VERIFIED; Gradle stopped while preparing NDK 27.1. No APK produced.
- ESLint: NOT VERIFIED; runner stalled without diagnostics.

## Next action

Start the local backend with a known non-secret configuration for `erp_scratch`, install NDK 27.1 through Android SDK Manager, start the `Pixel_9_Pro` emulator, build/install the app, and rerun the blocked synthetic E2E scenarios. Do not use real SMS or notifications.
