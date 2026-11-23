# Mobile Companion API Map

Base path: `/api/v1`. Authenticated operations use `Authorization: Bearer <mobile token>`. All POST/PATCH writes use `Idempotency-Key` as documented by the API. Do not log tokens or raw messages. Amounts remain decimal strings. Show validation errors from `error.details.<field>`.

| Method and path | Auth / permission | Request fields | Response fields used | Validation / status |
| --- | --- | --- | --- | --- |
| POST `/mobile/auth/login` | Public mobile login; account must be permitted for mobile | username, password, device_name, optional device_model | data.access_token, token_type, expires_at, device | 401 invalid login; 403 denied; 422 field details; 429 limit |
| GET `/mobile/auth/me` | Bearer; mobile.use | — | user identity, effective permissions, device | 401/403 |
| POST `/mobile/auth/logout` | Bearer; mobile.use | — | success | 401 |
| POST `/mobile/auth/confirm-password` | Bearer; mobile.use | password | confirmation window | 401/422/429; required before channel creation |
| GET `/mobile/channels` | Bearer; mobile.use | page, per_page, optional search, channel_type/type, paused/status | data channels; meta pagination; `balance_egp` decimal string where permitted | 401; balance may be omitted without mobile.balances.view |
| POST `/mobile/channels` | Bearer; mobile.channels.manage; step-up | name, type, number, sender_filter, optional deposit_keywords/withdrawal_keywords, deposit_enabled/withdrawal_enabled | channel id/name/type/number/filter/keywords/enabled/paused/balance | 403/409/422/428; one keyword list is required; create sends idempotency key |
| GET `/mobile/channels/{channelId}` | Bearer; mobile.channels.view | channelId | channel configuration and decimal balance | 401/403/404 |
| PATCH `/mobile/channels/{channelId}` | Bearer; mobile.channels.manage | channelId; supported settings including active/paused status and flags | updated channel | 401/403/404/409/422; pause uses PATCH, never DELETE |
| DELETE `/mobile/channels/{channelId}` | Do not call | — | — | 405; channels are paused, not deleted |
| GET `/mobile/sources` | Bearer; mobile.channels.manage | page, per_page | data sources and this-device capture settings; meta | 401/403 |
| POST `/mobile/sources` | Bearer; mobile.channels.manage | channel_id, source_kind, sender_identifier and/or notification_package_names, read_deposits/read_withdrawals, optional is_enabled, keyword lists, parser settings | created source | 401/403/409/422; idempotency key |
| PATCH `/mobile/sources/{sourceId}` | Bearer; mobile.channels.manage | sourceId; source identity, enabled/direction switches, keyword lists, status | updated source | 401/403/404/409/422; idempotency key |
| POST `/mobile/messages/capture` | Bearer; mobile.messages.capture | channel_id, optional amount decimal string, raw_text, sender, received_at, 64-hex dedupe_key | data message id, direction, amount, status; 201 new / 200 duplicate | 401/403/422 `channel_id`; idempotency key equals dedupe key |
| GET `/mobile/messages` | Bearer; mobile.use | page, per_page, direction/type/status, channel/date/search/sort filters | data message id/type/direction/amount/channel/time/status/raw_text; meta | 401/403/422 |
| POST `/mobile/messages/{messageId}/record-deposit` | Bearer; mobile.messages.record | messageId, customer_id | id, status, recorded_as, recorded_ref_id | 201; 401/403/404/422 customer_id or status; key = message id |
| POST `/mobile/messages/{messageId}/record-withdrawal` | Bearer; mobile.messages.record | messageId; category_id or new_category_name; optional notes | id, status, recorded_as, recorded_ref_id and returned balance if provided | 201; 401/403/404/422 category/notes/status; key = message id |
| POST `/mobile/messages/{messageId}/ignore` | Bearer; mobile.use | messageId | id and ignored status | 200; 401/403/404/409/422; idempotency key |
| PATCH `/mobile/messages/{messageId}/amount` | Bearer; mobile.use | messageId, amount_egp decimal string | id, amount_egp, status, reviewed_at | 200; 401/403/404/409/422; idempotency key |
| POST `/mobile/manual-deposits` | Bearer; mobile.messages.record | customer_id, amount decimal string, date, optional note/channel_id | id, channel_id, amount, source=MANUAL, recorded_as, receipt | 201; 401/403/422; key required |
| GET `/mobile/withdrawal-categories` | Bearer; mobile.use | — | active category id/name/category_kind/requires_notes | 401/403 |
| POST `/mobile/withdrawal-categories` | Bearer; mobile.channels.manage | name | created category | 201; 401/403/422 duplicate/invalid name; key required |
| GET `/customers` | Bearer; mobile.use (browser session may also use this path) | page, per_page, search, sort_by, sort_direction | data customer IDs/names and meta pagination; balances are permission-dependent | 401/403/422 |`n| POST `/mobile/customers` | Bearer; mobile.customers.create | CustomerInput fields; name required, phone/email/address/etc optional | created customer id/name and customer fields | 201; 401/403/409/422; key required |
| GET `/mobile/sync` | Bearer; mobile.use | cursor, limit | next cursor, has_more, customers/channels/categories/sources/message status deltas, server_time | 200; 401/403/422; raw text is not returned |

Check each route against `backend/docs/openapi.yaml` during implementation. Capture-specific request shapes take precedence over legacy variants accepted by shared routes. iOS uses the manual/viewing subset; automatic capture remains Android-only.
