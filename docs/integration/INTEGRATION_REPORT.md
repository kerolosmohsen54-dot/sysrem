# Integration report

## Current connections

- **Web to backend:** `frontend/` calls the Laravel API under `/api/v1`; the shared client handles browser session/CSRF behavior and feature adapters map customers, sales, purchasing, inventory, containers, finance, reports, and administration. The OpenAPI contract is in `backend/docs/openapi.yaml`; frontend contract check command is `npm run contract:check`. Current live browser verification is NOT VERIFIED.
- **Mobile to backend:** `mobile-app/` uses bearer-token auth from `src/api/http.ts` and mobile endpoints under `/api/v1/mobile`; selected customer lookup uses `/api/v1/customers`. Requests carry idempotency keys for writes. Static source check VERIFIED; authenticated live integration NOT VERIFIED.
- **Authorization:** backend route middleware and `RolePermissionMatrixSeeder.php` own the policy. The web uses session-oriented authentication; the companion uses mobile bearer tokens and mobile permissions. Static route/OpenAPI parity is VERIFIED: 180/180 operations matched; Laravel runtime route boot NOT VERIFIED.
- **Database linkage:** all three clients share Laravel-backed business domains and database state through the API. The mobile inbox/capture paths are intended to record deposits/withdrawals into shared ERP workflows; no mobile-to-web round trip was run during cleanup.

## What is not connected or not verified

Financial adjustments, chart of accounts, budgets, recurring expenses, cash forecast, daily summary, and Excel import lack complete active frontend/backend contracts as documented in UI and API reports. Mobile E2E linkage, live persisted data, and iOS automatic capture are NOT VERIFIED. Historical audit evidence and open decisions are in `docs/integration/FINAL_SYSTEM_REPORT.md`, `docs/integration/ROLE_MATRIX.md`, and `docs/mobile/API_MAP.md`.

Verification: source references were inspected with `rg` and package manifests. No API server was started, no credentials were read, and no database or business write was made.
