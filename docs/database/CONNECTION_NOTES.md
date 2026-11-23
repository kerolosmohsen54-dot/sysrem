# MySQL and MariaDB connection notes

- The project documents `mysql_test` and `mariadb_test` as the isolated Laravel test connections. Their intended database is `erp_test`.
- Historical test reports state `TARGET DB = erp_test` before each run. This cleanup did not inspect `backend/.env`, reveal credentials, connect to an engine, or run any database command.
- `mysql` and `mariadb` are separate connection names in historical development/runbook instructions; verify the target database before any future operation.
- Do not use `system_end` or a production database for tests. No migration, seed, refresh, wipe, rollback, or other database write was performed during this cleanup.

Status: connection configuration and live engine availability are NOT VERIFIED in this cleanup.
