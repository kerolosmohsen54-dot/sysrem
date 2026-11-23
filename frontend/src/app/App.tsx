import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { appRoutes } from '../shared/constants/routes';
import { PermissionGate } from '../shared/auth/PermissionGate';
import { MobileApiAccess } from '../features/mobile/MobileApiAccess';
import { AppShell } from './layouts/AppShell';
import { ar } from '../shared/i18n/ar';
import { PageState } from '../shared/components/PageState';

const LoginPage = lazy(() =>
  import('../features/auth/LoginPage').then((module) => ({ default: module.LoginPage })),
);
const CatalogPages = {
  CategoriesPage: lazy(() =>
    import('../features/inventory/CatalogPages').then((module) => ({
      default: module.CategoriesPage,
    })),
  ),
  InventoryBalancesPage: lazy(() =>
    import('../features/inventory/CatalogPages').then((module) => ({
      default: module.InventoryBalancesPage,
    })),
  ),
  ProductsPage: lazy(() =>
    import('../features/inventory/CatalogPages').then((module) => ({
      default: module.ProductsPage,
    })),
  ),
  WarehousesPage: lazy(() =>
    import('../features/inventory/CatalogPages').then((module) => ({
      default: module.WarehousesPage,
    })),
  ),
};
const StockPages = {
  InventoryAdjustmentPage: lazy(() =>
    import('../features/inventory/StockPages').then((module) => ({
      default: module.InventoryAdjustmentPage,
    })),
  ),
  InventoryMovementsPage: lazy(() =>
    import('../features/inventory/StockPages').then((module) => ({
      default: module.InventoryMovementsPage,
    })),
  ),
  InventoryMovementDetailPage: lazy(() =>
    import('../features/inventory/StockPages').then((module) => ({
      default: module.InventoryMovementDetailPage,
    })),
  ),
  InventoryTransferPage: lazy(() =>
    import('../features/inventory/StockPages').then((module) => ({
      default: module.InventoryTransferPage,
    })),
  ),
  OpeningStockPage: lazy(() =>
    import('../features/inventory/StockPages').then((module) => ({
      default: module.OpeningStockPage,
    })),
  ),
};
const CustomerListPage = lazy(() =>
  import('../features/customers/CustomerListPage').then((module) => ({
    default: module.CustomerListPage,
  })),
);
const CustomerDetailPage = lazy(() =>
  import('../features/customers/CustomerDetailPage').then((module) => ({
    default: module.CustomerDetailPage,
  })),
);
const CustomerStatementPage = lazy(() =>
  import('../features/customers/CustomerStatementPage').then((module) => ({
    default: module.CustomerStatementPage,
  })),
);
const CustomerLiquidationPage = lazy(() =>
  import('../features/customers/CustomerLiquidationPage').then((module) => ({
    default: module.CustomerLiquidationPage,
  })),
);
const CostHistoryPage = lazy(() =>
  import('../features/inventory/CostHistoryPage').then((module) => ({
    default: module.CostHistoryPage,
  })),
);
const InvoiceListPage = lazy(() =>
  import('../features/sales/InvoiceListPage').then((module) => ({
    default: module.InvoiceListPage,
  })),
);
const InvoiceFormPage = lazy(() =>
  import('../features/sales/InvoiceFormPage').then((module) => ({
    default: module.InvoiceFormPage,
  })),
);
const InvoicePrintPage = lazy(() =>
  import('../features/sales/InvoicePrintPage').then((module) => ({
    default: module.InvoicePrintPage,
  })),
);
const InvoicePdfPage = lazy(() =>
  import('../features/sales/InvoicePrintPage').then((module) => ({
    default: module.InvoicePdfPage,
  })),
);
const InvoiceDetailPage = lazy(() =>
  import('../features/sales/InvoiceDetailPage').then((module) => ({
    default: module.InvoiceDetailPage,
  })),
);
const InvoiceEditPage = lazy(() =>
  import('../features/sales/InvoiceEditPage').then((module) => ({
    default: module.InvoiceEditPage,
  })),
);
const ReturnsPage = lazy(() =>
  import('../features/sales/ReturnsPage').then((module) => ({ default: module.ReturnsPage })),
);
const ReturnFormPage = lazy(() =>
  import('../features/sales/ReturnFormPage').then((module) => ({ default: module.ReturnFormPage })),
);
const ReturnPrintPage = lazy(() =>
  import('../features/sales/ReturnsPage').then((module) => ({
    default: module.ReturnPrintPage,
  })),
);
const CollectionsPage = lazy(() =>
  import('../features/sales/CollectionsPage').then((module) => ({
    default: module.CollectionsPage,
  })),
);
const ContainerListPage = lazy(() =>
  import('../features/containers/ContainerListPage').then((module) => ({
    default: module.ContainerListPage,
  })),
);
const ContainerDetailPage = lazy(() =>
  import('../features/containers/ContainerDetailPage').then((module) => ({
    default: module.ContainerDetailPage,
  })),
);
const ContainerReceiptPage = lazy(() =>
  import('../features/containers/ContainerReceiptPage').then((module) => ({ default: module.ContainerReceiptPage })),
);
const ContainerReceiptDetailPage = lazy(() =>
  import('../features/containers/ContainerReceiptDetailPage').then((module) => ({ default: module.ContainerReceiptDetailPage })),
);
const LandedCostPage = lazy(() =>
  import('../features/containers/LandedCostPage').then((module) => ({ default: module.LandedCostPage })),
);
const ContainerLedgerPages = {
  ContainerTransfersPage: lazy(() =>
    import('../features/containers/ContainerLedgerPages').then((module) => ({ default: module.ContainerTransfersPage })),
  ),
  ContainerFundsPage: lazy(() =>
    import('../features/containers/ContainerLedgerPages').then((module) => ({ default: module.ContainerFundsPage })),
  ),
};
const OrdersPage = lazy(() =>
  import('../features/orders/OrdersPage').then((module) => ({ default: module.OrdersPage })),
);
const OrderFormPage = lazy(() =>
  import('../features/orders/OrderFormPage').then((module) => ({ default: module.OrderFormPage })),
);
const OrderDetailPage = lazy(() =>
  import('../features/orders/OrderDetailPage').then((module) => ({
    default: module.OrderDetailPage,
  })),
);
const OrderPrintPage = lazy(() =>
  import('../features/orders/OrderPrintPage').then((module) => ({ default: module.OrderPrintPage })),
);
const DeliveriesPage = lazy(() =>
  import('../features/orders/DeliveriesPage').then((module) => ({
    default: module.DeliveriesPage,
  })),
);
const DeliveryFormPage = lazy(() =>
  import('../features/orders/DeliveryFormPage').then((module) => ({
    default: module.DeliveryFormPage,
  })),
);
const DeliveryDetailPage = lazy(() =>
  import('../features/orders/DeliveryDetailPage').then((module) => ({
    default: module.DeliveryDetailPage,
  })),
);
const FinancePage = lazy(() =>
  import('../features/finance/FinancePage').then((module) => ({ default: module.FinancePage })),
);
const PendingFundsPage = lazy(() => import('../features/finance/FinancialPlanningPages').then((module) => ({ default: module.PendingFundsPage })));
const PartnerInstallmentsPage = lazy(() => import('../features/finance/FinancialPlanningPages').then((module) => ({ default: module.PartnerInstallmentsPage })));
const ExpenseBudgetsPage = lazy(() => import('../features/finance/FinancialPlanningPages').then((module) => ({ default: module.ExpenseBudgetsPage })));
const RecurringExpensesPage = lazy(() => import('../features/finance/FinancialPlanningPages').then((module) => ({ default: module.RecurringExpensesPage })));
const MonthlyComparisonPage = lazy(() => import('../features/finance/FinancialPlanningPages').then((module) => ({ default: module.MonthlyComparisonPage })));
const CashForecastPage = lazy(() => import('../features/finance/FinancialPlanningPages').then((module) => ({ default: module.CashForecastPage })));
const PartnersPage = lazy(() =>
  import('../features/finance/PartnersPage').then((module) => ({ default: module.PartnersPage })),
);
const PartnerAccountPage = lazy(() =>
  import('../features/finance/PartnerAccountPage').then((module) => ({ default: module.PartnerAccountPage })),
);
const GovernoratesPage = lazy(() =>
  import('../features/customers/GovernoratesPage').then((module) => ({ default: module.GovernoratesPage })),
);
const ShippingDriversPage = lazy(() =>
  import('../features/admin/ReferenceAdminPages').then((module) => ({ default: module.ShippingDriversPage })),
);
const RecycleBinPage = lazy(() =>
  import('../features/admin/RecycleBinPage').then((module) => ({ default: module.RecycleBinPage })),
);
const PwaInstallPage = lazy(() =>
  import('../features/admin/PwaInstallPage').then(module => ({ default: module.PwaInstallPage })),
);
const TreasuryPage = lazy(() =>
  import('../features/finance/TreasuryPage').then((module) => ({ default: module.TreasuryPage })),
);
const MobileInboxPage = lazy(() => import('../features/mobile/MobileInboxPage').then((module) => ({ default: module.MobileInboxPage })));
const MobileChannelsPage = lazy(() => import('../features/mobile/MobileChannelsPage').then((module) => ({ default: module.MobileChannelsPage })));
const TransferPage = lazy(() =>
  import('../features/finance/TransferPage').then((module) => ({ default: module.TransferPage })),
);
const ExpensePage = lazy(() =>
  import('../features/finance/ExpensePage').then((module) => ({ default: module.ExpensePage })),
);
const DashboardPage = lazy(() =>
  import('../features/dashboard/DashboardPage').then((module) => ({
    default: module.DashboardPage,
  })),
);
const ReportsPage = lazy(() =>
  import('../features/reports/ReportsPage').then((module) => ({ default: module.ReportsPage })),
);
const SalesReportPage = lazy(() =>
  import('../features/reports/SalesReportPage').then((module) => ({
    default: module.SalesReportPage,
  })),
);
const ProfitReportPage = lazy(() =>
  import('../features/reports/ProfitReportPage').then((module) => ({
    default: module.ProfitReportPage,
  })),
);
const ProfitLossReportPage = lazy(() =>
  import('../features/reports/ProfitLossReportPage').then((module) => ({
    default: module.ProfitLossReportPage,
  })),
);
const ProfitDistributionReportPage = lazy(() =>
  import('../features/reports/ProfitDistributionReportPage').then((module) => ({
    default: module.ProfitDistributionReportPage,
  })),
);
const InventoryReportPage = lazy(() =>
  import('../features/reports/InventoryReportPage').then((module) => ({
    default: module.InventoryReportPage,
  })),
);
const ContainerCostsReportPage = lazy(() =>
  import('../features/reports/ContainerCostsReportPage').then((module) => ({
    default: module.ContainerCostsReportPage,
  })),
);
const CustomerBalancesReportPage = lazy(() =>
  import('../features/reports/CustomerBalancesReportPage').then((module) => ({
    default: module.CustomerBalancesReportPage,
  })),
);
const ChartOfAccountsPage = lazy(() =>
  import('../features/finance/ChartOfAccountsPage').then((module) => ({
    default: module.ChartOfAccountsPage,
  })),
);
const JournalsPage = lazy(() =>
  import('../features/finance/AccountingPages').then((module) => ({ default: module.JournalsPage })),
);
const LedgerPage = lazy(() =>
  import('../features/finance/AccountingPages').then((module) => ({ default: module.LedgerPage })),
);
const TrialBalancePage = lazy(() =>
  import('../features/finance/AccountingPages').then((module) => ({ default: module.TrialBalancePage })),
);
const AutoPostingMappingsPage = lazy(() =>
  import('../features/finance/AccountingPages').then((module) => ({ default: module.AutoPostingMappingsPage })),
);
const FinancialAdjustmentsPage = lazy(() =>
  import('../features/finance/FinancialAdjustmentsPage').then((module) => ({
    default: module.FinancialAdjustmentsPage,
  })),
);
const CurrenciesPage = lazy(() =>
  import('../features/finance/CurrenciesPage').then((module) => ({
    default: module.CurrenciesPage,
  })),
);
const FinancialReportPage = lazy(() =>
  import('../features/reports/FinancialReportPage').then((module) => ({
    default: module.FinancialReportPage,
  })),
);
const PurchaseInvoicesPage = lazy(() =>
  import('../features/purchases/PurchaseInvoicesPage').then(module => ({ default: module.PurchaseInvoicesPage })),
);
const PurchaseInvoiceCreatePage = lazy(() =>
  import('../features/purchases/PurchaseInvoicesPage').then(module => ({ default: module.PurchaseInvoiceCreatePage })),
);
const PurchaseInvoiceDetailPage = lazy(() =>
  import('../features/purchases/PurchaseInvoicesPage').then(module => ({ default: module.PurchaseInvoiceDetailPage })),
);
const PurchaseInvoiceEditPage = lazy(() =>
  import('../features/purchases/PurchaseInvoiceEditPage').then(module => ({ default: module.PurchaseInvoiceEditPage })),
);
const DamagedStockPage = lazy(() =>
  import('../features/inventory/ApprovedDamagedStockPage').then((module) => ({
    default: module.ApprovedDamagedStockPage,
  })),
);
const WarehouseReturnsPage = lazy(() =>
  import('../features/inventory/WarehouseReturnsPage').then((module) => ({ default: module.WarehouseReturnsPage })),
);
const WarehouseReturnDetailPage = lazy(() =>
  import('../features/inventory/WarehouseReturnsPage').then((module) => ({ default: module.WarehouseReturnDetailPage })),
);
const AdvancedInventoryPages = {
  MinimumStockPage: lazy(() => import('../features/inventory/AdvancedInventoryPages').then(module => ({ default: module.MinimumStockPage }))),
  PeriodicCountPage: lazy(() => import('../features/inventory/AdvancedInventoryPages').then(module => ({ default: module.PeriodicCountPage }))),
  PeriodicCountDetailPage: lazy(() => import('../features/inventory/AdvancedInventoryPages').then(module => ({ default: module.PeriodicCountDetailPage }))),
};
const AuditPage = lazy(() =>
  import('../features/admin/AuditPage').then((module) => ({ default: module.AuditPage })),
);
const UsersPage = lazy(() =>
  import('../features/admin/UsersPage').then((module) => ({ default: module.UsersPage })),
);
const SettingsPage = lazy(() =>
  import('../features/admin/SettingsPage').then((module) => ({ default: module.SettingsPage })),
);
const DataImportPage = lazy(() => import('../features/admin/DataToolsPage').then((module) => ({ default: module.DataImportPage })));
const DailySummaryPage = lazy(() => import('../features/admin/DataToolsPage').then((module) => ({ default: module.DailySummaryPage })));
const BackupPage = lazy(() => import('../features/admin/BackupPage').then((module) => ({ default: module.BackupPage })));

