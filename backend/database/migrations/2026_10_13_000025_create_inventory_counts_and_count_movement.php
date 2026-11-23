<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('inventory_counts', function (Blueprint $table): void {
            $table->id();
            $table->string('count_number', 80)->unique();
            $table->foreignId('warehouse_id')->constrained('locations')->restrictOnDelete();
            $table->date('count_date');
            $table->string('status', 24)->default('draft');
            $table->string('reason', 1000);
            $table->foreignId('created_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('approved_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('approved_at')->nullable();
            $table->string('idempotency_key', 200)->unique();
            $table->timestamps();
            $table->index(['warehouse_id', 'count_date', 'id']);
        });
        Schema::create('inventory_count_lines', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('inventory_count_id')->constrained('inventory_counts')->cascadeOnDelete();
            $table->unsignedInteger('line_number');
            $table->foreignId('product_id')->constrained('products')->restrictOnDelete();
            $table->unsignedInteger('expected_quantity');
            $table->unsignedInteger('counted_quantity');
            $table->integer('difference_quantity');
            $table->foreignId('inventory_movement_id')->nullable()->constrained('inventory_movements')->restrictOnDelete();
            $table->timestamps();
            $table->unique(['inventory_count_id', 'line_number'], 'uq_inventory_count_line_number');
            $table->unique(['inventory_count_id', 'product_id'], 'uq_inventory_count_product');
            $table->unique('inventory_movement_id', 'uq_inventory_count_movement');
        });
        DB::statement("ALTER TABLE inventory_movements MODIFY movement_type ENUM('opening','receipt','sale','return','transfer','adjustment','damage','container_receipt','reversal','count') NOT NULL");
    }

    public function down(): void
    {
        if (DB::table('inventory_movements')->where('movement_type', 'count')->exists()) {
            throw new \RuntimeException('Cannot roll back count movement support while count movements exist.');
        }
        Schema::dropIfExists('inventory_count_lines');
        Schema::dropIfExists('inventory_counts');
        DB::statement("ALTER TABLE inventory_movements MODIFY movement_type ENUM('opening','receipt','sale','return','transfer','adjustment','damage','container_receipt','reversal') NOT NULL");
    }
};