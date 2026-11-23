<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $connection = DB::connection();
        $driver = $connection->getConfig('driver');

        if (! in_array($driver, ['mysql', 'mariadb'], true)) {
            throw new \RuntimeException('The approved v4.2 schema migration requires MySQL or MariaDB.');
        }

        $connection->statement(
            "ALTER TABLE users ADD COLUMN email_verified_at DATETIME NULL COMMENT 'Set only after administrator confirms ownership; clear if email changes' AFTER email"
        );
        $connection->statement(
            'ALTER TABLE users ADD CONSTRAINT chk_users_email_verification_requires_email CHECK (email_verified_at IS NULL OR email IS NOT NULL)'
        );
    }

    public function down(): void
    {
        $connection = DB::connection();
        $driver = $connection->getConfig('driver');

        if (! in_array($driver, ['mysql', 'mariadb'], true)) {
            throw new \RuntimeException('The approved v4.2 schema migration requires MySQL or MariaDB.');
        }

        $dropConstraint = $driver === 'mariadb' ? 'DROP CONSTRAINT' : 'DROP CHECK';
        $connection->statement(
            "ALTER TABLE users {$dropConstraint} chk_users_email_verification_requires_email"
        );

        // Rollback intentionally removes the verification timestamp and its data.
        $connection->statement('ALTER TABLE users DROP COLUMN email_verified_at');
    }
};