function ProtectedShell() {
  return (
    <PermissionGate>
      <AppShell />
    </PermissionGate>
  );
}

function PlaceholderRoute({ title }: { title: (typeof appRoutes)[number]['title'] }) {
  return (
    <section className="page">
      <header className="page-heading">
        <div>
          <h1>{ar.nav[title]}</h1>
          <p>{ar.app.subtitle}</p>
        </div>
      </header>
      <PageState kind="empty" title={ar.common.pagePlaceholder} />
    </section>
  );
}

function ScreenRoute({ path, title }: (typeof appRoutes)[number]) {
  if (path === '/products') return <CatalogPages.ProductsPage />;
  if (path === '/categories') return <CatalogPages.CategoriesPage />;
  if (path === '/warehouses') return <CatalogPages.WarehousesPage />;
  if (path === '/inventory') return <CatalogPages.InventoryBalancesPage />;
  if (path === '/inventory/movements') return <StockPages.InventoryMovementsPage />;
  if (path === '/inventory/returns') return <StockPages.InventoryMovementsPage returnOnly />;
  if (path === '/inventory/adjustments') return <StockPages.InventoryAdjustmentPage />;
  if (path === '/inventory/opening-stock') return <StockPages.OpeningStockPage />;
  if (path === '/inventory/transfers') return <StockPages.InventoryTransferPage />;
  if (path === '/inventory/damaged') return <DamagedStockPage />;
  if (path === '/warehouse-returns') return <WarehouseReturnsPage />;
  if (path === '/inventory/minimum-stock') return <AdvancedInventoryPages.MinimumStockPage />;
  if (path === '/inventory/counts') return <AdvancedInventoryPages.PeriodicCountPage />;
  if (path === '/customers') return <CustomerListPage />;
  if (path === '/invoices') return <InvoiceListPage />;
  if (path === '/returns') return <ReturnsPage />;
  if (path === '/collections') return <CollectionsPage />;
  if (path === '/containers') return <ContainerListPage />;
  if (path === '/container-transfers') return <ContainerLedgerPages.ContainerTransfersPage />;
  if (path === '/container-funds') return <ContainerLedgerPages.ContainerFundsPage />;
  if (path === '/orders') return <OrdersPage />;
  if (path === '/deliveries') return <DeliveriesPage />;
  if (path === '/dashboard') return <DashboardPage />;
  if (path === '/finance') return <FinancePage />;
  if (path === '/partners') return <PartnersPage />;
  if (path === '/purchase-invoices') return <PurchaseInvoicesPage />;
  if (path === '/admin/governorates') return <GovernoratesPage />;
  if (path === '/admin/drivers') return <ShippingDriversPage />;
  if (path === '/admin/trash') return <RecycleBinPage />;
  if (path === '/admin/install') return <PwaInstallPage />;
  if (path === '/reports') return <ReportsPage />;
  if (path === '/admin/users') return <UsersPage />;
  if (path === '/admin/audit') return <AuditPage />;
  if (path === '/admin/settings') return <SettingsPage />;
  if (path === '/data/import') return <DataImportPage />;
  if (path === '/data/daily-summary') return <DailySummaryPage />;
  if (path === '/admin/backups') return <BackupPage />;
  return <PlaceholderRoute title={title} />;
}

