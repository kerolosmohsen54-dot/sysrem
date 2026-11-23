# Hostinger Deployment [PROPOSED - hosting topology and versions NOT VERIFIED]

Decision baseline: [OWNER_DECISIONS_ALIGNMENT.md](./OWNER_DECISIONS_ALIGNMENT.md). Design only; schema approval and runtime behavior NOT VERIFIED.
The selected target is Hostinger Premium shared hosting with PHP 8.3 and MariaDB 10.6+ required by the portable schema; actual account capabilities and engine version are not yet verified. This document's VPS procedure is conditional reference material only and is not the deployment plan for shared hosting. See [LARAVEL_13_SKELETON_PLAN.md](./LARAVEL_13_SKELETON_PLAN.md) for the shared-hosting layout questions and required checks. No root access or persistent queue worker is assumed; use Cron for scheduled work.

## Verify first (later authorized environment review)
`php -v`, `php -m`, `mysql --version`/`mariadb --version`, OS release, nginx/Apache availability, available RAM/disk, whether Hostinger firewall/panel manages ports.
Required extensions to confirm: pdo_mysql, mbstring, openssl, json, ctype, tokenizer, xml, bcmath, sodium (intl optional). Select the Laravel major compatible with the installed PHP.

## Layout
`/var/www/precision-slate-api/{releases,shared,current}`; web root = `current/public`; `shared/.env`, `shared/storage`.

## Web server
nginx + PHP-FPM (dedicated pool/user), `try_files` to `index.php`, deny dotfiles, `client_max_body_size` small, gzip, request timeouts; the API on `api.<domain>`, frontend static on `app.<domain>` (CORS allow-list) or same domain behind path routing.

## Environment
`.env` created on server from `.env.example` (APP_ENV=production, APP_DEBUG=false, DB creds for least-privilege user, session/token settings, CORS origin). `chmod 600`.

## HTTPS
Certbot/Let's Encrypt, auto-renew, HTTP→HTTPS redirect, HSTS after validation.

## Database
Existing MySQL/MariaDB. Create app user with limited grants (no DDL). **No `migrate` in deploy script.** Daily `mysqldump` + off-box encrypted copy; monthly restore test.

## Procedure
1. Build on CI: `composer install --no-dev --optimize-autoloader`. 2. rsync to new release dir. 3. link shared `.env/storage`. 4. `php artisan config:cache route:cache`. 5. run read-only `schema:verify`. 6. switch `current` symlink; reload php-fpm. 7. smoke test `/api/v1/health`. 8. rollback = re-point symlink.
Also: scheduler cron for reconciliation job, log rotation, fail2ban/ufw (22,80,443 only), unattended security updates.
