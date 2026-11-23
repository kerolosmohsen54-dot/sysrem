<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('purchase_invoices', function (Blueprint $table): void {
            $table->foreignId('seller_partner_id')->nullable()->after('supplier_id')
                ->constrained('partners')->restrictOnDelete();
        });

        Schema::table('purchase_invoice_lines', function (Blueprint $table): void {
            $table->decimal('company_price_egp', 19, 4)->nullable()->after('unit_cost_egp');
        });

        Schema::table('partner_profit_ledger', function (Blueprint $table): void {
            $table->foreignId('purchase_invoice_id')->nullable()->after('sales_document_id')
                ->constrained('purchase_invoices')->restrictOnDelete();
            $table->index(['purchase_invoice_id', 'entry_type'], 'ix_partner_profit_purchase_invoice');
        });
    }

    public function down(): void
    {
        Schema::table('partner_profit_ledger', function (Blueprint $table): void {
            $table->dropIndex('ix_partner_profit_purchase_invoice');
            $table->dropConstrainedForeignId('purchase_invoice_id');
        });
        Schema::table('purchase_invoice_lines', function (Blueprint $table): void {
            $table->dropColumn('company_price_egp');
        });
        Schema::table('purchase_invoices', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('seller_partner_id');
        });
    }
};
