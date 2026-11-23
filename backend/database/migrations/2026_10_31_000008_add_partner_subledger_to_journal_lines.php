<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('journal_lines', function (Blueprint $table): void {
            $table->foreignId('partner_id')->nullable()->after('supplier_id')->constrained('partners')->restrictOnDelete();
            $table->index(['partner_id', 'journal_entry_id'], 'ix_journal_lines_partner');
        });
    }

    public function down(): void
    {
        Schema::table('journal_lines', function (Blueprint $table): void {
            $table->dropIndex('ix_journal_lines_partner');
            $table->dropConstrainedForeignId('partner_id');
        });
    }
};
