# Mobile API v1.2 implementation notes

The generated client contract is [`../../backend/docs/openapi.yaml`](../../backend/docs/openapi.yaml), OpenAPI 3.1.0, contract version 1.2.0. Route matching was checked against Laravel's registered API method/path pairs; the OpenAPI document covers 135 operations, including all 29 mobile operations.

## Decisions

- A successful password login issues a trusted, mobile-only device bearer token. The phone enforces its own PIN/biometric app lock. Browser cookie sessions cannot call mobile-only routes, and mobile tokens cannot call browser routes.
- Device tokens expire after 720 hours by default and can be revoked immediately. There is no per-user device-count limit; the login rate limit is a separate abuse control.
- The high-risk confirmation window is device-specific and lasts 10 minutes by default. Channel creation/deletion, dated opening balances, and category creation require it.
- Owner grants include all nine `mobile.*` permissions; the driver has none. The canonical role-permission matrix remains configurable for future limited roles.
- `Idempotency-Key` is required for replayable mobile business-data mutations. Authentication lifecycle operations and browser-only owner device administration are control-plane actions, not offline queue writes. The mobile idempotency record is scoped to a device, hashes the request, and retains the response for replay.
- The app never treats an SMS or notification as proof of payment. A message-origin deposit is marked unverified and creates an unapplied customer collection plus treasury entry transactionally.
- Withdrawal categories reuse the existing expense and treasury transfer services. `مصاريف أخرى` requires notes; `الدرج` transfers to the cash drawer. Accountant-dependent journal rules and report formulas remain out of scope.

## Request and data limits

- Login is limited to five attempts per minute; password confirmation is separately rate-limited to five attempts per minute.
- A message batch contains 1–100 messages; each raw text is limited to 5,000 characters. Raw text is never included in logs or audit payloads and is returned only with `mobile.messages.view`.
- Source definitions (sender, keywords, parser rule, and default directions) are shared across authorized owners and devices. Each device has a separate opt-in and deposit/withdrawal switches; new devices receive shared definitions disabled until locally enabled. Message ingestion requires an active source, active channel, local opt-in, a matching normalized sender, and a keyword match. The server chooses the direction from keywords; matching both sets stores an `ambiguous` message with `needs_review`, while matching neither rejects the message without storing it. OTP/verification markers are rejected. Duplicate detection uses normalized sender, amount, received time, and text hash globally across devices and users.
- An unclear amount is stored as `needs_review`; manual review can supply an exact EGP amount. Archived messages remain archived after amount review and cannot be registered without review.
- List endpoints are paginated, with a maximum of 100 items per page. Sync defaults to 200 events and accepts at most 500 events per page; `has_more` and the returned cursor continue a larger delta.
- Mobile money inputs are decimal strings in EGP, limited to piastres; no JSON floating-point amounts are accepted. The server computes balances and financial totals.

## Implemented endpoint groups

- Authentication: login, current user/effective permissions, ten-minute password confirmation, logout.
- Owner browser administration: paginated device/source listing, device rename and revocation; requires browser session, permission, and step-up.
- Mobile configuration: channel, source, and category list/create/update/archive; high-risk operations require mobile step-up.
- Messages: batch ingestion, filtered/paginated list, amount review, ignore, deposit registration, and withdrawal registration.
- Finance/customer: manual post-office deposit, customer search through the shared customer endpoint, and owner customer creation using the existing customer validation/service.
- Synchronization: cursor-based customer/channel/category/shared-source/message deltas and cheap ping. Shared source changes reach every device; source opt-in/direction changes are device-local. Raw text is never synchronized; balances require `mobile.balances.view`.

## Mobile contract behavior (sections 4–8)

### 4. Channels and accounts

Channels represent wallet, bank, Instapay, post-office, and other accounts. They are shared system data, can be paused without deletion, and list/sync with grouped balance queries rather than a per-channel balance query. There is no fixed channel-count limit.

### 5. Sources and settings

Source definitions and their sender matching, deposit/withdrawal keywords, parser rule, and default direction settings are shared through sync. Every device has an independent `is_enabled`, `read_deposits`, and `read_withdrawals` association. Source creation enables it only for the creating device; other devices start disabled and may opt in. A single source can have both directions enabled. Updating a definition syncs globally; updating device switches syncs only to that device.

