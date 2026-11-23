# API contract status

The authoritative web contract remains `backend/docs/openapi.yaml` and the Laravel routes in `backend/routes/api_v1.php`. No existing endpoint was changed in this pass and no new endpoint was added.

## Existing web domains

Auth, users/audit, customers, invoices, returns, collections, settings, orders/deliveries, catalog, inventory, containers/landed cost, treasury/expenses, and operational reports are represented in the current route file.

## Contract gaps requiring design before implementation

Partners and partner payments, purchase invoices/suppliers workflow, warehouse returns, customer governorates/settlement, recycle bin, container transfers/funds, expense budgets/recurrence/liquidity, minimum stock/cycle counts, daily summary and a browser Excel import flow do not have a complete web endpoint contract. They remain documented gaps; this file does not invent request/response shapes.
