# Laravel 13 Backend Skeleton Plan

**Status:** Plan only; no framework dependencies installed and no application skeleton generated.  
**Runtime target:** PHP 8.3; Laravel 13 (`^13.0`), subject to the verified host runtime before deployment.  
**Schema mode:** Existing, SQL-first schema. Laravel ORM schema generation is not permitted.

## Compatibility evidence

- Laravel 13 release notes list PHP 8.3–8.5 and PHP 8.3 as its minimum.
- Laravel 13 database documentation lists MariaDB 10.3+ and MySQL 5.7+. These documented minima include the selected MariaDB 10.6+ and MySQL 8.0+ targets.
- Laravel framework 13.x `composer.json` specifies `"php": "^8.3"`.

Sources: [Laravel 13 release notes](https://laravel.com/docs/13.x/releases), [Laravel 13 database documentation](https://laravel.com/docs/13.x/database), [Laravel 13 framework requirements](https://raw.githubusercontent.com/laravel/framework/13.x/composer.json).

## Repository layout

The Laravel application will live under `backend/`. Production secrets belong in ignored `backend/.env`; only a placeholder `.env.example` is tracked. The public HTTP entry point is `backend/public/index.php`. App source, configuration, storage and dependencies must not be directly web-accessible.

For Hostinger Premium, first verify whether a per-site document root can target `backend/public`. If not, use a minimal `public_html` front controller/rewrite that forwards requests to `backend/public/index.php`, denies access to application files and dotfiles, and keeps storage outside the document root. Do not expose `backend/` or `vendor/` through direct URLs. The exact deployment routing remains contingent on Hostinger's account capabilities.

## Skeleton contents (after Phase 1 schema review)

- `composer.json` with PHP `^8.3`, Laravel Framework `^13.0`, and a committed `composer.lock`.
- Laravel bootstrap and `public/index.php`; API-only routes under `/api/v1`.
- Separate named Laravel database connections for MySQL and MariaDB test runs, both selected explicitly by test configuration. Local settings point only to `erp_scratch` / `erp_test`.
- Environment-aware configuration, JSON-only error envelope, request-ID middleware, redacted structured logging, Arabic-first validation messages with English fallback, and a read-only database health endpoint.
- Existing-schema repositories using prepared SQL / Laravel query facilities with explicit columns. No default migrations may be allowed to create or mutate the proposal schema.
- SQL-first DDL remains the source of truth. The owner approved v4.2 on 2026-10-10. Preserve the v4.1 baseline migration unchanged and apply the reviewed v4.2 email-verification addition as a forward-only SQL migration; do not use Eloquent schema builders to infer columns or constraints.
- PHPUnit/Laravel tests: unit and HTTP tests can run without a database where practical; integration tests require an explicitly selected scratch/test database. No test suite may target `system_end`.
- Cron, not a persistent queue worker, for later scheduled maintenance/backup tasks; no root privileges assumed.

## Installation and exit gates

No Composer installation, framework generation, or system package installation is part of this plan. After Phase 1 is accepted, create the Laravel 13 skeleton under `backend/`, use Composer's platform checks against PHP 8.3, and verify that generated dependencies retain the required PHP floor. Database migrations and seeders wait for Phase 2. Authentication/business endpoints wait for their later gated phases.

Before go-live, confirm Hostinger PHP 8.3+, MariaDB version (at least 10.6 for the agreed schema target), required PHP extensions, document-root/rewrite support, Cron availability, writable storage paths, and backup capabilities.
