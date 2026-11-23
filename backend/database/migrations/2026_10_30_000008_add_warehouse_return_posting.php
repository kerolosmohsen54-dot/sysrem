<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('warehouse_returns', function (Blueprint $table): void {
            $table->foreignId('approved_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('approved_at')->nullable();
            $table->index(['status', 'return_date', 'id']);
        });
        Schema::table('warehouse_return_lines', function (Blueprint $table): void {
            $table->foreignId('inventory_movement_id')->nullable()->unique()->constrained('inventory_movements')->restrictOnDelete();
        });
        DB::table('permissions')->updateOrInsert(['code' => 'warehouse_returns.approve'], ['description' => 'Approve warehouse returns and post stock movements.', 'created_at' => now()]);
        $owner = DB::table('roles')->where('code', 'owner')->value('id');
        $permission = DB::table('permissions')->where('code', 'warehouse_returns.approve')->value('id');
        if ($owner && $permission) DB::table('role_permissions')->insertOrIgnore(['role_id' => $owner, 'permission_id' => $permission, 'granted_at' => now()]);
    }

    public function down(): void
    {
        Schema::table('warehouse_return_lines', fn (Blueprint $table) => $table->dropConstrainedForeignId('inventory_movement_id'));
        Schema::table('warehouse_returns', function (Blueprint $table): void {
            $table->dropIndex(['status', 'return_date', 'id']);
            $table->dropConstrainedForeignId('approved_by_user_id');
            $table->dropColumn('approved_at');
        });
    }
};
