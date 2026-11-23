<?php

namespace App\Policies;

use Illuminate\Support\Facades\DB;

class SalesOrderReservationPolicy
{
    public function confirm(object $user): bool
    {
        return $this->hasPermission($user, 'orders.manage');
    }

    public function cancel(object $user): bool
    {
        return $this->hasPermission($user, 'orders.manage');
    }

    public function invoice(object $user): bool
    {
        return $this->hasPermission($user, 'orders.manage')
            && $this->hasPermission($user, 'invoices.create');
    }

    private function hasPermission(object $user, string $permission): bool
    {
        return isset($user->id) && DB::table('role_permissions as role_permission')
            ->join('permissions as permission', 'permission.id', '=', 'role_permission.permission_id')
            ->join('user_roles as user_role', 'user_role.role_id', '=', 'role_permission.role_id')
            ->join('roles as role', 'role.id', '=', 'user_role.role_id')
            ->where('user_role.user_id', $user->id)
            ->where('role.is_active', true)
            ->where('permission.code', $permission)
            ->exists();
    }
}
