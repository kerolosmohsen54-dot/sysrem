# Frontend / Mobile API Contract Diff

**Compared:** current `backend/docs/openapi.yaml` (OpenAPI 3.1.0, contract
1.2.0; 135 operations total, 29 mobile) and
`docs/backend/MOBILE_API_NOTES.md` against frontend API modules, shared API
types, generated OpenAPI declarations, MSW handlers, and application routes.
**Audit mode:** static/read-only comparison, before implementation.

## Summary

- The frontend generated type declaration comes from
  `frontend/api-contract/openapi.snapshot.yaml`, version **1.1.0**. The current
  backend contract is **1.2.0**.
- The frontend client, API modules, MSW handlers, and route tree contain no
  mobile-device/source/message API surface. A search of those frontend trees
  found no `/mobile/` endpoint or mobile contract schema definitions.
- Consequently all **29 mobile method/path operations** listed below are
  missing from the frontend client/types/MSW surface. There are no existing
  mobile payload implementations to compare field-by-field; the contracted
  schemas and behavioral differences that must be represented are listed
  below.
- Existing React app shell “mobile menu” styling is responsive web navigation,
  not a mobile API or companion-management screen.

## Missing mobile operations

Every operation below exists in `backend/docs/openapi.yaml` but has no
frontend API wrapper, route-bound mobile screen, or MSW handler.

| # | Method | Contract path | Operation ID | Contract permission |
|---:|---|---|---|---|
| 1 | POST | `/mobile/auth/login` | `mobileLogin` | Public login; requires `mobile.use` for user eligibility |
| 2 | GET | `/mobile/auth/me` | `mobileCurrentUser` | `mobile.use` |
| 3 | POST | `/mobile/auth/confirm-password` | `confirmMobilePassword` | `mobile.use` |
| 4 | POST | `/mobile/auth/logout` | `mobileLogout` | `mobile.use` |
| 5 | GET | `/mobile/devices` | `mobileListDevices` | `mobile.devices.manage`, 10-minute step-up |
| 6 | PATCH | `/mobile/devices/{deviceId}` | `mobileRenameDevice` | `mobile.devices.manage`, CSRF, 10-minute step-up |
| 7 | POST | `/mobile/devices/{deviceId}/revoke` | `mobileRevokeDevice` | `mobile.devices.manage`, CSRF, 10-minute step-up |
| 8 | GET | `/mobile/channels` | `mobileListChannels` | `mobile.use` |
| 9 | POST | `/mobile/channels` | `mobileCreateChannel` | `mobile.channels.manage`, idempotency, step-up |
| 10 | PATCH | `/mobile/channels/{channelId}` | `mobileUpdateChannel` | `mobile.channels.manage`, idempotency |
| 11 | DELETE | `/mobile/channels/{channelId}` | `mobileArchiveChannel` | `mobile.channels.manage`, idempotency, step-up |
| 12 | GET | `/mobile/sources` | `mobileListSources` | `mobile.channels.manage` |
| 13 | POST | `/mobile/sources` | `mobileCreateSource` | `mobile.channels.manage`, idempotency |
| 14 | PATCH | `/mobile/sources/{sourceId}` | `mobileUpdateSource` | `mobile.channels.manage`, idempotency |
| 15 | DELETE | `/mobile/sources/{sourceId}` | `mobileArchiveSource` | `mobile.channels.manage`, idempotency |
| 16 | GET | `/mobile/categories` | `mobileListCategories` | `mobile.withdrawals.register` or `mobile.categories.manage` |
| 17 | POST | `/mobile/categories` | `mobileCreateCategory` | `mobile.categories.manage`, idempotency, step-up |
| 18 | PATCH | `/mobile/categories/{categoryId}` | `mobileUpdateCategory` | `mobile.categories.manage`, idempotency |
| 19 | DELETE | `/mobile/categories/{categoryId}` | `mobileArchiveCategory` | `mobile.categories.manage`, idempotency |
| 20 | POST | `/mobile/messages/batch` | `mobileIngestMessageBatch` | `mobile.use`, idempotency |
| 21 | POST | `/mobile/customers` | `mobileCreateCustomer` | `mobile.customers.create`, idempotency |
| 22 | GET | `/mobile/sync` | `mobileSync` | `mobile.use` |
| 23 | GET | `/mobile/ping` | `mobilePing` | `mobile.use` |
| 24 | GET | `/mobile/messages` | `mobileListMessages` | `mobile.use` |
| 25 | PATCH | `/mobile/messages/{messageId}/amount` | `mobileReviewMessageAmount` | `mobile.use`, idempotency |
| 26 | POST | `/mobile/messages/{messageId}/ignore` | `mobileIgnoreMessage` | `mobile.use`, idempotency |
| 27 | POST | `/mobile/messages/{messageId}/register-deposit` | `mobileRegisterDeposit` | `mobile.deposits.register`, idempotency |
| 28 | POST | `/mobile/deposits/manual` | `mobileRegisterManualDeposit` | `mobile.deposits.register`, idempotency |
| 29 | POST | `/mobile/messages/{messageId}/register-withdrawal` | `mobileRegisterWithdrawal` | `mobile.withdrawals.register`, idempotency |

