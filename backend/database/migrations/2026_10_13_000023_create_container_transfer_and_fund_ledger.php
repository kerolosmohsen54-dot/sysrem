<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('container_location_transfers', function (Blueprint $table): void {
            $table->id();
            $table->string('transfer_number', 80)->unique();
            $table->foreignId('product_id')->constrained('products')->restrictOnDelete();
            $table->foreignId('source_location_id')->constrained('locations')->restrictOnDelete();
            $table->foreignId('destination_location_id')->constrained('locations')->restrictOnDelete();
            $table->unsignedInteger('quantity');
            $table->date('transfer_date');
            $table->string('reason', 1000);
            $table->foreignId('inventory_movement_id')->constrained('inventory_movements')->restrictOnDelete();
            $table->foreignId('created_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('idempotency_key', 200)->unique();
            $table->timestamps();
            $table->index(['transfer_date', 'id']);
        });

        Schema::create('container_fund_movements', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('container_id')->constrained('containers')->restrictOnDelete();
            $table->string('movement_type', 16);
            $table->decimal('amount_egp', 19, 4);
            $table->string('department', 160);
            $table->string('reason', 500);
            $table->string('reference', 160)->nullable();
            $table->text('notes')->nullable();
            $table->date('movement_date');
            $table->decimal('balance_after_egp', 19, 4);
            $table->foreignId('created_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('idempotency_key', 200)->unique();
            $table->timestamps();
            $table->index(['container_id', 'movement_date', 'id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('container_fund_movements');
        Schema::dropIfExists('container_location_transfers');
    }
};