# React Native Companion Final Report

Date: 2026-10-14

## Summary

- Created a native React Native 0.87.1 TypeScript companion app in `mobile-app/`, package `com.erp.companion`; the legacy `mobile-application/` folder was left untouched.
- Implemented bearer auth, channels, inbox, deposit/withdrawal flows, decimal-string money, Android capture sources, and a SQLite outbox with ordered idempotent replay.
- Added Android settings, salted PIN/biometric lock logic, capture foreground service, and conditional boot receiver.
- React Native typecheck and 81 Jest tests pass; backend mobile tests pass on both configured MySQL engines against `erp_test`.
- Android APK build and app E2E remain blocked; iOS native config/simulator validation is incomplete.

## Spec status

| Requirement | Status | Notes |
| --- | --- | --- |
| Paginated channels and balance/state cards | DONE | UI and mock API tests pass; live UI not verified. |
| Add channel form and field validation | DONE | Step-up is required before create; this means channel creation itself cannot be queued while offline. |
| Android SMS receiver capture | PARTIAL | Kotlin receiver and source matching exist; no native APK/runtime verification. |
| Selected-app notification capture | PARTIAL | Kotlin NotificationListenerService filters to enabled configured packages; no device verification. |
| Capture permission rationale/status | PARTIAL | Controls and rationale exist; denial/re-enable behavior not device-tested. |
| Keyword/amount filter and unmatched drop | DONE | Pure TypeScript tests cover decimal strings, Arabic/Western digits and filtering. |
| Dedupe key and duplicate notice | PARTIAL | Key and duplicate handling are tested; visible device notice not E2E-verified. |
| Inbox, filters and statuses | DONE | Jest screen tests pass. |
| Deposit customer picker and unapplied collection | DONE | API/service calls and tests implemented; live server path not E2E-verified. |
| Withdrawal category/notes and posting | DONE | API/service calls and tests implemented; live server path not E2E-verified. |
| Manual postal deposit | DONE | Keeps amount as a decimal string and defaults date to today. |
| Create missing customer | DONE | Integrated in customer pickers. |
| Settings and sync status | DONE | Settings report account, SMS/notification, battery, capture, lock, queue and cursor/time state. |
| Six-digit salted PIN, biometrics and two-minute lock | PARTIAL | Kotlin PBKDF2 hash and JS gate exist for Android; native build is unverified and iOS lock is unavailable. |
| SQLite write-ahead outbox and replay | PARTIAL | Queue, retry/backoff, account owner isolation and cursor tests pass; device SQLite/offline behavior is not exercised. |
| 409, 422 and 401 replay behavior | DONE | Unit tests cover duplicate success, editable failed details and auth pause. |
| Foreground capture service | PARTIAL | Native service and persistent notification exist; Android build/runtime not verified. |
| Boot restart only for active session/capture | PARTIAL | Receiver checks both persisted flags; device behavior not verified. |
| Battery optimization status and user-directed settings | DONE | Detected; user is not forced into exemption. |
| Server sync cursor/deltas | PARTIAL | Cursor and last sync are stored. App does not yet apply all entity deltas or page through `has_more`. |
| iOS manual/view-only and no automatic capture | PARTIAL | Automatic capture is correctly Android-only, but iOS native API URL config and simulator checks are not done. |
| Legacy mobile application untouched | DONE | No changes made under `mobile-application/`. |

## Verification

- `npm run typecheck` in `mobile-app/`: PASS.
- `npm test -- --runInBand` in `mobile-app/`: 11 suites, 81 tests PASS.
- ESLint: NOT VERIFIED; local runner stalled without diagnostics.
- Backend mobile suites: mysql_test -> erp_test: 32 tests, 749 assertions PASS.
- Backend mobile suites: mariadb_test -> erp_test: 32 tests, 749 assertions PASS.
- Android manifest XML parse: PASS.
- Android build: NOT VERIFIED. Gradle 9.4.1 downloaded and configured the project, then stalled while preparing missing NDK 27.1. No APK was generated.
- E2E: BLOCKED. `127.0.0.1:8000` returned `Unable to connect to the remote server`; `adb devices -l` showed no device. `Pixel_9_Pro` AVD exists but was not started; no app was launched.
- iOS: NOT VERIFIED on this Windows host; there is no iOS simulator and no native config module.
- No `.env` file was read. No E2E database command was run. Backend suite DB target was only `erp_test`.

## Commits

| Phase | Commit |
| --- | --- |
| 0 Spec/API map | `ef5cc8c` |
| 1 Native scaffold | `bfde086` |
| 2 Auth | `d77747f` |
| 3 Channels/home | `ef8811d` |
| 4 Android capture implementation | `9b2f691` |
| 5 Filter/dedupe | `d3f4cc9` |
| 6 Inbox | `ad41645` |
| 7 Deposit flows | `0a97813` |
| 8 Withdrawal flows | `9327cad` |
| 9 Offline outbox/sync | `de2d72c`, `0d4fd29`, `b1ef733` |
| 10 Settings/lock/background | `399d45c` |
| 11 E2E report | `1bb127d` |
| 12 Final report/checklist | pending commit |

## Platform limits and open questions

- Distribution default: internal APK. Confirm `com.erp.companion` before release.
- Review SMS and notification access security before real-device use.
- Certificate pinning remains off by default for local development; revisit before release.
- Rerunning `db:seed` removes mobile capture grants; the recommended post-seed grant command remains unimplemented.
- Android 15+ does not allow a `dataSync` foreground service to start from `BOOT_COMPLETED`; the capture service is declared `specialUse` for this user-enabled capture use case. Validate the subtype and OEM behavior on target devices.
- iOS automatic SMS/notification capture is unavailable by platform design. Manual/viewing support needs native API URL configuration and simulator verification; PIN lock is also not implemented for iOS.
- Safe next step: make the backend available on the emulator host without exposing `.env`, install NDK 27.1, build/install the debug APK, then run the synthetic SMS/notification scenarios from `E2E_RN_REPORT.md`.

## Reports

- Phase log: `docs/mobile/RN_BUILD_PROGRESS.md`
- E2E status: `docs/mobile/E2E_RN_REPORT.md`
