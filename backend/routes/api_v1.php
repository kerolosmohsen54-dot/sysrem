<?php

use App\Http\Controllers\AuditHistoryController;
use App\Http\Controllers\AccountingController;
use App\Http\Controllers\FinancialPlanningController;
use App\Http\Controllers\WarehouseReturnController;
use App\Http\Controllers\ApprovedDamagedStockController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\CatalogController;
use App\Http\Controllers\ContainerController;
use App\Http\Controllers\ContainerIntakeController;
use App\Http\Controllers\ContainerLedgerController;
use App\Http\Controllers\GeneralSettingsController;
use App\Http\Controllers\HealthController;
use App\Http\Controllers\InventoryController;
use App\Http\Controllers\InventoryCountController;
use App\Http\Controllers\MobileAdministrationController;
use App\Http\Controllers\MobileCaptureController;
use App\Http\Controllers\MinimumStockController;
use App\Http\Controllers\MobileAuthController;
use App\Http\Controllers\MobileCustomerController;
use App\Http\Controllers\MobileDeviceAdminController;
use App\Http\Controllers\MobileFinanceController;
use App\Http\Controllers\MobileMessageController;
use App\Http\Controllers\MobileSyncController;
use App\Http\Controllers\OrdersController;
use App\Http\Controllers\ReportsController;
use App\Http\Controllers\SalesController;
use App\Http\Controllers\SupplierController;
use App\Http\Controllers\SupplierPaymentController;
use App\Http\Controllers\PurchaseInvoiceController;
use App\Http\Controllers\TreasuryController;
use App\Http\Controllers\UserAdminController;
use App\Http\Controllers\UserPasswordController;
use App\Http\Controllers\PartnerController;
use App\Http\Controllers\PartnerPaymentController;
use App\Http\Controllers\CustomerLiquidationController;
use App\Http\Controllers\CustomerAttachmentController;
use App\Http\Controllers\CurrencyReferenceController;
use App\Http\Controllers\ReferenceCatalogController;
use App\Http\Controllers\RecycleBinController;
use App\Http\Controllers\DataToolsController;
use App\Http\Controllers\BackupController;
use App\Http\Controllers\GlobalSearchController;
use App\Http\Controllers\NotificationController;
use Illuminate\Support\Facades\Route;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

