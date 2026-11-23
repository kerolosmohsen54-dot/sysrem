# Security Requirements

Decision baseline: [OWNER_DECISIONS_ALIGNMENT.md](./OWNER_DECISIONS_ALIGNMENT.md). Design only; schema approval and runtime behavior NOT VERIFIED.

| Area | Control |
|---|---|
| Passwords | Argon2id/bcrypt; remove all default/hard-coded passwords (`1234`) |
| AuthZ | Server-side endpoint + service checks; default deny; owner alone edits/reverses/corrects; two designated issuers create invoices; everyone else cannot mutate; cost/markup/profit owner only (OD-13/15) |
| SQL | PDO prepared statements only; explicit column lists; no string-built SQL; no dynamic sort columns except whitelist |
| Input/Output | Validate every request; whitelist resource serializers (never `SELECT *` to client); frontend must stop `innerHTML` with untrusted data (HTML builds rows by string concat — XSS risk; escaping function `E()` exists but is not universal) |
| CSRF | Required if cookie sessions; double-submit or Laravel token |
| CORS | Allow-list the exact frontend origin; no `*` with credentials |
| Rate limiting | Login, password reset, receipts/post endpoints (abuse) |
| Secrets | `.env` on server only, `chmod 600`, never committed; rotate on staff change |
| DB least privilege | App user: SELECT/INSERT/UPDATE (and DELETE only where a verified need exists) on the app schema; **no DDL**; separate read-only user for reports/`schema-verify`; audit table INSERT/SELECT only |
| Audit | Retained append-only history/evidence with actor, time, IP, entity, every changed field, old value, new value, reason; posted invoices ARE editable via owner reverse-and-record retaining both versions (OD-10); reuse audit_logs where adequate |
| Logging | Structured JSON; redact password/token/Authorization; request_id |
| Errors | Generic 500 in production (`APP_DEBUG=false`) |
| Transport | HTTPS only, HSTS, secure cookies, TLS via Let's Encrypt |
| Headers | `X-Content-Type-Options`, `Referrer-Policy`, CSP for any served HTML |
| Concurrency | Row locks + unique constraints + per-event/version idempotency; forbid negative stock; stale revision protection; edit effects/version/history atomic |
| Uploads | None identified; if logo/attachments added: type/size whitelist, outside web root, random names |
| Backups | Daily DB dump encrypted off-box; restore drill monthly |
| Dependencies | `composer audit` in CI; lock file committed |
Threats considered: credential stuffing, privilege escalation via client role, double-submit duplicate posting, race on last unit of stock, IDOR on `/customers/{id}`, XSS via stored names/notes, leakage of markup data (D6).
