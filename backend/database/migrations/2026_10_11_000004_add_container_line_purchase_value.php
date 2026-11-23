<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! in_array(DB::connection()->getConfig('driver'), ['mysql', 'mariadb'], true)) {
            throw new RuntimeException('Container purchase values require MySQL or MariaDB.');
        }

        Schema::table('container_lines', function (Blueprint $table): void {
            $table->decimal('purchase_value_egp', 19, 4)->nullable()->after('expected_quantity');
        });
    }

    public function down(): void
    {
        Schema::table('container_lines', function (Blueprint $table): void {
            $table->dropColumn('purchase_value_egp');
        });
    }
};
