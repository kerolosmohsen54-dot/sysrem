<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('warehouse_return_lines', function (Blueprint $table): void {
            $table->foreignId('source_movement_line_id')->nullable()
                ->constrained('inventory_movement_lines')->restrictOnDelete();
            $table->string('return_condition', 16)->nullable();
            $table->index('source_movement_line_id', 'idx_warehouse_return_source_line');
        });
    }

    public function down(): void
    {
        Schema::table('warehouse_return_lines', function (Blueprint $table): void {
            $table->dropIndex('idx_warehouse_return_source_line');
            $table->dropConstrainedForeignId('source_movement_line_id');
            $table->dropColumn('return_condition');
        });
    }
};
