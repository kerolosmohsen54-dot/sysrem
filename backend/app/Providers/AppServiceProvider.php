<?php

namespace App\Providers;

use App\Models\SalesOrderReservation;
use App\Models\SalesOrder;
use App\Models\SalesDocument;
use App\Models\ChartOfAccount;
use App\Models\FinancialAdjustment;
use App\Models\JournalEntry;
use App\Models\PendingFund;
use App\Models\PartnerInstallmentPlan;
use App\Models\ExpenseBudget;
use App\Models\RecurringExpenseTemplate;
use App\Models\CustomerAttachment;
use App\Models\Governorate;
use App\Models\WarehouseReturn;
use App\Models\InventoryBalance;
use App\Models\InventoryCount;
use App\Models\MinimumStockThreshold;
use App\Policies\AccountingPolicy;
use App\Policies\FinancialPlanningPolicy;
use App\Policies\CustomerAttachmentPolicy;
use App\Policies\GovernoratePolicy;
use App\Policies\WarehouseReturnPolicy;
use App\Policies\InventoryPolicy;
use App\Policies\SalesOrderPolicy;
use App\Policies\SalesDocumentPolicy;
use App\Policies\SalesOrderReservationPolicy;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Gate::policy(SalesOrderReservation::class, SalesOrderReservationPolicy::class);
        Gate::policy(SalesOrder::class, SalesOrderPolicy::class);
        Gate::policy(SalesDocument::class, SalesDocumentPolicy::class);
        Gate::policy(ChartOfAccount::class, AccountingPolicy::class);
        Gate::policy(JournalEntry::class, AccountingPolicy::class);
        Gate::policy(FinancialAdjustment::class, AccountingPolicy::class);
        Gate::policy(PendingFund::class, FinancialPlanningPolicy::class);
        Gate::policy(PartnerInstallmentPlan::class, FinancialPlanningPolicy::class);
        Gate::policy(ExpenseBudget::class, FinancialPlanningPolicy::class);
        Gate::policy(RecurringExpenseTemplate::class, FinancialPlanningPolicy::class);
        Gate::policy(CustomerAttachment::class, CustomerAttachmentPolicy::class);
        Gate::policy(Governorate::class, GovernoratePolicy::class);
        Gate::policy(WarehouseReturn::class, WarehouseReturnPolicy::class);
        Gate::policy(InventoryBalance::class, InventoryPolicy::class);
        Gate::policy(InventoryCount::class, InventoryPolicy::class);
        Gate::policy(MinimumStockThreshold::class, InventoryPolicy::class);
    }
}
