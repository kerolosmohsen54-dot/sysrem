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
  { path: '/inventory/adjustments', title: 'inventoryAdjustments', permission: 'inventory.view' },
  { path: '/inventory/opening-stock', title: 'openingStock', permission: 'inventory.view' },
  { path: '/inventory/transfers', title: 'inventoryTransfers', permission: 'inventory.view' },
  { path: '/inventory/damaged', title: 'damagedStock', permission: 'inventory.view' },
  { path: '/finance', title: 'finance', permission: 'treasury.view' },
  { path: '/containers', title: 'containers', permission: 'containers.view' },
  { path: '/reports', title: 'reports', permission: 'invoices.view' },
  { path: '/admin/users', title: 'users', permission: 'users.manage' },
  { path: '/admin/audit', title: 'audit', permission: 'audit_logs.view' },
  { path: '/admin/settings', title: 'settings', permission: ['sales_tax.manage', 'users.manage'] },
];
