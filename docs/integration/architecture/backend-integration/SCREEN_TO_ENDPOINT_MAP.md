# Screen → Endpoint Map (all PROPOSED; field names pending the approved schema)

Routes come from the frontend `FRONTEND_ROUTE_MAP.md`. Endpoint paths use the canonical choices in `FRONTEND_BACKEND_INTEGRATION.md` §2. "Cond" = depends on an undecided item.

## Permission catalog (frontend names adopted)
`dashboard.read` `customers.read/write` `customers.statement.read` `customers.balance.read` `invoices.read/create/post/reverse` `returns.read/create` `receipts.read/create` `products.read/write` `products.cost.read` `locations.read/write` `inventory.read/adjust/transfer` `inventory.movements.read` `treasury.read/transfer` `expenses.read/create` `finance.read/adjust` `finance.ledger.read` `accounting.read` `containers.read/receive/costs.read` `reports.read/sales/profit/inventory/financial` `users.manage` `settings.manage` `audit.read` `trash.manage` `import.run` — plus Cond: `orders.*` `deliveries.*` (D8), `suppliers.*` `purchases.*` (D9), `partners.*` `drivers.*` (D7), `markup.read` (D6).

## Auth
| Screen/route | Calls | Notes |
|---|---|---|
| `/login` | `POST /auth/login` → `GET /auth/me` | 401 inline, 429 lockout |
| shell boot | `GET /auth/me` | permissions drive nav |
| logout | `POST /auth/logout` | |
| profile | `POST /auth/change-password` | policy fields from Settings |

## Dashboard / global
| `/dashboard` | `GET /dashboard` (NEW), overdue widget from `GET /sales/invoices?status=overdue` | each number must trace to a source (blueprint) |
| Ctrl+K | `GET /search?q=` (NEW) | |

## Customers
| `/customers` | `GET /customers?q&status&page`; add/edit dialog: `POST /customers`, `PATCH /customers/{id}` | D10 uniqueness → 409 `DUPLICATE_CUSTOMER` |
| `/customers/:id` | `GET /customers/{id}` (NEW; includes recent invoices/payments) | |
| `/customers/:id/statement` | `GET /customers/{id}/statement?from&to` | balance rule open |
| `/customers/balances` | `GET /customers/balances` (NEW); permission `customers.balance.read` **replaces the `1234` prompt gate** | |
| `/customers/settlement` (`liq`) | `POST /sales/receipts` with allocations (proposed reuse) | Cond: confirm what "liq" does |
| `/customers/governorates` | `GET /reference/governorates` (NEW) | |
| attachments tab | `POST /customers/{id}/attachments` | Cond G-06 |

## Sales
| `/sales/invoices` | `GET /sales/invoices?status&from&to&q&sort` | bulk print/PDF/WhatsApp: Cond |
| `/sales/invoices/new` | product search `GET /products?q=`; customer `GET /customers/{id}` (credit banner); submit = `POST /sales/invoices` → `POST …/{id}/post` → optional `POST /sales/receipts` | one idempotency key per step, derived from the form key (`key+':draft'`, `':post'`, `':receipt'`) |
| return mode (`?mode=return`) | `GET /sales/invoices/{id}/returnable`, `POST /sales/invoices/{id}/returns` | replaces `isReturn` flag |
| `/sales/invoices/:id` & `/print` | `GET /sales/invoices/{id}`; reverse: `POST …/reverse {reason}` | print uses same payload |
| `/sales/collections` | `GET /sales/collections` (NEW), `POST /sales/receipts` | |
| `/returns`, `/returns/new` | `GET /sales/returns`, `POST /sales/invoices/{id}/returns` | |

## Orders / Deliveries (Cond D8 — not built unless approved)
`/orders*` → `/orders` (list/create/detail/confirm/cancel/reserve), `/deliveries*` → `/deliveries`. MVP shows static toasts for most buttons, so no behavior to port; the backend must define states first.

## Inventory
| `/inventory/products` | `GET/POST/PATCH /products` | |
| `/inventory/warehouses` | `GET/POST/PATCH /locations` | |
| `/inventory/summary` | `GET /inventory/balances` | |
| `/inventory/movements`, `/:id` | `GET /inventory/movements[/{id}]` | |
| `/inventory/stock-in` | `POST /inventory/receipts` (NEW) | Cond accounting effect |
| `/inventory/adjustments`, `/count` | `POST /inventory/adjustments` (reason mandatory) | |
| `/inventory/returned-stock`, `/warehouse-returns` | `GET /inventory/balances?location=damaged`, `POST /inventory/damaged/{id}/restore` | |
| transfers | `POST /inventory/transfers` | |
| `/inventory/min-stock`, `/barcodes`, `/purchase-prices` | `GET /products?below_min=1`, `GET /products?fields=barcode`, `GET /products/{id}/cost-history` | cost-history Cond D2 |

## Finance
| `/finance`, `/finance/inbox` | `GET /finance/treasuries`, `GET /sales/receipts` | |
| `/finance/expenses` | `GET/POST /finance/expenses` | |
| `/finance/treasury`, `/transfers` | `GET/POST /finance/treasuries`, `POST /finance/transfers` | |
| `/finance/ledger|journal|trial-balance|coa` | `GET /finance/{ledger,journal,trial-balance,coa}` | Cond accounting policy |
| `/finance/adjustments`, `/currencies` | `GET/POST /finance/adjustments`, `/finance/currencies` | Cond D1; MVP gates ROLE≥3 |
| void | `POST /finance/entries/{id}/void` | |
| partners / installments / purchase invoices / supplier balances | — | Cond D7/D9, not built |
| budget / recurring / compare / cash-forecast | — | Cond F-06 (extras) |

## Containers
| `/containers` | `GET/POST /containers` |
| `/containers/:id/money` | `GET /containers/{id}`, `POST /containers/{id}/costs` |
| `/containers/:id/landed-cost` | `GET /containers/{id}/landed-cost` (preview; Cond D3) |
| `/containers/:id/receive` | `POST /containers/{id}/receive` (once; 409 ALREADY_RECEIVED) |
| `/containers/tracking` | `GET /containers?fields=tracking` |

## Reports & Admin
| `/reports/*` | `GET /reports/{sales,profit,inventory,financial}` | profit blocked on D2/D6; `price*0.8` fallback must disappear |
| `/admin/users` | `GET/POST/PATCH /admin/users`, `/admin/roles` | |
| `/admin/settings` | `GET/PUT /admin/settings` | backup/restore = ops task, not a browser button |
| `/admin/audit-log` | `GET /admin/audit` | |
| `/admin/trash` | `GET /admin/trash`, `POST …/restore` | Cond (conflicts with no-delete rule) |
| `/admin/import` | `POST /admin/import` | tied to migration plan |
| `/admin/drivers` | Cond D7 | |
| `/me/notes` | client-only or `GET/PUT /me/notes` | undecided |

## Counts
~68 runtime screens → ~60 routes; ~85 endpoint operations including the NEW set; ~35 are blocked by Cond items.
