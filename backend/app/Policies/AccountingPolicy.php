<?php

namespace App\Policies;

use Illuminate\Support\Facades\DB;

class AccountingPolicy
{
    public function viewChart(object $user): bool { return $this->hasPermission($user, 'chart_of_accounts.view'); }
    public function manageChart(object $user): bool { return $this->hasPermission($user, 'chart_of_accounts.manage'); }
    public function viewJournals(object $user): bool { return $this->hasPermission($user, 'journal_entries.view'); }
    public function createJournal(object $user): bool { return $this->hasPermission($user, 'journal_entries.create'); }
    public function editDraft(object $user): bool { return $this->hasPermission($user, 'journal_entries.create'); }
    public function postJournal(object $user): bool { return $this->hasPermission($user, 'journal_entries.post'); }
    public function reverseJournal(object $user): bool { return $this->hasPermission($user, 'journal_entries.reverse'); }
    public function postTreasury(object $user): bool { return $this->hasPermission($user, 'treasury.post'); }
    public function viewReports(object $user): bool { return $this->hasPermission($user, 'accounting.reports.view'); }
    public function viewAdjustments(object $user): bool { return $this->hasPermission($user, 'financial_adjustments.view'); }
    public function createAdjustment(object $user): bool { return $this->hasPermission($user, 'financial_adjustments.manage'); }

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
