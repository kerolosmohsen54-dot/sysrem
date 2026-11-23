<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table): void {
            $table->decimal('purchase_cost_egp', 19, 4)->nullable()->after('company_price');
        });

        Schema::table('sales_documents', function (Blueprint $table): void {
            $table->decimal('paid_amount_snapshot', 19, 4)->nullable()->after('total_amount');
            $table->decimal('cogs_egp_snapshot', 19, 4)->nullable()->after('paid_amount_snapshot');
            $table->decimal('surplus_egp_snapshot', 19, 4)->nullable()->after('cogs_egp_snapshot');
            $table->decimal('partner_profit_egp_snapshot', 19, 4)->nullable()->after('surplus_egp_snapshot');
            $table->decimal('company_profit_egp_snapshot', 19, 4)->nullable()->after('partner_profit_egp_snapshot');
            $table->string('profit_pricing_status', 16)->default('unpriced')->after('company_profit_egp_snapshot');
        });

        Schema::table('sales_document_lines', function (Blueprint $table): void {
            $table->string('container_number_snapshot', 100)->nullable()->after('company_price_egp_snapshot');
        });

        DB::statement('UPDATE products AS product JOIN (SELECT product_id, ROUND(SUM(inventory_value_egp) / NULLIF(SUM(quantity_on_hand), 0), 4) AS unit_cost FROM inventory_balances WHERE quantity_on_hand > 0 GROUP BY product_id) AS stock_cost ON stock_cost.product_id = product.id SET product.purchase_cost_egp = stock_cost.unit_cost WHERE product.purchase_cost_egp IS NULL');

        Schema::create('partner_profit_ledger', function (Blueprint $table): void {
            $table->bigIncrements('id');
            $table->foreignId('partner_id')->constrained('partners')->restrictOnDelete();
            $table->foreignId('sales_document_id')->nullable()->constrained('sales_documents')->restrictOnDelete();
            $table->foreignId('reference_document_id')->nullable()->constrained('sales_documents')->restrictOnDelete();
            $table->foreignId('partner_payment_id')->nullable()->constrained('partner_payments')->restrictOnDelete();
            $table->string('entry_type', 16);
            $table->decimal('amount_egp', 19, 4);
            $table->date('effective_date');
            $table->string('source_key', 200)->unique();
            $table->string('notes', 500)->nullable();
            $table->foreignId('created_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('created_at')->useCurrent();
            $table->index(['partner_id', 'effective_date', 'id'], 'ix_partner_profit_ledger_partner_date');
            $table->index(['sales_document_id', 'entry_type'], 'ix_partner_profit_ledger_document');
        });

        Schema::create('container_cost_revaluations', function (Blueprint $table): void {
            $table->bigIncrements('id');
            $table->foreignId('container_cost_id')->constrained('container_costs')->restrictOnDelete();
            $table->foreignId('container_receipt_line_id')->constrained('container_receipt_lines')->restrictOnDelete();
            $table->foreignId('product_id')->constrained('products')->restrictOnDelete();
            $table->foreignId('location_id')->constrained('locations')->restrictOnDelete();
            $table->unsignedInteger('quantity_on_hand_at_posting')->default(0);
            $table->decimal('allocated_amount_egp', 19, 4);
            $table->decimal('capitalized_amount_egp', 19, 4);
            $table->decimal('unapplied_amount_egp', 19, 4);
            $table->foreignId('created_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('created_at')->useCurrent();
            $table->unique(['container_cost_id', 'container_receipt_line_id'], 'uq_container_cost_revaluation_line');
            $table->index(['product_id', 'location_id', 'created_at'], 'ix_container_cost_revaluation_stock');
        });

        $baseColumn = null;
        foreach (['base_price_egp_snapshot', 'base_price_egp', 'base_price'] as $candidate) {
            if (Schema::hasColumn('sales_document_lines', $candidate)) {
                $baseColumn = $candidate;
                break;
            }
        }
        if ($baseColumn !== null) {
            DB::table('sales_document_lines')
                ->whereNull('company_price_egp_snapshot')
                ->whereNotNull($baseColumn)
                ->update(['company_price_egp_snapshot' => DB::raw('`'.$baseColumn.'`')]);
        }

        DB::table('sales_documents')
            ->where('document_type', 'invoice')
            ->where('status', 'posted')
            ->orderBy('id')
            ->chunkById(200, function ($documents): void {
                foreach ($documents as $document) {
                    $lines = DB::table('sales_document_lines')
                        ->where('sales_document_id', $document->id)
                        ->get(['company_price_egp_snapshot', 'unit_cost_egp_snapshot']);
                    $priced = $lines->isNotEmpty() && $lines->every(
                        static fn (object $line): bool => $line->company_price_egp_snapshot !== null
                            && $line->unit_cost_egp_snapshot !== null,
                    );
                    DB::table('sales_documents')->where('id', $document->id)->update([
                        'profit_pricing_status' => $priced ? 'priced' : 'unpriced',
                    ]);
                }
            });
    }

    public function down(): void
    {
        // Forward-only financial history and snapshot fields are intentionally retained.
    }
};
