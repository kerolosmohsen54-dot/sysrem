<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    private array $permissions = [
        'inventory_counts.view' => 'View periodic inventory counts.',
        'inventory_counts.manage' => 'Create periodic inventory count sessions.',
        'inventory_counts.approve' => 'Approve periodic inventory counts and post count movements.',
    ];

    public function up(): void
    {
        $ownerId = DB::table('roles')->where('code', 'owner')->value('id');
        foreach ($this->permissions as $code => $description) {
            DB::table('permissions')->updateOrInsert(['code' => $code], ['description' => $description, 'created_at' => now()]);
            $permissionId = DB::table('permissions')->where('code', $code)->value('id');
            if ($ownerId !== null && $permissionId !== null) {
                DB::table('role_permissions')->insertOrIgnore(['role_id' => $ownerId, 'permission_id' => $permissionId, 'granted_at' => now()]);
            }
        }
    }

    public function down(): void
    {
        $ownerId = DB::table('roles')->where('code', 'owner')->value('id');
        $ids = DB::table('permissions')->whereIn('code', array_keys($this->permissions))->pluck('id');
        if ($ownerId !== null && $ids->isNotEmpty()) DB::table('role_permissions')->where('role_id', $ownerId)->whereIn('permission_id', $ids)->delete();
        DB::table('permissions')->whereIn('code', array_keys($this->permissions))->delete();
    }
};