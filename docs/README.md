# Precision Slate ERP

This repository contains the active Laravel API, React web frontend, and React Native companion app. Project documentation and evidence are under `docs/`; retained material whose active use is unclear is under `review/` and is inventoried in `review/REVIEW_LIST.md`.

## Project map

- `backend/` — Laravel API, including migrations, seeders, factories, routes, tests, vendor dependencies, and backend tooling.
- `database/` — schema proposals, database notes, and non-Laravel SQL material. Laravel migrations remain in `backend/database/migrations/`.
- `frontend/` — active React/Vite web app.
- `mobile-app/` — active React Native app, including Android and iOS projects.
- `docs/` — reports, architecture notes, runbooks, and evidence, grouped by topic.
- `review/` — retained legacy projects, older/uncertain files, and `REVIEW_LIST.md` with a recommended disposition for every item.

See [the project overview report](docs/PROJECT_OVERVIEW_REPORT.md) for the detailed inventory and verification status. Start with [the runbook](docs/runbook/RUNBOOK.md) for local setup and verification instructions.

## Safety notes

Use local environment files for credentials and do not commit them. Database setup and migration instructions in the runbook are for local development only. Cleanup verification did not run migration commands or database-backed test suites.
