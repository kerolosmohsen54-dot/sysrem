# Precision Slate ERP frontend

The React/Vite web application, its MSW fixtures, tests, reference assets and
frontend-specific documentation live in this directory.

## Install and run

Use Node.js and npm versions compatible with the lockfile:

```powershell
npm ci
npm run dev
```

The development server proxies `/api/v1` requests to Laravel. Set
`VITE_MOCK_API=false` and configure `VITE_API_TARGET` through the process environment.
Browser MSW runs only in Vite test mode with `VITE_MOCK_API=true`; the accessibility
and parity test scripts select that mode explicitly. Never put secrets in variables
exposed to the browser.

## Checks

Run from this directory:

```powershell
npm run typecheck
npm run lint
npm test
npm run build
npx prettier --check .
npm run contract:check
npm run a11y
```

`contract:check` reads `../backend/docs/openapi.yaml` from the working
tree. It checks method/path coverage only; it does not validate live response
payloads.
`a11y` requires a Playwright-compatible Chromium browser. If Playwright's
bundled browser is unavailable, set `PLAYWRIGHT_CHROMIUM_EXECUTABLE` to an
installed local browser executable.

## Documentation

- [`docs/`](docs/) - UI specification and frontend-specific acceptance/history
  documents.
- [`../docs/frontend/`](../docs/frontend/) - current handoff report, progress
  log and API request/schema notes.
- [`docs/FRONTEND_REORG_PLAN.md`](docs/FRONTEND_REORG_PLAN.md) - this
  repository reorganization inventory and plan.
