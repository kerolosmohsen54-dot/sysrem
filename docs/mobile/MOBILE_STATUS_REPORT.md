# Mobile application status report

Audit date: 2026-10-14

## Summary

- This is a native Kotlin Android app using Jetpack Compose and Android Gradle (Kotlin DSL).
- Phases 1 and 2 are implemented: HTTPS server setup, system-account login, encrypted bearer token, account setup/cards, pause/resume, cursor sync, and a durable idempotent write queue.
- SMS and notification capture, message triage, deposits/withdrawals, manual postal deposit, app lock, boot/background service, and audit UI are not implemented.
- Backend Companion APIs exist for the missing message and finance flows, but the app does not call them.
- The named spec PDF was not found; comparison uses the areas enumerated in the request and `mobile-application/docs/DESIGN.md`.

## Inventory

### Git

`git status --short mobile-application/` produced no output (clean).

`git log --oneline -- mobile-application/ | head -20`:

```text
eb01d69 fix: align Android companion with owner decisions
5f89440 feat: scaffold Android companion phases 1 and 2
```

### Project tree

Generated and excluded folders are omitted.

```text
mobile-application/
├── .gitignore
├── README.md
├── build.gradle.kts
├── gradle.properties
├── settings.gradle.kts
├── docs/
│   └── DESIGN.md
└── app/
    ├── build.gradle.kts
    └── src/
        ├── main/
        │   ├── AndroidManifest.xml
        │   └── java/com/precisionslate/mobile/
        │       ├── MainActivity.kt
        │       └── data/
        │           ├── AuthorizationHeader.kt
        │           ├── DevicePreferences.kt
        │           ├── LocalStore.kt
        │           ├── MobileApi.kt
        │           ├── MobileRepository.kt
        │           ├── OutboxReplay.kt
        │           └── SenderMatcher.kt
        └── test/java/com/precisionslate/mobile/data/
            ├── AuthorizationHeaderTest.kt
            ├── OutboxReplayTest.kt
            └── SenderMatcherTest.kt
```

### Platform and build configuration

Platform: native Android, Kotlin, Jetpack Compose, Room, OkHttp; Gradle Kotlin DSL.

- `mobile-application/settings.gradle.kts:19`: root project `PrecisionSlateMobile`; includes `:app`.
- `mobile-application/build.gradle.kts:2-5`: Android Gradle Plugin `8.7.3`; Kotlin Android, Compose, and kapt plugins `2.0.21`.
- `mobile-application/app/build.gradle.kts:9-18`: namespace/applicationId `com.precisionslate.mobile`, compileSdk/targetSdk `35`, minSdk `26`, version `0.1.0`, AndroidJUnitRunner configured.
- `mobile-application/app/src/main/AndroidManifest.xml:2-17`: INTERNET is the only declared permission; cleartext traffic is disabled; only `MainActivity` is registered.
- Dependencies from `mobile-application/app/build.gradle.kts:39-59`: Compose BOM `2024.10.01`, Activity Compose `1.9.3`, Compose Foundation/Material3/UI/UI tooling preview, Lifecycle runtime KTX/Compose `2.8.7`, Room KTX/compiler `2.6.1`, OkHttp `4.12.0`, coroutines Android/test `1.9.0`, JUnit `4.13.2`, and debug Compose UI tooling.
- Build commands documented in `mobile-application/README.md:22-25`: `gradle :app:testDebugUnitTest` and `gradle :app:assembleDebug`. There is no Gradle wrapper in the tree.

The referenced `Android_Deposit_Withdrawal_App_Spec.pdf` was not found in the repository/workspace PDF filename inventory. The exact text of its section 4 therefore could not be independently checked. The add-account fields below are compared against the field list recorded in `mobile-application/docs/DESIGN.md:50` and visible source code.

## Spec area status

