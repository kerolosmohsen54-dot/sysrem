# Precision Slate ERP — Proposed MySQL Schema and Reconciliation

**Status: PROPOSAL FOR REVIEW.** The schema in this folder is not approved,
has not been applied, and is not a claim about any existing database. It is a
candidate design derived from the localStorage-based MVP, the backend and
integration design documents, and the Arabic database/architecture blueprint.
The existing prototype and architecture files are unchanged.

## Deliverables

- [`precision_slate_proposed_mysql_erd.md`](./precision_slate_proposed_mysql_erd.md) — relationship map.
- [`precision_slate_proposed_mysql.sql`](./precision_slate_proposed_mysql.sql) — complete proposed MySQL DDL.
- This file — source reconciliation, table-by-table description, MVP mapping,
  transaction invariants, unresolved decisions, assumptions, and risks.

## 1. Reconciliation and design boundary

### Verified source facts

- The MVP is one Arabic/RTL HTML document with 29 screen sections and
  browser-side JavaScript state. It makes no `fetch` or `XMLHttpRequest` calls;
  the SQL design therefore models target persistence, not an existing API.
- MVP state includes customers, products, locations, sales documents,
  collections, stock movements, cashiers/treasuries, expenses, containers,
  settings, drivers, returns, and report inputs. Several state domains are
  split among multiple localStorage keys and in-memory objects.
- The prototype calculates invoice values in JavaScript, updates customer and
  stock values locally, uses `noTax: true` on an active sales path, and has a
  return representation using `isReturn`. These are observations of code
  structure, not approval of those accounting rules.
- The PDF documents proposed entities and workflows (users/roles, customers,
  products, locations, sales documents/lines, inventory movements, receipts,
  treasury entries, journals, containers/costs, audit, idempotency) and labels
  accounting/cost policies as requiring approval.
- Integration/backend documents propose REST JSON, server-side validation and
  authorization, decimal strings across the API, idempotency keys for posting,
  transactions for stock/finance operations, an append-only audit trail, and a
  MySQL/MariaDB implementation direction.
- No approved SQL schema, live database details, or migration files exist in
  this workspace.

### Conflicts reconciled for this proposal

| Topic | Existing material | Proposal treatment |
|---|---|---|
| Backend database and stack | PDF contains a Node/PostgreSQL/Prisma proposal; user-approved target is PHP/MySQL. Backend notes also recommend Laravel with MySQL. | MySQL DDL only. No PostgreSQL syntax, Prisma schema, or Node backend is proposed. Laravel remains a PHP implementation option, not a prerequisite to this database proposal. |
| IDs | PDF describes UUID identifiers; existing-schema notes say the real key strategy is unknown. | `BIGINT UNSIGNED AUTO_INCREMENT` is a straightforward MySQL candidate, **not approved**. UUID/ULID compatibility must be decided before API contracts or data imports rely on identifiers. |
| Numeric types | PDF uses PostgreSQL `NUMERIC(18,2)` / quantities at 3 places; other notes say precision depends on the real schema and approved policy. | MySQL `DECIMAL(19,4)` for money/quantity, `DECIMAL(9,6)` for rates, `DECIMAL(19,8)` for exchange rates. These are storage capacities only. They do not establish currency scale, quantity precision, or rounding policy. |
| Tax | UI includes tax presentation while an active calculation path indicates no tax. | Store invoice-level totals and optional line `tax_rate`; rate is nullable and no tax default is supplied. Whether tax applies and how it is rounded must be approved before posting. |
| Returns | MVP can store a return as a flagged invoice; target docs require a return tied to a source invoice, with good/damaged disposition. | Proposed `credit_note` document plus source invoice/line references and condition field. No refund, restock, valuation, or tax reversal rule is assumed. |
| Stock | MVP has multiple stock representations; target docs call for movement-ledger-derived balances. | Posted movement lines are the source ledger. `inventory_balances` is an optional, transactionally maintained projection for locking/queries and must reconcile to the ledger. |
| Authentication | MVP login/roles are client-side. Target docs propose server-side auth and role/permission checks, but session/token choice and schema support were previously unresolved. | Propose hashed sessions, CSRF hash, password reset token, normalized roles/permissions. Session topology and retention need approval. |
| Orders/deliveries and suppliers | Screens exist; implementation scope is conditional (D8); supplier/AP scope is conditional (D9). | Orders/deliveries are represented but must remain gated. Supplier master is included for container costs; no AP invoice/settlement subledger is included. |
| API and reports | Documents disagree on some endpoint paths, payload names, envelopes, and report definitions. | No API or reporting tables are treated as finalized here. Business data is normalized; reports are derived queries/views after contract and formula approval. |

