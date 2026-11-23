<?php

namespace App\Policies;

use Illuminate\Support\Facades\DB;

class SalesDocumentPolicy
{
    public function createInvoice(object $user): bool
    {
        return $this->hasPermission($user, 'invoices.create');
    }

    public function revise(object $user): bool
    {
        return $this->hasPermission($user, 'documents.edit');
    }

    public function restore(object $user): bool
    {
        return $this->hasPermission($user, 'documents.edit');
    }

    public function issue(object $user): bool
    {
        return $this->hasPermission($user, 'invoices.create');
    }

    public function cancel(object $user): bool
    {
        return $this->hasPermission($user, 'documents.cancel');
    }

    public function print(object $user): bool
    {
        return $this->hasPermission($user, 'invoices.view');
    }

    public function printReturn(object $user): bool
    {
        return $this->hasPermission($user, 'returns.view');
    }

    public function createReturn(object $user, bool $free = false): bool
    {
        return $this->hasPermission($user, 'returns.create')
            && (! $free || $this->hasPermission($user, 'returns.free.create'));
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
