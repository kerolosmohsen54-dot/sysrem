# Android Companion End-to-End Report

Date: 2026-10-15 (Africa/Cairo)

## Setup

- Backend: `GET http://127.0.0.1:8000/api/v1/health` returned HTTP 200 with `data.status = ok`, both before and after the fresh migration.
- Database: the backend target was `erp_scratch`. The post-migration read-only query printed `TARGET DB = erp_scratch`, returned 78 tables, and found no `manual_owner` or `manual_readonly` users.
- Account file: `%TEMP%\test-accounts.local.txt` was absent. No password was read from another source, generated, printed, or submitted.
- Emulator: `Pixel_9_Pro` booted as `emulator-5554` (`sdk_gphone16k_x86_64`). The original AVD was read-only in this environment, so the same AVD configuration was copied to a temporary directory before launch. The original AVD files were left unchanged.
- APK: installed `mobile-app/android/app/build/outputs/apk/debug/app-debug.apk`; `adb install -r` returned `Success`. Metro was not started; the APK launched its packaged JavaScript.
- Screenshot and UI hierarchy: [permission-prompt.png](android-e2e/permission-prompt.png), [permission-prompt.xml](android-e2e/permission-prompt.xml).
- Read-only Android permission state: `READ_SMS=false`, `RECEIVE_SMS=false`, `POST_NOTIFICATIONS=false`, and `ACCESS_LOCAL_NETWORK=false` (`appops` mode `ignore`). The merged manifest requests `ACCESS_LOCAL_NETWORK`, but no Bluetooth or `NEARBY_WIFI_DEVICES` permission. The manifest-merger blame report attributes `ACCESS_LOCAL_NETWORK` to `com.facebook.react:react-android:0.87.1`; its comment says Android 17 uses it for local-network access to the development server, with `adb reverse` loopback exempt.

The app was blocked by an Android system permission prompt. Exact visible text: **â€œAllow ErpCompanion to find, connect to, and determine the relative position of nearby devices?â€** Buttons: **â€œAllowâ€** and **â€œDonâ€™t allowâ€**. The emulator runs Android 17 (API 37); the prompt is consistent with the declared `ACCESS_LOCAL_NETWORK` permission, which Android groups with nearby-device access. The manifest merger attributes that permission to React Native 0.87.1, although the exact runtime call that triggered the prompt was not confirmed. I left it unanswered. The approved local credential file was also missing, so an authenticated owner session could not be established.

For every flow below, the screenshot is `android-e2e/permission-prompt.png` and the visible gate is the exact prompt above. No flow request or write was submitted. The server check was `GET /api/v1/health` â†’ HTTP 200, `status: ok`; a flow-specific database check was not applicable because the action was not initiated.

## Flow results

| # | Flow | Result | Screenshot | Exact visible text | Server check |
|---:|---|---|---|---|---|
| 1 | Owner login, home screen, and backend channel load | BLOCKED â€” permission setup and missing credentials | `android-e2e/permission-prompt.png` | â€œAllow ErpCompanion to find, connect to, and determine the relative position of nearby devices?â€; â€œAllowâ€; â€œDonâ€™t allowâ€ | Health 200/`ok`; no login request or channel read was submitted. After the fresh migration, the database query found no manual test users. |
| 2 | Create `E2E-TEST Vodafone` wallet channel with sender and keywords | BLOCKED â€” no owner session | `android-e2e/permission-prompt.png` | Same exact gate text and buttons above | Health 200/`ok`; no channel write was submitted. |
| 3 | Pause and resume channel; verify retained row | BLOCKED â€” no owner session | `android-e2e/permission-prompt.png` | Same exact gate text and buttons above | Health 200/`ok`; no pause/resume request was submitted. |
| 4 | Deposit SMS, customer selection, and collection/treasury checks | BLOCKED â€” no channel or owner session | `android-e2e/permission-prompt.png` | Same exact gate text and buttons above | Health 200/`ok`; no SMS was injected and no message, collection, or treasury entry was created by this run. |
| 5 | Duplicate SMS and visible duplicate notice | BLOCKED â€” no channel or owner session | `android-e2e/permission-prompt.png` | Same exact gate text and buttons above | Health 200/`ok`; no SMS or capture request was submitted. |
| 6 | Unknown sender dropped | BLOCKED â€” no channel or owner session | `android-e2e/permission-prompt.png` | Same exact gate text and buttons above | Health 200/`ok`; no SMS was injected and no server message check was applicable. |
| 7 | Ambiguous deposit/withdrawal message requires review and posts nothing | BLOCKED â€” no channel or owner session | `android-e2e/permission-prompt.png` | Same exact gate text and buttons above | Health 200/`ok`; no SMS or capture request was submitted. |
| 8 | Withdrawal without notes error, retry with notes, and ledger checks | BLOCKED â€” no channel or owner session | `android-e2e/permission-prompt.png` | Same exact gate text and buttons above | Health 200/`ok`; no withdrawal or finance write was submitted. |
| 9 | Allowed-package notification captured; unlisted package ignored | BLOCKED â€” permission setup and no owner session | `android-e2e/permission-prompt.png` | Same exact gate text and buttons above | Health 200/`ok`; no notification was posted and no capture request was submitted. |
| 10 | Manual postal deposit with customer, date, and note | BLOCKED â€” no owner session | `android-e2e/permission-prompt.png` | Same exact gate text and buttons above | Health 200/`ok`; no manual deposit was submitted. |
| 11 | Airplane-mode queue and exactly-once replay | BLOCKED â€” no owner session or queued operations | `android-e2e/permission-prompt.png` | Same exact gate text and buttons above | Health 200/`ok`; no operation was queued or replayed. |
| 12 | Permission/sync/lock settings, logout, and two-minute PIN lock | BLOCKED â€” system prompt prevented reaching settings | `android-e2e/permission-prompt.png` | Same exact gate text and buttons above | `READ_SMS`, `RECEIVE_SMS`, `POST_NOTIFICATIONS`, and `ACCESS_LOCAL_NETWORK` read as not granted; health 200/`ok`; no settings change, PIN, or logout request was made. |
| 13 | Read-only login and visible 403 write denial | BLOCKED â€” missing credentials and no owner session | `android-e2e/permission-prompt.png` | Same exact gate text and buttons above | Health 200/`ok`; no read-only login or write request was submitted. Post-migration query found no manual test users. |
| 14 | Web treasury inbox, withdrawals, and customer statement linkage | BLOCKED â€” no owner login or mobile-captured records | `android-e2e/permission-prompt.png` | Same exact gate text and buttons above | Health 200/`ok`; no browser linkage check or mobile finance write was run. |

