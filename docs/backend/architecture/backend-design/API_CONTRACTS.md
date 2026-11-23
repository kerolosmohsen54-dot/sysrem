# API Contracts [PROPOSED — coordinate with Frontend Architecture before freezing]

Decision baseline: [OWNER_DECISIONS_ALIGNMENT.md](./OWNER_DECISIONS_ALIGNMENT.md). Design only; schema approval and runtime behavior NOT VERIFIED.

Field-level payloads depend on the unverified schema; shapes below define the **envelope and conventions** plus representative contracts. Money values are **decimal strings** (e.g. `"1250.50"`), never JSON floats. Dates ISO-8601.

## Headers
`Authorization`, `Content-Type: application/json`, `Accept-Language: ar`, `X-Request-Id` (echoed back), `Idempotency-Key` (UUID, required on marked POSTs).

## Success envelope
```json
{ "data": { }, "meta": { "request_id": "…" } }
```
List: `{ "data": [ ], "meta": { "page": 1, "limit": 25, "total": 130, "request_id": "…" } }`
Query: `page`, `limit` (max 100), `q`, `from`, `to`, `status`, `sort=-created_at`.

## Error envelope
```json
{ "error": { "code": "INSUFFICIENT_STOCK", "message": "…", "details": [ { "field": "lines.0.qty", "issue": "exceeds_available" } ] }, "meta": { "request_id": "…" } }
```
| HTTP | Meaning | Example codes |
|---|---|---|
| 400 | Malformed/validation | VALIDATION_FAILED |
| 401 | Not authenticated | UNAUTHENTICATED, TOKEN_EXPIRED |
| 403 | Not permitted | FORBIDDEN |
| 404 | Not found | NOT_FOUND |
| 409 | Conflict/duplicate/concurrency | DUPLICATE_DOCUMENT, IDEMPOTENCY_REPLAY_MISMATCH, ALREADY_POSTED, STALE_REVISION |
| 422 | Business rule | INSUFFICIENT_STOCK, OVER_RETURN, OVER_ALLOCATION, UNBALANCED_ENTRY |
| 429 | Rate limited | TOO_MANY_ATTEMPTS |
| 500 | Generic; no internals leaked | INTERNAL_ERROR |

Idempotency: same key + same body hash → original response replayed (`Idempotent-Replayed: true`); same key + different body → 409.

## Representative contracts

### POST /auth/login
Req `{ "username": "…", "password": "…" }` → 200 `{ "data": { "token"|session, "expires_at", "user": { "id","name","roles":[],"permissions":[] } } }`. Failures return one generic `UNAUTHENTICATED` (no user enumeration). Throttled.

### POST /sales/invoices (draft)
Req (proposed; fields grounded in HTML invoice object)
```json
{ "customer_id": 1, "issuer_user_id": null, "issuer_name_snapshot": "designated issuer", "driver": ".", "payment_terms": ".", "due_date": "2026-11-01",
  "notes": "", "discount": "0.00",
  "lines": [ { "product_id": 10, "location_id": 3, "qty": 2, "unit_price": "100.00" } ] }
```
Validation: customer exists/active; lines ≥1; qty > 0; price ≥ 0; discount ≤ subtotal; due_date ≥ issue date. **Server recomputes totals; client totals ignored.** 201 → draft document with server number (number assigned at post or create — **open**, see D-Numbering).

### POST /sales/invoices/{id}/post
Req `{}` + `Idempotency-Key`. Atomic post: lock stock/document, reject negative stock, snapshot global sales_tax enabled/rate on each issued line, compute exact EGP totals with nearest-piastre line rounding, write weighted-average issue cost snapshots, stock/receivable/approved journals and audit. Credit-limit exceedance is a response warning, never a rejection. Replay same idempotency request; reject a different attempt to post the same version again.

### POST /sales/receipts
Req `{ "customer_id","treasury_id","method","amount","reference","allocations":[{"invoice_id","amount"}] }` — Σallocations ≤ amount; each ≤ invoice outstanding.

### POST /inventory/transfers
Req `{ "from_location_id","to_location_id","lines":[{"product_id","qty"}],"note" }` — from≠to; atomic out+in.

### POST /containers/{id}/receive
Req (shape proposed) `{ "location_id": 3, "received_at": "2026-10-09T12:00:00+03:00", "allocation_basis": "value", "lines": [{ "container_line_id": 1, "received_quantity": 2 }] }`. Basis must be value, quantity or manual. Single/multiple/partial receipt events allowed; replay duplicates by event/request identity, not by container. Receipt/movement/cost lineage and weighted-average valuation update atomically; cumulative quantity bounds and cost timing require approved rules.

## Items needing frontend coordination
EGP decimal-string payloads and whole quantities; draft/post numbering; token versus cookie/CSRF; print/list fields; Arabic messages; exact designated issuer names and logins; revision identifiers and history payload; tax convention/formula. Revision/opening/reference fields remain proposed until approved schema mapping.

## Posted invoice edits (OD-10)
Proposed POST /sales/invoices/{id}/revisions: Idempotency-Key, expected current revision, mandatory reason and revised fields/lines. Owner only. In one transaction reverse old stock/receivable/journal effects, record/post the new version and retain BOTH versions. Persist every changed field with old/new/actor/time/reason; include line additions/removals. Reuse audit_logs where adequate; physical storage and API field names await approved schema. Response exposes revision lineage/history only under permission checks; cost fields owner only. GET /sales/invoices/{id}/history is proposed.

## Additional owner contracts
- Orders/deliveries full fulfillment only: reject partial order invoicing/delivery; preserve order -> invoice -> delivery -> stock without double issue. Owner decision: order confirmation does not reserve stock and warns without blocking when available stock is insufficient; linked invoice posting is the sole stock issue. Delivery header and line each require exactly one order/invoice source.
- Returns may link to original_invoice_line_id or be free with a null link; linked quantities cannot exceed remaining returnable quantities. Refund/valuation OPEN.
- Customer phone unique, name non-unique; normalization OPEN.
- Opening receivables/stock/treasury use dated distinguishable documents/movements, never fixed balance fields.
- Optional foreign original amount/rate/currency-code text on container costs are reference-only (OD-19); all operational amounts/calculations EGP.