export function App() {
  return (
    <Suspense fallback={<PageState kind="loading" />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedShell />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route element={<PermissionGate permission="partners.view"><PartnerAccountPage /></PermissionGate>} path="partners/:partnerId" />
          <Route element={<PermissionGate permission="purchases.manage"><PurchaseInvoiceCreatePage /></PermissionGate>} path="purchase-invoices/new" />
          <Route element={<PermissionGate permission="purchases.manage"><PurchaseInvoiceEditPage /></PermissionGate>} path="purchase-invoices/:invoiceId/edit" />
          <Route element={<PermissionGate permission="purchases.view"><PurchaseInvoiceDetailPage /></PermissionGate>} path="purchase-invoices/:invoiceId" />
          <Route
            element={
              <PermissionGate permission="treasury.view">
                <TreasuryPage />
              </PermissionGate>
            }
            path="finance/treasury"
          />
          <Route
            element={
              <PermissionGate permission="treasury.view">
                <MobileApiAccess optional permission="mobile.messages.view">
                  {({ token }) => <TreasuryPage direction="in" title="الصندوق الوارد" mobileToken={token || undefined} />}
                </MobileApiAccess>
              </PermissionGate>
            }
            path="finance/inbox"
          />
          <Route element={<PermissionGate permission="mobile.messages.view"><MobileInboxPage /></PermissionGate>} path="finance/mobile-inbox" />
          <Route element={<PermissionGate permission="treasury.view"><MobileApiAccess optional permission="mobile.messages.view">{({ token }) => <TreasuryPage direction="out" title="السحب" mobileToken={token || undefined} />}</MobileApiAccess></PermissionGate>} path="finance/withdrawals" />
          <Route element={<PermissionGate permission="treasury.view"><MobileApiAccess optional permission="mobile.messages.view">{({ token }) => <TreasuryPage title="الحركات" mobileToken={token || undefined} />}</MobileApiAccess></PermissionGate>} path="finance/movements" />
                    <Route element={<PermissionGate permission="mobile.channels.view"><MobileChannelsPage /></PermissionGate>} path="finance/mobile-channels" />
          <Route
            element={
              <PermissionGate permission="treasury.view">
                <TransferPage />
              </PermissionGate>
            }
            path="finance/transfers"
          />
          <Route
            element={
              <PermissionGate permission="expenses.view">
                <ExpensePage />
              </PermissionGate>
            }
            path="finance/expenses"
          />
          <Route
            element={
              <PermissionGate permission="currencies.view">
                <CurrenciesPage />
              </PermissionGate>
            }
            path="finance/currencies"
          />
          <Route
            element={
              <PermissionGate permission="chart_of_accounts.view">
                <ChartOfAccountsPage />
              </PermissionGate>
            }
            path="finance/chart-of-accounts"
          />
          <Route element={<PermissionGate permission="chart_of_accounts.view"><AutoPostingMappingsPage /></PermissionGate>} path="finance/auto-posting-mappings" />
          <Route
            element={
              <PermissionGate permission="financial_adjustments.view">
                <FinancialAdjustmentsPage />
              </PermissionGate>
            }
            path="finance/adjustments"
          />
          <Route element={<PermissionGate permission="journal_entries.view"><JournalsPage /></PermissionGate>} path="finance/journals" />
          <Route element={<PermissionGate permission="journal_entries.view"><JournalsPage /></PermissionGate>} path="finance/journals/:entryId" />
          <Route element={<PermissionGate permission="accounting.reports.view"><LedgerPage /></PermissionGate>} path="finance/ledger" />
          <Route element={<PermissionGate permission="accounting.reports.view"><TrialBalancePage /></PermissionGate>} path="finance/trial-balance" />
          <Route element={<PermissionGate permission="pending_funds.view"><PendingFundsPage /></PermissionGate>} path="finance/pending-funds" />
          <Route element={<PermissionGate permission="partner_installments.view"><PartnerInstallmentsPage /></PermissionGate>} path="finance/partner-installments" />
          <Route element={<PermissionGate permission="expense_budgets.view"><ExpenseBudgetsPage /></PermissionGate>} path="finance/expense-budgets" />
          <Route element={<PermissionGate permission="recurring_expenses.view"><RecurringExpensesPage /></PermissionGate>} path="finance/recurring-expenses" />
          <Route element={<PermissionGate permission="finance_reports.view"><MonthlyComparisonPage /></PermissionGate>} path="finance/monthly-comparison" />
          <Route element={<PermissionGate permission="finance_reports.view"><CashForecastPage /></PermissionGate>} path="finance/cash-forecast" />
          <Route
            element={
              <PermissionGate permission="invoices.view">
                <SalesReportPage />
              </PermissionGate>
            }
            path="reports/sales"
          />
          <Route
            element={<PermissionGate permission="accounting.reports.view"><ProfitLossReportPage /></PermissionGate>}
            path="reports/profit-loss"
          />
          <Route
            element={
              <PermissionGate permission="profit.view">
                <PermissionGate permission="markup.view">
                  <ProfitReportPage />
                </PermissionGate>
              </PermissionGate>
            }
            path="reports/invoice-profit"
          />
          <Route
            element={
              <PermissionGate permission="profit.view">
                <PermissionGate permission="costs.view">
                  <ProfitDistributionReportPage />
                </PermissionGate>
              </PermissionGate>
            }
            path="reports/profit-distribution"
          />
          <Route
            element={
              <PermissionGate permission="inventory.view">
                <InventoryReportPage />
              </PermissionGate>
            }
            path="reports/stock"
          />
          <Route
            element={
              <PermissionGate permission="inventory.view">
                <InventoryReportPage />
              </PermissionGate>
            }
            path="reports/stock-movements"
          />
          <Route
            element={
              <PermissionGate permission="reports.container_costs.view">
                <ContainerCostsReportPage />
              </PermissionGate>
            }
            path="reports/container-costs"
          />
          <Route
            element={
              <PermissionGate permission="reports.customer_balances.view">
                <CustomerBalancesReportPage />
              </PermissionGate>
            }
            path="reports/customer-balances"
          />
          <Route
            element={
              <PermissionGate permission="accounting.reports.view">
                <FinancialReportPage />
              </PermissionGate>
            }
            path="reports/financial"
          />
          <Route
            element={
              <PermissionGate permission="orders.manage">
                <OrderFormPage />
              </PermissionGate>
            }
            path="orders/:orderId/edit"
          />
          <Route
            element={
              <PermissionGate permission="orders.manage">
                <OrderFormPage />
              </PermissionGate>
            }
            path="orders/new"
          />
          <Route
            element={
              <PermissionGate permission="orders.view">
                <OrderDetailPage />
              </PermissionGate>
            }
            path="orders/:orderId"
          />
          <Route
            element={
              <PermissionGate permission="orders.view">
                <OrderPrintPage />
              </PermissionGate>
            }
            path="orders/:orderId/print"
          />
          <Route
            element={
              <PermissionGate permission="deliveries.manage">
                <DeliveryFormPage />
              </PermissionGate>
            }
            path="deliveries/new"
          />
          <Route
            element={
              <PermissionGate permission="deliveries.view">
                <DeliveryDetailPage />
              </PermissionGate>
            }
            path="deliveries/:deliveryId"
          />
          <Route
            element={
              <PermissionGate permission="costs.view">
                <CostHistoryPage />
              </PermissionGate>
            }
            path="products/:productId/cost-history"
          />
          <Route element={<PermissionGate permission="inventory.view"><StockPages.InventoryMovementDetailPage /></PermissionGate>} path="inventory/movements/:lineId" />
          <Route element={<PermissionGate permission="inventory_counts.view"><AdvancedInventoryPages.PeriodicCountDetailPage /></PermissionGate>} path="inventory/counts/:countId" />
          <Route element={<PermissionGate permission="warehouse_returns.view"><WarehouseReturnDetailPage /></PermissionGate>} path="warehouse-returns/:returnId" />
          <Route
            element={
              <PermissionGate permission="reports.customer_statement.view">
                <CustomerStatementPage />
              </PermissionGate>
            }
            path="customers/:customerId/statement"
          />
          <Route
            element={
              <PermissionGate permission="reports.customer_balances.view">
                <CustomerLiquidationPage />
              </PermissionGate>
            }
            path="customers/:customerId/liquidation"
          />
          <Route
            element={
              <PermissionGate permission="customers.view">
                <CustomerDetailPage />
              </PermissionGate>
            }
            path="customers/:customerId"
          />
          <Route
            element={
              <PermissionGate permission="containers.view">
                <ContainerDetailPage />
              </PermissionGate>
            }
            path="containers/:containerId"
          />
          <Route element={<PermissionGate permission="containers.manage"><ContainerReceiptPage /></PermissionGate>} path="containers/:containerId/receive" />
          <Route element={<PermissionGate permission="containers.view"><ContainerReceiptDetailPage /></PermissionGate>} path="containers/:containerId/receipts/:receiptId" />
          <Route element={<PermissionGate permission="containers.manage"><PermissionGate permission="costs.view"><LandedCostPage /></PermissionGate></PermissionGate>} path="containers/:containerId/landed-cost" />
          <Route
            element={
              <PermissionGate permission="invoices.create">
                <InvoiceFormPage />
              </PermissionGate>
            }
            path="invoices/new"
          />
          <Route
            element={
              <PermissionGate permission="documents.edit">
                <InvoiceEditPage />
              </PermissionGate>
            }
            path="invoices/:documentId/edit"
          />
          <Route
            element={
              <PermissionGate permission="invoices.view">
                <InvoicePrintPage />
              </PermissionGate>
            }
            path="invoices/:documentId/print"
          />
          <Route
            element={
              <PermissionGate permission="invoices.view">
                <InvoicePdfPage />
              </PermissionGate>
            }
            path="invoices/:documentId/pdf"
          />
          <Route
            element={
              <PermissionGate permission="invoices.view">
                <InvoiceDetailPage />
              </PermissionGate>
            }
            path="invoices/:documentId"
          />
          <Route
            element={
              <PermissionGate permission="returns.create">
                <ReturnFormPage />
              </PermissionGate>
            }
            path="returns/new"
          />
          <Route
            element={
              <PermissionGate permission="returns.view">
                <ReturnPrintPage />
              </PermissionGate>
            }
            path="returns/:documentId/print"
          />
          {appRoutes.map((route) => (
            <Route
              element={
                <PermissionGate permission={route.permission}>
                  <ScreenRoute {...route} />
                </PermissionGate>
              }
              key={route.path}
              path={route.path.slice(1)}
            />
          ))}
        </Route>
        <Route path="*" element={<PageState kind="error" title={ar.common.pageNotFound} />} />
      </Routes>
    </Suspense>
  );
}
