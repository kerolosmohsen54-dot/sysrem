<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Sales order snapshots and return origin are retained as part of the
     * document history, so this migration is intentionally forward only.
     */
    public function up(): void
    {
        Schema::table('sales_orders', function (Blueprint $table): void {
            $table->foreignId('salesperson_id')->nullable()->after('customer_id')->constrained('users')->restrictOnDelete();
            $table->string('salesperson_name_snapshot', 160)->nullable()->after('salesperson_id');
            $table->foreignId('warehouse_id')->nullable()->after('salesperson_name_snapshot')->constrained('locations')->restrictOnDelete();
            $table->char('currency_code', 3)->default('EGP')->after('warehouse_id');
            $table->string('payment_method', 40)->nullable()->after('currency_code');
            $table->string('payment_terms', 120)->nullable()->after('payment_method');
            $table->string('discount_type', 16)->default('fixed')->after('payment_terms');
            $table->decimal('discount_value', 19, 4)->default(0)->after('discount_type');
            $table->decimal('subtotal', 19, 4)->default(0)->after('discount_value');
            $table->decimal('discount_amount', 19, 4)->default(0)->after('subtotal');
            $table->decimal('tax_amount', 19, 4)->default(0)->after('discount_amount');
            $table->decimal('shipping_amount', 19, 4)->default(0)->after('tax_amount');
            $table->decimal('total_amount', 19, 4)->default(0)->after('shipping_amount');
            $table->timestamp('printed_at')->nullable()->after('confirmed_at');
            $table->unsignedInteger('print_count')->default(0)->after('printed_at');
            $table->index(['salesperson_id', 'order_date', 'id'], 'ix_sales_orders_salesperson_date');
            $table->index(['warehouse_id', 'order_date', 'id'], 'ix_sales_orders_warehouse_date');
            $table->index(['currency_code', 'payment_method', 'id'], 'ix_sales_orders_currency_payment');
        });

        Schema::table('sales_order_lines', function (Blueprint $table): void {
            $table->decimal('discount_percent', 5, 2)->default(0)->after('unit_price');
            $table->decimal('discount_amount', 19, 4)->default(0)->after('discount_percent');
            $table->decimal('order_discount_amount', 19, 4)->default(0)->after('discount_amount');
            $table->decimal('tax_amount', 19, 4)->default(0)->after('order_discount_amount');
            $table->decimal('line_total', 19, 4)->default(0)->after('discount_amount');
        });

        DB::table('sales_order_lines')->update([
            'line_total' => DB::raw('quantity * unit_price'),
        ]);
        DB::statement('UPDATE sales_orders SET subtotal = COALESCE((SELECT SUM(line.quantity * line.unit_price) FROM sales_order_lines AS line WHERE line.sales_order_id = sales_orders.id), 0), total_amount = COALESCE((SELECT SUM(line.quantity * line.unit_price) FROM sales_order_lines AS line WHERE line.sales_order_id = sales_orders.id), 0)');

        Schema::table('sales_documents', function (Blueprint $table): void {
            $table->string('return_processing_type', 16)->nullable()->after('return_reason');
            $table->index(['document_type', 'return_processing_type', 'issue_date'], 'ix_sales_documents_return_processing');
        });
    }

    public function down(): void
    {
        throw new LogicException('This forward-only migration retains sales document history and cannot be rolled back.');
    }
};