| Area | Status | Evidence | Notes |
|---|---|---|---|
| a. ERP login and token storage | BUILT | `app/src/main/java/com/precisionslate/mobile/data/MobileRepository.kt:48-65`; `DevicePreferences.kt:22-42`; `MainActivity.kt:265-295` | Username/password use `/mobile/auth/login`, then `/mobile/auth/me`. Token is encrypted using Android Keystore AES/GCM. |
| b. Account list/cards and fields | PARTIAL | `MainActivity.kt:300-365,375-423`; `MobileRepository.kt:11-19,82-95,169-183` | Cards show name, type, number/identifier, balance, new-message count, status, and pause/resume. Add form captures sender filter, keywords, deposit/withdrawal enable switches. Cards do not show source filters or enable flags; no delete action is offered. |
| c. Add-account form | BUILT | `MainActivity.kt:368-464`; `MobileRepository.kt:21-30,123-166` | Captures name, type, number/IBAN, sender filter, deposit/withdrawal keywords and switches; password-confirmed API creation. Exact spec section 4 was unavailable. |
| d. SMS permissions/receiver | MISSING | `app/src/main/AndroidManifest.xml:1-18`; searched source for `SMS_RECEIVE`, `READ_SMS`, `RECEIVED_SMS`, and `BroadcastReceiver` | No SMS permissions, receiver, runtime request, or explanatory permission UI. |
| e. Notification listener | MISSING | `app/src/main/AndroidManifest.xml:1-18`; searched source for `NotificationListenerService` | No notification listener or selected-app configuration. |
| f. Message filter logic | PARTIAL | `data/SenderMatcher.kt:5-27`; `MainActivity.kt:397-423`; `MobileRepository.kt:139-159` | Sender normalization/exact match helper exists and account setup stores keywords. No message pipeline uses sender/deposit/withdrawal matching or discards unmatched messages. |
| g. Deposit flow | MISSING | `MainActivity.kt:73-78,299-365`; `MobileRepository.kt:218-235`; endpoint call sites at `MobileRepository.kt:48-241` | Home only shows aggregate new-message counts; there is no message list/customer picker/register action. App does not call message list or deposit registration APIs. |
| h. Withdrawal flow | MISSING | `MainActivity.kt:73-78,299-464`; `MobileRepository.kt:48-241` | No category picker, notes form, new-category flow, or withdrawal registration call. |
| i. Manual Bosta/postal deposit | MISSING | `MainActivity.kt:368-464`; `backend/routes/api_v1.php:550-552` | `post_office` is an account type, but no manual deposit screen or call to `/mobile/deposits/manual`. |
| j. Settings and security status | PARTIAL | `MainActivity.kt:224-259,299-342`; `data/DevicePreferences.kt:13-20`; `data/MobileRepository.kt:97-100` | Server URL, account cards, queue count, retry/status are visible. No account profile, permissions status screen, PIN/biometric lock, or app settings page. |
| k. Offline queue and recovery | PARTIAL | `data/LocalStore.kt:51-60,90-103,125-174`; `data/OutboxReplay.kt:26-43`; `MobileRepository.kt:101-121,169-203`; `MainActivity.kt:145-159,323-328` | Room persists ordered writes and stable idempotency keys; retry occurs on foreground polling or explicit retry. No connectivity receiver/WorkManager/background guarantee; only ordinary writes currently use this queue. |
| l. Duplicate detection | MISSING | `data/LocalStore.kt:28-33,51-60`; `data/OutboxReplay.kt:26-43` | No duplicate key based on sender, amount, time, and text. Outbox idempotency prevents replay duplication, not duplicate bank messages. |
| m. Foreground service/boot/battery exemption | MISSING | `MainActivity.kt:145-160`; `AndroidManifest.xml:1-18`; searched source for `BOOT_COMPLETED`, service, and battery optimization APIs | Polling runs only while the activity lifecycle is STARTED. No service, boot receiver, or exemption request. |
| n. ERP sync/API/auth/idempotency | PARTIAL | `data/MobileRepository.kt:48-80,101-119,123-159,169-203`; `data/MobileApi.kt:30-67,73-92` | Calls Companion APIs for login/me/confirm/logout, ping/sync, channel create/update, and source create. Bearer Authorization and Idempotency-Key are added by `MobileApi`; HTTPS is enforced. No message/deposit/withdrawal/category/customer-picker endpoints are called. |
| o. HTTPS and audit trail | PARTIAL | `data/MobileApi.kt:73-92`; `AndroidManifest.xml:4-9`; `MainActivity.kt:73-78` | HTTPS-only URL validation and cleartext disabled. No in-app audit trail or “who did what” history is present. Server-side audit behavior was not inferred from route declarations. |

**Counts:** BUILT 2; PARTIAL 6; MISSING 7.

## Backend Companion endpoints versus mobile usage

Backend route evidence is `backend/routes/api_v1.php:458-568`. All listed routes exist in the backend. “Used” means a call site exists in `MobileRepository.kt`; no other API-call sites were found in mobile source. All endpoints below are under `/api/v1`.