### 6. Message ingestion and review

The server normalizes numeric sender variants such as `+20`, `0020`, and leading `0`, ignoring spaces and dashes; sender names compare case-insensitively. It classifies direction from keywords, not the optional client `type` hint or default direction settings. A message matching both keyword sets is stored as `message_type=ambiguous` and `status=needs_review`; no direction is guessed. A message matching neither direction is rejected before persistence. The batch response includes the server-classified type for accepted and duplicate records. Amounts remain decimal strings.

### 7. Owners, devices, duplicates, and audit

Any number of owner accounts and devices are supported. Each device has its own token; revoking one token does not revoke sibling devices. Global duplicate identity spans devices and users. Audit events identify the acting user/device without recording raw message text or tokens.

### 8. Synchronization

`GET /mobile/sync` returns shared channels, categories, customers, and source definitions, plus source switches for the requesting device. Global source-definition events are visible to all devices; device-setting events are scoped to the matching device. Message status records remain scoped to the authenticated user's devices. Cursor pagination remains capped at 500 events per call.

## API contract changes in this audit

- Source list/create/update/archive now operate on shared definitions; per-device capture settings are exposed as `is_enabled`, `read_deposits`, and `read_withdrawals`, with `default_read_deposits` and `default_read_withdrawals` providing shared defaults.
- Sync snapshots/deltas include shared source definitions for every authorized device, while direction/opt-in changes remain device-local.
- Message `type` is an optional consistency hint, classification is server-side, and response items include the computed type (`deposit`, `withdrawal`, or `ambiguous`).
- Overlapping keyword matches return `needs_review`; no keyword match is rejected and not stored. Sender phone-format/name-case normalization is performed server-side.
- The message list accepts `type=ambiguous`, matching the server-side filter validation and stored message enum.
- The per-user mobile device cap and its `DEVICE_LIMIT_REACHED` response are removed. No route was added.

### Device administration contract clarification

The three `/mobile/devices` operations are browser-admin operations, not mobile-token operations. Laravel registers them inside the `api.session` route group; the list requires `mobile.devices.manage` and `api.step_up`, while rename and revoke additionally require `api.csrf`. The tests verify cookie-session access, step-up, CSRF-protected mutations, and rejection of a mobile bearer token for the list route.

`GET /mobile/devices` returns the standard `data` / `meta` pagination envelope. Each device item contains `id`, `user_id`, `username`, `display_name`, `name`, nullable `model`, nullable `last_seen_at`, nullable `token_expires_at`, nullable `revoked_at`, `created_at`, and `sources`. Each source summary contains `id`, `kind`, nullable `sender_identifier`, nullable `notification_package_names`, `read_deposits`, `read_withdrawals`, `status`, and a nested `channel` with `id`, `name`, `type`, and `status`. It does not expose a token or token hash. The OpenAPI response schema is based on the fields selected and assembled by `MobileDeviceAdminController::index`.

`PATCH /mobile/devices/{deviceId}` returns the renamed device's `id`, `user_id`, `name`, nullable `model`, nullable `last_seen_at`, nullable `token_expires_at`, nullable `revoked_at`, and `created_at`. `POST /mobile/devices/{deviceId}/revoke` returns `{data: {id, status: "revoked"}}`. These operations use the same browser-session security scheme.

### Contract correction verification — 2026-10-12

- `js-yaml` parsed `backend/docs/openapi.yaml`: **PASS**, OpenAPI 1.2.0, 135 operations, 29 mobile. The locally installed `openapi-typescript` parser/generator also completed successfully.
- PHP 8.3.33 full test suite with `AUTH_TEST_CONNECTION=mariadb_test`: **115 passed, 1,947 assertions** (37.464 seconds). Its integration tests verified that the selected database is `erp_test`.
- MariaDB constraint suite: **21 passed, 0 failed** on MariaDB 13.0.2 `erp_test`.
- Route-permission audit: **1 passed, 461 assertions** with `DB_CONNECTION=mariadb_test`.
- Route/OpenAPI comparison under both `mysql_test` and `mariadb_test` configurations: **135 registered non-HEAD operations, 135 documented, 29 mobile, 0 missing, 0 extra** for each configuration. Route listing does not open a database connection.
- **NOT VERIFIED on MySQL:** port 3306 did not accept a TCP connection. The MySQL full-suite attempt was stopped without a test result after it remained blocked; the MySQL constraint suite and route-permission audit were not run. No MySQL database was accessed.

