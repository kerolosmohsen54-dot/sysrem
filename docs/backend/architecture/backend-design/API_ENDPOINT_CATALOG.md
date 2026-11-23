# API Endpoint Catalog — all **[PROPOSED]**, pending schema verification and frontend coordination

Decision baseline: [OWNER_DECISIONS_ALIGNMENT.md](./OWNER_DECISIONS_ALIGNMENT.md). Design only; schema approval and runtime behavior NOT VERIFIED.

Base: `/api/v1`. Auth: bearer/session per `AUTHENTICATION_AND_AUTHORIZATION.md`. Permission names are proposals. "Idem" = requires `Idempotency-Key`. "Tx" = single DB transaction. "Gate" = blocked decision.

## Auth & users
| Method Path | Purpose | Permission | Idem/Tx | Gate |
|---|---|---|---|---|
| POST /auth/login | Login | public, throttled | – | schema (users) |
| POST /auth/logout | Revoke session | auth | – | |
| GET /auth/me | Current user + permissions | auth | – | |
| GET/POST /users, GET/PATCH /users/{id} | User admin | users.manage | Tx | D7 |
| PUT /users/{id}/roles | Assign roles | users.manage | Tx | permissions matrix |
| POST /users/{id}/reset-password | Admin reset | users.manage | | |

## Customers
| GET /customers (q,page,limit,status) | List | customers.read | | |
| POST /customers · PATCH /customers/{id} | Create/update | customers.write | | OD-16 phone unique; normalization OPEN |
| GET /customers/{id}/statement?from&to | Account statement derived from documents | customers.statement | | tax/statement formulas, opening reconciliation |

## Catalog & locations
| GET/POST/PATCH /products | Products | products.read/write | | pricing formula; cost/markup owner-only OD-15 |
| GET/POST/PATCH /locations | Warehouses/sub/car/damaged | locations.* | | D7 |

## Inventory
| GET /inventory/balances?product&location | Balances from ledger | inventory.read | | ledger exists? |
| GET /inventory/movements | Movement history | inventory.read | | |
| POST /inventory/transfers | Out+in atomically | inventory.transfer | Idem, Tx | |
| POST /inventory/adjustments | Reasoned adjustment | inventory.adjust | Idem, Tx | accounting effect |
| POST /inventory/damaged · POST /inventory/damaged/{id}/restore | Mark damaged / restore | inventory.damage / .restore | Idem, Tx | |

## Sales
| GET /sales/invoices · GET /sales/invoices/{id} | List/detail/print data | sales.read | | |
| POST /sales/invoices | Create draft (no stock/ledger effect) | sales.create | Idem | |
| POST /sales/invoices/{id}/post | Post: stock out + receivable (+COGS if approved) | sales.post | Idem, Tx | tax formula/journals; OD-3/10/14/18 selected |
| POST /sales/invoices/{id}/reverse | Reverse posted invoice | sales.reverse | Idem, Tx | OD-10/13; owner only |
| POST /sales/invoices/{id}/returns | Return against invoice | sales.return | Idem, Tx | return rules |
| GET /sales/returns · GET /sales/returns/{id} | Return docs | sales.read | | |
| POST /sales/receipts · GET /sales/receipts | Collection + allocation | collections.write/read | Idem, Tx | |

## Finance
| GET /finance/treasuries · GET /finance/treasuries/{id}/entries | Treasury ledger | finance.read | | |
| POST /finance/expenses | Expense | finance.expense | Idem, Tx | accounts |
| POST /finance/transfers | Treasury transfer | finance.transfer | Idem, Tx | |
| POST /finance/entries/{id}/void | Reversal | finance.void | Idem, Tx | |
| GET/POST /finance/adjustments | EGP financial adjustments | finance.admin; owner writes | Tx | journal policy |

## Containers
| GET/POST /containers · GET /containers/{id} | Containers | containers.* | | |
| POST /containers/{id}/costs | EGP cost; optional foreign reference evidence only | containers.cost; owner writes | Idem, Tx | eligibility/late costs |
| POST /containers/{id}/receive | Single or multiple/partial receipt event + landed cost | containers.receive; owner writes | Idem, Tx per event | eligibility/late costs/valuation algorithm |

## Reports (GET, read-only)
`/reports/sales`, `/reports/profit`, `/reports/inventory`, `/reports/financial`, `/reports/dashboard` - permission `reports.*`; formulas **blocked** (profit formula/valuation detail and financial accounting policy OPEN; weighted-average costing selected, cost/markup/profit owner only).

## Admin
`GET /admin/audit` (audit.read) · `GET/PUT /settings` (settings.manage; companies, WhatsApp numbers, theme is client-only).

## Owner-approved scope (endpoint contracts still proposed)
Orders/Deliveries (OD-8): /orders, /deliveries are IN scope; full order invoicing/delivery only, preserve stock lineage. Suppliers (OD-9): container-cost counterparty read/maintenance only; no purchase invoices or AP endpoints. Cost/markup/profit visibility owner only (OD-15); any markup administration contract still needs detail.
| Method Path | Purpose | Permission | Idem/Tx | Gate |
|---|---|---|---|---|
| POST /sales/invoices/{id}/revisions | Editable posted invoice: reverse old effects, record new version, retain both and field-level history | sales.edit; owner only | Idem, Tx | revision/history mapping, downstream reconciliation |
| GET /sales/invoices/{id}/history | Retained versions and field/old/new/actor/time/reason | sales.history; read grant pending | | cost data owner only |
| POST /sales/returns | Linked or free return; original invoice-line link nullable | sales.return; owner writes | Idem, Tx | refund/valuation rules |

Posted invoices ARE editable via the revision endpoint (OD-10). Retain old/new versions and all field changes; reversing effects is part of editing. No destructive replacement of historical evidence. OD-13: owner alone edits/reverses/corrects; two designated issuers create invoices; everyone else cannot modify anything. Invoice posting rights for issuers remain to be specified; all other mutation grants default deny unless assigned to owner.
