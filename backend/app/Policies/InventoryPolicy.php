<?php

namespace App\Policies;

use Illuminate\Support\Facades\DB;

class InventoryPolicy
{
    public function manage(object $user): bool { return $this->allows($user, 'inventory.manage'); }
    public function countCreate(object $user): bool { return $this->allows($user, 'inventory_counts.manage'); }
    public function countApprove(object $user): bool { return $this->allows($user, 'inventory_counts.approve'); }
    public function minimumUpdate(object $user): bool { return $this->allows($user, 'inventory.manage'); }

    private function allows(object $user, string $permission): bool
    {
        return isset($user->id) && DB::table('role_permissions as rp')
            ->join('permissions as p', 'p.id', '=', 'rp.permission_id')
            ->join('user_roles as ur', 'ur.role_id', '=', 'rp.role_id')
            ->join('roles as r', 'r.id', '=', 'ur.role_id')
            ->where('ur.user_id', $user->id)->where('r.is_active', true)->where('p.code', $permission)->exists();
    }
}
