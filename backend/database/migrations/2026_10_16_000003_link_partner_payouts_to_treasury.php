<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('partner_payments', function (Blueprint $table): void {
            $table->foreignId('treasury_account_id')->nullable()->after('partner_id')->constrained('treasury_accounts')->restrictOnDelete();
            $table->foreignId('treasury_entry_id')->nullable()->after('treasury_account_id')->unique()->constrained('treasury_entries')->restrictOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('partner_payments', function (Blueprint $table): void {
            $table->dropForeign(['treasury_account_id']);
            $table->dropForeign(['treasury_entry_id']);
            $table->dropUnique(['treasury_entry_id']);
            $table->dropColumn(['treasury_account_id', 'treasury_entry_id']);
        });
    }
};