## 2. MySQL-specific choices and compatibility

- Target dialect is MySQL 8.0.16 or later, InnoDB, `utf8mb4`, and
  `utf8mb4_0900_ai_ci`. MySQL 8.0.16 is specified because it enforces `CHECK`
  constraints; the selected collation is not MariaDB-portable. If the actual
  target is MariaDB, version and collation need a compatibility pass.
- PostgreSQL `NUMERIC` is adapted to MySQL `DECIMAL`; `BOOLEAN` is MySQL's
  `TINYINT(1)` alias. JSON columns use MySQL's native JSON type.
- The proposal uses `ENUM` for controlled document/status/direction values.
  These values are tentative. If workflow values are expected to change often,
  use reference tables or `VARCHAR` plus application validation instead.
- Foreign keys use InnoDB and `ON DELETE RESTRICT` for business records to
  prevent destructive cascades. User attribution references generally use
  `ON DELETE SET NULL`; accounts/customers/products are expected to be
  deactivated, not deleted, after use.
- Currency values are stored with currency codes on monetary records. The
  schema does not force all values to one base currency nor implement FX
  conversion. Cross-currency conversion requires an approved rate convention,
  source, timestamp, rounding, and realized/unrealized gain policy.
- DDL is ordered so referenced tables precede their dependent tables. The SQL
  file has not been executed against any MySQL server and remains a review
  artifact, not a migration.

## 3. Proposed table-by-table design

### Identity, authorization, and reference data

| Table | Purpose, keys, relations, and notable constraints |
|---|---|
| `currencies` | Currency code is the primary key; stores display name and nullable minor-unit precision. Other monetary tables reference the code. `minor_unit` remains unset until currency/rounding decisions are made. |
| `users` | Login identity and password hash; unique nullable username, phone, and email; active state and authentication timestamps. Supports API actors and attribution FKs. At least one login identifier and password policy must be enforced in the service. |
| `roles` | Named role records with unique code and active/system flags. Role names for the three prototype actors are not seeded or assumed. |
| `permissions` | Unique permission code catalog; actual codes and grants must be approved. |
| `user_roles` | Many-to-many user/role grants; composite PK prevents duplicate assignment; records grantor and time. |
| `role_permissions` | Many-to-many role/permission grants; composite PK. API authorization must be deny-by-default and server-enforced. |
| `auth_sessions` | Stores only a SHA-256-sized token hash, optional CSRF hash, expiry, revocation, last-use, and client metadata. Never stores a raw session/bearer secret. |
| `password_reset_tokens` | Hashed, expiring, single-use password reset tokens. Reset issuance/verification and rate limits are service responsibilities. |
| `app_settings` | Keyed JSON settings, with updater attribution. Financial policy values must not be enabled by storing defaults before approval. |
| `document_sequences` | Unique `(sequence_key, period_key)` counter for serialized number generation. Allocate while locking the row (`SELECT … FOR UPDATE`); prefixes, periods, reset rules, and numbering policy remain unresolved. |

### Parties, catalog, and locations

| Table | Purpose, keys, relations, and notable constraints |
|---|---|
| `customers` | Customer identity/contact/address, optional customer number, optional credit limit and its currency. Balance is **derived** from posted documents, allocations, and reversals; it is not persisted as a mutable balance. Name/phone uniqueness is unresolved. |
| `suppliers` | Supplier identity/contact for container costs. Full supplier purchase/AP documents are intentionally omitted until D9 is decided. |
| `product_categories` | Optional self-referencing category hierarchy; category code unique when present. |
| `products` | Unique SKU and optional unique barcode, category, unit code, optional company price/currency, optional minimum stock, and active state. Units/conversions and price meaning (including markup) require approval. |
| `locations` | Unique code, name, type (`main`, `sub`, `vehicle`, `damaged`, `other`), and optional parent location. Types support the locations visible in the MVP without asserting how they are administered. |

### Sales, receipts, and customer balances

