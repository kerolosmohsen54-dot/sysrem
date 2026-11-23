# Role Permission Matrix V3

**Decision date:** 2026-10-10
**Status:** Owner-approved policy; active implementation.
**Supersedes:** V2 as the active policy. V2 remains unchanged as historical decision context.
**Canonical seed source:** `database/seeders/RolePermissionMatrixSeeder.php`. Do not duplicate the matrix in a migration.

## Current accounts and access

The two owner accounts to be provisioned are ابنوب and كراس. Both receive every permission seeded by this matrix, including invoice and customer operations, document changes, cost/profit/markup visibility, and user management.

The `designated_invoice_issuer`, `read_only`, and `driver` role types remain available for configurable future assignments. The `driver` role display name is `السواق`; its seeded grants allow invoice creation/posting, customer/product/stock reads, and order/delivery work, but not invoice reads, document edits/cancellation, cost/profit/markup, treasury/expenses, or user management. Additional driver grants can be maintained in `role_permissions` and survive routine seeder reruns. No real driver account is created or assigned by this seeder. The matrix seeder defines roles and grants only; account creation and role assignment remain separate operations.

## Permission matrix

| Permission | `owner` | `designated_invoice_issuer` | `read_only` | `driver` (`السواق`) |
|---|---:|---:|---:|---:|
| `users.view_self` | Yes | Yes | Yes | Yes |
| `sessions.revoke_self` | Yes | Yes | Yes | Yes |
| `invoices.view` | Yes | No | Yes | No |
| `audit_logs.view` | Yes | No | No | No |
| `users.manage` | Yes | No | No | No |
| `invoices.create` | Yes | Yes | No | Yes |
| `customers.view` | Yes | Yes | Yes | Yes |
| `products.view` | Yes | Yes | Yes | Yes |
| `customers.manage` | Yes | No | No | No |
| `customers.opening_balance` | Yes | No | No | No |
| `products.manage` | Yes | No | No | No |
| `warehouses.manage` | Yes | No | No | No |
| `inventory.view` | Yes | No | No | Yes |
| `inventory.manage` | Yes | No | No | No |
| `customers.create` | Yes | No | No | No |
| `collections.create` | Yes | No | No | No |
| `collections.view` | Yes | No | No | No |
| `returns.create` | Yes | No | No | No |
| `returns.view` | Yes | No | No | No |
| `documents.edit` | Yes | No | No | No |
| `documents.cancel` | Yes | No | No | No |
| `documents.reverse` | Yes | No | No | No |
| `documents.correct` | Yes | No | No | No |
| `costs.view` | Yes | No | No | No |
| `markup.view` | Yes | No | No | No |
| `profit.view` | Yes | No | No | No |
| `containers.view` | Yes | No | No | No |
| `containers.manage` | Yes | No | No | No |
| `costs.manage` | Yes | No | No | No |
| `costs.pay` | Yes | No | No | No |
| `sales_tax.manage` | Yes | No | No | No |
| `orders.view` | Yes | No | No | Yes |
| `orders.manage` | Yes | No | No | Yes |
| `deliveries.view` | Yes | No | No | Yes |
| `deliveries.manage` | Yes | No | No | Yes |
| `treasury.view` | Yes | No | No | No |
| `treasury.manage` | Yes | No | No | No |
| `treasury.post` | Yes | No | No | No |
| `expenses.view` | Yes | No | No | No |
| `expenses.post` | Yes | No | No | No |
| `expense_categories.manage` | Yes | No | No | No |
| `reports.customer_balances.view` | Yes | No | No | No |
| `reports.customer_statement.view` | Yes | No | No | No |
| `reports.container_costs.view` | Yes | No | No | No |
| `reports.dashboard.view` | Yes | No | Yes | No |

The table reflects the canonical seeder. A driver can create and post invoices
through the `invoices.create` grant but cannot read invoice records, edit or
cancel documents, see cost/profit/markup fields, use financial areas, or manage
users. Future grants are explicit `role_permissions` rows and survive routine
driver seeder reruns.

Both owners may manually reset another user's password through the authenticated user-management route. The reset is audited without recording the new password and revokes the target's existing sessions. Email-based password reset is not implemented.

## Enforcement

- Permission checks remain server-side and deny by default. Every protected route requires a valid session and explicit permission; empty or unknown permission declarations deny access.
- Health and login remain public. Unknown API paths have no handler and return 404; a declared route with a missing or empty permission declaration returns 403 instead of reaching its handler.
- State-changing routes require CSRF in addition to session and permission checks.
- Never infer authority from a submitted name or client-provided role. Owners are assigned the `owner` role by the interactive `users:create-owner` console command; that command accepts no password argument and prompts for a hidden password and confirmation.
- Non-owner future role templates are not assigned to any current users. Update their grants only through a separately reviewed policy change when those users are introduced.

The owner-only inventory permissions cover catalog/category changes, warehouse maintenance, stock balance and movement reads, manual adjustments, dated opening stock, and warehouse transfers. Cost fields are omitted unless the caller also has `costs.view`.

## Step-up re-authentication

`POST /api/v1/auth/reauth` requires the current password and CSRF token for any authenticated role. A successful verification is stored per session and expires after 10 minutes. Inventory mutations and product/warehouse mutations require a recent step-up before permission evaluation. Cost-bearing product, balance, and movement reads require a recent step-up when the caller has `costs.view`; roles without that grant do not receive cost data. Each financial endpoint added by later phases must apply the same step-up middleware in addition to its explicit permission.
