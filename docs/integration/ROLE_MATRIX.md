# ERP role permission defaults

The canonical role definitions and grants are seeded by `backend/database/seeders/RolePermissionMatrixSeeder.php`. The seed replaces grants for the managed roles on every run; new permission codes must be added to the seeder and receive a test before relying on them.

| Role | Default access |
|---|---|
| `owner` | Every permission code in the canonical seed list, including user governance and owner approvals. |
| `admin` | Every persisted permission except `users.manage`, `damaged_stock.approve`, and `financial_adjustments.manage`. The excluded permissions are owner-only. |
| `accountant` | `users.view_self`, `sessions.revoke_self`, `invoices.view`, `customers.view`, `products.view`, `collections.view`, `returns.view`, `costs.view`, `markup.view`, `profit.view`, `containers.view`, `orders.view`, `deliveries.view`, `treasury.view`, `expenses.view`, `expenses.post`, `reports.customer_balances.view`, `reports.customer_statement.view`, `reports.container_costs.view`, `reports.dashboard.view`, `purchases.view`, `partners.view`, `partner_payments.view`, `inventory.view`, `warehouse_returns.view`, `inventory_counts.view`, and `currencies.view`. |
| `read_only` | `users.view_self`, `sessions.revoke_self`, `invoices.view`, `customers.view`, `products.view`, `reports.dashboard.view`, and `currencies.view`. |
| `designated_invoice_issuer` | `users.view_self`, `sessions.revoke_self`, `invoices.create`, `customers.view`, and `products.view`. |
| `driver` | `users.view_self`, `sessions.revoke_self`, `invoices.create`, `customers.view`, `products.view`, `inventory.view`, `orders.view`, `orders.manage`, `deliveries.view`, and `deliveries.manage`. Existing driver grants are additive so administrator-configured grants survive reseeding. |

The `admin` role is computed from all permission rows in the database minus its three owner-only codes. Therefore permission-catalog additions are automatically granted to admins unless deliberately added to the exclusion list; review that policy whenever the catalog changes. The accountant and limited roles use explicit allowlists.

## Verification and limitations

`AuthenticationEngineTest::accountant_and_admin_follow_the_documented_safe_permission_defaults` exercises authorization through HTTP middleware for accountant finance access, denied owner-only actions, administrator operational access, and owner approvals. The focused role-policy test passed on both MySQL and MariaDB, and the complete backend suite passed on both engines against `erp_test` (184 tests, 2,595 assertions after this change).

Permission presence does not mean the corresponding feature exists or is complete. `financial_adjustments.manage` is reserved as an owner-only permission; no financial-adjustment workflow is verified by this matrix. Currency catalog permissions manage reference metadata only; all posting remains EGP. Mobile capture confirmation policy, route/OpenAPI parser validation, and the remaining feature phases are tracked in `FINISH_PROGRESS.md`.
