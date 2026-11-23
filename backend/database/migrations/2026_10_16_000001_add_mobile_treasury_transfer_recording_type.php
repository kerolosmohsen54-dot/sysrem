<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('mobile_captured_messages', function (Blueprint $table): void {
            $table->enum('recorded_as', ['CUSTOMER_COLLECTION', 'EXPENSE', 'TREASURY_TRANSFER'])
                ->nullable()
                ->change();
        });
    }

    public function down(): void
    {
        throw new \RuntimeException('This migration is forward-only.');
    }
};