## Contract schema and behavior differences to address

### Source definitions and device capture settings

- `MobileSource` includes a **shared** source definition (channel, kind,
  sender identifier, package names, keywords, parser fields, status) and
  **requesting-device-only** settings: `device_id`, `is_enabled`,
  `read_deposits`, and `read_withdrawals`. The response also includes shared
  defaults `default_read_deposits` and `default_read_withdrawals`.
- Frontend has no source/device types or UI. The source settings must not be
  represented as globally shared switches: the mobile API notes state a
  device's switches do not change another device's values.
- Source list/create/update/archive operations and their request schemas are
  absent. In particular, create requires `channel_id`, `source_kind`,
  `read_deposits`, and `read_withdrawals`; `is_enabled` applies to the
  authenticated device, while defaults are shared configuration.

### Devices and permissions

- `MobileDevice` list response is paginated and must never expose a token or
  token hash. Rename requires `{name}`; revoke is a separate operation.
- All device listing/rename/revoke operations require `mobile.devices.manage`
  and a valid ten-minute **browser-session** step-up; mutations additionally
  require CSRF. The frontend has no device-management route, client, types,
  or MSW behavior.
- Mobile channel/source UI uses `mobile.channels.manage`; balance fields are
  decimal strings and only included with `mobile.balances.view`.
- The contract applies the global `sessionCookie` security to device
  list/rename/revoke (no operation-level security override), but source and
  message operations explicitly require `mobileBearer`. The existing
  frontend `apiRequest` sends same-site browser cookies, not a mobile bearer
  token. Therefore the frontend cannot call source/message operations as
  currently specified; the mobile notes describe owner browser device/source
  administration, so that description conflicts with OpenAPI for source
  operations. No authorization mode is inferred or changed here.
- `GET /mobile/devices` is described as a paginated device list including
  sources, but does not define a response schema or device/source item
  properties. Exact device-list response fields are **NOT VERIFIED** from
  the contract.

### Server-classified messages and review state

- `POST /mobile/messages/batch` accepts an optional client `type` hint, but
  direction is classified by the server from the source keywords and that
  device's switches. Frontend must not classify or override direction.
- Batch results use server-returned types/statuses; duplicate results are
  reported rather than reposted as new. Unmatched/OTP/direction-disabled
  messages reject the request without persistence (contract behavior).
- The contract's `MobileMessageBatchResponse` allows result statuses
  `new`, `needs_review`, and `duplicate`; syncing message status includes
  `new`, `registered`, `ignored`, `needs_review`, and `archived`.
