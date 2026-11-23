<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('sales_receipts', function (Blueprint $table): void {
            $table->enum('recording_source', ['sms', 'notification', 'manual'])->nullable()->after('notes');
            $table->boolean('is_unverified_payment')->default(false)->after('recording_source');
        });
    }

    public function down(): void
    {
        Schema::table('sales_receipts', function (Blueprint $table): void {
            $table->dropColumn(['recording_source', 'is_unverified_payment']);
        });
    }
};
