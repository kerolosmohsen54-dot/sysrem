# Frontend ⇄ Backend Integration Architecture

Status: **PROPOSED — design only.** Sources: the backend set in `docs/backend/` and the frontend set (7 docs, `files.zip`). Same rule as before: **[VERIFIED]** = from supplied files, **[PROPOSED]** = needs approval, **[BLOCKED]** = depends on missing info (approved MySQL schema is still not supplied).

## 1. The two sides at a glance [VERIFIED]
| | Frontend (supplied docs) | Backend (my docs) |
|---|---|---|
| Stack | React 18 + TS + Vite + TanStack Query + RHF/Zod, static `dist/` | Laravel (existing-schema mode), PHP, MySQL/MariaDB |
| Auth | Cookie session + CSRF **or** bearer — undecided (F-02) | Same — undecided (G-05) |
| Money | decimal **strings** | decimal strings |
| Idempotency | `Idempotency-Key` on posting mutations | same |
| UI/UX | Existing look preserved (tokens ported verbatim) | n/a |
Both sides already agree on the principles. The work below removes the **points where the two contracts differ**.

## 2. Contract conflicts and the single canonical choice [PROPOSED]
| # | Topic | Frontend doc says | Backend doc says | **Canonical (proposed)** |
|---|---|---|---|---|
| 1 | Success envelope | `{data}`; lists `{data,page,limit,total}` | `{data, meta:{request_id}}`; lists `meta:{page,limit,total}` | Backend form. Frontend reads `meta.page/limit/total`. |
| 2 | Error body | `{error:{code,message,fields?:{name:msg},requestId}}` | `{error:{code,message,details:[{field,issue}]},meta:{request_id}}` | `{error:{code,message,fields:{"lines.0.qty":"…"},details?:[…]},meta:{request_id}}` — server sends **both** `fields` (for forms) and `details` (machine). Frontend uses `fields`. |
| 3 | Receipts path | `POST /receipts` | `POST /sales/receipts` | `POST /sales/receipts` |
| 4 | Stock balance | `GET /inventory/balance` | `GET /inventory/balances` | `GET /inventory/balances` |
| 5 | Login field | `{identifier,password}` (MVP login is phone-only) | `{username,password}` | `{identifier,password}`; backend accepts phone or username. **Open:** whether phone-only login is acceptable security (see §6). |
| 6 | Treasury path | `/finance/treasury-accounts` | `/finance/treasuries` | `/finance/treasuries` |
| 7 | Users admin | `/admin/users`, `/admin/roles` | `/users` | `/admin/users`, `/admin/roles` |
| 8 | Settings | `/admin/settings` | `/settings` | `/admin/settings` |
| 9 | Transfer vs create+post | MVP has one "issue" button (Ctrl+↵) | create draft then `/post` | Keep two calls; frontend chains them (see FLOWS). One-call variant only if business insists. |
| 10 | Request id header | `X-Request-Id` | `X-Request-Id` | same (client generates, server echoes) |
| 11 | Permission names | proposed e.g. `invoices.create`, `receipts.read` | proposed e.g. `sales.create`, `collections.write` | **One list** — see PERMISSION_CATALOG in `SCREEN_TO_ENDPOINT_MAP.md` (frontend names win; backend adopts) |
After approval, the backend docs get a small edit to align (items 1–8, 11); nothing else changes.

## 3. Endpoints the frontend needs that the backend catalog lacks (NEW) [PROPOSED]
`GET /auth/me`, `POST /auth/change-password`, `GET /customers/{id}` (detail+recents), `GET /customers/balances`, `GET /sales/invoices/{id}/returnable`, `GET /sales/collections`, `GET /products`, `GET /inventory/receipts`(stock-in) + `POST`, `GET /finance/{ledger,journal,trial-balance,coa}`, `GET /containers/{id}/landed-cost`, `GET /dashboard`, `GET /search`, `GET /reference/governorates`, `GET /admin/trash` (+restore), `POST /admin/import`, attachments `POST /customers/{id}/attachments`.
Rule: nothing here is built until its screen's gating decision is made (D7/D8/D9, trash vs "no delete of posted docs", file storage G-06).

## 4. Integration architecture
```
React page → feature hook (TanStack Query) → feature api service → shared http client → /api/v1 (Nginx) → Laravel → Service → Repository → MySQL
```
- **One http client** (`shared/api/http.ts`): base URL from `VITE_API_BASE_URL`, `credentials` per auth mode, adds `X-Request-Id`, adds `Idempotency-Key` only when the caller supplies one, normalizes errors into `ApiError`, handles 401 centrally. Skeleton in `API_CLIENT_SPEC.md`.
- **Types:** hand-written first; once backend publishes `openapi.yaml` (draft here), generate types (`openapi-typescript`) and delete hand-written copies.
- **Money/qty:** strings end-to-end; client math only for preview, labeled "تقديري"; server recomputes and its numbers win.
- **No business data in `localStorage`.** See `LOCALSTORAGE_REPLACEMENT_AND_MIGRATION.md`.

## 5. Deployment topology (decision F-02 / G-05) [PROPOSED]
| Option | When | Auth | CORS |
|---|---|---|---|
| **A. Same site, path-routed** — `app.example.com` serves `dist/`, `/api/*` proxied by Nginx to PHP-FPM | **Recommended** | HttpOnly+Secure+SameSite=Lax cookie session + CSRF header | none needed (same origin) |
| B. Subdomains `app.` / `api.` | OK if same registrable domain | Same cookie with `Domain=.example.com`, SameSite=Lax; CSRF header | allow-list exactly `https://app.example.com`, `credentials: true` |
| C. Different domains | avoid | opaque bearer token in memory (never localStorage) | allow-list, no cookies |
Recommendation: **A** on one Hostinger VPS. It removes CORS, third-party-cookie problems and token storage risk.

## 6. Open items that need your decision
1. F-02 / G-05: topology A/B/C above (blocks login implementation).
2. Phone-only login: the MVP's field says "write your phone number" with no password. A server cannot authenticate on a phone number alone. Proposal: phone/username **+ password**.
3. Create+post: one UX click chained into two calls (recommended) vs one backend call.
4. Collect-now: creates a **separate receipt** (recommended, consistent with backend model).
5. Trash/restore screen vs "posted documents are never deleted".
6. Bulk PDF / WhatsApp: no integration defined (client `wa.me` link only, or server PDF).
7. D1 currency model: MVP has per-customer/order currency columns and a `currencies` screen; backend assumes one currency until D1.
8. Sidebar width 240 vs 196 (frontend F-question; no backend impact).
9. **Still blocked:** exact field names (need the schema); all D1–D10 financial rules.