| Table | Purpose, keys, relations, and notable constraints |
|---|---|
| `sales_documents` | Invoice/credit-note header, unique document number, status, customer, currency, dates, issuer/driver references, totals, source document and reversal links, and posting attribution. A service must constrain allowed status transitions and document-type relationships. |
| `sales_document_lines` | Immutable line snapshots: product, optional stock location, optional original line (return link), quantity, unit price, discount, nullable tax rate, tax, total, and descriptive snapshots. Positive quantity and nonnegative amounts are checked; total recomputation and returns limits belong to the service. |
| `sales_receipts` | Collection or refund header with customer, treasury, currency, date, amount, method/reference, posting status, and reversal link. The signed financial effect is represented in treasury entries; the receipt amount itself is positive. |
| `sales_receipt_allocations` | Many-to-many allocations between receipts/refunds and invoices/credit notes; unique receipt/document pair. Aggregate limits, document/customer/currency compatibility, and correct collection-vs-refund behavior are transaction/service invariants. Unallocated receipt value is allowed by this structure but its business treatment needs approval. |

### Inventory

| Table | Purpose, keys, relations, and notable constraints |
|---|---|
| `inventory_movements` | Movement header with unique number, type, status, date, source reference, reversal link, reason, and posting attribution. A posted header should only be immutable/reversible. |
| `inventory_movement_lines` | Product, optional source/destination location, positive quantity, optional source invoice line, optional unit-cost snapshot/currency. Source/destination rules vary by movement type and need service validation. |
| `inventory_balances` | Composite `(product_id, location_id)` projection with on-hand and reserved quantities. Used for efficient reads/row locks; rebuildable from the posted ledger. It is not authoritative history. |

### Treasury, accounting, expenses, and transfers

| Table | Purpose, keys, relations, and notable constraints |
|---|---|
| `treasury_accounts` | Named cash/bank/other accounts, unique code, one currency per account, active state. Starting account and account/currency assignments require approved reference data. |
| `treasury_entries` | Append-only positive amount plus direction, account, date, type, source, and optional reversal reference. Available balance is derived from posted entries, not manually overwritten. |
| `chart_of_accounts` | Hierarchical account catalog with account type, normal balance, control flag, and active state. No account codes or default posting templates are seeded. |
| `journal_entries` | Numbered, dated, currency-scoped journal header with status, source and reversal references, and posting attribution. Source reference is polymorphic and validated in application code. |
| `journal_lines` | One debit or credit per line, account, currency, optional customer/supplier/treasury dimensions. Row checks enforce nonnegative amounts and exactly one nonzero side; service enforces aggregate balance before posting. |
| `expenses` | Expense header, amount/currency, payment treasury, optional expense account, and unique links to treasury/journal effects. Posting category and journal entry requirements depend on accounting policy. |
| `treasury_transfers` | Source/destination treasury, amounts and currencies, optional exchange rate, linked debit/credit treasury entries and journal. Different-currency policy and rate convention remain open. |

### Containers and landed cost

| Table | Purpose, keys, relations, and notable constraints |
|---|---|
| `containers` | Unique container number, status, optional supplier/currency, route/ETA, received location/time and actors. Container lifecycle values are proposals. |
| `container_lines` | Product and expected/received quantities, optional purchase unit cost/currency; unique line number per container. Partial/over-receipt policy is not fixed. |
| `container_costs` | Freight/customs/handling/etc. cost record, optional supplier, amount/currency, optional FX rate, date/status, optional treasury payment reference. Cost type vocabulary and capitalization eligibility remain undecided. |
| `container_cost_allocations` | Amount of one cost assigned to one container line, unique per cost/line, and recorded allocation basis (`value`, `quantity`, `weight`, `manual`). The basis is recorded for audit but no default is selected. |
| `container_receipts` | Unique receipt per container, one inventory movement, receipt time/actor and optional costing/allocation policy snapshots. Unique constraints prevent duplicate receipt records, while transactional checks protect the full workflow. |

### Orders and delivery

| Table | Purpose, keys, relations, and notable constraints |
|---|---|
| `sales_orders` | Optional order header with customer, currency, dates, status, and confirmation attribution. Included because screens exist; feature remains gated by D8. |
| `sales_order_lines` | Product/quantity/price line snapshots with unique line number per order. Reservation, price freezing, and order-to-invoice rules need approval. |
| `deliveries` | Optional delivery with order and/or invoice relation, status, driver and vehicle snapshots, address, and delivery timestamp. Driver may not be a user (D7). |
| `delivery_lines` | Product/quantity delivered, optionally linked to order and invoice lines. Partial delivery, stock-issue timing, and cancellation behavior are not decided. |

