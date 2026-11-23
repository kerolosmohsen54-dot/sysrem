<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('inventory_count_lines', function (Blueprint $table): void {
            $table->string('difference_reason', 32)->nullable()->after('difference_quantity');
        });
    }

    public function down(): void
    {
        Schema::table('inventory_count_lines', function (Blueprint $table): void {
            $table->dropColumn('difference_reason');
        });
    }
};
