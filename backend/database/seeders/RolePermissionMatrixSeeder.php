<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class RolePermissionMatrixSeeder extends Seeder
{
    public function run(): void
    {
        DB::transaction(function (): void {
            $now = now();
            $roles = [
                ['code' => 'owner', 'name' => 'المالك', 'description' => 'صلاحيات كاملة للنظام المالي والتشغيلي وإدارة المستخدمين.'],
                ['code' => 'admin', 'name' => 'مدير النظام', 'description' => 'صلاحيات تشغيلية واسعة مع استثناء موافقات المالك وتغيير الأدوار.'],
                ['code' => 'accountant', 'name' => 'المحاسب', 'description' => 'عرض البيانات المالية وتسجيل المصروفات دون صلاحية الاعتماد أو الحذف.'],
                ['code' => 'designated_invoice_issuer', 'name' => 'مُصدر الفواتير المحدد', 'description' => 'دور جاهز للتعيين مستقبلًا ولا يرتبط حاليًا بأي مستخدم.'],
                ['code' => 'read_only', 'name' => 'قراءة فقط', 'description' => 'دور جاهز للتعيين مستقبلًا ولا يرتبط حاليًا بأي مستخدم.'],
                ['code' => 'driver', 'name' => 'السائق', 'description' => 'نموذج دور السائق؛ تُضبط صلاحياته من مصفوفة الأدوار.'],
            ];

            foreach ($roles as $role) {
                DB::table('roles')->updateOrInsert(
                    ['code' => $role['code']],
                    [
                        'name' => $role['name'],
                        'description' => $role['description'],
                        'is_system' => true,
                        'is_active' => true,
                        'updated_at' => $now,
                    ],
                );
            }

            $permissions = [
                ['code' => 'users.view_self', 'description' => 'View the authenticated user profile.'],
                ['code' => 'sessions.revoke_self', 'description' => 'End the authenticated user session.'],
                ['code' => 'invoices.view', 'description' => 'View standard invoice records.'],
                ['code' => 'audit_logs.view', 'description' => 'View sensitive audit records and invoice change history; owner-only.'],
                ['code' => 'users.manage', 'description' => 'Manage users and role assignments.'],
                ['code' => 'invoices.create', 'description' => 'Create invoices.'],
                ['code' => 'customers.view', 'description' => 'View customer records.'],
                ['code' => 'customer_attachments.view', 'description' => 'View and download private customer attachments.'],
                ['code' => 'customer_attachments.manage', 'description' => 'Upload and soft-delete customer attachments.'],
                ['code' => 'products.view', 'description' => 'View product and catalog records.'],
                ['code' => 'customers.manage', 'description' => 'Update and deactivate customer records.'],
                ['code' => 'customers.opening_balance', 'description' => 'Post dated customer opening balance documents.'],
                ['code' => 'products.manage', 'description' => 'Create, update, and deactivate product and category records.'],
                ['code' => 'warehouses.manage', 'description' => 'Create, update, and deactivate warehouse locations.'],
                ['code' => 'inventory.view', 'description' => 'View stock balances and movement history.'],
                ['code' => 'inventory.manage', 'description' => 'Post inventory adjustments and opening stock.'],
                ['code' => 'customers.create', 'description' => 'Create customer records.'],
                ['code' => 'collections.create', 'description' => 'Record collections and cash receipts.'],
                ['code' => 'collections.view', 'description' => 'View collection records and allocations.'],
                ['code' => 'returns.create', 'description' => 'Create return documents.'],
                ['code' => 'returns.free.create', 'description' => 'Create unlinked sales returns with a documented reason.'],
                ['code' => 'returns.view', 'description' => 'View return documents.'],
                ['code' => 'documents.edit', 'description' => 'Edit posted documents.'],
                ['code' => 'documents.cancel', 'description' => 'Cancel documents.'],
                ['code' => 'documents.reverse', 'description' => 'Reverse and nullify posted documents.'],
                ['code' => 'documents.correct', 'description' => 'Correct document details after posting.'],
                ['code' => 'costs.view', 'description' => 'View cost and landed-cost details.'],
                ['code' => 'markup.view', 'description' => 'View markup through the ERP report stack.'],
                ['code' => 'profit.view', 'description' => 'View profit figures and performance details.'],
                ['code' => 'containers.view', 'description' => 'View container, receipt, and status records.'],
                ['code' => 'containers.manage', 'description' => 'Create containers and lines, select allocation basis, and post receipts.'],
                ['code' => 'costs.manage', 'description' => 'Configure cost inclusion and record container costs.'],
                ['code' => 'costs.pay', 'description' => 'Link container cost payments to treasury outflows.'],
                ['code' => 'sales_tax.manage', 'description' => 'Configure tax enablement, rate, and calculation method.'],
                ['code' => 'orders.view', 'description' => 'View sales orders and invoice links.'],
                ['code' => 'orders.manage', 'description' => 'Create and confirm full sales orders and issue their invoices.'],
                ['code' => 'deliveries.view', 'description' => 'View delivery records and status history.'],
                ['code' => 'deliveries.manage', 'description' => 'Create deliveries and change their status.'],
                ['code' => 'treasury.view', 'description' => 'View treasury accounts, balances, entries, and transfers.'],
                ['code' => 'treasury.manage', 'description' => 'Create and manage treasury accounts.'],
                ['code' => 'treasury.post', 'description' => 'Post treasury cash entries and account transfers.'],
                ['code' => 'expenses.view', 'description' => 'View expenses and expense categories.'],
                ['code' => 'expenses.post', 'description' => 'Post expenses to a treasury account.'],
                ['code' => 'financial_adjustments.manage', 'description' => 'Create and approve owner-only financial adjustments.'],
                ['code' => 'financial_adjustments.view', 'description' => 'View documented, journal-backed financial adjustments.'],
                ['code' => 'pending_funds.view', 'description' => 'View expected partner funds and their receipts.'],
                ['code' => 'pending_funds.manage', 'description' => 'Create and cancel expected partner funds.'],
                ['code' => 'pending_funds.receive', 'description' => 'Receive expected funds into treasury.'],
                ['code' => 'partner_installments.view', 'description' => 'View partner installment plans and payment status.'],
                ['code' => 'partner_installments.manage', 'description' => 'Create partner installment plans.'],
                ['code' => 'partner_installments.receive', 'description' => 'Receive partner installment payments.'],
                ['code' => 'expense_budgets.view', 'description' => 'View expense budgets and actual spend.'],
                ['code' => 'expense_budgets.manage', 'description' => 'Create and update expense budgets.'],
                ['code' => 'recurring_expenses.view', 'description' => 'View recurring expense schedules.'],
                ['code' => 'recurring_expenses.manage', 'description' => 'Manage recurring expenses and post due occurrences.'],
                ['code' => 'finance_reports.view', 'description' => 'View finance comparison and liquidity forecast reports.'],
                ['code' => 'chart_of_accounts.view', 'description' => 'View the chart of accounts and account balances.'],
                ['code' => 'chart_of_accounts.manage', 'description' => 'Create and update unposted chart of accounts.'],
                ['code' => 'journal_entries.view', 'description' => 'View journal entries and posting history.'],
                ['code' => 'journal_entries.create', 'description' => 'Create and update draft journal entries.'],
                ['code' => 'journal_entries.post', 'description' => 'Post balanced journal entries.'],
                ['code' => 'journal_entries.reverse', 'description' => 'Create and post reversal journal entries.'],
                ['code' => 'accounting.reports.view', 'description' => 'View general ledger, trial balance, and financial statements.'],
                ['code' => 'damaged_stock.approve', 'description' => 'Owner-only approval of damaged stock records.'],
                ['code' => 'inventory_counts.view', 'description' => 'View periodic inventory count sessions.'],
                ['code' => 'inventory_counts.manage', 'description' => 'Create periodic inventory count sessions.'],
                ['code' => 'inventory_counts.approve', 'description' => 'Approve periodic inventory count variances.'],
                ['code' => 'purchases.view', 'description' => 'View purchase invoices.'],
                ['code' => 'purchases.manage', 'description' => 'Create and manage purchase invoices.'],
                ['code' => 'purchases.payments.approve', 'description' => 'Approve supplier payments and post them to treasury.'],
                ['code' => 'partners.view', 'description' => 'View company partners, invoices, and recorded earnings.'],
                ['code' => 'partners.manage', 'description' => 'Create and update partner records.'],
                ['code' => 'partner_payments.view', 'description' => 'View historical partner payments for audit.'],
                ['code' => 'partner_payments.manage', 'description' => 'Legacy permission; company partner payout writes are disabled.'],
                ['code' => 'partners.approve_payments', 'description' => 'Legacy permission; company partner payout writes are disabled.'],
                ['code' => 'governorates.view', 'description' => 'View governorates.'],
                ['code' => 'governorates.manage', 'description' => 'Manage governorates.'],
                ['code' => 'shipping_drivers.view', 'description' => 'View shipping drivers.'],
                ['code' => 'shipping_drivers.manage', 'description' => 'Manage shipping drivers.'],
                ['code' => 'currencies.view', 'description' => 'عرض قائمة العملات المرجعية؛ تبقى المبالغ بالجنيه المصري.'],
                ['code' => 'currencies.manage', 'description' => 'إدارة قائمة العملات المرجعية دون تسجيل حركات مالية.'],
                ['code' => 'trash.view', 'description' => 'View restorable records.'],
                ['code' => 'trash.restore', 'description' => 'Restore deactivated records.'],
                ['code' => 'trash.delete', 'description' => 'Permanently delete an archived record.'],
                ['code' => 'trash.empty', 'description' => 'Permanently empty the recycle bin.'],
                ['code' => 'data.import.manage', 'description' => 'Preview and apply idempotent CSV imports.'],
                ['code' => 'data.daily_summary.view', 'description' => 'View the real daily business summary.'],
                ['code' => 'system.backups.view', 'description' => 'View database backup job status.'],
                ['code' => 'system.backups.create', 'description' => 'Queue a database backup job.'],
                ['code' => 'global_search.use', 'description' => 'Search business records allowed by the user role.'],
                ['code' => 'notifications.view', 'description' => 'View and acknowledge business notifications.'],
                ['code' => 'warehouse_returns.view', 'description' => 'View warehouse returns.'],
                ['code' => 'warehouse_returns.manage', 'description' => 'Create warehouse returns.'],
                ['code' => 'warehouse_returns.approve', 'description' => 'Approve warehouse returns and post stock movements.'],
                ['code' => 'expense_categories.manage', 'description' => 'Create and manage informational expense categories.'],
                ['code' => 'reports.customer_balances.view', 'description' => 'View customer receivable balances, including unapplied collections. Owner-only financial report.'],
                ['code' => 'reports.customer_statement.view', 'description' => 'View dated customer statement documents and collection activity. Owner-only financial report.'],
                ['code' => 'reports.container_costs.view', 'description' => 'View container cost summaries, payments, and inventory allocations. Owner-only financial report.'],
                ['code' => 'reports.dashboard.view', 'description' => 'View the dashboard sections allowed by the caller’s other permissions.'],
                ['code' => 'mobile.use', 'description' => 'Authenticate and use the mobile companion API.'],
                ['code' => 'mobile.balances.view', 'description' => 'View mobile channel treasury balances.'],
                ['code' => 'mobile.messages.view', 'description' => 'View captured mobile payment messages and raw message text.'],
                ['code' => 'mobile.deposits.register', 'description' => 'Register mobile payment deposits as customer collections.'],
                ['code' => 'mobile.withdrawals.register', 'description' => 'Register mobile payment withdrawals as expenses or treasury transfers.'],
                ['code' => 'mobile.channels.manage', 'description' => 'Create, update, pause, and archive mobile payment channels and sources.'],
                ['code' => 'mobile.categories.manage', 'description' => 'Create and manage mobile withdrawal categories.'],
                ['code' => 'mobile.customers.create', 'description' => 'Create customers through the mobile companion API.'],
                ['code' => 'mobile.devices.manage', 'description' => 'List, rename, and revoke mobile devices from the web API.'],
                ['code' => 'mobile.channels.view', 'description' => 'View mobile payment channels.'],
                ['code' => 'mobile.messages.capture', 'description' => 'Capture messages for configured mobile payment channels.'],
                ['code' => 'mobile.messages.record', 'description' => 'Record captured mobile deposits and withdrawals.'],
            ];

            foreach ($permissions as $permission) {
                DB::table('permissions')->updateOrInsert(
                    ['code' => $permission['code']],
                    ['description' => $permission['description']],
                );
            }

            $roleMap = [
                'owner' => array_column($permissions, 'code'),
                'admin' => array_values(array_diff(DB::table('permissions')->pluck('code')->all(), [
                    'damaged_stock.approve', 'financial_adjustments.manage', 'users.manage', 'audit_logs.view',
                    'data.import.manage', 'system.backups.view', 'system.backups.create', 'trash.delete', 'trash.empty',
                    'purchases.payments.approve',
                ])),
                'accountant' => [
                    'users.view_self', 'sessions.revoke_self', 'invoices.view', 'customers.view', 'products.view',
                    'collections.view', 'returns.view', 'costs.view', 'markup.view', 'profit.view', 'containers.view',
                    'orders.view', 'deliveries.view', 'treasury.view', 'expenses.view', 'expenses.post',
                    'reports.customer_balances.view', 'reports.customer_statement.view', 'reports.container_costs.view',
                    'reports.dashboard.view', 'purchases.view', 'partners.view', 'partner_payments.view',
                    'inventory.view', 'warehouse_returns.view', 'inventory_counts.view', 'currencies.view',
                    'chart_of_accounts.view', 'journal_entries.view', 'journal_entries.create', 'accounting.reports.view',
                    'financial_adjustments.view',
                    'pending_funds.view', 'partner_installments.view', 'expense_budgets.view',
                    'recurring_expenses.view', 'finance_reports.view',
                    'data.daily_summary.view', 'global_search.use', 'notifications.view',
                ],
                'designated_invoice_issuer' => [
                    'users.view_self', 'sessions.revoke_self', 'invoices.create', 'customers.view', 'products.view',
                    'global_search.use', 'notifications.view',
                ],
                'read_only' => [
                    'users.view_self', 'sessions.revoke_self', 'invoices.view', 'customers.view', 'products.view',
                    'reports.dashboard.view', 'currencies.view', 'global_search.use', 'notifications.view',
                ],
                'driver' => [
                    'users.view_self', 'sessions.revoke_self', 'invoices.create', 'customers.view',
                    'products.view', 'inventory.view', 'orders.view', 'orders.manage',
                    'deliveries.view', 'deliveries.manage', 'global_search.use', 'notifications.view',
                ],
            ];

            foreach ($roleMap as $code => $codes) {
                $roleId = DB::table('roles')->where('code', $code)->value('id');

                if ($roleId === null) {
                    throw new \RuntimeException("Role {$code} was not seeded.");
                }

                if ($code !== 'driver') {
                    DB::table('role_permissions')->where('role_id', $roleId)->delete();
                }

                foreach ($codes as $permissionCode) {
                    $permissionId = DB::table('permissions')->where('code', $permissionCode)->value('id');

                    if ($permissionId === null) {
                        throw new \RuntimeException("Permission {$permissionCode} was not seeded.");
                    }

                    $grant = [
                        'role_id' => $roleId,
                        'permission_id' => $permissionId,
                        'granted_at' => $now,
                    ];

                    if ($code === 'driver') {
                        DB::table('role_permissions')->insertOrIgnore($grant);
                    } else {
                        DB::table('role_permissions')->insert($grant);
                    }
                }
            }
        });
    }
}
