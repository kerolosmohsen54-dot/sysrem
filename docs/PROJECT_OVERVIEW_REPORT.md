# Project overview report

Date: 2026-10-15 (Africa/Cairo)

## Summary and final map

This was a file-organization and documentation pass. Active code was not intentionally changed. The top-level project map is:

```text
backend/                 Laravel app and backend tooling
  app/, database/, routes/, tests/, vendor/, ...
database/                schema notes, proposals, and non-Laravel SQL
frontend/                active React/Vite app
mobile-app/              active React Native app with android/ and ios/
docs/                    reports, runbooks, evidence, and archive
review/                  retained uncertain and legacy files
README.md                project map and entry point
```

The existing `.github/`, `.gitignore`, and `.editorconfig` remain at root as repository tooling/configuration. No other source project remains at root. `review/REVIEW_LIST.md` inventories each retained review item. Backend `.env` was not opened or printed.

## Reorganization inventory

- Files moved into `review/`: 1,047 (measured with `Get-ChildItem review -Recurse -File | Measure-Object`). This includes full retained legacy projects and the moved root Python environment; no review item was deleted.
- Database materials moved from `data/schema/` to `database/schema/`; `data/README.md` is now `database/README.md`.
- `backend/database/schema/precision_slate_v4_1.sql` was copied to `database/schema/precision_slate_v4_1.sql`; original remains in place. Copy hash match: VERIFIED (SHA-256 `F0E290E972964E87F98DB8090D9D202A28FE3A83E3266AE23C1B56248972FCD9` on both files).
- Other relocated documentation/evidence files (outside review): 119 (includes categorized docs, moved evidence, and database files; excludes new reports). Documentation files were grouped under `docs/backend/`, `docs/database/`, `docs/frontend/`, `docs/mobile/`, `docs/integration/`, `docs/runbook/`, `docs/evidence/`, and `docs/archive/`.
- Files deleted: 1 task-created temporary file: `docs/integration/route_openapi_audit_temp.php`, an output-only copy of the existing static audit script. It was removed after the current route/OpenAPI count was recorded. Proof: `Test-Path` returned `False` and `rg -n --hidden -g '!**/.git/**' 'route_openapi_audit_temp\.php' .` returned no matches. No pre-existing source, report, runtime log, or review item was deleted. `backend/test-results-erp-scratch.xml` was retained in review.
- Six phase test logs were moved from `backend/storage/logs/` to `docs/evidence/backend/`; the current `laravel.log` was moved unread into ignored `review/runtime-logs/`. The active storage log folder now contains only `.gitignore`.
- `docs/evidence/cleanup-before.txt` contains the pre-move Git status.
- Git commits were not created: `.git` is read-only in the granted workspace permissions, and the initial checkout already had numerous user changes. No history was rewritten.

## Verification results

| Area | Result |
|---|---|
| Frontend TypeScript | `npm run typecheck`: PASS |
| Frontend lint | `npm run lint`: FAIL, one `no-undef` error at pre-existing untracked `frontend/scripts/acceptance-browser.mjs:22` (`URL` undefined) |
| Frontend Vitest | NOT VERIFIED; `spawn EPERM` starting esbuild while loading Vitest config |
| Frontend production build | NOT VERIFIED; `spawn EPERM` starting esbuild/Vite |
| Frontend axe | NOT VERIFIED in this cleanup. Pinned Playwright browser missing; Edge retry failed `spawn EPERM`. Earlier `docs/integration/WEB_E2E_REPORT.md` records 50 views / 0 violations. |
| Mobile TypeScript | `npm run typecheck`: PASS |
| Mobile Jest | `npm test -- --runInBand`: 11 suites, 84 tests PASS |
| Backend MySQL/MariaDB tests | NOT RUN; executing these could write to a database, prohibited by the cleanup instructions. Prior dated evidence records 187 tests / 2,631 assertions per engine, but current tree was not retested. |
| Migration status / fresh install | NOT VERIFIED; no database command was run. |
| Static route/OpenAPI parity | PASS: 180 route operations, 180 OpenAPI operations, 180 matched, 0 missing/extra; output-only static script, no Laravel boot or .env read. |
| Runbook and README paths | README links target current report and runbook paths. VERIFIED by checking all explicit project paths in `README.md` and `docs/runbook/RUNBOOK.md` against the final tree; live commands were not executed. |

## Open questions and limits

- Static source audit: 180 API method/path operations and 180 OpenAPI operations matched (0 missing/extra); Laravel runtime route boot remains NOT VERIFIED.
- Apply/verify the latest migrations on both test engines only in a separately authorized database verification task.
- Resolve the frontend lint issue and provide an environment where esbuild/browser processes can launch; then rerun Vitest, production build, and axe.
- Decide whether retained legacy projects, environment template, editor settings, PDF, old notes, and test XML should be archived permanently or deleted. Recommendations are in `review/REVIEW_LIST.md`.
- Confirm whether historical archive contents should be kept indefinitely. Replacements are indexed in `docs/archive/README.md`.