### Cross-cutting integrity, audit, and retry support

| Table | Purpose, keys, relations, and notable constraints |
|---|---|
| `idempotency_records` | Authenticated user + idempotency key unique pair, request hash, processing state, resource pointer, and cached response. Same key/body replays; same key/different body conflicts. Retention and response-size policy need definition. |
| `audit_logs` | Append-oriented actor/action/entity/time/reason/request/IP metadata plus JSON before/after snapshots. Use a DB account/grants that cannot update/delete audit rows; decide sensitive-field redaction and retention. |

**No reporting tables are proposed.** Dashboard, customer statements, trial
balance, sales/profit/inventory/financial reports should be derived from posted
documents, allocations, movements, treasury entries, and journals after their
definitions are approved. A reporting cache/materialized snapshot, if needed,
must be explicitly reconciled to those source ledgers.

## 4. MVP and requirement-to-table mapping

| MVP screen/workflow | Proposed persistence | Notes/status |
|---|---|---|
| Login, user/role settings | `users`, `roles`, `permissions`, `user_roles`, `role_permissions`, `auth_sessions`, `password_reset_tokens` | Replaces client-only login and local role. No user/role seed data is included. |
| Customers and customer statement/balance | `customers`, `sales_documents`, `sales_document_lines`, `sales_receipts`, `sales_receipt_allocations`, `journal_lines` | Statement/balance is derived. Credit limits and account definition need policy approval. |
| Product and category catalog | `products`, `product_categories`, `currencies` | Price, unit, SKU/barcode uniqueness and cost visibility require decision. |
| Warehouses, sub-locations, vehicle, damaged stock | `locations` | Distinct location types; damaged-good restoration remains a workflow policy. |
| Inventory summary and low-stock report | `inventory_balances`, `products` | Query projection; reconcile balances to posted movement lines and minimum-stock value. |
| Inventory movement history | `inventory_movements`, `inventory_movement_lines` | Immutable posted movements with reversal records. |
| Stock-in/opening stock | `inventory_movements`, `inventory_movement_lines`, `locations`, optionally `container_receipts` | Opening balance conversion requires approved cut-off and reconciliation. |
| Sales invoices, invoice print and status | `sales_documents`, `sales_document_lines`, `sales_receipts`, `sales_receipt_allocations` | Print is a read model. Totals/status/paid amount must be derived or verified server-side. |
| Collections and invoice allocation | `sales_receipts`, `sales_receipt_allocations`, `treasury_accounts`, `treasury_entries` | Receipt, allocations, cash movement, audit, and optional journal post atomically. |
| Returns and damaged returns | Credit-note `sales_documents` + lines, `inventory_movements` + lines, receipt/refund records if applicable | Original-sale link and condition are represented; refund/restock/accounting behavior is unresolved. |
| Finance home, cashier/bank ledgers | `treasury_accounts`, `treasury_entries`, `currencies` | Balance derived from entries; opening balances need controlled conversion. |
| Expenses | `expenses`, `treasury_entries`, `chart_of_accounts`, `journal_entries`, `journal_lines` | Posting/journal template depends on accountant approval. |
| Treasury transfer | `treasury_transfers`, two `treasury_entries`, optionally `journal_entries`/lines | Single transaction; FX handling unresolved. |
| Financial adjustments | `journal_entries`, `journal_lines`, potentially `treasury_entries` | Must define whether the screen adjusts ledger, treasury, or both and require reason/permissions. |
| Container tracker and stages | `containers`, `container_lines`, `suppliers` | Status transitions and exact stage model need business agreement. |
| Container costs and landed cost | `container_costs`, `container_cost_allocations`, `container_cost_payments` not included, `treasury_entries` | Payment association is only a single optional treasury-entry reference in this draft; partial/multiple payments need a bridge table if required. D2/D3 unresolved. |
| Orders and order details | `sales_orders`, `sales_order_lines` | Included as a schema proposal; do not enable workflow before D8 approval. |
| Deliveries | `deliveries`, `delivery_lines`, order/invoice line links | Included as proposal; driver identity and stock timing unresolved. |
| Reports/dashboard | Derived from the above source tables | Report tables/formulas are intentionally not invented. |
| Settings and business configuration | `app_settings`, plus `currencies` | JSON for non-ledger settings; validated, typed policy/config values remain the application's responsibility. |
| Audit and duplicate request protection | `audit_logs`, `idempotency_records`, `document_sequences` | None is present as a verified persisted implementation in the MVP. |

