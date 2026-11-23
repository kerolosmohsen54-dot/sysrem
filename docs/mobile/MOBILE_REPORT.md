# Mobile report

## App, screens, and native modules

The active companion is `mobile-app/`, a React Native 0.87.1 / TypeScript app. Screens in `mobile-app/src/screens/` include login, app lock, channel home, inbox, manual deposit, and settings. Capture support is under `src/capture/`; offline persistence/outbox is under `src/offline/`; navigation/auth/API are under `src/navigation/`, `src/auth/`, and `src/api/`. Android and iOS native projects are included. Source inventory VERIFIED.

Package dependencies include Keychain, Biometrics, Nitro SQLite, NetInfo, navigation, gesture handler, and safe-area modules (`mobile-app/package.json`). Android capture and native configuration are Android-specific. iOS is limited to the viewing/manual-entry subset; automatic SMS/notification capture is not verified on iOS.

## API calls

The app calls mobile login/me/logout/password confirmation, `/mobile/channels` create/list/update, `/mobile/messages` list and deposit/withdrawal/ignore/review actions, `/mobile/customers`, `/mobile/manual-deposits`, and `/mobile/withdrawal-categories`; shared lookup calls include `/customers`. Paths and payload code are under `mobile-app/src/api/`; exact operation coverage versus the backend is NOT VERIFIED in a live session.

## Build and E2E status

| Item | Status |
|---|---|
| TypeScript: `npm run typecheck` in `mobile-app/` | PASS, exit 0 |
| Jest: `npm test -- --runInBand` | PASS, 11 suites / 84 tests |
| Debug APK | Present at `mobile-app/android/app/build/outputs/apk/debug/app-debug.apk`, 56,147,758 bytes (file inventory VERIFIED). Build was not rerun during cleanup. |
| Prior build/launch evidence | `docs/mobile/ANDROID_BUILD_EVIDENCE.md` records an earlier successful build and emulator login-screen launch; prior report APK size differs slightly (56,147,630 bytes). Current artifact size takes precedence; rebuild status NOT VERIFIED. |
| Authenticated mobile E2E | NOT VERIFIED. `docs/integration/FINAL_SYSTEM_REPORT.md` records 14 Phase 3 flows blocked. Prior E2E reports record login UI launch only, not authenticated business workflows. |

Limits include no current live backend/login verification, no verified SMS/notification injection or outbox replay against the server, and no iOS simulator verification in this Windows environment. Existing Android permission prompt evidence is stored under `docs/evidence/`.
