# React Native Companion Spec Checklist

Legend: DONE = implemented and checked in code/tests; PARTIAL = implementation exists but remains unverified or incomplete; NOT DONE = no implementation.

- [x] DONE — Channels: paginated account cards show name, type, decimal balance, unread NEW count, and enable states.
- [x] DONE — Add-account form has the approved ordered fields and uses server validation details.
- [~] PARTIAL — Android SMS capture uses Kotlin SMS_RECEIVED receiver and enabled matching channels; native build/runtime not verified.
- [~] PARTIAL — Android notification listener restricts to enabled source packages; native build/runtime not verified.
- [~] PARTIAL — Permission rationale and controls exist; runtime denial/re-enable flow not device-tested.
- [x] DONE — Sender matching is case-insensitive/trimmed; unmatched messages drop before upload.
- [x] DONE — Keyword classification, decimal string amount parsing, ambiguity, and missing amount rules have unit tests.
- [~] PARTIAL — Dedupe key is implemented and tested; visible duplicate notice is not verified end to end.
- [x] DONE — Inbox includes list filters and status badges with screen tests.
- [x] DONE — Deposit picker posts an unapplied collection; flow has mocked API tests.
- [x] DONE — Withdrawal picker supports existing/new categories and notes; flow has mocked API tests.
- [x] DONE — Manual postal deposit includes exact decimal amount, customer, date, and note.
- [x] DONE — Missing customer can be created from the picker.
- [x] DONE — Android settings surface account, access, lock, sync and logout status.
- [~] PARTIAL — Salted six-digit PIN and optional biometric logic exist for Android; native verification and iOS are incomplete.
- [~] PARTIAL — SQLite outbox persists every supported finance write before sending; native persistence/reconnect not exercised.
- [x] DONE — Idempotency replay, 409, 422 editable failure, and 401 pause behaviors have tests.
- [~] PARTIAL — Android foreground service and persistent notification are implemented but not compiled/device-tested.
- [~] PARTIAL — Boot receiver checks session and capture flags; device behavior not tested.
- [x] DONE — Battery exemption is detected and settings are opened only at user request.
- [~] PARTIAL — Sync cursor and last-sync time are retained; entity delta application and has_more paging are incomplete.
- [~] PARTIAL — Shared manual/view screens exist, but iOS native API URL config and simulator validation are missing. Auto-capture is Android-only by platform design.
- [x] DONE — Legacy `mobile-application/` directory was left untouched.
