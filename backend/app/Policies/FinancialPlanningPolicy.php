<?php

namespace App\Policies;

use Illuminate\Support\Facades\DB;

class FinancialPlanningPolicy
{
    public function viewOptions(object $user): bool
    {
        foreach (['pending_funds.view', 'partner_installments.view', 'expense_budgets.view', 'recurring_expenses.view'] as $permission) {
            if ($this->allows($user, $permission)) {
                return true;
            }
        }

        return false;
    }

    public function viewPendingFunds(object $user): bool { return $this->allows($user, 'pending_funds.view'); }
    public function managePendingFunds(object $user): bool { return $this->allows($user, 'pending_funds.manage'); }
    public function receivePendingFunds(object $user): bool { return $this->allows($user, 'pending_funds.receive'); }
    public function viewPartnerInstallments(object $user): bool { return $this->allows($user, 'partner_installments.view'); }
    public function managePartnerInstallments(object $user): bool { return $this->allows($user, 'partner_installments.manage'); }
    public function receivePartnerInstallments(object $user): bool { return $this->allows($user, 'partner_installments.receive'); }
    public function viewExpenseBudgets(object $user): bool { return $this->allows($user, 'expense_budgets.view'); }
    public function manageExpenseBudgets(object $user): bool { return $this->allows($user, 'expense_budgets.manage'); }
    public function viewRecurringExpenses(object $user): bool { return $this->allows($user, 'recurring_expenses.view'); }
    public function manageRecurringExpenses(object $user): bool { return $this->allows($user, 'recurring_expenses.manage'); }
    public function viewReports(object $user): bool { return $this->allows($user, 'finance_reports.view'); }

    private function allows(object $user, string $permission): bool
    {
        return isset($user->id) && DB::table('role_permissions as rp')
            ->join('permissions as p', 'p.id', '=', 'rp.permission_id')
            ->join('user_roles as ur', 'ur.role_id', '=', 'rp.role_id')
            ->join('roles as r', 'r.id', '=', 'ur.role_id')
            ->where('ur.user_id', $user->id)->where('r.is_active', true)->where('p.code', $permission)->exists();
    }
}
