<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        if (! in_array(DB::connection()->getConfig('driver'), ['mysql', 'mariadb'], true)) {
            throw new RuntimeException('Delivery source constraints require MySQL or MariaDB.');
        }

        $invalidDeliveries = DB::table('deliveries')
            ->where(function ($query): void {
                $query->whereNull('sales_order_id')->whereNull('sales_document_id');
            })
            ->orWhere(function ($query): void {
                $query->whereNotNull('sales_order_id')->whereNotNull('sales_document_id');
            })
            ->exists();
        if ($invalidDeliveries) {
            throw new RuntimeException('Cannot enforce delivery source constraint while invalid delivery headers exist.');
        }

        DB::statement('ALTER TABLE deliveries ADD CONSTRAINT chk_deliveries_exactly_one_source CHECK ((sales_order_id IS NULL) <> (sales_document_id IS NULL))');
    }

    public function down(): void
    {
        $dropConstraint = DB::connection()->getConfig('driver') === 'mariadb' ? 'DROP CONSTRAINT' : 'DROP CHECK';
        DB::statement("ALTER TABLE deliveries {$dropConstraint} chk_deliveries_exactly_one_source");
    }
};
