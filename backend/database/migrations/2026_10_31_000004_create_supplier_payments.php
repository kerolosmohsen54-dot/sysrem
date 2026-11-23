<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('supplier_payments', function (Blueprint $table): void {
            $table->bigIncrements('id');
            $table->foreignId('supplier_id')->constrained('suppliers')->restrictOnDelete();
            $table->foreignId('purchase_invoice_id')->constrained('purchase_invoices')->restrictOnDelete();
            $table->foreignId('treasury_account_id')->constrained('treasury_accounts')->restrictOnDelete();
            $table->foreignId('treasury_entry_id')->nullable()->unique()->constrained('treasury_entries')->restrictOnDelete();
            $table->decimal('amount_egp', 19, 4);
            $table->date('payment_date');
            $table->string('status', 24)->default('draft');
            $table->string('notes', 500)->nullable();
            $table->foreignId('created_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('approved_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('approved_at')->nullable();
            $table->string('idempotency_key', 200)->unique();
            $table->timestamps();
            $table->index(['supplier_id', 'status', 'payment_date'], 'ix_supplier_payments_balance');
            $table->index(['purchase_invoice_id', 'status', 'id'], 'ix_supplier_payments_invoice');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('supplier_payments');
    }
};