### Features intentionally not fully modeled

- D9 supplier accounts payable/purchase invoices: supplier master and supplier
  references support container costs only. If AP and purchasing are approved,
  add supplier invoices/lines, payment allocations, and supplier ledger
  semantics after requirements are specified.
- D7 partners/installments: no partner/installment model is proposed.
- D6 price markups: no markup history/access table is proposed until ownership,
  visibility, calculation, and report treatment are decided.
- File attachments and uploads: omitted pending G-06, storage/security rules,
  retention, and endpoint confirmation.
- Soft-delete/trash: omitted because retention/restore policy conflicts with
  the proposed immutability of posted financial/inventory records.
- Taxes, journal templates, opening balance detail, and report snapshot tables:
  no defaults/seeds are supplied.

## 5. Indexes, constraints, and integrity responsibilities

### Enforced by keys/constraints in the proposal

- Primary keys on all entities; composite primary keys on role grants and
  inventory balances.
- Unique business keys for SKUs, optional barcodes/party numbers, document
  numbers, sequence keys/periods, role/permission codes, and idempotency keys.
- Foreign keys for normalized relations; `RESTRICT` protects referenced
  business history from deletion.
- Query indexes on customer/date, document status/date, product/location
  movement access, receipt allocations, account/date ledgers, container status,
  and audit actor/entity/time.
- Row-level checks for positive quantities, nonnegative amounts, valid
  discounts, distinct transfer accounts, and one-sided journal lines.
- Nullable unique columns (such as email/phone/barcode) allow multiple NULLs in
  MySQL. The application must normalize phone/email/SKU before uniqueness
  checks if the business requires normalized uniqueness.

### Must be enforced in application transactions

MySQL row-level constraints cannot enforce these aggregate or cross-record
rules by a simple `CHECK`:

- Each posted journal entry has at least two lines and total debit equals total
  credit in the defined accounting currency/precision.
- Invoice totals equal server-calculated line totals under approved
  discount/tax/rounding rules; client totals are untrusted.
- Receipt allocation sum is no greater than receipt amount and no greater than
  each posted document's outstanding balance; currencies/customers/types match.
- Return quantity does not exceed the original posted quantity less previous
  returns; refund/credit and good/damaged inventory effects agree.
- Sales posting atomically validates and locks stock, updates
  `inventory_balances`, inserts movement lines, changes status, records journal
  effects where approved, audit, and idempotency result.
- Transfer movement has paired source/destination effects; no unintended
  negative stock; locations and products are active and compatible.
- Container receive is once-only, quantity checked, and commits receipt,
  movement, allocations, valuation effects and audit as one transaction.
- Treasury entry currency matches its account; transfer amounts/rates obey the
  approved same- or cross-currency policy.
- Polymorphic `source_type`/`source_id` references point to a valid source
  document of the expected type/status.
- Document sequence allocation is serialized and unique under concurrency.

## 6. Transaction boundaries

Transactions below are **requirements for the application design**, not
implemented behavior or database stored procedures in this proposal.

| Use case | Single-transaction work | Locks/guard |
|---|---|---|
| Post invoice | Lock/recheck draft; verify customer, lines and availability; write stock movement and update balance projection; post document; create approved journal effects; append audit; complete idempotency response. | Invoice row plus affected balance rows ordered by `(product_id, location_id)` to avoid deadlocks. |
| Reverse posted invoice | Create reversal/credit records and inverse stock/ledger effects; mark source appropriately; record actor/reason/audit. Never delete posted source. | Source document and affected inventory/account rows. D5/accounting approval required. |
| Create return | Lock original document and lines; calculate remaining returnable quantity; create linked credit note; stock into good/damaged destination; create approved refund/journal effects; audit. | Original document/lines and stock balance rows. |
| Post collection/refund | Create receipt, allocations, treasury entry, approved journal entries, audit and idempotency result. | Receipt/document outstanding rows and treasury account. |
| Transfer stock | Create one movement header and paired line effects; update both balance projections; append audit. | Both product/location balances in sorted order. |
| Adjust stock | Validate reason and permission; post adjustment movement; update projection; record accounting effects only if policy requires; audit. | Product/location row and authorization. |
| Post expense | Post expense, treasury debit, approved journal, idempotency result, audit. | Treasury account and relevant source rows. |
| Transfer treasury | Post source outflow, destination inflow, transfer, optional FX journal, audit. | Both accounts in stable ID order. |
| Receive container | Verify not received; validate received quantities/costs; create one receipt and inventory movement; apply approved allocations/valuation/journals; audit. | Container plus stock balance rows; unique receipt is final guard. |
| Grant/revoke access | Change grant records and append audit; invalidate active sessions if policy requires. | User and role/grant rows. |

