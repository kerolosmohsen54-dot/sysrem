# Mobile Deposit and Withdrawal Capture Backend Report

## Status

Backend capture endpoints and finance posting are implemented. The new tables are forward-only, existing treasury and collection posting services are reused, and existing Companion API clients retain their legacy request shapes through route dispatch based on the payload and filters.

## Files and migrations

- `backend/database/migrations/2026_10_14_000001_create_mobile_capture_tables.php` creates `mobile_payment_channels` and `mobile_captured_messages`, with the requested unique and query indexes.
- `backend/database/migrations/2026_10_14_000002_add_mobile_capture_permissions.php` adds the three missing permissions and owner grants. Its `down()` removes only the grants. The preexisting seeder was restored.
- `backend/app/Http/Controllers/MobileCaptureController.php` implements channel CRUD without delete, capture and dedupe, message listing, record deposit/withdrawal, manual postal deposits, category listing/creation, balance formatting, and audit events.
- `backend/app/Services/MobileCaptureCollectionService.php` adapts idempotency keys and delegates collection posting to `SalesService`.
- `backend/app/Services/MobileCaptureWithdrawalService.php` delegates expense and drawer-transfer posting to `TreasuryService`.
- `backend/routes/api_v1.php` adds the capture, record, manual-deposit, category, and channel-detail routes under the existing mobile token middleware. Existing channel and message routes continue to accept their prior request formats.
- `backend/tests/Feature/MobileFinanceEngineTest.php` contains the real HTTP flow coverage against the local API.
- `backend/docs/openapi.yaml` and `backend/docs/openapi.v2.yaml` describe the capture API paths and schemas.

The posting code reuses `SalesService::recordCollection`, `TreasuryService::postExpense`, `TreasuryService::postTransfer`, `TreasuryService::createAccount`, and `TreasuryService::updateAccount`. It does not duplicate treasury or customer collection posting.

## Endpoints

| Method and path | Behavior |
| --- | --- |
| GET `/api/v1/mobile/channels` | Paginated channels; supports `type` and `paused` filters. |
| POST `/api/v1/mobile/channels` | Creates a channel and treasury account; flags default enabled. |
| GET `/api/v1/mobile/channels/{channelId}` | Returns channel fields and decimal balance. |
| PATCH `/api/v1/mobile/channels/{channelId}` | Updates channel settings, including pause and direction flags. |
| POST `/api/v1/mobile/messages/capture` | Enforces sender/channel matching, derives direction from configured keywords, and returns 200 for dedupe hits. |
| GET `/api/v1/mobile/messages` | Paginated captured messages with direction/status filters. |
| POST `/api/v1/mobile/messages/{messageId}/record-deposit` | Posts an unapplied collection and marks the message recorded once. |
| POST `/api/v1/mobile/messages/{messageId}/record-withdrawal` | Posts an expense or configured treasury transfer; requires notes for “other” and newly named categories. |
| POST `/api/v1/mobile/manual-deposits` | Posts a manual postal collection; chooses the sole active postal channel or accepts `channel_id` when there are multiple. |
| GET/POST `/api/v1/mobile/withdrawal-categories` | Lists active categories and creates a unique user category. |

All writes require `Idempotency-Key`. Dedupe is also protected by the unique `dedupe_key` index. Duplicate captures return the existing message with HTTP 200; a second record attempt returns 422 with `error.details.status`.

## Tests and OpenAPI validation

All six mobile test files ran against the specifically targeted test database on both engines:

| Engine | Result | Tests | Assertions |
| --- | --- | ---: | ---: |
| `mysql_test` (`erp_test`) | Passed | 32 | 749 |
| `mariadb_test` (`erp_test`) | Passed | 32 | 749 |

The new HTTP case verifies channel validation, pause without deletion, 403 permission denial, capture and duplicate dedupe, sender mismatch rejection, deposit/withdrawal record-once behavior, notes required for “other,” manual source `MANUAL`, decimal amount preservation, exact channel balance `8.15`, and pagination over 50 channels.

Symfony YAML parser result: both `backend/docs/openapi.yaml` and `backend/docs/openapi.v2.yaml` parsed successfully.

## Verification decisions

### Approved decisions

- Capture uses a valid mobile bearer token and `mobile.messages.capture`. There is no per-operation password confirmation or browser CSRF requirement.
- A drawer withdrawal decreases the channel balance and increases the drawer balance under the chosen category.
- Deposits are unapplied customer collections without invoice links.
- The active "other" withdrawal category is visible to all authenticated mobile users.

`git show 634c712` changes a lookup of absent response field `channel['treasury_account_id']` to a lookup of `treasury_account_id` in `mobile_payment_channels`. The expected value remains one channel outflow and one drawer inflow. A `5.00` deposit followed by a `1.25` drawer withdrawal must leave `3.75` in the channel and add `1.25` to the drawer. Real HTTP assertions now verify both balances. The test correction is valid and was kept; no service change was needed.

The requested `git show c0ec4f4 -- backend/database/seeders/RolePermissionMatrixSeeder.php` has no diff. The seeder additions were made in `5e5ca7a`. Commit `afa3ea5` restores that seeder; commit `5b5bb42` adds the forward permission migration. On `mysql_test` / `erp_test`, `migrate`, `migrate:rollback --step=1`, and `migrate` succeeded. The rollback affected only `2026_10_14_000002_add_mobile_capture_permissions` and removed only its owner grants. The migration was also applied on `mariadb_test` / `erp_test` before the final test run.

