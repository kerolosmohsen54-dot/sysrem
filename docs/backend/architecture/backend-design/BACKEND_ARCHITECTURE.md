# Precision Slate ERP — Backend Architecture

Decision baseline: [OWNER_DECISIONS_ALIGNMENT.md](./OWNER_DECISIONS_ALIGNMENT.md). Design only; schema approval and runtime behavior NOT VERIFIED.

Status: **ANALYSIS / DESIGN ONLY.** Nothing here is implemented. Items marked **[VERIFIED]** come from the supplied files; **[PROPOSED]** are design choices awaiting approval; **[BLOCKED]** depend on information that was not supplied.

## 1. Inspected inputs [VERIFIED]

| Artifact | Findings |
|---|---|
| `precision-slate-erp-v43…html` (821,223 bytes, 6,383 lines) | Single-file Arabic/RTL frontend. 18 `<script>` blocks, 10 `<style>` blocks, **0** `fetch`/`XMLHttpRequest` calls → no backend integration exists. 29 `sec-*` screens. All state in JS objects (`DB`, `ST`, `LOCS`, `DMG`, `TRF`, `RDOC`…) persisted to `localStorage` (`ps-erp-v4`, `ps-fin2`, `ps-settings`, `ps-locs`, `ps-dmg`, `ps-trf`, `ps-retdocs`, `ps-wret`, `ps-cmov`, `ps-fix`, `ps-drivers`, `ps-expenses`, `ps-bd`, `ps-role`, …). |
| `Precision_Slate_ERP_Blueprint_AR (2).pdf` | Arabic blueprint dated 9 Oct 2026. Describes current behavior, gaps, open decisions D1–D10, and a **target** design. |
| Backend task brief (provided as document) | Confirmed decisions: PHP, MySQL/MariaDB, Hostinger VPS, REST/JSON/HTTPS, approved schema changes require separate authorization; invoice edits follow OD-10. |
| Current artifacts | UNAPPROVED v1/v2/v3/v4 proposals exist; v4 has 47 tables. A portable v4.1 proposal is being validated separately. `docs/handoff/PROJECT_STATUS_HANDOFF.md` is a historical project audit, not current implementation status. |

## 2. Critical findings

1. **No approved schema is available.** v3 SQL/ERD/design are review artifacts. Round 2 OD-8..OD-20 are supplied owner decisions; their v4 DDL realization is NOT VERIFIED. DATABASE_SCHEMA_MAPPING.md records candidate mappings, not a live contract.
2. **The blueprint conflicts with the confirmed decisions.** It proposes Node.js/Express + PostgreSQL + Prisma + UUID keys + `NUMERIC(18,2)`. Per your confirmed decisions, those are **discarded**; only the blueprint's *functional* content (workflows, gaps, decisions D1–D10) is used. Blueprint table names (`sales_documents`, `stock_movements`, …) are **proposals, not facts**.
3. The current frontend has no server-enforced security: default password `1234` (lines ~4441, 5052, 6365), role stored in `localStorage` (`ps-role`, line ~4787) and switchable from a dropdown, permissions map `ALLOW={1:[…],2:'*',3:'*'}` (line ~4820) is UI-only.
4. Prototype currency/tax displays are historical defects. Current decisions select EGP, issue-time global tax snapshots and nearest-piastre invoice-line rounding; tax convention/formula remains OPEN.

## 3. Stack recommendation [PROPOSED]

| Option | Pros | Cons |
|---|---|---|
| **Laravel** (recommended) | Mature auth, validation (FormRequest), rate limiting, queues/scheduler, exception mapping, testing tooling, Hostinger-VPS friendly | Heavier; its migrations/Eloquent conventions assume you own the schema |
| Structured native PHP (PSR-4 + a micro-router + PDO) | Total control, small footprint | We would hand-build auth, throttling, validation, DI, testing glue → more security risk for an ERP |

**Recommendation: Laravel 13 on PHP 8.3, used in "existing schema" mode.** Laravel's official 13.x release notes require PHP 8.3+, and its database documentation lists MySQL 5.7+ and MariaDB 10.3+, which include the selected MySQL 8.0+ / MariaDB 10.6+ database floors. Production-host capabilities are still NOT VERIFIED; see [LARAVEL_13_SKELETON_PLAN.md](./LARAVEL_13_SKELETON_PLAN.md).
- `php artisan migrate` is **never run** against production; `database/migrations/` is not created for the approved tables. A CI check fails if migration files appear without an approved Schema Change Request.
- Database access via **Query Builder / PDO in repository classes** with explicit column lists. Eloquent models, if used at all, are read-mapping only (`$timestamps`, `$table`, `$primaryKey` set explicitly) and only after the schema is verified. No ORM-driven schema changes.
- Auth tables: Laravel's default `users`/`personal_access_tokens`/`sessions` tables **cannot be assumed**. Authentication must use the approved schema's user table; if it lacks token/session storage, see Gap G-03 (a schema change or stateless signed tokens).

The local PHP 8.3.33 runtime and required Phase 0 extensions were verified. Before deployment, confirm PHP 8.3+ and the needed extensions on Hostinger Premium; do not substitute Laravel 12 or infer hosting capabilities. Continue to verify `pdo_mysql`, `mbstring`, `openssl`, `json`, `ctype`, `tokenizer`, `xml`, `bcmath`, `intl` (if needed), and the selected password-hashing extension on the actual host.

## 4. Architectural style [PROPOSED]

Modular monolith, layered inside each module:

`Route → Middleware → FormRequest (validation) → Controller (thin) → Service/UseCase → Repository (SQL) → MySQL`

- Controllers contain no business rules or SQL.
- Services own transaction boundaries (`DB::transaction` / PDO `beginTransaction`) and call repositories + audit writer.
- Exact EGP money via integer piastres or bcmath decimal strings, never PHP floats. OD-18: nearest piastre (2 decimals) per invoice line. Tax formula, tie-breaking and other workflow rounding remain to be specified.
- API versioned under `/api/v1`, JSON only, uniform envelope (see `API_CONTRACTS.md`).

## 5. Modules (derived from the 29 real screens)

| Module | Screens | Status |
|---|---|---|
| Auth & Users | users, settings | Required (replaces fake login/role) |
| Customers | customers, accounts-customer | Required |
| Products & Warehouses/Locations | products, warehouses | Required |
| Inventory | inventory-summary, movements, adjustments, transfers, damaged | Required |
| Sales (Invoices, Collections, Returns) | invoices, invoice-create, invoice-print, collections, returns, return-create | Required |
| Finance | finance (treasuries, receipts, expenses, transfers), financial-adjustments | EGP only; no currencies/FX finance scope; journals OPEN |
| Containers & Landed Cost | containers, container-receive, landed-cost | Weighted average; value/quantity/manual basis; single or partial receipts; eligibility/late costs OPEN |
| Reports | reports, -sales, -profit, -inventory, -financial | Required, formulas to be defined |
| Orders & Deliveries | orders, create-order, detail-order, deliveries, create-delivery | IN scope; full fulfillment only, no partial invoicing/delivery (OD-8) |
| Audit | (admin) | Required |
| Suppliers | container/cost references | Container-cost counterparty only; no purchase invoices or AP ledger (OD-9) |

Excluded: purchasing/AP and partner installments. Posted invoices ARE editable by the owner via reverse-and-record, retaining both versions and every field-level change (OD-10/OD-13).

## 6. Cross-cutting
Error handling, logging, security, tests, deployment: see the dedicated documents. This canonical folder is refreshed; the unchanged duplicate snapshot now differs.
