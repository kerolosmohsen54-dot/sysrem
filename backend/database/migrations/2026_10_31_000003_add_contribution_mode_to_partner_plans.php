<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('partner_installment_plans', function (Blueprint $table): void {
            // Existing plans retain their dated schedule. New container contributions
            // are explicitly marked manual and are not projected as future cash.
            $table->string('contribution_mode', 24)->default('scheduled')->after('first_due_date');
        });
    }

    public function down(): void
    {
        Schema::table('partner_installment_plans', function (Blueprint $table): void {
            $table->dropColumn('contribution_mode');
        });
    }
};
