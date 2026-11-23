<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * This migration is deliberately forward-only. Reservation history is part
     * of the stock audit trail and must not be removed by a rollback.
     */
    public function up(): void
    {
        Schema::create('sales_order_reservations', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('sales_order_line_id')->constrained('sales_order_lines')->restrictOnDelete();
            $table->unsignedSmallInteger('cycle_number')->default(1);
            $table->foreignId('product_id')->constrained('products')->restrictOnDelete();
            $table->unsignedInteger('quantity');
            $table->enum('status', ['reserved', 'released', 'consumed'])->default('reserved');
            $table->foreignId('created_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('reserved_at')->useCurrent();
            $table->timestamp('released_at')->nullable();
            $table->timestamp('consumed_at')->nullable();
            $table->timestamps();
            $table->unique(['sales_order_line_id', 'cycle_number'], 'uq_sales_order_reservation_line_cycle');
            $table->index(['product_id', 'status'], 'ix_sales_order_reservations_product_status');
        });

        Schema::create('sales_order_reservation_allocations', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('reservation_id')->constrained('sales_order_reservations')->restrictOnDelete();
            $table->foreignId('location_id')->constrained('locations')->restrictOnDelete();
            $table->unsignedInteger('quantity');
            $table->timestamp('created_at')->useCurrent();
            $table->unique(['reservation_id', 'location_id'], 'uq_sales_order_reservation_location');
            $table->index(['location_id', 'reservation_id'], 'ix_sales_order_reservation_allocations_location');
        });
    }

    public function down(): void
    {
        throw new LogicException('This forward-only migration retains reservation history and cannot be rolled back.');
    }
};