| Endpoint | Used by mobile | Backend exists |
|---|---:|---:|
| `POST /mobile/auth/login` | Yes | Yes |
| `GET /mobile/auth/me` | Yes | Yes |
| `POST /mobile/auth/confirm-password` | Yes | Yes |
| `POST /mobile/auth/logout` | Yes | Yes |
| `POST /mobile/customers` | No | Yes |
| `GET /mobile/sync` | Yes | Yes |
| `GET /mobile/ping` | Yes | Yes |
| `GET /mobile/channels` | No | Yes |
| `POST /mobile/channels` | Yes | Yes |
| `PATCH /mobile/channels/{channelId}` | Yes | Yes |
| `DELETE /mobile/channels/{channelId}` | No | Yes |
| `GET /mobile/sources` | No | Yes |
| `POST /mobile/sources` | Yes | Yes |
| `PATCH /mobile/sources/{sourceId}` | No | Yes |
| `DELETE /mobile/sources/{sourceId}` | No | Yes |
| `GET /mobile/categories` | No | Yes |
| `POST /mobile/categories` | No | Yes |
| `PATCH /mobile/categories/{categoryId}` | No | Yes |
| `DELETE /mobile/categories/{categoryId}` | No | Yes |
| `POST /mobile/messages/batch` | No | Yes |
| `GET /mobile/messages` | No | Yes |
| `PATCH /mobile/messages/{messageId}/amount` | No | Yes |
| `POST /mobile/messages/{messageId}/ignore` | No | Yes |
| `POST /mobile/messages/{messageId}/register-deposit` | No | Yes |
| `POST /mobile/messages/{messageId}/register-withdrawal` | No | Yes |
| `POST /mobile/deposits/manual` | No | Yes |
| `GET /mobile/devices` | No | Yes |
| `PATCH /mobile/devices/{deviceId}` | No | Yes |
| `POST /mobile/devices/{deviceId}/revoke` | No | Yes |
| `GET /customers` (shared route with `mobile.use`) | No | Yes |

Mobile API paths not found in backend routes: **none**. The app currently uses 9 distinct Companion endpoints (login, me, confirm-password, logout, sync, ping, channel create/update, source create).

## Build and test status

- Test files: 3 unit-test files; 8 `@Test` cases total. No instrumented or UI test files are present; `androidTestImplementation` only configures the Compose BOM.
- Build/test execution: not run in this read-only audit.
- Last-known successful build: none found. `README.md:26-32` says “NOT VERIFIED: not built; unit tests not run,” notes SDK Platform 35 was not found, and says JDK/Gradle/adb were not detected. No APK/AAB outputs or mobile CI workflow were found. The only `.github` entry is `.github/workflows/.gitkeep`.
- Build configuration and commands exist, but there is no Gradle wrapper (`gradlew`).

## TODO/FIXME/not-implemented markers

Source search: `mobile-application/app/src` for case-insensitive `TODO`, `FIXME`, and `not implemented`.

**Count: 0.** No top 10 markers to list.

## Work needed to reach the spec (priority order)

1. Confirm the actual spec PDF, account/message data policy, APK distribution decision, and security review for SMS/notification access.
2. Implement SMS and selected-app notification permissions, user explanation/consent, receivers/listener, foreground service, boot handling, and battery-optimization UX.
3. Implement filtering/classification, ignored-message handling, duplicate detection, durable message storage, and message review/registration screens.
4. Implement deposit customer search/registration, withdrawal categories/notes/registration, and manual Post Office deposit against the existing backend endpoints.
5. Complete account cards and settings: per-source enable/filter state, account identity, permissions, app lock, and sync/error status.
6. Extend offline handling to finance operations, defined retry/reconciliation semantics, and app lifecycle/network recovery.
7. Add UI/instrumented/API contract tests, then build and verify a signed private APK after toolchain and distribution decisions are settled.
8. Decide and verify the audit trail covering actor, device, action, timestamp, and financial record.

## Open questions

- Is the mobile app a priority for the current delivery, or is phase 1/2 the intended scope for now?
- Can the named `Android_Deposit_Withdrawal_App_Spec.pdf` be supplied at a readable path? It was not found in the workspace by that filename.
- Should distribution remain private APK sideloading as `README.md:36-42` says, and who owns signing-key custody and update distribution?
- What legal/privacy review and consent wording are required before SMS and notification access is requested? Which notification apps may be selected?
- What exact duplicate window/time-zone rule and behavior should apply when two valid messages share a sender and amount?
- Should the app lock be PIN, biometric, or both? What is the recovery policy?
- Is server-side audit sufficient, or must the app include a user-visible activity history?
- What background sync guarantees are required when Android restricts background execution?
