# Mobile Companion Completion Report

**Disposition: INCOMPLETE**

## Current update (2026-10-15)

This update supersedes the historical verification status below. The previous continuation reported that the debug APK could not be built; the current `assembleDebug` passed and the APK installed successfully. Phase 3 is **BLOCKED**: 0 PASS, 0 FAIL, and 14 BLOCKED. The detailed per-flow evidence is in [E2E_ANDROID_REPORT.md](E2E_ANDROID_REPORT.md).

| Current check | Result |
| --- | --- |
| Android TypeScript | PASS: `npm run typecheck` |
| React Native Jest | PASS: 11 suites / 84 tests |
| ESLint | PASS: 0 errors / 142 warnings |
| Android `assembleDebug` | PASS: `BUILD SUCCESSFUL`, exit 0; APK is 56,147,758 bytes at `android/app/build/outputs/apk/debug/app-debug.apk` |
| Install and launch on `Pixel_9_Pro` | PASS: `adb install -r` returned `Success`; app launch reproduced the unanswered system prompt. Updated screenshot and UI hierarchy are in `android-e2e/`. |
| Pixel_9_Pro Android end-to-end flows | BLOCKED: all 14 flows; no owner credentials were available and the unanswered Android nearby-device system prompt prevented app interaction |

The permitted `%TEMP%\test-accounts.local.txt` file was absent. After the authorized `erp_scratch` fresh seed, the read-only user query also found no `manual_owner` or `manual_readonly` rows. I did not source or generate credentials. Android 17/API 37 shows a nearby-device-group prompt while `ACCESS_LOCAL_NETWORK` is declared by the merged manifest through React Native 0.87.1; the exact runtime trigger is unconfirmed. SMS, notification, and local-network grants read false. I left the prompt and permission state unchanged. No mobile finance writes or SMS/notification injections were submitted.

## Historical snapshot (2026-10-14; superseded by the current update above)

At that point the report recorded an incomplete NDK installation, no APK installation, earlier backend and frontend test counts, and unverified browser flows. The current build, mobile checks, and E2E disposition are recorded above and in the linked current reports.

## Results

| Area | Status | Evidence |
| --- | --- | --- |
| React Native app and Android capture source | PARTIAL | `mobile-app/`; implementation phases 0–10 detailed in `SPEC_CHECKLIST.md` and `RN_BUILD_PROGRESS.md`. Kotlin SMS receiver, notification listener, foreground service, boot receiver, permission controls, and battery settings are in source. |
| Android toolchain and APK | BLOCKED | `assembleDebug` failed CXX1101 because NDK 27.1.12297006 lacks `source.properties`; no APK produced. Android command line tools package 15859902 was installed and SHA-256 verified. Two NDK installation attempts stalled; the longer retry left a zero-byte archive. |
| Android app E2E | NOT RUN | No emulator app launch, SMS/notification injection, deposit/withdrawal, manual deposit, offline reconnect, or read-only scenario. These depend on a buildable APK. |
| Backend on `erp_scratch` | PASS | Only two pending forward migrations applied. `/api/v1/health` returned `ok`. `manual_owner` login returned 201; `/api/v1/mobile/auth/me` returned 200 and confirmed `mobile.messages.capture`. Password and token were not printed or stored. |
| Backend regression | PASS | mysql_test against erp_test: 32 tests / 749 assertions. mariadb_test against erp_test: 32 tests / 749 assertions. |
| Web mobile linkage | PARTIAL | Commit `ab4d8e5`; capture inbox at `/finance/mobile-inbox`, channel manager, optional mobile-source correlation for treasury withdrawals/movements, and customer statement provenance. |
| Frontend checks | PARTIAL | TypeScript PASS; ESLint PASS; Vite production build PASS. Vitest: 40 files, 166 tests; 165 passed and 1 failed. Failing test: `/finance/withdrawals mobile source linkage > marks a ledger entry linked to a recorded mobile message`; helper waits for a password form after the shared in-memory grant from an earlier test is reused. Inbox and channel tests pass. |
| Browser and accessibility | NOT VERIFIED | CUA reported the `iab` browser unavailable. Axe did not run because Playwright Chromium was not installed. |
| iOS | NOT VERIFIED | Windows host has no Xcode or iOS simulator; build and runtime not tested. |

## Android blocker

Required NDK directory: `mobile-app/.toolchain/android-sdk/ndk/27.1.12297006`. It is incomplete: `source.properties` is absent. `gradlew.bat assembleDebug --no-daemon` failed with CXX1101. No APK was created and no emulator was started.

## Verification

- React Native TypeScript: PASS.
- React Native Jest: 11 suites / 81 tests PASS.
- React Native ESLint: PASS, 0 errors / 142 existing warnings.
- Frontend TypeScript, ESLint, and Vite production build: PASS; 84 output files checked for external URL literals.
- Frontend Vitest: 40 files / 166 tests, 165 pass and 1 fail (helper issue above).
- Mobile backend PHPUnit: 32 tests / 749 assertions for each engine, targeting `erp_test`.
- Browser manual check: NOT VERIFIED; CUA `iab` unavailable.
- Axe scan: NOT VERIFIED; Chromium executable unavailable.
- Local backend targeted `erp_scratch`; forward migrations only, health check and owner mobile login succeeded.

## Remaining work, by priority

1. Install NDK 27.1.12297006 and verify `source.properties` and `ndk-build` exist.
2. Build the debug APK, install it on `Pixel_9_Pro`, and run SMS and notification permission/capture scenarios.
3. Exercise deposits, withdrawals, manual postal deposits, offline queue replay, duplicate detection, and read-only permissions on Android against the local backend.
4. Fix the mobile linkage test helper for the shared in-memory mobile grant, then rerun the complete frontend suite.
5. Run browser checks against the local backend as `manual_owner` and run axe with Chromium installed.
6. Verify iOS viewing/manual-entry on a macOS/Xcode host.

## Open questions

- Distribution default: internal APK. Confirm package name `com.erp.companion` before release.
- Complete the SMS and notification access security review before use on real financial devices.
- Certificate pinning remains off by default; decide during mobile security hardening.
- `db:seed` removes mobile capture grants; implement a post-seed grant command or migration check before repeated seeding.
- iOS automatic SMS/notification capture is unavailable; iOS remains manual/viewing only. PIN lock is Android-only in this build.
- Confirm the browser app should retain its separate in-memory mobile bearer login flow for source attribution. The web app does not persist mobile tokens.

## Commits

- `693a14e fix: clear React Native lint errors`
- `167d0fb docs: record Android toolchain and lint verification`
- `ab4d8e5 feat: link mobile capture screens in web`
- This report and the final progress update are the current documentation changes.

## Continuation update (2026-10-14)

The Android build blocker described above has been resolved. `assembleDebug` succeeded; the self-contained APK was installed and launched on the connected emulator, which displayed the login screen with no Metro listener. Current evidence is in `ANDROID_BUILD_EVIDENCE.md`. Backend-connected login, finance, capture, offline, permission, release, and iOS checks remain NOT VERIFIED; the overall report therefore remains INCOMPLETE.