## Counts and disposition

- PASS: 0
- FAIL: 0
- BLOCKED: 14
- Overall Phase 3: **BLOCKED**. No item is marked PASS from a unit test or from the health endpoint alone.

## Blocker classification and safe defaults

- Permission setup: the Android system prompt remained unanswered. Safe default: leave it unchanged until the device owner decides whether local-network access is appropriate.
- The merged manifest requests `ACCESS_LOCAL_NETWORK` through React Native 0.87.1; the API 37 permission is grouped under nearby-device access. Bluetooth and `NEARBY_WIFI_DEVICES` are not requested. The exact runtime trigger is unconfirmed, so verify whether the app needs this access for its configured backend/dev-server address before retrying. See [Android's local-network permission guidance](https://developer.android.com/privacy-and-security/local-network-permission).
- Environment: `%TEMP%\test-accounts.local.txt` was missing before and after the fresh migration, and the fresh seed created neither manual test user. Safe default: do not invent or reset passwords; obtain the designated file before attempting authenticated flows.
- No backend posting bug was established because no finance operation reached the API.

## Continuation note â€” 2026-10-15

The account file is present in `%TEMP%` now (account keys only were inspected; values were not shown). The earlier authenticated run remains blocked by the Android prompt and missing account file at that time. In this continuation, `adb` and `emulator` were unavailable in PATH, Java was unavailable for Gradle, and the local API server was offline; no Android permissions or account credentials were changed, and no mobile flow was submitted. See `../integration/FINISH_PROGRESS.md` for current rerun results.

## Emulator continuation â€” 2026-10-15

### Environment and permission

- Debug APK: `mobile-app/android/app/build/outputs/apk/debug/app-debug.apk`; SHA-256 `998F7049F174FB0BD93E5DA0A2D1BD2395141000674609E23E5D1F1D85B6C122`.
- Build: `assembleDebug` passed using JDK 17, Android SDK, API 37 x86_64, and NDK 27.1.12297006; the project was mapped temporarily to `R:` to shorten the Windows CMake path. Install on `emulator-5554` returned `Success`.
- The app displayed Android 17â€™s â€œAllow ErpCompanion to find, connect to, and determine the relative position of nearby devices?â€ prompt. I granted it on the emulator. With the configured `http://10.0.2.2:8000/api/v1` base URL, app login then loaded `/mobile/auth/me`, `/mobile/channels`, and `/mobile/sync`. This reproduces the need for `ACCESS_LOCAL_NETWORK`; the manifest was not changed.
- Evidence: `../evidence/android-session2-launch.png`, `../evidence/android-session2-after-permission.png`, and `../evidence/android-session2-login.png`.

### Flows completed on the emulator

| Requested flow entry | Result | Evidence and server/database check |
|---|---|---|
| Owner login, home, channel load | PASS | `adb install -r` returned `Success`; owner home displayed live channel data. Backend served `/mobile/auth/login`, `/mobile/auth/me`, `/mobile/channels`, and `/mobile/sync`. Screenshot: `../evidence/android-session2-login.png`. |
| Create `E2E-TEST-Android-Channel` | PASS | App returned to channels and displayed the new active channel. Read-only query against `erp_scratch` returned channel id 2 and `paused=0`. Screenshots: `../evidence/android-session2-channel-filled.png`, `../evidence/android-session2-channel-saved.png`. |
| Pause and resume channel | PASS | The app displayed paused then active state. Read-only queries against `erp_scratch` showed `paused=1` after pause and `paused=0` after resume. Screenshots: `../evidence/android-session2-channel-paused.png`, `../evidence/android-session2-channel-resumed.png`. |
| Read-only login and write denial | PASS | Read-only app view hid Add channel and pause/resume controls. Mobile API login 201, prefixed channel write 403, logout 200; no write was persisted. Screenshot: `../evidence/android-session2-readonly.png`. |

Logout returned the app to the login screen and `/mobile/auth/logout` was served. This was only a successful substep of the combined PIN-lock/logout entry; that requested entry remains blocked because PIN lock timing was not tested. Screenshot: `../evidence/android-session2-logout.png`.

The standalone mobile auth check also returned login `201` and logout `200`; its device name was prefixed `E2E-TEST`.

### Remaining Android flows

The other requested device flow entries remain BLOCKED / not run: SMS deposit and duplicate/unknown/ambiguous variants, withdrawal validation and retry, allowed/unlisted notification capture, manual postal deposit, airplane-mode exactly-once replay, two-minute PIN lock, and web linkage for mobile-created records. No SMS or notification was injected during this continuation. No PASS is inferred from unit tests. Evidence for the latest UI state and the prior 14-flow blocked run is retained above.


