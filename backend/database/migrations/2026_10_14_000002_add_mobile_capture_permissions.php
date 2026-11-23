<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    private array $permissions = [
        'mobile.channels.view' => 'View mobile payment channels.',
        'mobile.messages.capture' => 'Capture messages for configured mobile payment channels.',
        'mobile.messages.record' => 'Record captured mobile deposits and withdrawals.',
    ];

    public function up(): void
    {
        $ownerId = DB::table('roles')->where('code', 'owner')->value('id');

        foreach ($this->permissions as $code => $description) {
            DB::table('permissions')->updateOrInsert(
                ['code' => $code],
                ['description' => $description],
            );

            $permissionId = DB::table('permissions')->where('code', $code)->value('id');
            if ($ownerId !== null && $permissionId !== null) {
                DB::table('role_permissions')->insertOrIgnore([
                    'role_id' => $ownerId,
                    'permission_id' => $permissionId,
                    'granted_at' => now(),
                ]);
            }
        }
    }

    public function down(): void
    {
        $ownerId = DB::table('roles')->where('code', 'owner')->value('id');
        if ($ownerId === null) {
            return;
        }

        $permissionIds = DB::table('permissions')->whereIn('code', array_keys($this->permissions))->pluck('id');
        DB::table('role_permissions')->where('role_id', $ownerId)
            ->whereIn('permission_id', $permissionIds)->delete();
    }
};
