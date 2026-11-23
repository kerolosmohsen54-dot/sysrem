# Frontend Test Flakiness: Isolation Diagnosis

**Date:** 2026-10-12  
**Scope:** Source read-only; this note is the only file added. No database accessed.

## Clean starting state

Reverted the uncommitted `frontend/vitest.config.ts` change using the requested `git checkout -- frontend/vitest.config.ts`. `git status --short` was empty immediately afterward. The checked-in config therefore remains at `maxWorkers: 4`.

## Isolated test runs

Each invocation used the normal npm script with one file selector, in a separate process, from `frontend/`. Each target was run five times:

| Test file | Run 1 | Run 2 | Run 3 | Run 4 | Run 5 | Aggregate |
| --- | --- | --- | --- | --- | --- | --- |
| `tests/integration/admin-parked.test.tsx` | 7/7 pass | 7/7 pass | 7/7 pass | 7/7 pass | 7/7 pass | 35/35 pass |
| `tests/integration/finance-reports.test.tsx` | 4/4 pass | 4/4 pass | 4/4 pass | 4/4 pass | 4/4 pass | 20/20 pass |
| `tests/integration/container-receipt.test.tsx` | 2/2 pass | 2/2 pass | 2/2 pass | 2/2 pass | 2/2 pass | 10/10 pass |

All 15 isolated runs passed; no failing assertion or timeout was reproduced in isolation. The earlier failures are therefore suite-context-sensitive rather than repeatable within one of these files alone.

## Previously observed failing assertions

These are the failures recorded during earlier full-suite runs; none recurred in the 15 isolated runs above.

| Test and source line | Exact observed assertion/timeout | Wait/dependency involved |
| --- | --- | --- |
| `admin-parked.test.tsx:44` — “loads sales-tax settings and updates them through the API” | `TestingLibraryElementError: Unable to find role="heading" and name "الإعدادات"` | `findByRole` waits for the Settings page heading after rendering the app. The route is under `AppProviders`; `AuthProvider` first requests `/auth/me`, and the lazy page and settings API queries must settle. |
| `admin-parked.test.tsx:77` — “shows owner-only audit data and supports user administration” | `Error: Test timed out in 5000ms.` | A sequential integration flow waits for audit data, then user list data, dialogs, edits, and user creation. It depends on `/auth/me` and MSW-handled API requests; the test-level timeout is Vitest's default. |
| `admin-parked.test.tsx:147` — “shows permission-appropriate quick actions and opens invoice creation” | `TestingLibraryElementError: Unable to find role="heading" and name "إنشاء فاتورة مبيعات جديدة"` | After clicking the dashboard quick-action link, `findByRole` waits for the lazy `/invoices/new` route heading and its auth/permission route state. |
| `container-receipt.test.tsx:38` — “shows the explicit empty state when the fixture has no documented line details” | `TestingLibraryElementError: Unable to find an element with the text: تفاصيل البنود غير متاحة في عقد الاستجابة الحالي..` | `findByText` waits for the empty state after `ContainerReceiptPage` fetches container details through the MSW-backed container API. The failed DOM showed the page still in its loading state. |
| `finance-reports.test.tsx:45` — “routes to treasury and posts a server-owned decimal-string entry” | `TestingLibraryElementError: Unable to find role="heading" and name "حسابات الخزينة"` | `findByRole` waits for the treasury route heading while its auth and treasury-account query are pending. |
| `finance-reports.test.tsx:63` — “routes finance transfers and expenses to their screens” | `TestingLibraryElementError: Unable to find role="heading" and name "التحويلات بين الحسابات"` | `findByRole` waits for the finance-transfer route heading after rendering the app and resolving auth/route state. |

The user-facing errors are Testing Library's failed async-query messages; they do not show that the MSW handlers returned an error. The captured output and isolated passes do not establish whether worker scheduling, a particular handler delay, or another suite-load effect was the immediate cause.

## Timeout and shared-state checks

- `frontend/vitest.config.ts` sets jsdom, setup file, mock restore/clear, `minWorkers: 1`, and `maxWorkers: 4`. It does **not** set `testTimeout` or `hookTimeout`; Vitest defaults apply (5,000 ms per test and 10,000 ms per hook).
- `frontend/tests/setup.ts` starts the MSW server with `onUnhandledRequest: 'error'`. After each test it runs Testing Library cleanup, `server.resetHandlers()`, `resetMockSession()`, and `sessionStore.clear()`. It closes the server after the file.
- The tests install per-test MSW handlers with `server.use(...)`; the setup resets runtime handlers after every test. Tests within a file share that file's server/mock module state, but the reset is explicit.
- No `localStorage` or `sessionStorage` references were found under `frontend/src/` or `frontend/tests/`, so browser storage is not evidenced as the cause. The in-memory `sessionStore` is explicitly cleared after each test.
- Vitest may run files in separate workers (up to four as configured); there is no evidence from these isolated invocations that a shared browser store or unreset handler leaks between the tested cases.

## Diagnosis and smallest proposed fix

**Most likely cause:** async UI queries with Testing Library's default short find-query timeout, plus one sequential integration test bounded by Vitest's 5-second default, are occasionally expiring under full-suite load. Evidence: earlier failures occurred while expected content was still absent/loading; the affected files each passed all five isolated runs; the setup resets MSW handlers and in-memory session state; and no browser storage usage was found. This remains a best-supported hypothesis, not a proven root cause.

**Smallest proposed fix (not applied):** extend timeout only at the affected waits: give the pending async UI queries an explicit longer `findBy...` timeout (for example 3 seconds), and set a longer timeout on the sequential audit/user-administration test. This directly targets observed waits without changing application behavior, API handlers, global test parallelism, or unrelated tests. If that targeted adjustment does not stabilize full-suite runs, investigate worker resource pressure next.

No source or test files were changed, and no proposed fix was applied.

## Status: known flaky under load

- Serializing Vitest with `maxWorkers: 1` passed once and failed once on repeat; it did not meet a repeatability check.
- A subsequent attempt to lengthen only the affected waits and the one test timeout passed twice, then failed on run 3 with 8 failures across 5 files. Those test-file edits were reverted without committing.
- The three suspect files passed all 15 isolated runs (admin 35/35, finance/reports 20/20, container receipt 10/10). They are not consistently failing when run independently.
- Working rule: treat a failing full-suite run as a confirmed blocker only if the failure reproduces on rerun. A single failure is evidence of flakiness under load, not by itself a reproducible regression.

The root cause is still unproven. No source or test changes remain from the attempted fixes.
