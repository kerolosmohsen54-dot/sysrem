<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('mobile_payment_channels', function (Blueprint $table): void {
            $table->json('notification_package_names')->nullable()->after('sender_filter');
        });
    }

    public function down(): void
    {
        Schema::table('mobile_payment_channels', function (Blueprint $table): void {
            $table->dropColumn('notification_package_names');
        });
    }
};
