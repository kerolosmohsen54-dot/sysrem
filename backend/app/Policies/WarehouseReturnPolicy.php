<?php

namespace App\Policies;

use App\Models\WarehouseReturn;
use Illuminate\Support\Facades\DB;

class WarehouseReturnPolicy
{
    public function viewAny(object $user): bool { return $this->allows($user, 'warehouse_returns.view'); }
    public function view(object $user, WarehouseReturn $return): bool { return $this->viewAny($user); }
    public function create(object $user): bool { return $this->allows($user, 'warehouse_returns.manage'); }
    public function approve(object $user, WarehouseReturn $return): bool { return $this->allows($user, 'warehouse_returns.approve'); }

    private function allows(object $user, string $permission): bool
    {
        return isset($user->id) && DB::table('role_permissions as rp')
            ->join('permissions as p', 'p.id', '=', 'rp.permission_id')
            ->join('user_roles as ur', 'ur.role_id', '=', 'rp.role_id')
            ->join('roles as r', 'r.id', '=', 'ur.role_id')
            ->where('ur.user_id', $user->id)->where('r.is_active', true)->where('p.code', $permission)->exists();
    }
}