The `mysql_test` migration status lists `2026_10_13_000026_add_inventory_count_permissions` in batch 12, followed by `2026_10_14_000001_create_mobile_capture_tables` in batch 13. The permission migration followed in batch 14. No applied migration was renamed.

The unchanged role seeder resets owner grants when it runs. **Rerunning `db:seed` removes the three capture grants** after the permission migration. The HTTP test fixture restores those grants after seeding. Recommended fix for later review: add a post-seed grant command or a migration check that restores the grants. Neither fix has been implemented.

DELETE `/api/v1/mobile/channels/{channelId}` previously invoked `MobileAdministrationController::archiveChannel`, which set `deleted_at` on a legacy channel and archived related sources and messages. It now returns 405 `METHOD_NOT_ALLOWED`; real HTTP tests verify both legacy and capture channel rows and counts remain intact. Both OpenAPI files document the 405 response.

## Real HTTP coverage

| Item | Test name | Status |
| --- | --- | --- |
| Channels 403 without `mobile.channels.manage` | `capture_write_permissions_validation_and_category_filters_are_enforced_over_http` | PASS |
| Channels 422: missing name, invalid type, missing sender, no keyword set; `error.details.<field>` | `capture_write_permissions_validation_and_category_filters_are_enforced_over_http` | PASS |
| Pause with PATCH; row and count unchanged | `capture_api_deduplicates_records_finance_and_paginates_channels` | PASS |
| Capture first 201, duplicate 200, same ID, one row | `capture_api_deduplicates_records_finance_and_paginates_channels` | PASS |
| Disabled channel 422 `error.details.channel_id` | `capture_api_deduplicates_records_finance_and_paginates_channels` | PASS |
| Record deposit creates collection and inbound entry; second call 422 `error.details.status` | `captured_deposit_posts_one_unapplied_collection_and_inbound_entry`; `capture_api_deduplicates_records_finance_and_paginates_channels` | PASS |
| Non-DEPOSIT message rejected by record-deposit with 422 | `capture_api_deduplicates_records_finance_and_paginates_channels` | PASS |
| Other withdrawal without notes 422 `error.details.notes`; second call 422 `error.details.status` | `capture_api_deduplicates_records_finance_and_paginates_channels` | PASS |
| Manual deposit source `MANUAL`, exact decimal string | `capture_api_deduplicates_records_finance_and_paginates_channels` | PASS |
| Categories list active only; duplicate name 422 | `capture_write_permissions_validation_and_category_filters_are_enforced_over_http` | PASS |
| 50 wallet channels across three pages; total 50 | `capture_api_deduplicates_records_finance_and_paginates_channels` | PASS |
| `read_only` gets 403 on all seven capture write routes | `read_only_role_is_forbidden_on_every_capture_write_endpoint` | PASS |
| Browser CSRF 419 and step-up 428 on mobile device write | `device_admin_routes_require_browser_session_step_up_and_revoke_mobile_tokens_immediately` | PASS |
| Same Idempotency-Key on channel write gives same ID and one row | `capture_write_permissions_validation_and_category_filters_are_enforced_over_http` | PASS |
| DELETE channel returns 405 and preserves legacy and capture rows | `source_definitions_are_shared_while_capture_settings_remain_device_local`; `delete_channel_is_rejected_and_capture_channel_row_remains` | PASS |
| Capture: missing or invalid bearer token 401 | `capture_rejects_missing_and_invalid_bearer_tokens` | PASS |
| Capture: valid token without `mobile.messages.capture` 403 | `capture_rejects_valid_token_without_capture_permission` | PASS |
| Capture: revoked device token 401 | `capture_rejects_revoked_device_token` | PASS |
| Capture: valid token works without CSRF or recent password confirmation | `capture_write_currently_accepts_mobile_token_without_csrf_or_recent_confirmation` | PASS; approved bearer-token policy |

Capture authentication is verified by real HTTP tests: the `api.mobile` group requires a valid non-revoked bearer token, and `MobileCaptureController::capture()` requires `mobile.messages.capture`. Mobile-token capture writes intentionally do not use browser CSRF or per-operation password confirmation. Browser CSRF and step-up checks still apply to mobile device administration; channel creation separately requires mobile password confirmation.

## Final test and API checks

The final runs passed **32 tests and 749 assertions** on each of `mysql_test` and `mariadb_test`, both targeting `erp_test`. `php artisan route:list --path=mobile --json` listed 36 route operations. Both Symfony-parsed OpenAPI files contain 36 matching mobile operations: **no route gaps**. An earlier MariaDB run had five 403 failures while the permission migration was pending; all passed after it was applied.

## Commits

- `feat: add mobile payment channels`
- `feat: add mobile capture and dedupe`
- `feat: add mobile deposit recording`
- `feat: add mobile withdrawals and categories`
- `test: correct mobile drawer account assertion`
- `docs: document mobile capture API`

## OPEN QUESTIONS

- Operational reseeding: rerunning `db:seed` removes the three migration-added capture grants. Recommended later fix: a post-seed grant command or migration check; neither has been implemented.
