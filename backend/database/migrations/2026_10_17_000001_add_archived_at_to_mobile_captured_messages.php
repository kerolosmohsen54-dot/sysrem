<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('mobile_captured_messages', function (Blueprint $table): void {
            $table->dateTime('archived_at')->nullable()->after('recorded_ref_id');
            $table->index(['archived_at', 'received_at', 'id'], 'ix_mobile_captured_archived_received');
        });
    }

    public function down(): void
    {
        throw new \RuntimeException('This production migration is forward-only.');
    }
};
