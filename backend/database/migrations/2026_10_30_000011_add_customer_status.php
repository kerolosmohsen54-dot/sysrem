<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('customers', 'status')) {
            Schema::table('customers', function (Blueprint $table): void {
                $table->enum('status', ['active', 'paused', 'blocked'])->default('active')->after('is_active');
            });
        }

        if (! Schema::hasIndex('customers', 'ix_customers_status_name')) {
            Schema::table('customers', function (Blueprint $table): void {
                $table->index(['status', 'name'], 'ix_customers_status_name');
            });
        }

        DB::table('customers')->where('is_active', false)->where('status', 'active')->update(['status' => 'paused']);
    }

    public function down(): void
    {
        Schema::table('customers', function (Blueprint $table): void {
            if (Schema::hasIndex('customers', 'ix_customers_status_name')) {
                $table->dropIndex('ix_customers_status_name');
            }
            if (Schema::hasColumn('customers', 'status')) {
                $table->dropColumn('status');
            }
        });
    }
};
