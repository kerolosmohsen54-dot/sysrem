<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pending_fund_receipts', function (Blueprint $table): void {
            $table->unsignedBigInteger('treasury_entry_id')->nullable()->change();
        });
        Schema::table('partner_installment_payments', function (Blueprint $table): void {
            $table->unsignedBigInteger('treasury_entry_id')->nullable()->change();
        });
    }

    public function down(): void
    {
        throw new LogicException('Finance receipt ledger-link migrations are forward-only.');
    }
};
