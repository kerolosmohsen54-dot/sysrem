# Authentication & Authorization

Decision baseline: [OWNER_DECISIONS_ALIGNMENT.md](./OWNER_DECISIONS_ALIGNMENT.md). The current approved business permission policy is [PROPOSED_ROLE_PERMISSION_MATRIX_V3.md](./PROPOSED_ROLE_PERMISSION_MATRIX_V3.md); V2 remains historical.

## Current implementation

- The frontend and API share a domain; API routes use `/api`. Authentication uses same-site cookies, server-side sessions and CSRF on state-changing routes.
- Login is throttled. Session tokens are stored as hashes, expiry/revocation are checked by middleware, and logout revokes the current session.
- `RequirePermission` checks the authenticated user's assigned roles against active role grants. Protected routes require explicit permission codes; missing or unknown permissions deny access.
- The health and login endpoints are public. The current `/auth/me` and `/auth/logout` routes require `users.view_self` and `sessions.revoke_self`; logout also requires CSRF.
- The `RolePermissionMatrixSeeder` is the single canonical role/permission seed source. Both current users, ابنوب and كراس, are owners and receive every seeded permission. The other role types remain unassigned templates for future users.
- The `driver` role template is named `السواق`, starts with only self-profile/session grants, and permits additional explicit rows in `role_permissions`; routine seeding preserves those added driver grants. No real driver account is created.
- `users:create-owner` interactively creates an owner account and obtains the password through hidden prompts, never command arguments. Either owner may manually reset another user's password through the CSRF-protected, permission-checked user-management route; the reset is audit-logged without password data and revokes the target's active sessions. No email-based reset flow is in scope.

The API includes permission-checked product/category and warehouse catalog routes, plus inventory balance/history reads, manual adjustments, opening-stock entry, and one-transaction warehouse transfers. Catalog and stock mutations require CSRF. Stock cost fields and product company prices are included only when the caller has `costs.view`; those cost-bearing reads require step-up when the permission is present.

`POST /api/v1/auth/reauth` verifies the current password and records a per-session step-up timestamp for 10 minutes. Financial mutations require a recent step-up before permission checks, so every role follows the same re-authentication control while permission grants remain independent. Any financial endpoint added in later phases must use the step-up middleware. The marker is forward-migrated on `auth_sessions`; v4.1/v4.2 files are unchanged. Test-only routes also exercise the matrix and middleware. Every business endpoint must keep explicit session, CSRF where applicable, and permission middleware; unknown API URLs return 404 without reaching an application handler, and a registered route with an empty permission declaration is forbidden.

## Historical prototype and proposal

Default 1234 password, localStorage role, and client-side ALLOW map are prototype behavior, not authorization. Earlier design text treated sessions and the role matrix as open proposals; those items are superseded by current owner decisions and the implementation above. Do not import prototype Employee/Accountant/Admin privileges or trust a submitted name to authorize an action.

Posted invoice corrections use reverse-and-record with retained versions and field-level history. Cost, markup and profit must be excluded from non-owner API, report, print, export and history payloads; corresponding business surfaces remain future implementation work.