Route::prefix('v1')->group(function (): void {
    Route::get('/health', HealthController::class)->name('health');
    Route::get('/auth/login-options', [AuthController::class, 'loginOptions'])
        ->middleware('throttle:10,1')
        ->name('auth.login-options');
    Route::post('/auth/login', [AuthController::class, 'login'])
        ->middleware('throttle:5,1')
        ->name('auth.login');
    Route::get('/customers', [SalesController::class, 'customers'])
        ->middleware(['api.customer_picker', 'api.permission:customers.view,mobile.use'])
        ->name('customers.index');

    Route::middleware('api.session')->group(function (): void {
        Route::get('/finance-planning-options', [FinancialPlanningController::class, 'planningOptions'])
            ->middleware('api.permission:pending_funds.view,partner_installments.view,expense_budgets.view,recurring_expenses.view')
            ->name('finance-planning-options.index');
        Route::get('/pending-funds', [FinancialPlanningController::class, 'pendingFunds'])->middleware('api.permission:pending_funds.view')->name('pending-funds.index');
        Route::post('/pending-funds', [FinancialPlanningController::class, 'createPendingFund'])->middleware(['api.csrf', 'api.step_up', 'api.permission:pending_funds.manage'])->name('pending-funds.store');
        Route::get('/pending-funds/{id}', [FinancialPlanningController::class, 'showPendingFund'])->whereNumber('id')->middleware('api.permission:pending_funds.view')->name('pending-funds.show');
        Route::post('/pending-funds/{id}/receive', [FinancialPlanningController::class, 'receivePendingFund'])->whereNumber('id')->middleware(['api.csrf', 'api.step_up', 'api.permission:pending_funds.receive'])->name('pending-funds.receive');
        Route::post('/pending-funds/{id}/cancel', [FinancialPlanningController::class, 'cancelPendingFund'])->whereNumber('id')->middleware(['api.csrf', 'api.step_up', 'api.permission:pending_funds.manage'])->name('pending-funds.cancel');
        Route::get('/container-partners', [FinancialPlanningController::class, 'containerPartners'])->middleware('api.permission:partner_installments.view')->name('container-partners.index');
        Route::post('/container-partners', [FinancialPlanningController::class, 'createContainerPartner'])->middleware(['api.csrf', 'api.step_up', 'api.permission:partner_installments.manage'])->name('container-partners.store');
        Route::get('/partner-installment-plans', [FinancialPlanningController::class, 'partnerPlans'])->middleware('api.permission:partner_installments.view')->name('partner-installment-plans.index');
        Route::post('/partner-installment-plans', [FinancialPlanningController::class, 'createPartnerPlan'])->middleware(['api.csrf', 'api.step_up', 'api.permission:partner_installments.manage'])->name('partner-installment-plans.store');
        Route::get('/partner-installment-plans/{id}', [FinancialPlanningController::class, 'showPartnerPlan'])->whereNumber('id')->middleware('api.permission:partner_installments.view')->name('partner-installment-plans.show');
        Route::post('/partner-installment-plans/{id}/payments', [FinancialPlanningController::class, 'payPartnerPlan'])->whereNumber('id')->middleware(['api.csrf', 'api.step_up', 'api.permission:partner_installments.receive'])->name('partner-installment-plans.payments.store');
        Route::get('/expense-budgets', [FinancialPlanningController::class, 'expenseBudgets'])->middleware('api.permission:expense_budgets.view')->name('expense-budgets.index');
        Route::post('/expense-budgets', [FinancialPlanningController::class, 'saveExpenseBudget'])->middleware(['api.csrf', 'api.step_up', 'api.permission:expense_budgets.manage'])->name('expense-budgets.store');
        Route::put('/expense-budgets/{id}', [FinancialPlanningController::class, 'saveExpenseBudget'])->whereNumber('id')->middleware(['api.csrf', 'api.step_up', 'api.permission:expense_budgets.manage'])->name('expense-budgets.update');
        Route::get('/recurring-expenses', [FinancialPlanningController::class, 'recurringExpenses'])->middleware('api.permission:recurring_expenses.view')->name('recurring-expenses.index');
        Route::post('/recurring-expenses', [FinancialPlanningController::class, 'createRecurringExpense'])->middleware(['api.csrf', 'api.step_up', 'api.permission:recurring_expenses.manage'])->name('recurring-expenses.store');
        Route::put('/recurring-expenses/{id}', [FinancialPlanningController::class, 'updateRecurringExpense'])->whereNumber('id')->middleware(['api.csrf', 'api.step_up', 'api.permission:recurring_expenses.manage'])->name('recurring-expenses.update');
        Route::post('/recurring-expenses/{id}/stop', [FinancialPlanningController::class, 'stopRecurringExpense'])->whereNumber('id')->middleware(['api.csrf', 'api.step_up', 'api.permission:recurring_expenses.manage'])->name('recurring-expenses.stop');
        Route::post('/recurring-expenses/{id}/occurrences/{occurrenceId}/post', [FinancialPlanningController::class, 'postRecurringOccurrence'])->whereNumber('id')->whereNumber('occurrenceId')->middleware(['api.csrf', 'api.step_up', 'api.permission:recurring_expenses.manage'])->name('recurring-expenses.occurrences.post');
        Route::get('/finance-reports/monthly-comparison', [FinancialPlanningController::class, 'monthlyComparison'])->middleware('api.permission:finance_reports.view')->name('finance-reports.monthly-comparison');
        Route::get('/finance-reports/cash-forecast', [FinancialPlanningController::class, 'cashForecast'])->middleware('api.permission:finance_reports.view')->name('finance-reports.cash-forecast');
        Route::get('/accounting/accounts', [AccountingController::class, 'accounts'])->middleware('api.permission:chart_of_accounts.view');
        Route::post('/accounting/accounts', [AccountingController::class, 'createAccount'])->middleware(['api.csrf', 'api.step_up', 'api.permission:chart_of_accounts.manage']);
        Route::put('/accounting/accounts/{accountId}', [AccountingController::class, 'updateAccount'])->whereNumber('accountId')->middleware(['api.csrf', 'api.step_up', 'api.permission:chart_of_accounts.manage']);
        Route::get('/accounting/auto-posting-mappings', [AccountingController::class, 'accountMappings'])->middleware('api.permission:chart_of_accounts.view');
        Route::put('/accounting/auto-posting-mappings/{mappingKey}', [AccountingController::class, 'updateAccountMapping'])->where('mappingKey', '[A-Za-z0-9_-]+')->middleware(['api.csrf', 'api.step_up', 'api.permission:chart_of_accounts.manage']);
        Route::get('/accounting/journals', [AccountingController::class, 'journals'])->middleware('api.permission:journal_entries.view');
        Route::get('/accounting/journals/{entryId}', [AccountingController::class, 'showJournal'])->whereNumber('entryId')->middleware('api.permission:journal_entries.view');
        Route::post('/accounting/journals', [AccountingController::class, 'createJournal'])->middleware(['api.csrf', 'api.step_up', 'api.permission:journal_entries.create']);
        Route::put('/accounting/journals/{entryId}', [AccountingController::class, 'updateJournal'])->whereNumber('entryId')->middleware(['api.csrf', 'api.step_up', 'api.permission:journal_entries.create']);
        Route::post('/accounting/journals/{entryId}/post', [AccountingController::class, 'postJournal'])->whereNumber('entryId')->middleware(['api.csrf', 'api.step_up', 'api.permission:journal_entries.post']);
        Route::post('/accounting/journals/{entryId}/reverse', [AccountingController::class, 'reverseJournal'])->whereNumber('entryId')->middleware(['api.csrf', 'api.step_up', 'api.permission:journal_entries.reverse']);
        Route::get('/accounting/ledger', [AccountingController::class, 'ledger'])->middleware('api.permission:accounting.reports.view');
        Route::get('/accounting/trial-balance', [AccountingController::class, 'trialBalance'])->middleware('api.permission:accounting.reports.view');
        Route::get('/accounting/statements', [AccountingController::class, 'statements'])->middleware('api.permission:accounting.reports.view');
        Route::get('/accounting/adjustments', [AccountingController::class, 'adjustments'])->middleware('api.permission:financial_adjustments.view');
        Route::get('/accounting/adjustments/{adjustmentId}', [AccountingController::class, 'showAdjustment'])->whereNumber('adjustmentId')->middleware('api.permission:financial_adjustments.view');
        Route::post('/accounting/adjustments', [AccountingController::class, 'createAdjustment'])->middleware(['api.csrf', 'api.step_up', 'api.permission:financial_adjustments.manage']);
        Route::get('/currencies', [CurrencyReferenceController::class, 'index'])
            ->middleware('api.permission:currencies.view')->name('currencies.index');
        Route::post('/currencies', [CurrencyReferenceController::class, 'store'])
            ->middleware(['api.csrf', 'api.step_up', 'api.permission:currencies.manage'])->name('currencies.store');
        Route::patch('/currencies/{currencyId}', [CurrencyReferenceController::class, 'update'])
            ->whereNumber('currencyId')->middleware(['api.csrf', 'api.step_up', 'api.permission:currencies.manage'])->name('currencies.update');
        Route::get('/reference/governorates', [ReferenceCatalogController::class, 'governorates'])
            ->middleware('api.permission:governorates.view')->name('reference.governorates.index');
        Route::post('/reference/governorates', [ReferenceCatalogController::class, 'createGovernorate'])
            ->middleware(['api.csrf', 'api.step_up', 'api.permission:governorates.manage'])->name('reference.governorates.store');
        Route::patch('/reference/governorates/{governorateId}', [ReferenceCatalogController::class, 'updateGovernorate'])
            ->whereNumber('governorateId')->middleware(['api.csrf', 'api.step_up', 'api.permission:governorates.manage'])->name('reference.governorates.update');
        Route::delete('/reference/governorates/{governorateId}', [ReferenceCatalogController::class, 'deleteGovernorate'])
            ->whereNumber('governorateId')->middleware(['api.csrf', 'api.step_up', 'api.permission:governorates.manage'])->name('reference.governorates.destroy');
        Route::get('/drivers', [ReferenceCatalogController::class, 'drivers'])
            ->middleware('api.permission:shipping_drivers.view')->name('shipping-drivers.index');
        Route::post('/drivers', [ReferenceCatalogController::class, 'createDriver'])
            ->middleware(['api.csrf', 'api.step_up', 'api.permission:shipping_drivers.manage'])->name('shipping-drivers.store');
        Route::patch('/drivers/{driverId}', [ReferenceCatalogController::class, 'updateDriver'])
            ->whereNumber('driverId')->middleware(['api.csrf', 'api.step_up', 'api.permission:shipping_drivers.manage'])->name('shipping-drivers.update');
        Route::get('/admin/trash', [RecycleBinController::class, 'index'])
            ->middleware(['api.step_up', 'api.permission:trash.view'])->name('trash.index');
        Route::post('/admin/trash/{trashId}/restore', [RecycleBinController::class, 'restore'])
            ->whereNumber('trashId')->middleware(['api.csrf', 'api.step_up', 'api.permission:trash.restore'])->name('trash.restore');
        Route::delete('/admin/trash/{trashId}', [RecycleBinController::class, 'destroy'])
            ->whereNumber('trashId')->middleware(['api.csrf', 'api.step_up', 'api.permission:trash.delete'])->name('trash.destroy');
        Route::delete('/admin/trash', [RecycleBinController::class, 'empty'])
            ->middleware(['api.csrf', 'api.step_up', 'api.permission:trash.empty'])->name('trash.empty');
        Route::post('/data/imports/preview', [DataToolsController::class, 'preview'])
            ->middleware(['api.csrf', 'api.step_up', 'api.permission:data.import.manage'])->name('data.imports.preview');
        Route::post('/data/imports/apply', [DataToolsController::class, 'apply'])
            ->middleware(['api.csrf', 'api.step_up', 'api.permission:data.import.manage'])->name('data.imports.apply');
        Route::get('/data/daily-summary', [DataToolsController::class, 'dailySummary'])
            ->middleware('api.permission:data.daily_summary.view')->name('data.daily-summary');
        Route::get('/system/backups', [BackupController::class, 'index'])
            ->middleware(['api.step_up', 'api.permission:system.backups.view'])->name('system.backups.index');
        Route::post('/system/backups', [BackupController::class, 'create'])
            ->middleware(['api.csrf', 'api.step_up', 'api.permission:system.backups.create'])->name('system.backups.store');
        Route::get('/search', GlobalSearchController::class)
            ->middleware('api.permission:global_search.use')->name('search');
        Route::get('/notifications', [NotificationController::class, 'index'])
            ->middleware('api.permission:notifications.view')->name('notifications.index');
        Route::post('/notifications/{notificationId}/read', [NotificationController::class, 'markRead'])
            ->whereNumber('notificationId')->middleware(['api.csrf', 'api.permission:notifications.view'])->name('notifications.read');

        Route::get('/suppliers', [SupplierController::class, 'index'])
            ->middleware('api.permission:purchases.view')
            ->name('suppliers.index');
        Route::post('/suppliers', [SupplierController::class, 'store'])
            ->middleware(['api.csrf', 'api.step_up', 'api.permission:purchases.manage'])
            ->name('suppliers.store');
        Route::post('/supplier-payments', [SupplierPaymentController::class, 'store'])
            ->middleware(['api.csrf', 'api.step_up', 'api.permission:purchases.manage'])
            ->name('supplier-payments.store');
        Route::post('/supplier-payments/{id}/approve', [SupplierPaymentController::class, 'approve'])
            ->whereNumber('id')->middleware(['api.csrf', 'api.step_up', 'api.permission:purchases.payments.approve'])
            ->name('supplier-payments.approve');
        Route::delete('/supplier-payments/{id}', [SupplierPaymentController::class, 'destroy'])
            ->whereNumber('id')->middleware(['api.csrf', 'api.step_up', 'api.permission:purchases.manage'])
            ->name('supplier-payments.destroy');
        Route::get('/purchase-invoices', [PurchaseInvoiceController::class, 'index'])
            ->middleware('api.permission:purchases.view')
            ->name('purchase-invoices.index');
        Route::get('/purchase-invoices/{invoiceId}', [PurchaseInvoiceController::class, 'show'])
            ->whereNumber('invoiceId')
            ->middleware('api.permission:purchases.view')
            ->name('purchase-invoices.show');
        Route::post('/purchase-invoices', [PurchaseInvoiceController::class, 'store'])
            ->middleware(['api.csrf', 'api.step_up', 'api.permission:purchases.manage'])
            ->name('purchase-invoices.store');
        Route::post('/purchase-invoices/{invoiceId}/post', [PurchaseInvoiceController::class, 'post'])
            ->whereNumber('invoiceId')
            ->middleware(['api.csrf', 'api.step_up', 'api.permission:purchases.manage'])
            ->name('purchase-invoices.post');
        Route::put('/purchase-invoices/{invoiceId}', [PurchaseInvoiceController::class, 'update'])
            ->whereNumber('invoiceId')
            ->middleware(['api.csrf', 'api.step_up', 'api.permission:purchases.manage'])
            ->name('purchase-invoices.update');
        Route::delete('/purchase-invoices/{invoiceId}', [PurchaseInvoiceController::class, 'destroy'])
            ->whereNumber('invoiceId')
            ->middleware(['api.csrf', 'api.step_up', 'api.permission:purchases.manage'])
            ->name('purchase-invoices.destroy');
        Route::get('/warehouse-returns', [WarehouseReturnController::class, 'index'])->middleware('api.permission:warehouse_returns.view')->name('warehouse-returns.index');
        Route::get('/warehouse-returns/candidates', [WarehouseReturnController::class, 'candidates'])->middleware('api.permission:warehouse_returns.view')->name('warehouse-returns.candidates');
        Route::post('/warehouse-returns/from-movement', [WarehouseReturnController::class, 'returnMovement'])->middleware(['api.csrf','api.step_up','api.permission:warehouse_returns.manage','api.permission:warehouse_returns.approve'])->name('warehouse-returns.return-movement');
        Route::get('/warehouse-returns/{id}', [WarehouseReturnController::class, 'show'])->whereNumber('id')->middleware('api.permission:warehouse_returns.view')->name('warehouse-returns.show');
        Route::post('/warehouse-returns', [WarehouseReturnController::class, 'store'])->middleware(['api.csrf','api.step_up','api.permission:warehouse_returns.manage'])->name('warehouse-returns.store');
        Route::post('/warehouse-returns/{id}/approve', [WarehouseReturnController::class, 'approve'])->whereNumber('id')->middleware(['api.csrf','api.step_up','api.permission:warehouse_returns.approve'])->name('warehouse-returns.approve');
        Route::get('/approved-damaged-stock', [ApprovedDamagedStockController::class, 'index'])->middleware('api.permission:damaged_stock.approve')->name('damaged-stock.index');
        Route::post('/approved-damaged-stock', [ApprovedDamagedStockController::class, 'store'])->middleware(['api.csrf','api.step_up','api.permission:damaged_stock.approve'])->name('damaged-stock.store');
        Route::get('/partners', [PartnerController::class, 'index'])->middleware(['api.permission:partners.view', 'api.step_up'])->name('partners.index');
        Route::post('/partners', [PartnerController::class, 'store'])->middleware(['api.csrf','api.step_up','api.permission:partners.manage'])->name('partners.store');
        Route::get('/partners/{id}', [PartnerController::class, 'show'])->whereNumber('id')->middleware(['api.permission:partners.view', 'api.step_up'])->name('partners.show');
        Route::patch('/partners/{id}', [PartnerController::class, 'update'])->whereNumber('id')->middleware(['api.csrf','api.step_up','api.permission:partners.manage'])->name('partners.update');
        Route::get('/partner-payments', [PartnerPaymentController::class, 'index'])->middleware('api.permission:partner_payments.view')->name('partner-payments.index');
        Route::post('/partner-payments', [PartnerPaymentController::class, 'store'])->middleware(['api.csrf','api.step_up','api.permission:partner_payments.manage'])->name('partner-payments.store');
        Route::post('/partner-payments/{id}/approve', [PartnerPaymentController::class, 'approve'])->whereNumber('id')->middleware(['api.csrf','api.step_up','api.permission:partners.approve_payments'])->name('partner-payments.approve');
        Route::get('/customers/{customerId}/liquidation', [CustomerLiquidationController::class, 'show'])->whereNumber('customerId')->middleware(['api.step_up','api.permission:reports.customer_balances.view'])->name('customers.liquidation');
        Route::get('/customers/{customerId}/attachments', [CustomerAttachmentController::class, 'index'])->whereNumber('customerId')->middleware('api.permission:customer_attachments.view')->name('customers.attachments.index');
        Route::post('/customers/{customerId}/attachments', [CustomerAttachmentController::class, 'store'])->whereNumber('customerId')->middleware(['api.csrf', 'api.permission:customer_attachments.manage'])->name('customers.attachments.store');
        Route::get('/customers/{customerId}/attachments/{attachmentId}/content', [CustomerAttachmentController::class, 'content'])->whereNumber('customerId')->whereNumber('attachmentId')->middleware('api.permission:customer_attachments.view')->name('customers.attachments.content');
        Route::delete('/customers/{customerId}/attachments/{attachmentId}', [CustomerAttachmentController::class, 'destroy'])->whereNumber('customerId')->whereNumber('attachmentId')->middleware(['api.csrf', 'api.permission:customer_attachments.manage'])->name('customers.attachments.destroy');
        Route::get('/auth/me', [AuthController::class, 'me'])
            ->middleware('api.permission:users.view_self')
            ->name('auth.me');
        Route::post('/auth/reauth', [AuthController::class, 'reauthenticate'])
            ->middleware(['throttle:5,1', 'api.csrf', 'api.permission:users.view_self'])
            ->name('auth.reauth');
        Route::post('/auth/logout', [AuthController::class, 'logout'])
            ->middleware(['api.csrf', 'api.permission:sessions.revoke_self'])
            ->name('auth.logout');

        Route::post('/users/{userId}/password', [UserPasswordController::class, 'reset'])
            ->whereNumber('userId')
            ->middleware(['api.csrf', 'api.permission:users.manage', 'api.step_up'])
            ->name('users.password.reset');
        Route::get('/users', [UserAdminController::class, 'index'])
            ->middleware(['api.permission:users.manage', 'api.step_up'])
            ->name('users.index');
        Route::get('/roles', [UserAdminController::class, 'roles'])
            ->middleware(['api.permission:users.manage', 'api.step_up'])->name('roles.index');
        Route::post('/users', [UserAdminController::class, 'store'])
            ->middleware(['api.csrf', 'api.permission:users.manage', 'api.step_up'])
            ->name('users.store');
        Route::put('/users/{userId}', [UserAdminController::class, 'update'])
            ->whereNumber('userId')
            ->middleware(['api.csrf', 'api.permission:users.manage', 'api.step_up'])
            ->name('users.update');
        Route::delete('/users/{userId}', [UserAdminController::class, 'destroy'])
            ->whereNumber('userId')
            ->middleware(['api.csrf', 'api.permission:users.manage', 'api.step_up'])
            ->name('users.destroy');
        Route::put('/users/{userId}/roles', [UserAdminController::class, 'assignRoles'])
            ->whereNumber('userId')
            ->middleware(['api.csrf', 'api.permission:users.manage', 'api.step_up'])
            ->name('users.roles.update');

        Route::get('/audit-logs', [AuditHistoryController::class, 'index'])
            ->middleware(['api.step_up', 'api.permission:audit_logs.view'])
            ->name('audit-logs.index');

        Route::get('/customers/{customerId}', [SalesController::class, 'customer'])
            ->whereNumber('customerId')
            ->middleware(['api.step_up', 'api.permission:customers.view'])
            ->name('customers.show');
        Route::post('/customers', [SalesController::class, 'createCustomer'])
            ->middleware(['api.csrf', 'api.permission:customers.create'])
            ->name('customers.store');
        Route::match(['put', 'patch'], '/customers/{customerId}', [SalesController::class, 'updateCustomer'])
            ->whereNumber('customerId')
            ->middleware(['api.csrf', 'api.permission:customers.manage'])
            ->name('customers.update');
        Route::delete('/customers/{customerId}', [SalesController::class, 'archiveCustomer'])
            ->whereNumber('customerId')
            ->middleware(['api.csrf', 'api.permission:customers.manage'])
            ->name('customers.archive');
        Route::post('/customers/{customerId}/opening-balance', [SalesController::class, 'createOpeningBalance'])
            ->whereNumber('customerId')
            ->middleware(['api.csrf', 'api.step_up', 'api.permission:customers.opening_balance'])
            ->name('customers.opening-balance.store');

        Route::get('/customers/{customerId}/last-prices', [SalesController::class, 'customerLastPrices'])
            ->whereNumber('customerId')
            ->middleware(['api.step_up', 'api.permission:invoices.create'])
            ->name('customers.last-prices');

        Route::get('/invoice-issuers', [SalesController::class, 'invoiceIssuers'])
            ->middleware(['api.step_up', 'api.permission:invoices.create'])
            ->name('invoices.issuers');

        Route::get('/invoices', [SalesController::class, 'invoices'])
            ->middleware(['api.step_up', 'api.permission:invoices.view'])
            ->name('invoices.index');
        Route::post('/invoices/preview', [SalesController::class, 'previewInvoice'])
            ->middleware(['api.csrf', 'api.step_up', 'api.permission:invoices.create'])
            ->name('invoices.preview');
        Route::post('/invoices', [SalesController::class, 'createInvoice'])
            ->middleware(['api.csrf', 'api.step_up', 'api.permission:invoices.create'])
            ->name('invoices.store');
        Route::get('/invoices/{documentId}', [SalesController::class, 'invoice'])
            ->whereNumber('documentId')
            ->middleware(['api.step_up', 'api.permission:invoices.view'])
            ->name('invoices.show');
        Route::get('/invoices/{documentId}/history', [AuditHistoryController::class, 'invoiceHistory'])
            ->whereNumber('documentId')
            ->middleware(['api.step_up', 'api.permission:audit_logs.view'])
            ->name('invoices.history');
        Route::post('/invoices/{documentId}/issue', [SalesController::class, 'issueInvoice'])
            ->whereNumber('documentId')
            ->middleware(['api.csrf', 'api.step_up', 'api.permission:invoices.create'])
            ->name('invoices.issue');
        Route::post('/invoices/{documentId}/printed', [SalesController::class, 'markInvoicePrinted'])
            ->whereNumber('documentId')
            ->middleware(['api.csrf', 'api.step_up', 'api.permission:invoices.view'])
            ->name('invoices.printed');
        Route::put('/invoices/{documentId}', [SalesController::class, 'reviseInvoice'])
            ->whereNumber('documentId')
            ->middleware(['api.csrf', 'api.step_up', 'api.permission:documents.edit'])
            ->name('invoices.revise');
        Route::post('/invoices/{documentId}/cancel', [SalesController::class, 'cancelInvoice'])
            ->whereNumber('documentId')
            ->middleware(['api.csrf', 'api.step_up', 'api.permission:documents.cancel'])
            ->name('invoices.cancel');
        Route::post('/invoices/{documentId}/restore', [SalesController::class, 'restoreInvoice'])
            ->whereNumber('documentId')
            ->middleware(['api.csrf', 'api.step_up', 'api.permission:documents.edit'])
            ->name('invoices.restore');
        Route::get('/returns', [SalesController::class, 'returns'])
            ->middleware(['api.step_up', 'api.permission:returns.view'])
            ->name('returns.index');
        Route::post('/returns/preview', [SalesController::class, 'previewReturn'])
            ->middleware(['api.csrf', 'api.step_up', 'api.permission:returns.create'])
            ->name('returns.preview');
        Route::post('/returns', [SalesController::class, 'createReturn'])
            ->middleware(['api.csrf', 'api.step_up', 'api.permission:returns.create'])
            ->name('returns.store');
        Route::get('/returns/{documentId}', [SalesController::class, 'return'])
            ->whereNumber('documentId')
            ->middleware(['api.step_up', 'api.permission:returns.view'])
            ->name('returns.show');
        Route::post('/returns/{documentId}/printed', [SalesController::class, 'markReturnPrinted'])
            ->whereNumber('documentId')
            ->middleware(['api.csrf', 'api.step_up', 'api.permission:returns.view'])
            ->name('returns.printed');
        Route::get('/collections', [SalesController::class, 'collections'])
            ->middleware(['api.step_up', 'api.permission:collections.view'])
            ->name('collections.index');
        Route::get('/collections/summary', [SalesController::class, 'collectionsSummary'])
            ->middleware(['api.step_up', 'api.permission:collections.view'])
            ->name('collections.summary');
        Route::get('/collections/{receiptId}', [SalesController::class, 'showCollection'])
            ->whereNumber('receiptId')
            ->middleware(['api.step_up', 'api.permission:collections.view'])
            ->name('collections.show');
        Route::post('/collections', [SalesController::class, 'createCollection'])
            ->middleware(['api.csrf', 'api.step_up', 'api.permission:collections.create'])
            ->name('collections.store');
        Route::post('/collections/{receiptId}/allocations', [SalesController::class, 'allocateCollection'])
            ->whereNumber('receiptId')
            ->middleware(['api.csrf', 'api.step_up', 'api.permission:collections.create'])
            ->name('collections.allocations.store');
        Route::post('/collections/{receiptId}/allocations/{allocationId}/reverse', [SalesController::class, 'reverseCollectionAllocation'])
            ->whereNumber('receiptId')
            ->whereNumber('allocationId')
            ->middleware(['api.csrf', 'api.step_up', 'api.permission:documents.reverse'])
            ->name('collections.allocations.reverse');
        Route::get('/settings/sales-tax', [SalesController::class, 'taxSettings'])
            ->middleware(['api.step_up', 'api.permission:sales_tax.manage'])
            ->name('settings.sales-tax.show');
        Route::put('/settings/sales-tax', [SalesController::class, 'updateTaxSettings'])
            ->middleware(['api.csrf', 'api.step_up', 'api.permission:sales_tax.manage'])
            ->name('settings.sales-tax.update');
        Route::get('/settings/general', [GeneralSettingsController::class, 'show'])
            ->middleware(['api.step_up', 'api.permission:users.manage'])
            ->name('settings.general.show');
        Route::put('/settings/general', [GeneralSettingsController::class, 'update'])
            ->middleware(['api.csrf', 'api.step_up', 'api.permission:users.manage'])
            ->name('settings.general.update');

        Route::get('/orders', [OrdersController::class, 'index'])
            ->middleware(['api.step_up', 'api.permission:orders.view'])
            ->name('orders.index');
        Route::get('/orders/options', [OrdersController::class, 'options'])
            ->middleware(['api.step_up', 'api.permission:orders.view'])
            ->name('orders.options');
        Route::get('/orders/{orderId}', [OrdersController::class, 'show'])
            ->whereNumber('orderId')
            ->middleware(['api.step_up', 'api.permission:orders.view'])
            ->name('orders.show');
        Route::post('/orders/preview', [OrdersController::class, 'preview'])
            ->middleware(['api.csrf', 'api.step_up', 'api.permission:orders.manage'])
            ->name('orders.preview');
        Route::post('/orders', [OrdersController::class, 'store'])
            ->middleware(['api.csrf', 'api.step_up', 'api.permission:orders.manage'])
            ->name('orders.store');
        Route::put('/orders/{orderId}', [OrdersController::class, 'update'])
            ->whereNumber('orderId')
            ->middleware(['api.csrf', 'api.step_up', 'api.permission:orders.manage'])
            ->name('orders.update');
        Route::post('/orders/{orderId}/confirm', [OrdersController::class, 'confirm'])
            ->whereNumber('orderId')
            ->middleware(['api.csrf', 'api.step_up', 'api.permission:orders.manage'])
            ->name('orders.confirm');
        Route::post('/orders/{orderId}/printed', [OrdersController::class, 'markPrinted'])
            ->whereNumber('orderId')
            ->middleware(['api.csrf', 'api.step_up', 'api.permission:orders.view'])
            ->name('orders.printed');
        Route::post('/orders/{orderId}/cancel', [OrdersController::class, 'cancel'])
            ->whereNumber('orderId')
            ->middleware(['api.csrf', 'api.step_up', 'api.permission:orders.manage'])
            ->name('orders.cancel');
        Route::post('/orders/{orderId}/invoice', [OrdersController::class, 'invoice'])
            ->whereNumber('orderId')
            ->middleware(['api.csrf', 'api.step_up', 'api.permission:orders.manage', 'api.permission:invoices.create'])
            ->name('orders.invoice');
        Route::get('/deliveries', [OrdersController::class, 'deliveries'])
            ->middleware(['api.step_up', 'api.permission:deliveries.view'])
            ->name('deliveries.index');
        Route::get('/deliveries/{deliveryId}', [OrdersController::class, 'showDelivery'])
            ->whereNumber('deliveryId')
            ->middleware(['api.step_up', 'api.permission:deliveries.view'])
            ->name('deliveries.show');
        Route::post('/deliveries', [OrdersController::class, 'storeDelivery'])
            ->middleware(['api.csrf', 'api.step_up', 'api.permission:deliveries.manage'])
            ->name('deliveries.store');
        Route::patch('/deliveries/{deliveryId}/status', [OrdersController::class, 'changeDeliveryStatus'])
            ->whereNumber('deliveryId')
            ->middleware(['api.csrf', 'api.step_up', 'api.permission:deliveries.manage'])
            ->name('deliveries.status.update');

        Route::get('/categories', [CatalogController::class, 'categories'])
            ->middleware('api.permission:products.view')
            ->name('categories.index');
        Route::post('/categories', [CatalogController::class, 'createCategory'])
            ->middleware(['api.csrf', 'api.permission:products.manage'])
            ->name('categories.store');
        Route::match(['put', 'patch'], '/categories/{categoryId}', [CatalogController::class, 'updateCategory'])
            ->whereNumber('categoryId')
            ->middleware(['api.csrf', 'api.permission:products.manage'])
            ->name('categories.update');
        Route::delete('/categories/{categoryId}', [CatalogController::class, 'deleteCategory'])
            ->whereNumber('categoryId')
            ->middleware(['api.csrf', 'api.permission:products.manage'])
            ->name('categories.destroy');

        Route::get('/products', [CatalogController::class, 'products'])
            ->middleware(['api.step_up:costs.view', 'api.permission:products.view,inventory.view,warehouse_returns.view,inventory_counts.view,damaged_stock.approve'])
            ->name('products.index');
        Route::get('/products/{productId}', [CatalogController::class, 'product'])
            ->whereNumber('productId')
            ->middleware(['api.step_up:costs.view', 'api.permission:products.view,inventory.view,warehouse_returns.view,inventory_counts.view,damaged_stock.approve'])
            ->name('products.show');
        Route::get('/products/{productId}/cost-history', [CatalogController::class, 'productCostHistory'])
            ->whereNumber('productId')
            ->middleware(['api.step_up', 'api.permission:costs.view'])
            ->name('products.cost-history');
        Route::post('/products', [CatalogController::class, 'createProduct'])
            ->middleware(['api.csrf', 'api.step_up', 'api.permission:products.manage'])
            ->name('products.store');
        Route::match(['put', 'patch'], '/products/{productId}', [CatalogController::class, 'updateProduct'])
            ->whereNumber('productId')
            ->middleware(['api.csrf', 'api.step_up', 'api.permission:products.manage'])
            ->name('products.update');
        Route::delete('/products/{productId}', [CatalogController::class, 'deleteProduct'])
            ->whereNumber('productId')
            ->middleware(['api.csrf', 'api.step_up', 'api.permission:products.manage'])
            ->name('products.destroy');

        Route::get('/warehouses', [CatalogController::class, 'warehouses'])
            ->middleware('api.permission:products.view,inventory.view,warehouse_returns.view,inventory_counts.view,damaged_stock.approve')
            ->name('warehouses.index');
        Route::post('/warehouses', [CatalogController::class, 'createWarehouse'])
            ->middleware(['api.csrf', 'api.step_up', 'api.permission:warehouses.manage'])
            ->name('warehouses.store');
        Route::match(['put', 'patch'], '/warehouses/{warehouseId}', [CatalogController::class, 'updateWarehouse'])
            ->whereNumber('warehouseId')
            ->middleware(['api.csrf', 'api.step_up', 'api.permission:warehouses.manage'])
            ->name('warehouses.update');
        Route::delete('/warehouses/{warehouseId}', [CatalogController::class, 'deleteWarehouse'])
            ->whereNumber('warehouseId')
            ->middleware(['api.csrf', 'api.step_up', 'api.permission:warehouses.manage'])
            ->name('warehouses.destroy');

        Route::get('/inventory/counts', [InventoryCountController::class, 'index'])->middleware('api.permission:inventory_counts.view')->name('inventory-counts.index');
        Route::post('/inventory/counts', [InventoryCountController::class, 'store'])->middleware(['api.csrf', 'api.step_up', 'api.permission:inventory_counts.manage'])->name('inventory-counts.store');
        Route::get('/inventory/counts/{countId}', [InventoryCountController::class, 'show'])->whereNumber('countId')->middleware('api.permission:inventory_counts.view')->name('inventory-counts.show');
        Route::post('/inventory/counts/{countId}/approve', [InventoryCountController::class, 'approve'])->whereNumber('countId')->middleware(['api.csrf', 'api.step_up', 'api.permission:inventory_counts.approve'])->name('inventory-counts.approve');
        Route::get('/inventory/minimum-stock', [MinimumStockController::class, 'index'])
            ->middleware('api.permission:inventory.view')->name('inventory.minimum-stock.index');
        Route::put('/inventory/minimum-stock', [MinimumStockController::class, 'update'])
            ->middleware(['api.csrf', 'api.step_up', 'api.permission:inventory.manage'])->name('inventory.minimum-stock.update');        Route::get('/inventory/balances', [InventoryController::class, 'balances'])
            ->middleware(['api.step_up:costs.view', 'api.permission:inventory.view'])
            ->name('inventory.balances');
        Route::get('/inventory/summary', [InventoryController::class, 'summary'])
            ->middleware(['api.step_up:costs.view', 'api.permission:inventory.view'])
            ->name('inventory.summary');
        Route::get('/inventory/movements', [InventoryController::class, 'movements'])
            ->middleware(['api.step_up:costs.view', 'api.permission:inventory.view'])
            ->name('inventory.movements');
        Route::get('/inventory/movements/{lineId}', [InventoryController::class, 'movement'])
            ->whereNumber('lineId')->middleware(['api.step_up:costs.view', 'api.permission:inventory.view'])
            ->name('inventory.movements.show');
        Route::get('/inventory/adjustments', [InventoryController::class, 'adjustments'])
            ->middleware(['api.step_up:costs.view', 'api.permission:inventory.view'])
            ->name('inventory.adjustments.index');
        Route::post('/inventory/adjustments', [InventoryController::class, 'adjust'])
            ->middleware(['api.csrf', 'api.step_up', 'api.permission:inventory.manage'])
            ->name('inventory.adjustments');
        Route::post('/inventory/opening-stock', [InventoryController::class, 'open'])
            ->middleware(['api.csrf', 'api.step_up', 'api.permission:inventory.manage'])
            ->name('inventory.opening-stock');
        Route::post('/inventory/transfers', [InventoryController::class, 'transfer'])
            ->middleware(['api.csrf', 'api.step_up', 'api.permission:inventory.manage'])
            ->name('inventory.transfers');

        Route::get('/containers', [ContainerController::class, 'index'])
            ->middleware('api.permission:containers.view')
            ->name('containers.index');
        Route::post('/containers/intake', [ContainerIntakeController::class, 'store'])
            ->middleware(['api.csrf', 'api.step_up', 'api.permission:containers.manage'])
            ->name('containers.intake.store');
        Route::post('/containers/quick-warehouses', [ContainerIntakeController::class, 'quickWarehouse'])
            ->middleware(['api.csrf', 'api.step_up', 'api.permission:containers.manage'])
            ->name('containers.quick-warehouses.store');
        Route::get('/container-transfers', [ContainerLedgerController::class, 'transfers'])
            ->middleware('api.permission:inventory.view')
            ->name('container-transfers.index');
        Route::post('/container-transfers', [ContainerLedgerController::class, 'createTransfer'])
            ->middleware(['api.csrf', 'api.step_up', 'api.permission:inventory.manage'])
            ->name('container-transfers.store');
        Route::get('/container-funds', [ContainerLedgerController::class, 'funds'])
            ->middleware(['api.step_up', 'api.permission:containers.view'])
            ->name('container-funds.index');
        Route::post('/container-funds', [ContainerLedgerController::class, 'createFundMovement'])
            ->middleware(['api.csrf', 'api.step_up', 'api.permission:containers.manage'])
            ->name('container-funds.store');
        Route::post('/containers', [ContainerController::class, 'store'])
            ->middleware(['api.csrf', 'api.step_up', 'api.permission:containers.manage'])
            ->name('containers.store');
        Route::get('/containers/{containerId}', [ContainerController::class, 'show'])
            ->whereNumber('containerId')
            ->middleware(['api.step_up:costs.view', 'api.permission:containers.view'])
            ->name('containers.show');
        Route::get('/containers/{containerId}/receipts', [ContainerController::class, 'receipts'])
            ->whereNumber('containerId')
            ->middleware(['api.step_up:costs.view', 'api.permission:containers.view'])
            ->name('containers.receipts.index');
        Route::get('/containers/{containerId}/receipts/{receiptId}', [ContainerController::class, 'receipt'])
            ->whereNumber('containerId')
            ->whereNumber('receiptId')
            ->middleware(['api.step_up:costs.view', 'api.permission:containers.view'])
            ->name('containers.receipts.show');
        Route::post('/containers/{containerId}/landed-cost/preview', [ContainerController::class, 'previewReceipt'])
            ->whereNumber('containerId')
            ->middleware(['api.csrf', 'api.step_up', 'api.permission:containers.manage', 'api.permission:costs.view'])
            ->name('containers.landed-cost.preview');
        Route::post('/containers/{containerId}/lines', [ContainerController::class, 'addLine'])
            ->whereNumber('containerId')
            ->middleware(['api.csrf', 'api.step_up', 'api.permission:containers.manage'])
            ->name('containers.lines.store');
        Route::put('/containers/{containerId}/allocation-basis', [ContainerController::class, 'setAllocationBasis'])
            ->whereNumber('containerId')
            ->middleware(['api.csrf', 'api.step_up', 'api.permission:containers.manage'])
            ->name('containers.allocation-basis');
        Route::patch('/containers/{containerId}/status', [ContainerController::class, 'changeStatus'])
            ->whereNumber('containerId')
            ->middleware(['api.csrf', 'api.step_up', 'api.permission:containers.manage'])
            ->name('containers.status.update');
        Route::post('/containers/{containerId}/receipts', [ContainerController::class, 'receive'])
            ->whereNumber('containerId')
            ->middleware(['api.csrf', 'api.step_up', 'api.permission:containers.manage'])
            ->name('containers.receipts.store');
        Route::post('/containers/{containerId}/receipts/{receiptId}/reverse', [ContainerController::class, 'reverseReceipt'])
            ->whereNumber('containerId')
            ->whereNumber('receiptId')
            ->middleware(['api.csrf', 'api.step_up', 'api.permission:inventory.manage'])
            ->name('containers.receipts.reverse');
        Route::put('/containers/{containerId}', [ContainerController::class, 'update'])
            ->whereNumber('containerId')
            ->middleware(['api.csrf', 'api.step_up', 'api.permission:containers.manage'])
            ->name('containers.update');
        Route::delete('/containers/{containerId}', [ContainerController::class, 'destroy'])
            ->whereNumber('containerId')
            ->middleware(['api.csrf', 'api.step_up', 'api.permission:containers.manage'])
            ->name('containers.destroy');
        Route::post('/containers/{containerId}/costs', [ContainerController::class, 'addCost'])
            ->whereNumber('containerId')
            ->middleware(['api.csrf', 'api.step_up', 'api.permission:costs.manage'])
            ->name('containers.costs.store');
        Route::put('/container-cost-types/{costType}', [ContainerController::class, 'configureCostType'])
            ->middleware(['api.csrf', 'api.step_up', 'api.permission:costs.manage'])
            ->name('containers.cost-types.update');
        Route::post('/container-costs/{costId}/payments', [ContainerController::class, 'linkPayment'])
            ->whereNumber('costId')
            ->middleware(['api.csrf', 'api.permission:costs.pay', 'api.step_up'])
            ->name('container-costs.payments.store');

        Route::get('/treasury/accounts', [TreasuryController::class, 'accounts'])
            ->middleware(['api.permission:treasury.view', 'api.step_up'])
            ->name('treasury.accounts.index');
        Route::post('/treasury/accounts', [TreasuryController::class, 'createAccount'])
            ->middleware(['api.csrf', 'api.permission:treasury.manage', 'api.step_up'])
            ->name('treasury.accounts.store');
        Route::patch('/treasury/accounts/{accountId}', [TreasuryController::class, 'updateAccount'])
            ->whereNumber('accountId')
            ->middleware(['api.csrf', 'api.permission:treasury.manage', 'api.step_up'])
            ->name('treasury.accounts.update');
        Route::get('/treasury/accounts/{accountId}/balance', [TreasuryController::class, 'balance'])
            ->whereNumber('accountId')
            ->middleware(['api.permission:treasury.view', 'api.step_up'])
            ->name('treasury.accounts.balance');
        Route::get('/treasury/entries', [TreasuryController::class, 'entries'])
            ->middleware(['api.permission:treasury.view', 'api.step_up'])
            ->name('treasury.entries.index');
        Route::post('/treasury/entries', [TreasuryController::class, 'postEntry'])
            ->middleware(['api.csrf', 'api.permission:treasury.post', 'api.step_up'])
            ->name('treasury.entries.store');
        Route::get('/treasury/transfers', [TreasuryController::class, 'transfers'])
            ->middleware(['api.permission:treasury.view', 'api.step_up'])
            ->name('treasury.transfers.index');
        Route::post('/treasury/transfers', [TreasuryController::class, 'postTransfer'])
            ->middleware(['api.csrf', 'api.permission:treasury.post', 'api.step_up'])
            ->name('treasury.transfers.store');
        Route::get('/expense-categories', [TreasuryController::class, 'expenseCategories'])
            ->middleware(['api.permission:expenses.view', 'api.step_up'])
            ->name('expense-categories.index');
        Route::post('/expense-categories', [TreasuryController::class, 'createExpenseCategory'])
            ->middleware(['api.csrf', 'api.permission:expense_categories.manage', 'api.step_up'])
            ->name('expense-categories.store');
        Route::patch('/expense-categories/{categoryId}', [TreasuryController::class, 'updateExpenseCategory'])
            ->whereNumber('categoryId')
            ->middleware(['api.csrf', 'api.permission:expense_categories.manage', 'api.step_up'])
            ->name('expense-categories.update');
        Route::get('/expenses', [TreasuryController::class, 'expenses'])
            ->middleware(['api.permission:expenses.view', 'api.step_up'])
            ->name('expenses.index');
        Route::post('/expenses', [TreasuryController::class, 'postExpense'])
            ->middleware(['api.csrf', 'api.permission:expenses.post', 'api.step_up'])
            ->name('expenses.store');

        Route::get('/reports/customer-balances', [ReportsController::class, 'customerBalances'])
            ->middleware(['api.permission:reports.customer_balances.view', 'api.step_up'])
            ->name('reports.customer-balances');
        Route::get('/reports/customers/{customerId}/statement', [ReportsController::class, 'customerStatement'])
            ->whereNumber('customerId')
            ->middleware(['api.permission:reports.customer_statement.view', 'api.step_up'])
            ->name('reports.customer-statement');
        Route::get('/reports/stock', [ReportsController::class, 'stock'])
            ->middleware(['api.permission:inventory.view', 'api.step_up'])
            ->name('reports.stock');
        Route::get('/reports/stock-movements', [ReportsController::class, 'stockMovements'])
            ->middleware(['api.permission:inventory.view', 'api.step_up'])
            ->name('reports.stock-movements');
        Route::get('/reports/sales', [ReportsController::class, 'sales'])
            ->middleware(['api.permission:invoices.view', 'api.step_up'])
            ->name('reports.sales');
        Route::get('/reports/container-costs', [ReportsController::class, 'containerCosts'])
            ->middleware(['api.permission:reports.container_costs.view', 'api.step_up'])
            ->name('reports.container-costs');
        Route::get('/reports/invoice-profit', [ReportsController::class, 'invoiceProfit'])
            ->middleware(['api.permission:profit.view', 'api.permission:markup.view', 'api.step_up'])
            ->name('reports.invoice-profit');
        Route::get('/reports/profit-distribution', [ReportsController::class, 'profitDistribution'])
            ->middleware(['api.permission:profit.view', 'api.permission:costs.view', 'api.step_up'])
            ->name('reports.profit-distribution');
        Route::get('/reports/dashboard', [ReportsController::class, 'dashboard'])
            ->middleware(['api.permission:reports.dashboard.view', 'api.step_up'])
            ->name('reports.dashboard');
    });

    Route::prefix('mobile')->group(function (): void {
        Route::post('/auth/login', [MobileAuthController::class, 'login'])
            ->middleware('throttle:5,1')
            ->name('mobile.auth.login');

        Route::middleware('api.mobile')->group(function (): void {
            Route::get('/auth/me', [MobileAuthController::class, 'me'])
                ->middleware('api.permission:mobile.use')
                ->name('mobile.auth.me');
            Route::post('/auth/confirm-password', [MobileAuthController::class, 'confirmPassword'])
                ->middleware(['throttle:5,1', 'api.permission:mobile.use'])
                ->name('mobile.auth.confirm-password');
            Route::post('/auth/logout', [MobileAuthController::class, 'logout'])
                ->middleware('api.permission:mobile.use')
                ->name('mobile.auth.logout');
            Route::post('/customers', [MobileCustomerController::class, 'store'])
                ->middleware(['api.permission:mobile.use', 'api.permission:mobile.customers.create'])
                ->name('mobile.customers.store');
            Route::get('/sync', [MobileSyncController::class, 'sync'])
                ->middleware('api.permission:mobile.use')
                ->name('mobile.sync');
            Route::get('/ping', [MobileSyncController::class, 'ping'])
                ->middleware('api.permission:mobile.use')
                ->name('mobile.ping');

            Route::get('/channels', function (Request $request) {
                if ($request->hasAny(['type', 'paused']) || DB::table('mobile_payment_channels')->exists()) {
                    return app(MobileCaptureController::class)->channels($request);
                }
                return app(MobileAdministrationController::class)->channels($request);
            })
                ->middleware('api.permission:mobile.use')
                ->name('mobile.channels.index');
            Route::post('/channels', function (Request $request) {
                return $request->hasAny(['type', 'number', 'sender_filter', 'deposit_keywords', 'withdrawal_keywords'])
                    ? app(MobileCaptureController::class)->createChannel($request)
                    : app(MobileAdministrationController::class)->createChannel($request);
            })
                ->middleware(['api.permission:mobile.use', 'api.permission:mobile.channels.manage', 'api.mobile_step_up'])
                ->name('mobile.channels.store');
            Route::get('/channels/{channelId}', [MobileCaptureController::class, 'showChannel'])
                ->whereNumber('channelId')
                ->middleware('api.permission:mobile.use')
                ->name('mobile.payment-channels.show');
            Route::patch('/channels/{channelId}', function (Request $request, int $channelId) {
                return $request->hasAny(['sender_filter', 'number', 'paused', 'deposit_enabled', 'withdrawal_enabled', 'notification_package_names', 'type'])
                    ? app(MobileCaptureController::class)->updateChannel($request, $channelId)
                    : app(MobileAdministrationController::class)->updateChannel($request, $channelId);
            })
                ->whereNumber('channelId')
                ->middleware(['api.permission:mobile.use', 'api.permission:mobile.channels.manage'])
                ->name('mobile.channels.update');
            Route::delete('/channels/{channelId}', fn () => response()->json([
                'error' => ['code' => 'METHOD_NOT_ALLOWED', 'message' => 'Pause channels with PATCH.'],
            ], 405))
                ->whereNumber('channelId')
                ->middleware('api.permission:mobile.use')
                ->name('mobile.channels.destroy');

            Route::get('/sources', [MobileAdministrationController::class, 'sources'])
                ->middleware(['api.permission:mobile.use', 'api.permission:mobile.channels.manage'])
                ->name('mobile.sources.index');
            Route::post('/sources', [MobileAdministrationController::class, 'createSource'])
                ->middleware(['api.permission:mobile.use', 'api.permission:mobile.channels.manage'])
                ->name('mobile.sources.store');
            Route::patch('/sources/{sourceId}', [MobileAdministrationController::class, 'updateSource'])
                ->whereNumber('sourceId')
                ->middleware(['api.permission:mobile.use', 'api.permission:mobile.channels.manage'])
                ->name('mobile.sources.update');
            Route::delete('/sources/{sourceId}', [MobileAdministrationController::class, 'archiveSource'])
                ->whereNumber('sourceId')
                ->middleware(['api.permission:mobile.use', 'api.permission:mobile.channels.manage'])
                ->name('mobile.sources.destroy');

            Route::get('/categories', [MobileAdministrationController::class, 'categories'])
                ->middleware('api.permission:mobile.use')
                ->name('mobile.categories.index');
            Route::post('/categories', [MobileAdministrationController::class, 'createCategory'])
                ->middleware(['api.permission:mobile.use', 'api.permission:mobile.categories.manage', 'api.mobile_step_up'])
                ->name('mobile.categories.store');
            Route::patch('/categories/{categoryId}', [MobileAdministrationController::class, 'updateCategory'])
                ->whereNumber('categoryId')
                ->middleware(['api.permission:mobile.use', 'api.permission:mobile.categories.manage'])
                ->name('mobile.categories.update');
            Route::delete('/categories/{categoryId}', [MobileAdministrationController::class, 'archiveCategory'])
                ->whereNumber('categoryId')
                ->middleware(['api.permission:mobile.use', 'api.permission:mobile.categories.manage'])
                ->name('mobile.categories.destroy');

            Route::post('/messages/batch', [MobileMessageController::class, 'ingest'])
                ->middleware('api.permission:mobile.use')
                ->name('mobile.messages.batch');
            Route::get('/messages', function (Request $request) {
                if (DB::table('mobile_captured_messages')->exists()
                    || in_array($request->query('direction'), ['DEPOSIT', 'WITHDRAWAL', 'NEEDS_REVIEW'], true)
                    || in_array($request->query('status'), ['NEW', 'RECORDED', 'NEEDS_REVIEW', 'IGNORED'], true)
                    || $request->boolean('include_archived') || $request->boolean('archived_only')) {
                    return app(MobileCaptureController::class)->messages($request);
                }
                return app(MobileMessageController::class)->index($request);
            })
                ->middleware('api.permission:mobile.use')
                ->name('mobile.messages.index');
            Route::post('/messages/capture', [MobileCaptureController::class, 'capture'])
                ->middleware('api.permission:mobile.use')
                ->name('mobile.messages.capture');
            Route::delete('/messages', [MobileCaptureController::class, 'archiveAllMessages'])
                ->middleware(['api.permission:mobile.use', 'api.permission:mobile.channels.manage'])
                ->name('mobile.messages.archive-all');
            Route::delete('/messages/{messageId}', [MobileCaptureController::class, 'archiveMessage'])
                ->whereNumber('messageId')->middleware(['api.permission:mobile.use', 'api.permission:mobile.channels.manage'])
                ->name('mobile.messages.archive');
            Route::post('/messages/{messageId}/restore', [MobileCaptureController::class, 'restoreMessage'])
                ->whereNumber('messageId')->middleware(['api.permission:mobile.use', 'api.permission:mobile.channels.manage'])
                ->name('mobile.messages.restore');
            Route::post('/messages/{messageId}/resolve-direction', [MobileCaptureController::class, 'resolveDirection'])
                ->whereNumber('messageId')->middleware('api.permission:mobile.use')->name('mobile.messages.resolve-direction');
            Route::post('/messages/{messageId}/record-deposit', [MobileCaptureController::class, 'recordDeposit'])
                ->whereNumber('messageId')->middleware('api.permission:mobile.use')->name('mobile.messages.record-deposit');
            Route::post('/messages/{messageId}/record-withdrawal', [MobileCaptureController::class, 'recordWithdrawal'])
                ->whereNumber('messageId')->middleware('api.permission:mobile.use')->name('mobile.messages.record-withdrawal');
            Route::post('/manual-deposits', [MobileCaptureController::class, 'manualDeposit'])
                ->middleware('api.permission:mobile.use')->name('mobile.manual-deposits.store');
            Route::get('/withdrawal-categories', [MobileCaptureController::class, 'categories'])
                ->middleware('api.permission:mobile.use')->name('mobile.withdrawal-categories.index');
            Route::post('/withdrawal-categories', [MobileCaptureController::class, 'createCategory'])
                ->middleware('api.permission:mobile.use')->name('mobile.withdrawal-categories.store');
            Route::patch('/messages/{messageId}/amount', [MobileMessageController::class, 'reviewAmount'])
                ->whereNumber('messageId')
                ->middleware('api.permission:mobile.use')
                ->name('mobile.messages.amount.review');
            Route::post('/messages/{messageId}/ignore', [MobileMessageController::class, 'ignore'])
                ->whereNumber('messageId')
                ->middleware('api.permission:mobile.use')
                ->name('mobile.messages.ignore');
            Route::post('/messages/{messageId}/register-deposit', [MobileFinanceController::class, 'registerDeposit'])
                ->whereNumber('messageId')
                ->middleware(['api.permission:mobile.use', 'api.permission:mobile.deposits.register'])
                ->name('mobile.messages.deposit.register');
            Route::post('/messages/{messageId}/register-withdrawal', [MobileFinanceController::class, 'registerWithdrawal'])
                ->whereNumber('messageId')
                ->middleware(['api.permission:mobile.use', 'api.permission:mobile.withdrawals.register'])
                ->name('mobile.messages.withdrawal.register');
            Route::post('/deposits/manual', [MobileFinanceController::class, 'manualDeposit'])
                ->middleware(['api.permission:mobile.use', 'api.permission:mobile.deposits.register'])
                ->name('mobile.deposits.manual');
        });

        Route::middleware('api.session')->group(function (): void {
            Route::get('/devices', [MobileDeviceAdminController::class, 'index'])
                ->middleware(['api.permission:mobile.devices.manage', 'api.step_up'])
                ->name('mobile.devices.index');
            Route::patch('/devices/{deviceId}', [MobileDeviceAdminController::class, 'rename'])
                ->whereNumber('deviceId')
                ->middleware(['api.csrf', 'api.permission:mobile.devices.manage', 'api.step_up'])
                ->name('mobile.devices.rename');
            Route::post('/devices/{deviceId}/revoke', [MobileDeviceAdminController::class, 'revoke'])
                ->whereNumber('deviceId')
                ->middleware(['api.csrf', 'api.permission:mobile.devices.manage', 'api.step_up'])
                ->name('mobile.devices.revoke');
        });
    });
});
