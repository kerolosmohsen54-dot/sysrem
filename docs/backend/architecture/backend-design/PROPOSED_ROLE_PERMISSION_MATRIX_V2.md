# Proposed Role Permission Matrix v2

**Decision date:** 2026-10-10
**Status:** Owner-approved policy; implementation is in progress.
**Canonical seed source:** `database/seeders/RolePermissionMatrixSeeder.php`. Do not duplicate the matrix in a migration.

## Role definitions

| Role code | Intended users | Allowed business permissions |
|---|---|---|
| `owner` | Owner account | All permissions listed below |
| `designated_invoice_issuer` | The two owner-designated issuer accounts, ابنوب and كراس | `invoices.create`, `customers.view`, `products.view` |
| `read_only` | All other read-only users | `invoices.view`, `customers.view`, `products.view` |

All roles also receive `users.view_self` and `sessions.revoke_self` so an authenticated user can view their own profile and end their own session.

## Owner-only permissions

- `users.manage`
- `customers.create`
- `collections.create`
- `returns.create`
- `documents.edit`
- `documents.cancel`
- `documents.reverse`
- `documents.correct`
- `costs.view`
- `profit.view`
- `markup.view`

The owner also receives invoice creation and standard invoice/customer/product view permissions. Issuers do not receive invoice view permission; they can create invoices and view customers/products only.

## Enforcement rules

- Permission checks are server-side. Every protected API route must require a valid session and at least one named permission. A missing permission parameter or unknown permission denies access.
- `/api/v1/health` and `/api/v1/auth/login` remain public. Current authenticated routes require explicit permissions: `users.view_self` for `/auth/me` and `sessions.revoke_self` for `/auth/logout`; logout also requires CSRF.
- State-changing routes require CSRF in addition to session and permission checks.
- Never infer authority from a submitted issuer name or client-provided role. The issuer accounts are assigned the shared `designated_invoice_issuer` role by an owner-controlled user-management workflow; this seeder does not create accounts or set passwords.
- Costs, profit, and markup use separate permissions so response shaping, reports, exports, and print surfaces can deny those values to non-owners.
- New API endpoints must be wired to a permission before they are considered implemented. Empty permission declarations fail closed.

## Scope

This matrix defines authorization only. Business endpoint behavior, invoice posting, revision history, returns, collections, and catalog operations remain separate future implementation work. The current API has only health and authentication routes; permission integration tests use test-only routes to exercise every permission code until business endpoints are added.
