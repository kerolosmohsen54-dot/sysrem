# React Native Build Progress

## Resume snapshot

- `git status --short` and `git log --oneline -10` were captured at resume. Unrelated frontend changes and unrelated untracked files remain untouched.
- `mobile-application/` is left untouched.
- Native React Native 0.87.1 TypeScript app, package `com.erp.companion`; initialized with `npx @react-native-community/cli@latest init ErpCompanion --directory mobile-app/.rn-init --package-name com.erp.companion --pm npm`.
- Dependencies were installed with a temporary npm config and process-only offline override; no machine configuration was changed.

## Phases

| Phase | Status | Commit | Commands / results | NOT VERIFIED |
| --- | --- | --- | --- | --- |
| 0 Spec and API map | DONE | `ef5cc8c` | Committed `SPEC_CHECKLIST.md` and `API_MAP.md`; compared with `backend/docs/openapi.yaml`. | Runtime API behavior. |
| 1 Project scaffold | PARTIAL | `bfde086` | RN 0.87.1; `com.erp.companion`; minSdk 26, compile/target 37, Build Tools 36.0.0. `gradlew.bat assembleDebug --no-daemon` timed out fetching Gradle 9.4.1; local Gradle 9.6 offline could not resolve `foojay-resolver-convention:1.0.0`. | Android build/runtime; NDK 27.1 and SDK command-line tools absent. |
| 2 Auth | DONE | `d77747f` | Keychain token, login/me/logout, 401 clears session; typecheck PASS; Jest 3 suites / 7 tests PASS. | Live backend login; Android build. |
| 3 Channels and home | DONE | `ef8811d` | Paginated FlatList, channel form, step-up, pause/resume; typecheck PASS; Jest 4 suites / 11 tests PASS. | Live backend; Android build. |
| 4 Android capture | PARTIAL | `9b2f691` | Kotlin SMS receiver, selected-package notification listener, native bridge, permission controls and headless forwarding. | Native build/runtime and permission behavior. |
| 5 Filter and dedupe | DONE | `d3f4cc9` | Pure TypeScript classification, decimal string parsing, SHA-256 dedupe and unmatched drop. Included in 76-test suite. | End-to-end capture; Android runtime. |
| 6 Inbox | DONE | `ad41645` | Paginated messages, filters, status badges and searchable pickers; Jest 7 suites / 59 tests PASS. | Live API and picker actions. |
| 7 Deposit flow | DONE | `0a97813` | Record deposit, manual postal deposit and customer creation with decimal strings; Jest 8 suites / 64 tests PASS. | Live backend receipt. |
| 8 Withdrawal flow | DONE | `9327cad` | Category picker, notes validation, category creation, record call and server balance refresh; Jest 9 suites / 72 tests PASS. | Live backend posting; Android build. |
| 9 Offline outbox and sync | DONE | `de2d72c`, `0d4fd29`, `b1ef733` | SQLite outbox, unique idempotency keys, ordered replay, stale SENDING recovery, retry/backoff, 422 details, 409 duplicate success, 401 pause, sync cursor/time persistence, and owner isolation. Queue covers all listed finance writes including headless capture. Typecheck PASS; final suite includes these tests. | Native SQLite runtime and true offline/reconnect; channel creation still needs online password step-up; Android build. |
| 10 Settings, lock, background | PARTIAL | `399d45c` | Settings show account, SMS receive/read, notification access, capture service, battery exemption, PIN/biometric state, sync cursor/time and queue counts. Android PBKDF2 salted PIN in Keychain, lock at startup/after 2 minutes, user-enabled foreground service and boot receiver. Typecheck PASS; Jest 11 suites / 81 tests PASS; AndroidManifest XML PASS. | Kotlin build/runtime, boot behavior, iOS PIN/biometric lock; ESLint NOT VERIFIED. |
| 11 End-to-end | BLOCKED | pending docs commit | Backend probe returned `Unable to connect to the remote server`; no connected emulator (`adb devices -l` empty), AVD `Pixel_9_Pro` available but not started. No app launched and no E2E DB command run. Details in `E2E_RN_REPORT.md`. | All real app/backend and iOS scenarios. |
| 12 Final checks | PARTIAL | pending docs commit | React Native typecheck PASS; Jest 11 suites / 81 tests PASS. Backend mobile suites PASS: mysql_test and mariadb_test, each 32 tests / 749 assertions, target `erp_test`. Manifest XML PASS. Android Gradle 9.4.1 configured then stalled preparing NDK 27.1; no APK. iOS simulator/native API config unavailable on Windows; ESLint NOT VERIFIED. Final report: `RN_FINAL_REPORT.md`. | APK/native runtime, iOS build/runtime, lint, and E2E. |

## OPEN QUESTIONS

- Distribution: internal APK is the approved default.
- Package name: use `com.erp.companion`; confirm before release.
- SMS and notification access needs security review before real device use.
- Certificate pinning is off by default; revisit during hardening.
- Rerunning `db:seed` removes capture grants; recommended post-seed grant command is not implemented.
- iOS automatic capture is unavailable; iOS is manual and viewing only. PIN lock is Android-only in this build.

