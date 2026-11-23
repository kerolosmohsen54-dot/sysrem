<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! in_array(DB::connection()->getConfig('driver'), ['mysql', 'mariadb'], true)) {
            throw new RuntimeException('Sales workflow snapshots require MySQL or MariaDB.');
        }

        Schema::table('sales_document_lines', function (Blueprint $table): void {
            $table->decimal('unit_cost_egp_snapshot', 19, 4)->nullable()->after('unit_price');
            $table->string('tax_calculation_method_snapshot', 16)->nullable()->after('tax_rate_snapshot');
            $table->string('return_cost_method_snapshot', 40)->nullable()->after('original_document_line_id');
        });

        DB::statement(
            "ALTER TABLE sales_document_lines ADD CONSTRAINT chk_sales_lines_tax_calculation_method CHECK (tax_calculation_method_snapshot IS NULL OR tax_calculation_method_snapshot IN ('inclusive', 'exclusive'))",
        );
        DB::statement(
            "ALTER TABLE sales_document_lines ADD CONSTRAINT chk_sales_lines_return_cost_method CHECK (return_cost_method_snapshot IS NULL OR return_cost_method_snapshot IN ('sold_line', 'warehouse_current_average', 'warehouse_historical_average', 'owner_entered'))",
        );
    }

    public function down(): void
    {
        $driver = DB::connection()->getConfig('driver');
        $dropConstraint = $driver === 'mariadb' ? 'DROP CONSTRAINT' : 'DROP CHECK';
        DB::statement("ALTER TABLE sales_document_lines {$dropConstraint} chk_sales_lines_tax_calculation_method");
        DB::statement("ALTER TABLE sales_document_lines {$dropConstraint} chk_sales_lines_return_cost_method");

        Schema::table('sales_document_lines', function (Blueprint $table): void {
            $table->dropColumn([
                'unit_cost_egp_snapshot',
                'tax_calculation_method_snapshot',
                'return_cost_method_snapshot',
            ]);
        });
    }
};