The proposed schema assumes all persisted ledger effects and associated audit
records commit together. Whether the business requires journal entries for each
operational workflow remains subject to the accounting decisions below.

## 7. Unresolved business rules and schema impact

| Decision | Unresolved question | Schema representation and impact |
|---|---|---|
| D1 — Currency, tax, rounding | Base currency? Multiple currencies? VAT/no tax/rate? Per-line or per-document rounding? | Currency codes and nullable `minor_unit`/`tax_rate` exist, but no defaults. Cross-currency balances need base-currency amounts, exchange-rate source/date, and FX journals if approved. Precision scale may change before approval. |
| D2 — Inventory costing | Weighted average, FIFO, or another method? Return valuation and adjustment valuation? | Movement `unit_cost` and receipt valuation snapshots are optional. FIFO requires cost layers/consumption links; moving weighted average needs a maintained valuation projection. Do not infer the method from fields alone. |
| D3 — Landed cost | Allocate costs by value, quantity, weight, or manual amount? Which costs capitalize? | Allocation records carry a basis and amounts; weight is not represented on products yet. Weight-based policy would need product weight/unit support. Currency conversion and rounding residual rules also need definition. |
| D4 — Credit limit | Warn or block? Who may override? Which outstanding balance/currency is compared? | Customer has optional limit and currency. Add override actor/reason audit detail or approval record if overrides are approved. A balance projection is not included. |
| D5 — Posted invoice edits | Immutable with reversal/reissue or limited corrections? | Reversal links and reasons support reversal/reissue; direct posted-row edits should be prohibited. Exact reversal workflow and constraints require approval. |
| D6 — Markups | Who owns/views the markup; fixed/percentage; report treatment? | No markup table included. If approved, define effective-dated price history, currency, basis, access, and audit before adding. |
| D7 — Actor types | Are named issuers/drivers users, partners, or locations? | User FKs plus driver/issuer display-name snapshots retain flexibility, but snapshots are not a canonical partner directory. If non-user actors need lifecycle/reporting, add a separate actor/partner entity and type-specific links. |
| D8 — Orders/deliveries | In initial release? Do orders reserve stock? When do deliveries issue stock? | Proposed optional order/delivery tables included because screens exist. No reservation ledger or reservation quantity constraints are specified; `quantity_reserved` is only a projection placeholder. |
| D9 — Suppliers/AP | Supplier entity, purchase invoices, payables, supplier settlements in scope? | Supplier master supports container cost links. No AP subledger/payment allocation/purchase invoice entities are included. Add if approved. |
| D10 — Customer uniqueness | Is name unique? Is phone unique/required? What normalization? | Customer name and phone are indexed but not unique. Add unique normalized columns/indexes only after approval. |
| Permission matrix | Which role can read/create/post/reverse/adjust/export/see costs? | Normalized roles/permissions tables; no grants or role seeds are included. Define codes and least-privilege grants before deployment. |
| Authentication storage/topology | Same-site cookie session or opaque token; CSRF/lifetimes/revocation? | `auth_sessions` supports hash-at-rest opaque sessions and CSRF hash. Cookie/session model, absolute/idle expiry, rotation, and cleanup still require approval. |
| Receipt and refund policy | Partial allocations, overpayment, unapplied receipt, refund route, allocation reversal? | Receipt allocation bridge plus `collection`/`refund` type. Need explicit statuses and balancing/credit-note treatment. |
| Stock policy | Negative stock? reservations? damaged stock availability? transfer stages? | Movement ledger and balance projection support tracking. Service rules and possibly reservation/allocation tables depend on decisions. |
| Numbering | Prefix, period reset, concurrency, human-visible formats? | `document_sequences` supports locked counters; formatting and uniqueness scope (global vs fiscal period) unresolved. |
| Accounting design | Chart of accounts, journal templates, control accounts, periods, posting dates, reversals? | Generic chart/journal structure included. Period controls, multi-currency ledger model, and templates are absent until an accountant approves them. |
| Reports | Formula/source date/status/filtering and cost basis for each report? | Derived queries only; no report cache/table. Profit report cannot be final until D1/D2/D6 and journal policy are decided. |
| Migration | Cut-off, opening balances, old key shapes, duplicate cleanup, reconciliation acceptance? | No import batches or fabricated historical ledger. Need source export characterization and signed opening balances before data conversion. |
| G-06 integrations/uploads | Attachments, email/SMS, server-side WhatsApp/PDF? | No upload or integration tables. Add metadata only after storage and security requirements are approved. |