- `MobileMessageItem.type` currently declares only `deposit` and
  `withdrawal`; the sync response separately has `message_type` enum
  `deposit`, `withdrawal`, `ambiguous`. The contract therefore does not
  expose `ambiguous` consistently in the message-item type field. This is an
  OpenAPI schema discrepancy; **NOT VERIFIED** whether it is intentional or
  should be normalized to `ambiguous` in `MobileMessageItem.type`.
- `needs_review` is a message status, including when amount is unclear or
  keyword sets overlap. It must not be dropped or converted into a guessed
  deposit/withdrawal. The frontend currently has no message type/state model,
  review UI, API client, or MSW representation.
- Raw text is write-only on ingestion and is returned only when the caller
  has `mobile.messages.view`; it must never be logged.

### Money and sync

- Mobile EGP values are strings (`EgpAmount`); no floating-point client math.
  Frontend has no mobile amount/result types or handlers.
- Sync returns paginated deltas/snapshot for customers, channels, categories,
  shared source definitions, this device's switches, and this user's message
  statuses. `ping` returns the current cursor. Both operations and schema
  types are absent in the frontend.
- Idempotency keys are required for replayable mobile business-data writes.
  Authentication control-plane and browser device administration are not
  offline business writes.

## Comparison limits / NOT VERIFIED

- **NOT VERIFIED:** Current live response payloads were not obtained; this
  diff uses the checked-in OpenAPI and mobile API notes only.
- The audit was completed before implementation. During follow-up, the
  frontend OpenAPI snapshot and generated declaration were refreshed from the
  current backend contract. Generation initially failed because the backend
  document has an unquoted colon in the plain-scalar description at line
  3334. The frontend snapshot quotes that same description; its meaning is
  unchanged. The backend file was not modified.
- The generated schemas now provide contract-derived source, message,
  batch-result, and sync-message types through `shared/api/types.ts`.
- Device/source screens and their MSW handlers remain deferred: the contract
  omits the device-list response schema, and source/message operations require
  a mobile bearer token the browser client does not possess. Per the owner's
  decision, this report does not invent response fields or add a new browser
  authentication flow. The shared source schema preserves per-device
  `is_enabled`, `read_deposits`, and `read_withdrawals`.
- **NOT VERIFIED:** Runtime permission/CSRF/step-up behavior. Permission and
  operation facts above are read from the contract and notes, not live calls.
- **NOT VERIFIED:** Live API payload compatibility. No backend calls were
  made.

## Implementation disposition and checks

- Refreshed `frontend/api-contract/openapi.snapshot.yaml` to backend contract
  1.2.0 and regenerated `frontend/src/shared/api/generated/schema.d.ts`.
  Added contract-derived `MobileSource`, `MobileMessageItem`,
  `MobileMessageBatchResult`, and `MobileSyncMessage` aliases to
  `frontend/src/shared/api/types.ts`. Source switch types remain
  per-device; money fields remain contract strings.
- No mobile route, API wrapper, or MSW handler was added. Device list item
  fields are unspecified, and source/message routes require mobile bearer
  authentication unavailable to this browser frontend. The contract also
  leaves `MobileMessageItem.type` without `ambiguous` even though sync and
  batch-result types permit it. Per the owner's choice, those UI/mock changes
  await a corrected contract rather than fabricated fields or an added auth
  flow.
- Dependency install check: `npm ls --depth=0` **passed**.
- `npm run typecheck`: **passed**.
- `npm run lint`: **passed**.
- `npm test`: **22 test files passed; 74 tests passed**.
- `npm run build`: **passed**; 67 production files checked, no unapproved
  external URL literals.
- `npm run contract:check`: **passed**; 78 API method/path calls checked,
  0 missing.
- `npm run a11y` using installed Chrome: **34 views, 0 axe violations**;
  390px and 768px dashboard widths had no horizontal overflow. The initial
  invocation without a browser executable failed because Playwright's
  bundled Chromium was absent; rerunning with the installed Chrome passed.
- **NOT VERIFIED:** Runtime permission/CSRF/step-up behavior. Permission and
  operation facts above are read from the contract and notes, not live calls.
