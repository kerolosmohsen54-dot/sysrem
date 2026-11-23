<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $now = now();
        DB::table('permissions')->updateOrInsert(
            ['code' => 'purchases.payments.approve'],
            ['description' => 'Approve supplier payments and post them to treasury.', 'created_at' => $now],
        );
        $permissionId = DB::table('permissions')->where('code', 'purchases.payments.approve')->value('id');
        $ownerId = DB::table('roles')->where('code', 'owner')->value('id');
        if ($permissionId !== null && $ownerId !== null) {
            DB::table('role_permissions')->insertOrIgnore([
                'role_id' => $ownerId,
                'permission_id' => $permissionId,
                'granted_at' => $now,
            ]);
        }
    }

    public function down(): void
    {
        $permissionId = DB::table('permissions')->where('code', 'purchases.payments.approve')->value('id');
        if ($permissionId !== null) {
            DB::table('role_permissions')->where('permission_id', $permissionId)->delete();
            DB::table('permissions')->where('id', $permissionId)->delete();
        }
    }
};
