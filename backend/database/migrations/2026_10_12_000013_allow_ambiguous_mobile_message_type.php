<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        if (! in_array(DB::connection()->getDriverName(), ['mysql', 'mariadb'], true)) {
            return;
        }

        $column = DB::selectOne("SHOW COLUMNS FROM mobile_messages LIKE 'message_type'");
        if ($column !== null && ! str_contains((string) $column->Type, "'ambiguous'")) {
            DB::statement("ALTER TABLE mobile_messages MODIFY COLUMN message_type ENUM('deposit', 'withdrawal', 'ambiguous') NOT NULL");
        }
    }

    public function down(): void
    {
        if (! in_array(DB::connection()->getDriverName(), ['mysql', 'mariadb'], true)) {
            return;
        }

        if (DB::table('mobile_messages')->where('message_type', 'ambiguous')->exists()) {
            throw new RuntimeException('Cannot remove the ambiguous message type while ambiguous messages exist.');
        }

        $column = DB::selectOne("SHOW COLUMNS FROM mobile_messages LIKE 'message_type'");
        if ($column !== null && str_contains((string) $column->Type, "'ambiguous'")) {
            DB::statement("ALTER TABLE mobile_messages MODIFY COLUMN message_type ENUM('deposit', 'withdrawal') NOT NULL");
        }
    }
};
