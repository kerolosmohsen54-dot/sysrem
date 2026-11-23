# MySQL/MariaDB backup and restore operations

The Laravel scheduler creates one compressed MySQL or MariaDB logical dump per hour in
`storage/app/backups` by default. A daily scheduled job copies the newest dump
to an operator-configured SSH/SCP destination. Neither job prints database
credentials. Database credentials are read from the selected Laravel MySQL/MariaDB
connection in the ignored `.env`; do not place passwords in command arguments,
cron entries, or this document.

## Configure

Set these environment values in the private deployment `.env`:

| Variable | Purpose |
| --- | --- |
| `BACKUP_DIRECTORY` | Private local backup directory. Defaults to `storage/app/backups`. Keep it outside the web root and restrict filesystem access to the application user. |
| `MYSQLDUMP_BINARY` | `mysqldump` executable path/name. |
| `MYSQL_BINARY` | `mysql` executable path/name used for restore testing. |
| `MARIADB_DUMP_BINARY` | `mariadb-dump` executable path/name used when `DB_CONNECTION=mariadb`. |
| `MARIADB_BINARY` | `mariadb` executable path/name used for MariaDB restore testing. |
| `BACKUP_OFFSITE_TARGET` | SSH destination in `user@host:/absolute/private/path` form. Do not embed a password. |
| `BACKUP_SSH_KEY` | Optional private-key file path; the deployment service account must be the only reader. |
| `BACKUP_SSH_PORT` | SSH port; defaults to 22. |
| `BACKUP_RESTORE_TEST_CONFIRM` | Set to the exact value `YES_RESTORE_ERP_SCRATCH` only for an explicitly authorized local restore test. Leave unset in production. |

Provision a dedicated least-privilege MySQL/MariaDB backup account with SELECT,
SHOW VIEW, TRIGGER, EVENT, and routine metadata privileges as required by the
server version. It must not have access to the prohibited `system_end`
database. Confirm the destination host key out of band and prepopulate the
service account's `known_hosts`; the transfer requires strict host-key checking
and batch (non-interactive) authentication. Restrict the remote directory to
the backup account and apply the organization's encryption-at-rest and
retention policy.

## Scheduler

Run Laravel's scheduler every minute using the platform cron facility. The app
registers `backup:mysql` hourly and `backup:offsite` daily at 03:00; both use
`withoutOverlapping`. A failed off-site transfer returns a non-zero status and
does not delete the local backup. Configure scheduler output/error monitoring
without capturing environment values.

Example Linux cron entry (replace the deployment path and PHP executable):

```cron
* * * * * cd /home/ACCOUNT/backend && /usr/bin/php artisan schedule:run --no-interaction >> /home/ACCOUNT/logs/scheduler.log 2>&1
```

Verify that the hosting plan permits the required cron cadence, external SSH
connections, local backup storage, and enough disk for at least one complete
compressed dump plus retention. The Hostinger runtime and these capabilities
are **NOT VERIFIED**.

## Restore verification

`php artisan backup:restore-test [backup-path]` deliberately refuses every
target except the currently connected MySQL or MariaDB database named `erp_scratch`.
Before running it, create and verify a fresh backup; check the selected database
and get explicit approval to replace the contents of `erp_scratch`. Set
`BACKUP_RESTORE_TEST_CONFIRM=YES_RESTORE_ERP_SCRATCH` only for that invocation.
The command restores a `.sql.gz` file from the configured private backup
directory and compares every base-table name and exact row count before and
after. This is a destructive DDL/data restore operation on the scratch schema,
not a production recovery procedure. Never run it on `erp_test`, a production
database, or `system_end`.

On Windows Laragon, set the matching client executable paths for the selected
connection (`MYSQLDUMP_BINARY`/`MYSQL_BINARY` for MySQL,
`MARIADB_DUMP_BINARY`/`MARIADB_BINARY` for MariaDB) for the command process.
The script uses the selected Laravel connection and never accepts credentials
as command-line arguments. MariaDB dump mode omits MySQL's
`--set-gtid-purged` option; MySQL mode retains it.

## Recovery limitations

- A local hourly dump is not an off-host backup. Alert on off-site copy failure
  and verify the remote object exists and can be retrieved.
- No off-host target/key was provided for this project checkout. Live remote
  transfer is **NOT VERIFIED**.
- No automated retention deletion is configured; apply retention only after
  confirming the off-host copy and a separate recovery point.
- A successful scratch restore is not proof of production recovery time,
  hosting access, or recovery-point objectives. Perform a controlled restore
  drill on a production-equivalent isolated environment before launch.