## 8. Assumptions explicitly made for this proposal

1. MySQL 8.0.16+ with InnoDB and `utf8mb4` is the target dialect. MariaDB
   requires a compatibility review.
2. `BIGINT UNSIGNED AUTO_INCREMENT` keys are proposed for simplicity; this
   replaces neither a verified existing key type nor the PDF's UUID suggestion.
3. Documents, movements, treasury entries, journals, idempotency results, and
   audit records are not physically deleted after posting. Corrections use
   reversals; draft deletion policy still needs definition.
4. A document can be draft then posted; explicit status transitions and state
   values are provisional.
5. One treasury account is denominated in one currency. Cross-currency
   transfers are structurally representable but must not be enabled until FX
   policy is approved.
6. Customer balances and treasury/inventory balances are derived from source
   records; only the inventory projection is proposed as a mutable cache for
   concurrency.
7. Audit data and request/response idempotency data require retention and
   sensitive-data redaction policies not defined here.
8. Supplier/AP, orders/deliveries, and container costing tables are proposals
   to preserve known screen needs; conditional features must remain disabled
   until the corresponding business decisions are approved.

## 9. Migration and implementation risks

- **Not a production migration:** this DDL must not be applied before explicit
  review/approval and server compatibility checks. It has no seed data and no
  `DROP` statements, but table creation itself is still schema mutation.
- **Schema volume/upgrade complexity:** 40 normalized tables create a sizable
  first migration. Review necessity and naming together, then stage additive
  migrations with rollback/backup plans after approval.
- **Identifier mismatch:** choosing bigint instead of UUID would affect URLs,
  JSON contract types, import files, and any pre-existing external references.
- **Exactness and precision:** DECIMAL avoids binary floating point but cannot
  itself select rounding, currency scales, or overflow behavior. PHP and React
  must transport decimal values as strings; use decimal-safe server arithmetic.
- **Cross-currency correctness:** simply storing a currency code is not enough
  for consolidated balances or FX accounting. Define rate convention, base
  amount, rate timestamp/source, and gain/loss posting first.
- **Aggregate invariants:** CHECK/FK constraints do not enforce balanced
  journals, total receipt allocations, returnable quantities, current stock,
  or immutable posted state. Application transaction tests and least-privilege
  DB grants are necessary.
- **Mutable projection drift:** `inventory_balances` can diverge after defects
  or manual changes. Reconciliation and rebuild tooling must exist before
  relying on it for availability.
- **MySQL/MariaDB variation:** collation, CHECK enforcement, JSON behavior,
  online DDL, and Laravel driver behavior depend on exact engine/version.
- **Legacy data quality:** localStorage keys changed across MVP versions and
  there is no complete movement/journal history. Do not manufacture historical
  stock or accounting activity; import controlled opening positions only after
  reconciliation and approval.
- **No baseline tests or implementation:** this proposal cannot validate API
  contracts, runtime code, query performance, production volume, or server
  limits.

## 10. Review and approval gates

Before this becomes implementation DDL:

1. Confirm MySQL versus MariaDB and exact version, collation, timezone, and
   deployment/runtime constraints.
2. Approve identifier strategy and public API identifier format.
3. Sign off D1–D10 and the other policies in section 7, or explicitly defer
   affected modules and keep them disabled.
4. Review table names, field names, enum lifecycle values, foreign keys,
   deletion behavior, and required audit retention.
5. Have an accountant approve chart-of-accounts structure and journal rules.
6. Approve this proposal before converting it into application migrations.

No production database was contacted; no SQL was executed; this deliverable
does not mark any schema as approved.