## Next phase

Final report written. Remaining work is the blocked native build, live E2E, and iOS validation described in `RN_FINAL_REPORT.md`.
## Resume verification (2026-10-14)

| Step | Status | Exact commands / result | NOT VERIFIED |
| --- | --- | --- | --- |
| 1 Android environment | PARTIAL | `node --version` v26.8.2; `npm --version` 12.0.2; local Temurin JDK 17.0.20.1+1; emulator 37.1.11; adb 37.0.1; platform 37.0, Build Tools 36.0.0, API 37.2 Play Store x86_64 image. `Pixel_9_Pro` exists. Downloaded Android command-line tools 15859902 and verified SHA-256 `90ae805d20434428bffcb699c290860f19bb5f66a67e6b330067e3de801fb04a`. NDK path `27.1.12297006` is incomplete (`source.properties` missing). `sdkmanager --install 'ndk;27.1.12297006'` stalled twice; retry used 60s connect / 600s read timeout and left a zero-byte NDK archive. No alternate NDK is installed. | Usable NDK and APK build. |
| 2 Android build and JS checks | PARTIAL | Process-only `JAVA_HOME` and `ANDROID_HOME`; `gradlew.bat assembleDebug --no-daemon` failed at CXX1101 because NDK 27.1 has no `source.properties`. `npm run typecheck` PASS. `npm test -- --runInBand` PASS: 11 suites / 81 tests. `npm run lint` PASS after `693a14e`, 0 errors / 142 warnings. Source-only commit: `693a14e fix: clear React Native lint errors`. | APK, lint warnings cleanup, native runtime. |
| 11 Final backend mobile regression | PASS | mysql_test -> erp_test: 32 tests / 749 assertions PASS. mariadb_test -> erp_test: 32 tests / 749 assertions PASS. Each PHPUnit command printed `TARGET DB = erp_test` first. | Live app E2E. |

### Resume OPEN QUESTIONS

- NDK package downloads stall in this environment; only the incomplete NDK 27.1 directory is installed. Safe default: keep the project-required version and mark Android native build blocked until SDK Manager can download the package.
- The browser dashboard uses cookie sessions, while existing `/mobile/*` routes require a separate mobile bearer token. The linkage pages will use the existing mobile login flow in memory if implemented; no token will be persisted by the web app.

## Final continuation (2026-10-14)

| Step | Status | Result | NOT VERIFIED |
| --- | --- | --- | --- |
| 2 Android lint | PASS | `693a14e` removes the three lint errors. `npm run lint` PASS, 0 errors / 142 warnings. | Existing warnings remain. |
| 3 Local backend | PASS | Applied the two pending forward migrations to `erp_scratch`; health PASS; `manual_owner` mobile login 201 and `/mobile/auth/me` 200 with capture permission. No credentials printed or stored. | Browser-driven login. |
| 4 Android install and launch | BLOCKED | Build fails CXX1101: NDK 27.1.12297006 has no `source.properties`; SDK Manager retry stalled with a zero-byte archive. No APK or emulator app launch. | Android UI, SMS/notification injection, finance E2E. |
| 6–8 Android capture and finance E2E | BLOCKED | Not attempted because the app cannot be built or installed. | Synthetic SMS filters/dedupe/ambiguity; notification capture; deposit, withdrawal, manual deposit, offline queue, read-only. |
| 9 Web linkage | PARTIAL | `ab4d8e5 feat: link mobile capture screens in web`; mobile capture inbox, channel management, optional treasury source linkage, and statement source column. Typecheck, lint, and production build PASS. Full Vitest: 40 files / 165 pass / 1 fail (166 total). Failure: withdrawal linkage test helper expects a password form after the shared in-memory mobile grant already exists. | UI browser unavailable (`iab` not available); live browser linkage NOT VERIFIED. |
| 10 iOS | NOT AVAILABLE | Windows host has no Xcode or iOS simulator. | iOS build and runtime. |
| Accessibility | NOT VERIFIED | Playwright Chromium executable was unavailable; axe did not run. | Axe scan. |
| Backend regression | PASS | mysql_test -> erp_test: 32 tests / 749 assertions; mariadb_test -> erp_test: 32 tests / 749 assertions. | Android client integration. |

Final disposition: INCOMPLETE. Details in `MOBILE_COMPLETE_REPORT.md`.

## Continuation update (2026-10-14)

The earlier NDK-blocked status is superseded by the verified build below. The NDK 27.1.12297006 and project Temurin JDK are present. `assembleDebug` succeeded after using a temporary short drive mapping to avoid Windows' 260-character CMake object path. The build bundled JavaScript and targeted x86_64 for the connected emulator. APK install and login-screen launch passed without a host Metro listener. See `ANDROID_BUILD_EVIDENCE.md`.

Still NOT VERIFIED: live backend login, SMS/notification injection, finance writes, offline replay, 403 behavior, foreground service restrictions, release build, and iOS.
