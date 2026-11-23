# Frontend Live Integration

## Live integration status

The backend was started with the Laragon PHP 8.3.33 executable and an explicit process-only `DB_CONNECTION=mysql_test` / `DB_TEST_DATABASE=erp_scratch` override. The API health endpoint returned `data.status = ok` directly and through the Vite proxy while the frontend ran with `VITE_MOCK_API=false`. No migration, seed, or business write was run. No `.env` file was read or changed.

## Frontend integration configuration

- Browser MSW starts only in Vite test mode with `VITE_MOCK_API=true`. Normal development and production use the API; accessibility and parity scripts explicitly select test mode.
- `frontend/vite.config.ts` proxies `/api/v1` to `VITE_API_TARGET`, defaulting to `http://127.0.0.1:8000`.
- `frontend/src/shared/api/http.ts` calls `/api/v1${path}` with `credentials: 'include'`. Mutating requests send `X-CSRF-Token` when an `XSRF-TOKEN` cookie is present. It adds request IDs and idempotency keys according to the existing client rules.
- `frontend/src/shared/auth/AuthProvider.tsx` loads `/auth/me`, signs out through `POST /auth/logout`, and performs password reauthentication through `POST /auth/reauth` when a request returns 428.

## Authentication and contract evidence

- `backend/bootstrap/app.php` loads `routes/api_v1.php` as the API route file. That file groups the browser API under `/v1`; the framework API prefix makes the effective path `/api/v1`.
- In `backend/routes/api_v1.php`, browser endpoints are grouped under `api.session`. Mutations explicitly use `api.csrf`; operations requiring recent password confirmation also use `api.step_up`.
- `backend/docs/openapi.yaml` declares `sessionCookie` as the default security scheme, documents browser device administration using `sessionCookie`, and labels mobile bearer-token operations with `mobileBearer`. Mobile source/message operations are not browser-session endpoints and remain out of scope for the web UI.
- The client's 428 handling opens an online password reauthentication dialog, then retries the original request. The live health endpoint was verified; authenticated reauthentication and retry behavior were not.

## Startup and database verification

Commands run from the repository/backend as applicable:

| Check | Result |
| --- | --- |
| Backend start | `TARGET DB = erp_scratch`; Laragon PHP 8.3.33; `php artisan serve --host=127.0.0.1 --port=8000`; server started. |
| Direct API health | `GET http://127.0.0.1:8000/api/v1/health`; returned `data.status = ok`. |
| Frontend start | Vite on `http://127.0.0.1:5174/` with process-only `VITE_MOCK_API=false` and `VITE_API_TARGET=http://127.0.0.1:8000`. |
| Vite API proxy | `TARGET DB = erp_scratch`; `GET http://127.0.0.1:5174/api/v1/health`; returned `data.status = ok`, confirming the proxy reached the backend. |
| Database migration and seed | NOT RUN. No direct database command was run and no business data was created. `erp_test` and `system_end` were not targeted. |
| Browser login, CSRF, step-up, authenticated page loads and writes | NOT VERIFIED. The CUA browser inventory had no available browser, and the repository does not contain owner/read-only account credentials. No account was created and no password was guessed. |

No environment-file contents were read or changed, and no credential was printed. No software was installed.

## Remaining manual verification

The local API and Vite proxy are reachable, but authenticated UI flows require an authorized owner and read-only test account plus an available browser session. Those were not available in this run. The backend completion guide says owner accounts must be provisioned through a hidden interactive prompt; no credentials are stored in project docs. Do not provision a user or mutate business records until the disposable test accounts and data are authorized. `erp_scratch` remains the only configured target for any future local API use.
