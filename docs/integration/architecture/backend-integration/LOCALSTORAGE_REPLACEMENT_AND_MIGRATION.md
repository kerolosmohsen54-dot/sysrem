# localStorage Replacement & Data Migration (integration view)

## Key-by-key disposition [VERIFIED keys, PROPOSED disposition]
| Key / global | Today | Target |
|---|---|---|
| `ps-erp-v4`, `ps-fin2` (`DB`, invoices, cashiers) | business data in browser | **server only**; legacy export used once for migration |
| `ps-settings` (`ST`: companies, WhatsApp numbers) | settings | `/admin/settings` |
| `ps-locs`, `ps-dmg`, `ps-trf`, `ps-retdocs`, `ps-wret`, `ps-cmov`, `ps-fix` | stock locations/damaged/transfers/returns | derived from server inventory ledger |
| `ps-expenses`, `ps-drivers`, `ps-bd` | finance/driver data | server (drivers Cond D7) |
| `ps-role` | **role in browser, user-editable** | removed; role/permissions from `/auth/me` |
| `ps-cust-pw`, `ps-edit-pw-h`, `ps-fin-pin` | default-`1234` gates | removed; replaced by server permissions (`customers.balance.read`, edit permissions) |
| `ps-theme`, sidebar state, last filters | UI prefs | **stay** in `localStorage` (non-sensitive) |
| `ps-v17-seed`, `ps-v18-seed`, `ps-v32-wiped`, `ps-x-daily-last` | MVP flags | dropped |
| `SEQ`, `DB.purchaseSeq`, invoice numbers | browser-generated | server-assigned |

## Rules
1. Frontend must **never** call `localStorage.setItem` for business data (ESLint rule + test).
2. Old and new systems never accept data at the same time: freeze legacy entry at a cut-off date.
3. Import path: user exports the legacy keys to a raw JSON file (keep untouched) → an admin-only importer on the server validates and loads **reference data** (customers, products, locations, accounts) and **opening balances as opening movements** — not editable numbers → reconciliation report signed by the admin and accountant → legacy becomes read-only.
4. No invented history: legacy data has no full ledger, so past movements/entries are not fabricated; only the opening position is imported.
5. The importer tolerates multiple legacy shapes (seed/wipe flags show the model changed between versions) — a characterization run on real exports is required before writing it.
6. Importer endpoint `POST /admin/import` is **dry-run by default** and returns a diff; a second explicit call commits (needs approved schema + D1/D2 decisions).
