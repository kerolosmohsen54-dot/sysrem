<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $roleId = DB::table('roles')->where('code', 'read_only')->where('is_active', true)->value('id');
        $permissionId = DB::table('permissions')->where('code', 'mobile.use')->value('id');

        if ($roleId !== null && $permissionId !== null) {
            DB::table('role_permissions')->insertOrIgnore([
                'role_id' => $roleId,
                'permission_id' => $permissionId,
                'granted_at' => now(),
            ]);
        }
    }

    public function down(): void
    {
        $roleId = DB::table('roles')->where('code', 'read_only')->value('id');
        $permissionId = DB::table('permissions')->where('code', 'mobile.use')->value('id');

        if ($roleId !== null && $permissionId !== null) {
            DB::table('role_permissions')->where('role_id', $roleId)
                ->where('permission_id', $permissionId)->delete();
        }
    }
};
