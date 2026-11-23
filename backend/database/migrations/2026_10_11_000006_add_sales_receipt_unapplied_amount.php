<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! in_array(DB::connection()->getConfig('driver'), ['mysql', 'mariadb'], true)) {
            throw new RuntimeException('Sales receipt unapplied amounts require MySQL or MariaDB.');
        }

        Schema::table('sales_receipts', function ($table): void {
            $table->decimal('unapplied_amount', 19, 4)->nullable()->after('amount');
        });
        DB::statement(<<<'SQL'
            UPDATE sales_receipts AS receipt
            SET unapplied_amount = receipt.amount
                - COALESCE((
                    SELECT SUM(allocation.allocation_amount)
                    FROM sales_receipt_allocations AS allocation
                    WHERE allocation.sales_receipt_id = receipt.id
                ), 0)
                + COALESCE((
                    SELECT SUM(reversal.amount)
                    FROM sales_receipt_allocations AS allocation
                    INNER JOIN sales_receipt_allocation_reversals AS reversal
                        ON reversal.sales_receipt_allocation_id = allocation.id
                    WHERE allocation.sales_receipt_id = receipt.id
                ), 0)
            SQL);
        DB::statement('ALTER TABLE sales_receipts MODIFY COLUMN unapplied_amount DECIMAL(19,4) NOT NULL DEFAULT 0.0000');
        DB::statement('ALTER TABLE sales_receipts ADD CONSTRAINT chk_sales_receipts_unapplied CHECK (unapplied_amount >= 0 AND unapplied_amount <= amount)');
    }

    public function down(): void
    {
        $dropConstraint = DB::connection()->getConfig('driver') === 'mariadb' ? 'DROP CONSTRAINT' : 'DROP CHECK';
        DB::statement("ALTER TABLE sales_receipts {$dropConstraint} chk_sales_receipts_unapplied");
        Schema::table('sales_receipts', function ($table): void {
            $table->dropColumn('unapplied_amount');
        });
    }
};
