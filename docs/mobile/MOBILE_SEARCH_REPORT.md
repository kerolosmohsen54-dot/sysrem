# Mobile Application Search Report

**Date:** 2026-10-12
**Scope:** Read-only search under `D:\system karas`, excluding `_backup_*`,
`node_modules`, `vendor`, and Git internals. Checked native Android manifests
and Gradle files, Flutter manifests, React Native/Expo/Capacitor package
manifests, APKs, mobile-named folders, and both ERP repositories' all-ref Git
history.

## Filesystem hits

| Path | State | What it is |
|---|---|---|
| `D:\system karas\mobile-application\zaffa-live\package.json` | Untracked filesystem project; outside a Git repository | React Native/Expo project manifest (`name: zaffa-live`, Expo Router entry). It belongs to the unrelated demo, not this ERP application. |
| `D:\system karas\mobile-application\zaffa-live\app` | Untracked filesystem project; outside a Git repository | Expo Router screen source directory. |
| `D:\system karas\mobile-application\zaffa-live\dist\_expo\static\js\android` | Untracked filesystem project; outside a Git repository | Generated Expo Android-target JavaScript bundle directory, not a native Android project or APK. |
| `D:\system karas\system end\backend\app` | Tracked | Laravel backend application source directory. |
| `D:\system karas\system end\backend\storage\app` | Tracked files beneath directory | Laravel storage application directory; not a mobile app. |
| `D:\system karas\system end\frontend\src\app` | Tracked | React/Vite web frontend source directory. |
| `D:\system karas\erp-frontend\backend\app` | Tracked | Laravel backend application source directory. |
| `D:\system karas\erp-frontend\backend\storage\app` | Tracked files beneath directory | Laravel storage application directory; not a mobile app. |
| `D:\system karas\erp-frontend\frontend\src\app` | Tracked | React web frontend source directory. |

The Expo project has **34,793 files**, **5,823 directories**, and **363,824,638
bytes**. The pre-existing copy at
`D:\system karas\_backup_mobile_found\zaffa-live` was counted before cleanup
and matched exactly: **34,793 files**, **5,823 directories**, and
**363,824,638 bytes**. Its file count and total byte count match the moved
project. The original path `D:\system karas\application\New folder\zaffa-live`
was not present during this check and was not accessed.

## Platform and ERP-integration checks

- No `AndroidManifest.xml`, `build.gradle`, `build.gradle.kts`,
  `settings.gradle`, `settings.gradle.kts`, `pubspec.yaml`, or `*.apk` hit was
  found.
- No ERP API paths (`/api/v1/mobile`, `mobile/sync`, `mobile/auth`),
  `Idempotency-Key`, SMS permission/receiver, or `NotificationListenerService`
  references were found in the candidate's app/source files.
- The candidate has no `.git` metadata and is outside the `system end` repo.
  It is an unrelated Expo demo, not an ERP-related client.

## Git-history search

| Repository | Result |
|---|---|
| `D:\system karas\system end` | No mobile-platform paths matching the search criteria in all-ref history. |
| `D:\system karas\erp-frontend` | No mobile-platform paths matching the search criteria in all-ref history. |

## Worktree observations

- `system end` was clean on `master` at `1ff11f544914a475b1943d5b4030fe17589544e0` before this report; safety tag `pre-mobile-app` was created at that commit.
- `erp-frontend` already had `docs/frontend/FRONTEND_PROGRESS_LOG.md` modified. It is outside the requested worktree and has not been changed.
- No cleanup had been performed when this report was written.

## Cleanup decision

The only candidate project is unrelated to the ERP and the backup count/size
comparison passed. The user explicitly authorized removal of this moved demo
after documenting the search. No ERP-related candidate was found.

## Cleanup result

- Removed only `D:\system karas\mobile-application\zaffa-live` (34,793 files;
  5,823 directories; 363,824,638 bytes before removal).
- Verified the moved path no longer exists and
  `D:\system karas\_backup_mobile_found\zaffa-live` still exists.
- The original path under `D:\system karas\application\New folder` was not
  present and was not accessed. No files were deleted from `system end` or
  `erp-frontend`; their mobile-platform search found no such candidate.

## Follow-up search after the new project was created

- The requested Kotlin/Java SMS/notification-content scan matched only the
  newly created `mobile-application/app/src/main/java/com/precisionslate/mobile/MainActivity.kt`,
  at its two `sms` source-kind option labels. No SMS permission, receiver,
  `SmsManager`, `SmsMessage`, or notification-listener implementation exists.
- Mobile-named directories found after project creation are the report
  directory `docs/mobile` and the new app's Kotlin package directories
  `mobile-application/app/src/main/java/com/precisionslate/mobile` and
  `mobile-application/app/src/test/java/com/precisionslate/mobile`. These
  belong to this task, not pre-existing candidate applications.
- No additional unrelated candidate or APK was found.
