<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('purchase_invoices', function (Blueprint $table): void {
            $table->id();
            $table->string('invoice_number', 64)->unique();
            $table->foreignId('supplier_id')->constrained('suppliers')->restrictOnDelete();
            $table->foreignId('warehouse_id')->nullable()->constrained('locations')->nullOnDelete();
            $table->date('invoice_date');
            $table->string('status', 24)->default('draft');
            $table->decimal('subtotal_egp', 19, 4)->default(0);
            $table->decimal('discount_egp', 19, 4)->default(0);
            $table->decimal('tax_egp', 19, 4)->default(0);
            $table->decimal('total_egp', 19, 4)->default(0);
            $table->text('notes')->nullable();
            $table->foreignId('created_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->index(['supplier_id', 'invoice_date']);
            $table->index(['status', 'invoice_date']);
        });

        Schema::create('purchase_invoice_lines', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('purchase_invoice_id')->constrained('purchase_invoices')->cascadeOnDelete();
            $table->foreignId('product_id')->constrained('products')->restrictOnDelete();
            $table->unsignedInteger('quantity');
            $table->decimal('unit_cost_egp', 19, 4);
            $table->decimal('line_total_egp', 19, 4);
            $table->unsignedInteger('line_number');
            $table->timestamps();
            $table->unique(['purchase_invoice_id', 'line_number']);
            $table->index(['product_id', 'purchase_invoice_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('purchase_invoice_lines');
        Schema::dropIfExists('purchase_invoices');
    }
};
