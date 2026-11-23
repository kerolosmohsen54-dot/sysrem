<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('partners', function (Blueprint $table): void {
            $table->foreignId('user_id')->nullable()->unique('uq_partners_user')->after('phone')->constrained('users')->nullOnDelete();
        });

        $now = now();
        DB::table('roles')->updateOrInsert(
            ['code' => 'partner'],
            [
                'name' => 'Partner',
                'description' => 'Partner user role; can view only the linked partner account and its own profit ledger.',
                'is_system' => true,
                'is_active' => true,
                'updated_at' => $now,
            ],
        );
        DB::table('permissions')->updateOrInsert(
            ['code' => 'partners.view'],
            ['description' => 'View partner records; partner-role users are scoped to their linked partner only.'],
        );
        $roleId = DB::table('roles')->where('code', 'partner')->value('id');
        $permissionId = DB::table('permissions')->where('code', 'partners.view')->value('id');
        DB::table('role_permissions')->insertOrIgnore([
            'role_id' => $roleId,
            'permission_id' => $permissionId,
            'granted_at' => $now,
        ]);
    }

    public function down(): void
    {
        // Forward-only business data migration. This down method intentionally keeps role and account links.
    }
};
