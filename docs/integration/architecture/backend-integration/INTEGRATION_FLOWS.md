# Integration Flows

## 1. Login & session (topology A, cookie)
1. `GET /auth/me` on boot → 401 → `/login`.
2. `POST /auth/login {identifier,password}` → sets HttpOnly session cookie, returns user + CSRF token.
3. Client stores user/permissions/CSRF **in memory**. Every non-GET sends `X-CSRF-Token`.
4. 401 anywhere → clear memory → `/login?next=`. Logout → `POST /auth/logout`.
5. Idle warning dialog uses Settings values; server expiry is authoritative.

## 2. Issue invoice (one click, three server steps)
```
Form opens → key K generated
Submit → POST /sales/invoices        (Idempotency-Key K:draft)   → draft id
       → POST /sales/invoices/{id}/post (K:post)                  → posted invoice (server number)
       → if collect-now: POST /sales/receipts (K:receipt)
Success → invalidate cache set → /sales/invoices/{id}
Retry after failure re-uses same keys: replays are safe, never duplicates.
Partial failure (draft ok, post fails): draft stays; UI offers "retry post" on the draft page. Nothing silently half-posted.
```
Server-side post is one DB transaction (stock out + receivable + audit [+COGS per D2]); either everything or nothing.

## 3. Return
`GET …/returnable` → user picks qty ≤ returnable and condition (sound/damaged) → `POST …/returns` (key). UI limit is advisory; server returns 422 `OVER_RETURN` if exceeded.

## 4. Receipt with allocation
`POST /sales/receipts {customer, treasury, amount, allocations[]}`; 422 `OVER_ALLOCATION` if Σallocations > amount or > invoice outstanding. Then refetch invoices, statement, treasury.

## 5. Container receive
`POST /containers/{id}/receive` once; second call → 409 `ALREADY_RECEIVED` → UI shows the existing receipt.

## 6. Concurrency
Two users selling the last unit: one gets 422 `INSUFFICIENT_STOCK`; UI shows it on the line and refetches balance. No optimistic updates for money/stock.

## 7. Cache invalidation
Use the mutation → query-key table in the frontend `FRONTEND_STATE_AND_DATA_FLOW.md` §4 unchanged; the endpoint renames above do not affect keys.
