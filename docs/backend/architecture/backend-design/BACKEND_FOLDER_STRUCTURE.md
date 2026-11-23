# Backend Folder Structure [PROPOSED — Laravel, existing-schema mode]

Decision baseline: [OWNER_DECISIONS_ALIGNMENT.md](./OWNER_DECISIONS_ALIGNMENT.md). Design only; schema approval and runtime behavior NOT VERIFIED.

Proposed capabilities follow owner decisions; Orders/Deliveries are in scope with full fulfillment only. Suppliers are container-cost counterparties, with no purchasing/AP module.

```
precision-slate-api/
├── composer.json / composer.lock        # PHP ^8.3, Laravel ^13.0 (planned; verify host before deployment)
├── .env.example                         # placeholders only; real .env never committed
├── artisan, public/index.php            # single web entry; web root = public/
├── bootstrap/app.php                    # middleware, exception mapping registration
├── config/                              # app, database, auth, cors, logging, erp (policies as settings)
├── routes/api_v1.php                    # all /api/v1 routes, grouped by module
├── app/
│   ├── Http/
│   │   ├── Middleware/                  # RequestId, Authenticate, RequirePermission, Idempotency, ForceJson
│   │   ├── Requests/<Module>/           # FormRequest validation per endpoint
│   │   ├── Controllers/<Module>/        # thin; call one Service method
│   │   └── Resources/<Module>/          # explicit response serializers (whitelist fields)
│   ├── Modules/                         # business capabilities
│   │   ├── Auth/        (Services, Repositories)
│   │   ├── Users/
│   │   ├── Customers/
│   │   ├── Catalog/                     # products, categories, units
│   │   ├── Inventory/                   # movements, transfers, adjustments, damaged
│   │   ├── Sales/                       # invoices, returns, collections/receipts, allocations
│   │   ├── Finance/                     # treasuries, expenses, transfers, void
│   │   ├── Containers/                  # containers, costs, receive, landed cost
│   │   ├── Reports/                     # read-only query services
│   │   ├── Audit/
│   │   ├── Settings/
│   │   ├── Orders/    Deliveries/       # full invoicing/delivery only (OD-8)
│   │   └── Suppliers/                   # container-cost counterparties only (OD-9)
│   ├── Support/
│   │   ├── Money/                       # bcmath-based Money/Quantity value objects, rounding policy
│   │   ├── Database/TransactionRunner.php  # retry on deadlock, isolation, FOR UPDATE helpers
│   │   ├── Idempotency/                 # key store + replay logic
│   │   ├── Pagination/ , Errors/ (DomainException hierarchy → HTTP map)
│   │   └── Audit/AuditWriter.php        # append-only writer
│   └── Console/Commands/                # reconciliation, schema-verify (read-only), backup hooks
├── tests/
│   ├── Unit/ (Money, rounding, policies)  Feature/ (API + RBAC)  Integration/ (DB, concurrency)
│   └── Support/ (fixtures loader, test DB bootstrap)
├── docs/ (this folder, openapi.yaml later)
└── deploy/ (nginx.conf.example, php-fpm pool example, supervisor.conf, deploy.sh, backup.sh)
```

Laravel 13 skeleton/deployment planning is documented in [LARAVEL_13_SKELETON_PLAN.md](./LARAVEL_13_SKELETON_PLAN.md). No framework has been installed or generated yet.

## Responsibilities
| Path | Purpose | Depends on |
|---|---|---|
| `routes/api_v1.php` | Declares endpoints, attaches `auth`, `permission:*`, `idempotent` middleware | Middleware, Controllers |
| `Http/Requests` | Input validation only; no DB writes | Support/Money rules |
| `Modules/*/Services` | Workflow + transaction boundary + audit | Repositories, Support |
| `Modules/*/Repositories` | The **only** place SQL lives; explicit columns; prepared statements | `DATABASE_SCHEMA_MAPPING.md` (verified schema) |
| `Support/Money` | Exact decimal arithmetic, EGP arithmetic; nearest-piastre rounding per invoice line (OD-18); other rounding OPEN | `bcmath` |
| `Support/Database/TransactionRunner` | Wraps tx, deadlock retry, lock ordering | PDO |
| `Console/Commands/schema-verify` | Read-only comparison of live schema vs approved mapping (SELECT on `information_schema` only) | DB read user |

Not created (no verified need): GraphQL, event-sourcing, microservice folders, generic "BaseRepository" abstractions, file-upload storage (no upload feature found in the HTML; logo/attachments to be confirmed), email/SMS integration (the HTML uses `wa.me` WhatsApp links client-side only; server integration unconfirmed), queue workers (add only if reports/exports prove slow).

Sales services must support owner-only posted-invoice reverse-and-record, retained version links and every field change (OD-10/13). Reuse AuditWriter/audit_logs where adequate; physical revision/history mapping remains pending, without unjustified duplicate tables. Finance has no currencies/FX module; foreign container references are evidence only.
