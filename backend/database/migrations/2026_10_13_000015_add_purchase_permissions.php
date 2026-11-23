<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        $now = now();
        DB::table('permissions')->updateOrInsert(['code' => 'purchases.view'], ['description' => 'View suppliers and purchase invoices.', 'created_at' => $now]);
        DB::table('permissions')->updateOrInsert(['code' => 'purchases.manage'], ['description' => 'Create and manage purchase invoices.', 'created_at' => $now]);
        $ownerId = DB::table('roles')->where('code', 'owner')->value('id');
        if ($ownerId !== null) {
            $permissionIds = DB::table('permissions')->whereIn('code', ['purchases.view', 'purchases.manage'])->pluck('id');
            foreach ($permissionIds as $permissionId) {
                DB::table('role_permissions')->insertOrIgnore(['role_id' => $ownerId, 'permission_id' => $permissionId, 'granted_at' => $now]);
            }
        }
    }

    public function down(): void
    {
        $ownerId = DB::table('roles')->where('code', 'owner')->value('id');
        $permissionIds = DB::table('permissions')->whereIn('code', ['purchases.view', 'purchases.manage'])->pluck('id');
        if ($ownerId !== null && $permissionIds->isNotEmpty()) {
            DB::table('role_permissions')->where('role_id', $ownerId)->whereIn('permission_id', $permissionIds)->delete();
        }
        DB::table('permissions')->whereIn('code', ['purchases.view', 'purchases.manage'])->delete();
    }
};