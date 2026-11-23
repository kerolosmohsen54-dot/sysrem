<?php

return [
    'directory' => env('BACKUP_DIRECTORY') ?: storage_path('app/backups'),
    'retention_days' => env('BACKUP_RETENTION_DAYS', 14),
    'mysqldump_binary' => env('MYSQLDUMP_BINARY', 'mysqldump'),
    'mysql_binary' => env('MYSQL_BINARY', 'mysql'),
    'mariadb_dump_binary' => env('MARIADB_DUMP_BINARY', 'mariadb-dump'),
    'mariadb_binary' => env('MARIADB_BINARY', 'mariadb'),
    'scp_binary' => env('SCP_BINARY', 'scp'),
    'offsite_target' => env('BACKUP_OFFSITE_TARGET'),
    'ssh_key' => env('BACKUP_SSH_KEY'),
    'ssh_port' => env('BACKUP_SSH_PORT', '22'),
    'restore_test_confirmation' => env('BACKUP_RESTORE_TEST_CONFIRM'),
];
