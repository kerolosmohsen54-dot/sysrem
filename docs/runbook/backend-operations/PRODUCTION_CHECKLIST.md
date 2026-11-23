# Production readiness checklist

This checklist is a handoff, not a production deployment approval.

## Application and secrets

- [ ] Provision PHP **8.3** with the extensions required by Laravel and PDO
  MySQL (`pdo_mysql`, `mbstring`, `openssl`, `json`, `ctype`, `tokenizer`,
  `xml`, `bcmath`, `sodium`); verify the actual host runtime.
- [ ] Verify Laravel 13 support and the live database engine/version on the
  chosen hosting plan. Project compatibility targets are MySQL 8.0+ and
  MariaDB 10.6+, but only local MySQL 8.4.3 and MariaDB 13.0.2 have been tested.
- [ ] Use the same site/origin for the React frontend and API under `/api`.
  Configure secure HTTPS-only session cookies, `SameSite=Lax`, the correct
  cookie path/domain, and trusted HTTPS proxy handling.
- [ ] Set `APP_ENV=production`, `APP_DEBUG=false`, a unique application key,
  production URL, Arabic locale, and production-safe logging. Keep `.env`
  outside the web root, mode `0600` where supported, and out of version
  control, artifacts, logs, and support tickets.
- [ ] Use a dedicated least-privilege database user; do not grant DDL except
  during a separately approved migration window. Never point deployment
  commands at `system_end`.
- [ ] Create the two owner accounts through the interactive
  `users:create-owner` command. Do not pass or log passwords. Verify both
  owners, then remove any temporary account.

## Security and operations

- [ ] Run the complete test and constraint suites against the deployment's
  actual MySQL/MariaDB version before launch.
- [ ] Verify TLS, HTTP-to-HTTPS redirect, secure cookies, CSRF flow, session
  idle/absolute expiry, ten-minute financial step-up, permission grants,
  rate limits, and owner-only cost/profit/markup fields.
- [ ] Verify login and reauthentication throttling, audit-log retention/access,
  error monitoring, log rotation, storage permissions, and disk alerts.
- [ ] Configure the Laravel scheduler using the host's cron facility and
  verify `auth-sessions:prune` and backup schedule execution.
- [ ] Configure a least-privilege off-host backup destination, pinned SSH host
  key, encryption-at-rest, retention, transfer alerts, and a tested restore
  procedure. See [BACKUP_AND_RESTORE.md](./BACKUP_AND_RESTORE.md).
- [ ] Verify outbound SSH/SCP and cron frequency are allowed by the hosting
  plan; no Hostinger account/runtime access was available during development.
- [ ] Establish incident contact, restore owner, recovery-point objective,
  recovery-time objective, and a regular production-equivalent restore drill.

## Database/schema release

- [ ] Take and verify an off-host backup before each schema change.
- [ ] Review pending forward migrations and their rollback/forward-recovery
  procedure; do not edit released schema versions or run an unreviewed
  destructive migration.
- [ ] Confirm `utf8mb4_unicode_ci`, strict SQL mode, foreign keys, and
  CHECK-constraint behavior on the exact production engine.
- [ ] Confirm indexes and realistic data volumes for customer, inventory,
  invoice, and audit queries.

## Explicitly NOT VERIFIED

- MySQL 8.0 compatibility (local tests ran on MySQL 8.4.3 only).
- MariaDB 10.6 compatibility (local tests ran on MariaDB 13.0.2 only).
- Hostinger PHP 8.3 runtime, extensions, database version/privileges, cron,
  storage capacity, and SSH/SCP egress.
- Live off-host backup destination, key/host-key provisioning, remote
  retention, and production restore.
- Production HTTPS/proxy/cookie configuration, load behavior, and recovery
  objectives.