## Previous implementation verification — 2026-10-12 17:00 +03:00

- PHP 8.3.33 full suite on MySQL 8.4.3 `erp_test`: **115 passed, 1,947 assertions**.
- PHP 8.3.33 full suite on MariaDB 13.0.2 `erp_test`: **115 passed, 1,947 assertions**.
- Focused mobile suite: **18 passed, 471 assertions** on each engine, including 10 owners × 2 devices, 11 devices for one owner, global duplicate rejection, sibling-token revocation, keyword/sender cases, and 60-channel query bounds.
- Constraint suite: **21/21** on each engine. All behaviors passed on both; MariaDB reported its native CHECK/FK/unique-key error text where MySQL did not print those caught errors.
- Route-auth audit: **1 passed, 461 assertions** per engine, with no permission gaps.
- Full `route:list`: **133 route rows** on each engine; **135 API method/path operations** and **29 mobile operations**. Static OpenAPI comparison: **135/135**, zero missing and zero extra on each engine.
- Forward migrations `000012` and `000013` applied on both `erp_test` databases. Fresh rebuild from zero after these two migrations: **NOT VERIFIED**.
- Formal YAML/OpenAPI schema validation and a dedicated secret-scanner run: **NOT VERIFIED**. Historical `erp_scratch` backup/restore and prior credential-pattern scan results are recorded in the progress log; they were not rerun for this audit.

## NOT VERIFIED / limits

- MySQL full-suite, constraint-suite, and route-permission checks for the contract correction: **NOT VERIFIED** because local port 3306 was unavailable; see the dated verification above. The contract itself was parsed and OpenAPI type generation succeeded.
- Runtime testing on minimum MySQL 8.0 and MariaDB 10.6, Hostinger deployment/runtime, and production token/HTTPS/revocation operations: **NOT VERIFIED**.
- Dedicated secret-scanner output and arbitrary/unrecognized secret formats: **NOT VERIFIED**.
- Off-site backup transfer/retention/restore: **NOT VERIFIED**; only local `erp_scratch` drills were run.
- Accountant approval for journals, tax method, and report formulas: **WAITING**.

## MySQL verification addendum — 2026-10-12 20:44 +03:00

All commands below targeted `erp_test` through the explicit `mysql_test` connection. The integration tests and constraint runner check the selected database identity and fail rather than proceed if it is not `erp_test`.

- Before `php artisan test`: `DATABASE BEFORE FULL SUITE: erp_test (mysql_test)`. Command: `AUTH_TEST_CONNECTION=mysql_test php artisan test` (default non-integration suite remained on in-memory SQLite). Result: **115 passed, 1,947 assertions**, 64.690 seconds.
- Before `php scripts/run-phase1-constraints.php mysql_test`: `DATABASE BEFORE CONSTRAINT SUITE: erp_test (mysql_test)`. Runner confirmed `MYSQL_TEST 8.4.3 DATABASE erp_test`. Result: **21 passed, 0 failed**.
- Before `php artisan test --filter=route_list_shows_only_health_and_login_as_public_and_protects_all_other_routes`: `DATABASE BEFORE ROUTE-PERMISSION AUDIT: erp_test (mysql_test)`. Environment selected `DB_CONNECTION=mysql_test` and `AUTH_TEST_CONNECTION=mysql_test`. Result: **1 passed, 461 assertions**.

No application or test code was changed for these checks. The test suites and constraint runner used only `erp_test`. One preliminary read-only `artisan db:show --database=mysql_test` preflight printed schema metadata for the server's databases, including `erp_scratch`; it did not read table rows or modify any database. No further cross-database inspection was performed.
