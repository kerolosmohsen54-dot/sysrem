import type { NavigationKey } from '../i18n/ar';

export type AppRoute = {
  path: string;
  title: NavigationKey;
  permission: string | string[];
};

export const appRoutes: AppRoute[] = [
  { path: '/dashboard', title: 'dashboard', permission: 'reports.dashboard.view' },
  { path: '/customers', title: 'customers', permission: 'customers.view' },
  { path: '/orders', title: 'orders', permission: 'orders.view' },
  { path: '/deliveries', title: 'deliveries', permission: 'deliveries.view' },
  { path: '/invoices', title: 'invoices', permission: 'invoices.view' },
  { path: '/collections', title: 'collections', permission: 'collections.view' },
  { path: '/returns', title: 'returns', permission: 'returns.view' },
  { path: '/products', title: 'products', permission: 'products.view' },
  { path: '/categories', title: 'categories', permission: 'products.view' },
  { path: '/warehouses', title: 'warehouses', permission: 'inventory.view' },
  { path: '/inventory', title: 'inventory', permission: 'inventory.view' },
  { path: '/inventory/movements', title: 'inventoryMovements', permission: 'inventory.view' },
  { path: '/inventory/returns', title: 'stockReturns', permission: 'inventory.view' },
  { path: '/inventory/adjustments', title: 'inventoryAdjustments', permission: 'inventory.view' },
  { path: '/inventory/opening-stock', title: 'openingStock', permission: 'inventory.view' },
  { path: '/inventory/transfers', title: 'inventoryTransfers', permission: 'inventory.view' },
  { path: '/inventory/damaged', title: 'damagedStock', permission: 'damaged_stock.approve' },
  { path: '/warehouse-returns', title: 'warehouseReturns', permission: 'warehouse_returns.view' },
  { path: '/inventory/minimum-stock', title: 'minimumStock', permission: 'inventory.view' },
  { path: '/inventory/counts', title: 'periodicCount', permission: 'inventory_counts.view' },
  { path: '/finance', title: 'finance', permission: 'treasury.view' },
  { path: '/finance/partner-installments', title: 'containerPartners', permission: 'partner_installments.view' },
  { path: '/finance/inbox', title: 'financeInbox', permission: 'treasury.view' },
  { path: '/finance/mobile-inbox', title: 'mobileInbox', permission: 'mobile.messages.view' },
  { path: '/finance/withdrawals', title: 'financeWithdrawals', permission: ['treasury.view', 'mobile.messages.view'] },
  { path: '/finance/movements', title: 'financeMovements', permission: ['treasury.view', 'mobile.messages.view'] },
  { path: '/finance/mobile-channels', title: 'mobileChannels', permission: 'mobile.channels.view' },
  { path: '/partners', title: 'partners', permission: 'partners.view' },
  { path: '/purchase-invoices', title: 'purchaseInvoices', permission: 'purchases.view' },
  { path: '/admin/governorates', title: 'governorates', permission: 'governorates.view' },
  { path: '/admin/drivers', title: 'shippingDrivers', permission: 'shipping_drivers.view' },
  { path: '/admin/trash', title: 'trash', permission: 'trash.view' },
  { path: '/admin/backups', title: 'backups', permission: 'system.backups.view' },
  { path: '/admin/install', title: 'pwaInstall', permission: 'users.view_self' },
  { path: '/containers', title: 'containers', permission: 'containers.view' },
  { path: '/container-transfers', title: 'containerTransfers', permission: 'inventory.view' },
  { path: '/container-funds', title: 'containerFunds', permission: 'containers.view' },
  { path: '/reports', title: 'reports', permission: 'invoices.view' },
  { path: '/data/import', title: 'dataImport', permission: 'data.import.manage' },
  { path: '/data/daily-summary', title: 'dailySummary', permission: 'data.daily_summary.view' },
  { path: '/admin/users', title: 'users', permission: 'users.manage' },
  { path: '/admin/audit', title: 'audit', permission: 'audit_logs.view' },
  { path: '/admin/settings', title: 'settings', permission: ['sales_tax.manage', 'users.manage'] },
];
