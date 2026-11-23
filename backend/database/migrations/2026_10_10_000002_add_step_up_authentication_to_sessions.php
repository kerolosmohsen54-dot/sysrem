<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $connection = DB::connection();
        if (! in_array($connection->getConfig('driver'), ['mysql', 'mariadb'], true)) {
            throw new RuntimeException('Step-up authentication requires MySQL or MariaDB.');
        }

        $connection->statement(
            'ALTER TABLE auth_sessions ADD COLUMN step_up_verified_at DATETIME NULL AFTER last_seen_at'
        );
    }

    public function down(): void
    {
        $connection = DB::connection();
        if (! in_array($connection->getConfig('driver'), ['mysql', 'mariadb'], true)) {
            throw new RuntimeException('Step-up authentication requires MySQL or MariaDB.');
        }

        $connection->statement('ALTER TABLE auth_sessions DROP COLUMN step_up_verified_at');
    }
};
