import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { appRoutes } from '../../shared/constants/routes';
import { ar } from '../../shared/i18n/ar';
import { useAuth } from '../../shared/auth/AuthProvider';
import { ApiError } from '../../shared/api/errors';
import { Icon } from '../../shared/components/Icon';
import { Modal } from '../../shared/components/Modal';
import { PageState } from '../../shared/components/PageState';
import { displayRoles } from '../../shared/utils/labels';
import { globalSearch, listNotifications, markNotificationRead } from '../../features/admin/api';
import { getDailySummary } from '../../features/admin/dataToolsApi';
import '../../features/admin/pwaInstallStore';

const navigationGroups = [
  { key: 'sales', routes: ['orders', 'deliveries', 'invoices', 'collections', 'returns'] },
  { key: 'customers', routes: ['customers'] },
  {
    key: 'inventory',
    routes: [
      'products',
      'categories',
      'warehouses',
      'inventory',
      'inventoryMovements',
      'stockReturns',
      'inventoryAdjustments',
      'openingStock',
      'inventoryTransfers',
      'minimumStock',
      'periodicCount',
      'damagedStock',
      'warehouseReturns',
    ],
  },
  { key: 'containers', routes: ['containers', 'containerTransfers', 'containerFunds'] },
  { key: 'finance', routes: ['finance', 'financeInbox', 'mobileInbox', 'financeWithdrawals', 'financeMovements', 'mobileChannels', 'partners', 'purchaseInvoices'] },
  { key: 'containerPartners', routes: ['containerPartners'] },
  { key: 'reports', routes: ['reports'] },
  { key: 'admin', routes: ['governorates', 'shippingDrivers', 'trash', 'backups', 'pwaInstall', 'users', 'audit', 'settings'] },
  { key: 'data', routes: ['dataImport', 'dailySummary'] },
] as const;

type ReadyNavigationLink = {
  label: string;
  to: string;
  permissions: readonly string[];
  permissionMode?: 'all' | 'any';
};

const readyLinks: Record<string, readonly ReadyNavigationLink[]> = {
  sales: [
    { label: ar.app.createInvoice, to: '/invoices/new', permissions: ['invoices.create'] },
    { label: 'إنشاء مرتجع', to: '/returns/new', permissions: ['returns.create'] },
  ],
  customers: [
    { label: ar.app.createCustomer, to: '/customers', permissions: ['customers.view', 'customers.create'], permissionMode: 'all' },
    { label: '\u062d\u0633\u0627\u0628 \u0627\u0644\u0639\u0645\u064a\u0644', to: '/reports/customer-balances', permissions: ['reports.customer_balances.view'] },
  ],
  inventory: [
    { label: '\u0625\u0636\u0627\u0641\u0629 \u0625\u0644\u0649 \u0627\u0644\u0645\u062e\u0632\u0648\u0646', to: '/inventory/opening-stock', permissions: ['inventory.view', 'inventory.manage'], permissionMode: 'all' },
    { label: ar.inventory.productCostHistory, to: '/products', permissions: ['products.view', 'costs.view'], permissionMode: 'all' },
  ],
  containers: [
    { label: ar.app.createContainer, to: '/containers?create=1', permissions: ['containers.view', 'containers.manage'], permissionMode: 'all' },
    { label: ar.nav.containerTransfers, to: '/container-transfers', permissions: ['inventory.view'] },
    { label: ar.nav.containerFunds, to: '/container-funds', permissions: ['containers.view'] },
  ],
  reports: [
    { label: ar.reports.sales, to: '/reports/sales', permissions: ['invoices.view'] },
    { label: ar.reports.invoiceProfit, to: '/reports/invoice-profit', permissions: ['profit.view', 'markup.view'], permissionMode: 'all' },
    { label: ar.reports.profitDistribution, to: '/reports/profit-distribution', permissions: ['profit.view', 'costs.view'], permissionMode: 'all' },
    { label: ar.reports.stock, to: '/reports/stock', permissions: ['inventory.view'] },
    { label: ar.finance.financialReport, to: '/reports/financial', permissions: ['accounting.reports.view'] },
  ],
};

const shortcutRoutes = ['audit', 'dashboard'] as const;

type RouteTitle = (typeof appRoutes)[number]['title'];
type QuickActionItem = {
  label: string;
  to: string;
  permissions: string[];
  permissionMode?: 'all' | 'any';
};

const routeSearchAliases: Partial<Record<RouteTitle, string[]>> = {
  dashboard: ['الرئيسية', 'ملخص', 'مؤشرات'],
  customers: ['عميل', 'إضافة عميل', 'كشف حساب', 'رصيد عميل'],
  orders: ['إنشاء طلب', 'طلب بيع', 'طلبات البيع'],
  deliveries: ['إنشاء إذن تسليم', 'تسليم طلب', 'الشحن'],
  invoices: ['فاتورة بيع', 'إنشاء فاتورة', 'طباعة فاتورة'],
  collections: ['تحصيل مبلغ', 'سند قبض'],
  returns: ['مرتجع بيع', 'استرجاع فاتورة'],
  products: ['بحث عن منتج', 'إضافة منتج', 'سجل تكلفة'],
  categories: ['تصنيف منتج', 'مجموعات المنتجات'],
  warehouses: ['مخزن', 'موقع تخزين'],
  inventory: ['رصيد منتج', 'كمية متاحة', 'أرصدة المخزون'],
  containers: ['إنشاء حاوية', 'استلام حاوية', 'أصناف الشحنة', 'محتويات الحاوية'],
  purchaseInvoices: ['فاتورة شراء', 'مشتريات'],
  finance: ['الخزينة', 'الأرصدة المالية'],
  reports: ['تقرير', 'إجمالي', 'مبيعات', 'مخزون'],
};

const quickActionItems: QuickActionItem[] = [
  { label: ar.app.createInvoice, to: '/invoices/new', permissions: ['invoices.create'] },
  { label: ar.app.createOrder, to: '/orders/new', permissions: ['orders.manage'] },
  { label: ar.app.createDelivery, to: '/deliveries/new', permissions: ['deliveries.manage'] },
  { label: ar.app.createReturn, to: '/returns/new', permissions: ['returns.create'] },
  { label: ar.app.createCustomer, to: '/customers?create=1', permissions: ['customers.view', 'customers.create'], permissionMode: 'all' },
  { label: ar.app.createContainer, to: '/containers?create=1', permissions: ['containers.view', 'containers.manage'], permissionMode: 'all' },
  { label: ar.app.createExpense, to: '/finance/expenses#new-expense', permissions: ['expenses.view', 'expenses.post'], permissionMode: 'all' },
];

const navGroupLabels: Record<string, string> = {
  damaged: 'المرتجعات والتالف',
  data: 'أدوات إضافية',
};

const navStorageKey = 'master.navigation.open-groups.v1';

const contextualRouteLabels: { pattern: RegExp; label: string }[] = [
  { pattern: /^\/orders\/new$/, label: ar.orders.newOrder },
  { pattern: /^\/orders\/[^/]+$/, label: ar.orders.orderDetails },
  { pattern: /^\/deliveries\/new$/, label: ar.orders.newDelivery },
  { pattern: /^\/deliveries\/[^/]+$/, label: 'تفاصيل إذن التسليم' },
  { pattern: /^\/invoices\/new$/, label: ar.app.createInvoice },
  { pattern: /^\/invoices\/[^/]+\/edit$/, label: 'تعديل الفاتورة' },
  { pattern: /^\/invoices\/[^/]+\/print$/, label: 'طباعة الفاتورة' },
  { pattern: /^\/invoices\/[^/]+$/, label: 'تفاصيل الفاتورة' },
  { pattern: /^\/returns\/new$/, label: ar.app.createReturn },
  { pattern: /^\/returns\/[^/]+\/print$/, label: 'طباعة المرتجع' },
  { pattern: /^\/customers\/[^/]+\/statement$/, label: 'كشف حساب العميل' },
  { pattern: /^\/customers\/[^/]+\/liquidation$/, label: 'تصفية حساب العميل' },
  { pattern: /^\/customers\/[^/]+$/, label: 'تفاصيل العميل' },
  { pattern: /^\/products\/[^/]+\/cost-history$/, label: ar.inventory.productCostHistory },
  { pattern: /^\/containers\/[^/]+$/, label: 'تفاصيل الحاوية' },
  { pattern: /^\/containers\/[^/]+\/receive$/, label: ar.inventory.containerReceipt },
  { pattern: /^\/containers\/[^/]+\/landed-cost$/, label: 'معاينة التكلفة الواصلة' },
  { pattern: /^\/containers\/[^/]+\/receipts\/\d+$/, label: 'تفاصيل دفعة الاستلام' },
  { pattern: /^\/partners\/[^/]+$/, label: 'حساب شريك الشركة' },
  { pattern: /^\/purchase-invoices\/new$/, label: 'إنشاء فاتورة شراء' },
  { pattern: /^\/purchase-invoices\/[^/]+$/, label: 'تفاصيل فاتورة الشراء' },
  { pattern: /^\/finance\/treasury$/, label: ar.finance.treasuryAccounts },
  { pattern: /^\/finance\/inbox$/, label: ar.nav.financeInbox },
  { pattern: /^\/finance\/mobile-inbox$/, label: ar.nav.mobileInbox },
  { pattern: /^\/finance\/withdrawals$/, label: ar.nav.financeWithdrawals },
  { pattern: /^\/finance\/movements$/, label: ar.nav.financeMovements },
  { pattern: /^\/finance\/mobile-channels$/, label: ar.nav.mobileChannels },
  { pattern: /^\/finance\/transfers$/, label: ar.finance.transfers },
  { pattern: /^\/finance\/expenses$/, label: ar.finance.expenses },
  { pattern: /^\/finance\/currencies$/, label: ar.finance.currencies },
  { pattern: /^\/finance\/chart-of-accounts$/, label: ar.finance.chartOfAccounts },
  { pattern: /^\/finance\/journals(?:\/\d+)?$/, label: 'قيود اليومية' },
  { pattern: /^\/finance\/ledger$/, label: 'دفتر الأستاذ' },
  { pattern: /^\/finance\/trial-balance$/, label: 'ميزان المراجعة' },
  { pattern: /^\/finance\/adjustments$/, label: ar.finance.financialAdjustments },
  { pattern: /^\/reports\/sales$/, label: ar.reports.sales },
  { pattern: /^\/reports\/invoice-profit$/, label: ar.reports.invoiceProfit },
  { pattern: /^\/reports\/profit-distribution$/, label: ar.reports.profitDistribution },
  { pattern: /^\/reports\/stock-movements$/, label: ar.reports.stockMovements },
  { pattern: /^\/reports\/stock$/, label: ar.reports.stock },
  { pattern: /^\/reports\/container-costs$/, label: ar.reports.containerCosts },
  { pattern: /^\/reports\/customer-balances$/, label: ar.reports.customerBalances },
  { pattern: /^\/reports\/financial$/, label: ar.finance.financialReport },
];

function getNavigationGroupLabel(groupKey: string): string {
  return navGroupLabels[groupKey]
    ?? (groupKey in ar.navGroups ? ar.navGroups[groupKey as keyof typeof ar.navGroups] : groupKey);
}

function getRouteGroupLabel(routeTitle: string): string {
  const group = navigationGroups.find((candidate) => (candidate.routes as readonly string[]).includes(routeTitle));
  return group ? getNavigationGroupLabel(group.key) : ar.nav.dashboard;
}

function getContextualPageLabel(pathname: string, fallback: string): string {
  return contextualRouteLabels.find(({ pattern }) => pattern.test(pathname))?.label ?? fallback;
}

export function AppShell() {
  const queryClient = useQueryClient();
  const { user, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [logoutError, setLogoutError] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [dailyReminderMessage, setDailyReminderMessage] = useState('');
  const [isLight, setIsLight] = useState(() => document.documentElement.dataset.theme === 'light');
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    try {
      const stored = window.localStorage.getItem(navStorageKey);
      return stored ? (JSON.parse(stored) as Record<string, boolean>) : {};
    } catch {
      return {};
    }
  });
  const searchInput = useRef<HTMLInputElement>(null);
  const quickActions = useRef<HTMLDetailsElement>(null);
  const notificationsPanel = useRef<HTMLDivElement>(null);
  const lastActiveGroup = useRef<string | null>(null);
  const currentRoute = appRoutes
    .filter((route) => route.path === location.pathname || location.pathname.startsWith(`${route.path}/`))
    .sort((left, right) => right.path.length - left.path.length)[0];
  const currentGroup = navigationGroups.find(
    (group) => currentRoute && (group.routes as readonly string[]).includes(currentRoute.title),
  );
  const currentGroupKey = currentGroup?.key;

  const canCreateInvoice =
    !!user && (user.permissions.includes('*') || user.permissions.includes('invoices.create'));
  const visibleRoutes = user
    ? appRoutes.filter((route) => {
        const allowed =
          user.permissions.includes('*') ||
          (Array.isArray(route.permission)
            ? route.permission.some((permission) => user.permissions.includes(permission))
            : user.permissions.includes(route.permission));
        if (!allowed) return false;
        if (user.role === 'driver' && ['finance', 'reports'].includes(route.title)) return false;
        return true;
      })
    : [];
  const normalizedSearch = search.trim().toLocaleLowerCase('ar');
  const searchResults = visibleRoutes.filter(
    (route) => {
      const searchText = [ar.nav[route.title], ...(routeSearchAliases[route.title] ?? [])]
        .join(' ')
        .toLocaleLowerCase('ar');
      return !normalizedSearch || searchText.includes(normalizedSearch);
    },
  );
  const canSearchEntities = Boolean(user?.permissions.includes('*') || user?.permissions.includes('global_search.use'));
  const canViewNotifications = Boolean(user?.permissions.includes('*') || user?.permissions.includes('notifications.view'));
  const entitySearch = useQuery({ queryKey: ['/search', normalizedSearch], queryFn: () => globalSearch(normalizedSearch), enabled: searchOpen && canSearchEntities && normalizedSearch.length >= 2 });
  const notifications = useQuery({ queryKey: ['/notifications'], queryFn: listNotifications, enabled: canViewNotifications, refetchInterval: 60_000 });
  const canViewDailySummary = Boolean(user?.permissions.includes('*') || user?.permissions.includes('data.daily_summary.view'));
  const dailySummaryReminder = useQuery({ queryKey: ['/data/daily-summary', 'reminder'], queryFn: getDailySummary, enabled: canViewDailySummary, refetchInterval: 60_000 });
  const markRead = useMutation({ mutationFn: markNotificationRead, onSuccess: () => queryClient.invalidateQueries({ queryKey: ['/notifications'] }) });
  const unreadNotifications = notifications.data?.filter((item) => !item.is_read).length ?? 0;

  useEffect(() => {
    const summary = dailySummaryReminder.data?.data;
    if (!summary?.reminder_enabled || !summary.reminder_time) return;
    const currentTime = new Date().toTimeString().slice(0, 5);
    if (currentTime !== summary.reminder_time) return;
    const key = `master.daily-summary-reminder.${summary.date}.${summary.reminder_time}`;
    try {
      if (window.localStorage.getItem(key)) return;
      window.localStorage.setItem(key, 'sent');
    } catch {
      // A single in-memory reminder still works when local storage is disabled.
    }
    const message = `ملخص اليوم جاهز — صافي الربح ${summary.net_profit_egp} ج.م`;
    setDailyReminderMessage(message);
    if ('Notification' in window && Notification.permission === 'granted') new Notification(message);
    navigate('/data/daily-summary');
  }, [dailySummaryReminder.data, navigate]);

  const visibleQuickActions = quickActionItems.filter((item) => {
    const hasPermission = (permission: string) => user?.permissions.includes('*') || user?.permissions.includes(permission);
    return item.permissionMode === 'all'
      ? item.permissions.every(hasPermission)
      : item.permissions.some(hasPermission);
  });

  const updateGroupOpen = (groupKey: string, open: boolean) => {
    setOpenGroups((current) => {
      const next = { ...current, [groupKey]: open };
      try {
        window.localStorage.setItem(navStorageKey, JSON.stringify(next));
      } catch {
        // Navigation remains usable when browser storage is unavailable.
      }
      return next;
    });
  };

  useEffect(() => {
    if (!currentGroupKey || lastActiveGroup.current === currentGroupKey) return;
    lastActiveGroup.current = currentGroupKey;
    if (openGroups[currentGroupKey] === true) return;
    setOpenGroups((current) => {
      const next = { ...current, [currentGroupKey]: true };
      try {
        window.localStorage.setItem(navStorageKey, JSON.stringify(next));
      } catch {
        // Keep the active section available even when storage is disabled.
      }
      return next;
    });
  }, [currentGroupKey, openGroups]);

  useEffect(() => {
    if (searchOpen) searchInput.current?.focus();
  }, [searchOpen]);

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      const target = event.target;
      const isTyping =
        target instanceof HTMLElement &&
        (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setSearchOpen(true);
        return;
      }
      if (
        !isTyping &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.altKey &&
        event.key.toLowerCase() === 'n' &&
        canCreateInvoice
      ) {
        event.preventDefault();
        navigate('/invoices/new');
      }
      if (event.key === 'Escape') {
        setMenuOpen(false);
        if (quickActions.current) quickActions.current.open = false;
        setNotificationsOpen(false);
      }
    };
    const closePopoversOnOutsideClick = (event: PointerEvent) => {
      if (event.target instanceof Node) {
        if (quickActions.current && !quickActions.current.contains(event.target)) {
          quickActions.current.open = false;
        }
        if (notificationsPanel.current && !notificationsPanel.current.contains(event.target)) {
          setNotificationsOpen(false);
        }
      }
    };
    window.addEventListener('keydown', handleShortcut);
    window.addEventListener('pointerdown', closePopoversOnOutsideClick);
    return () => {
      window.removeEventListener('keydown', handleShortcut);
      window.removeEventListener('pointerdown', closePopoversOnOutsideClick);
    };
  }, [canCreateInvoice, navigate]);

  if (!user) return <PageState kind="loading" />;

  const dashboardRoute = visibleRoutes.find((route) => route.title === 'dashboard');
  const currentGroupLabel = currentGroup
    ? getNavigationGroupLabel(currentGroup.key)
    : undefined;
  const currentPageLabel = getContextualPageLabel(
    location.pathname,
    currentRoute ? ar.nav[currentRoute.title] : ar.common.pageNotFound,
  );

  const logout = async () => {
    setLogoutError('');
    try {
      await signOut();
      navigate('/login', { replace: true });
    } catch (error) {
      setLogoutError(error instanceof ApiError ? error.message : ar.common.networkError);
    }
  };

  return (
    <div className="app-shell" dir="rtl">
      {menuOpen && (
        <button
          className="mobile-backdrop"
          aria-label={ar.common.close}
          onClick={() => setMenuOpen(false)}
        />
      )}
      <aside className={`sidebar${menuOpen ? ' sidebar-open' : ''}`}>
        <div className="sidebar-brand">
          <span className="sidebar-brand-image" aria-hidden="true">
            <img alt="" src="/master-logo.png" />
          </span>
          <span>
            <strong>{ar.app.name}</strong>
            <small>{ar.app.subtitle}</small>
          </span>
        </div>
        <nav className="sidebar-nav" aria-label={ar.app.name}>
          {dashboardRoute && (
            <NavLink
              className={({ isActive }) => `nav-link nav-link-home${isActive ? ' nav-link-active' : ''}`}
              onClick={() => setMenuOpen(false)}
              to={dashboardRoute.path}
            >
              <Icon name={dashboardRoute.title} />
              <span>{ar.nav.dashboard}</span>
            </NavLink>
          )}
          {navigationGroups.map((group) => {
            const routes = group.routes
              .map((title) => visibleRoutes.find((route) => route.title === title))
              .filter((route) => route !== undefined);

            const permittedReadyLinks = (readyLinks[group.key] ?? []).filter((item) => {
              const has = (permission: string) => user.permissions.includes('*') || user.permissions.includes(permission);
              return item.permissionMode === 'all'
                ? item.permissions.every(has)
                : item.permissions.some(has);
            });
            if (!routes.length && !permittedReadyLinks.length) return null;
            if (user.role === 'driver' && ['finance', 'containerPartners', 'reports'].includes(group.key)) return null;
            const groupLabel = getNavigationGroupLabel(group.key);
            return (
              <details
                className="nav-group"
                key={group.key}
                open={openGroups[group.key] ?? group.key === currentGroup?.key}
                onToggle={(event) => updateGroupOpen(group.key, event.currentTarget.open)}
              >
                <summary>
                  <span>{groupLabel}</span>
                  <span aria-hidden="true" className="nav-group-chevron">⌄</span>
                </summary>
                {routes.map((route) => (
                  <NavLink
                    className={({ isActive }) => `nav-link${isActive ? ' nav-link-active' : ''}`}
                    key={route.path}
                    onClick={() => setMenuOpen(false)}
                    to={route.path}
                  >
                    <Icon name={route.title} />
                    <span>{ar.nav[route.title]}</span>
                  </NavLink>
                ))}
                {permittedReadyLinks.map((item) => (
                  <NavLink className="nav-link nav-link-ready" key={item.label + ':' + item.to} onClick={() => setMenuOpen(false)} to={item.to}>
                    <span aria-hidden="true">↗</span><span>{item.label}</span>
                  </NavLink>
                ))}
              </details>
            );
          })}
        </nav>
        <div className="sidebar-user">
          <span className="avatar" aria-hidden="true">
            {user.name.slice(0, 1)}
          </span>
          <span className="sidebar-user-details">
            <strong>{user.name}</strong>
            <small>{displayRoles(user.roles?.length ? user.roles : [user.role])}</small>
          </span>
          <button className="icon-button" type="button" aria-label={ar.app.logout} onClick={logout}>
            <Icon name="logout" />
          </button>
        </div>
      </aside>
      <div className="main-column">
        <header className="topbar">
          <nav className="breadcrumbs" aria-label={ar.app.breadcrumbs}>
            {currentRoute?.title === 'dashboard' ? (
              <strong aria-current="page">{ar.nav.dashboard}</strong>
            ) : (
              <>
                <NavLink to="/dashboard">{ar.nav.dashboard}</NavLink>
                {currentGroupLabel && (
                  <>
                    <span aria-hidden="true">/</span>
                    <NavLink to={currentRoute?.path ?? '/dashboard'}>{currentGroupLabel}</NavLink>
                  </>
                )}
                {currentGroupLabel !== currentPageLabel && (
                  <>
                    <span aria-hidden="true">/</span>
                    <strong aria-current="page">{currentPageLabel}</strong>
                  </>
                )}
              </>
            )}
          </nav>
          <button
            aria-label={ar.app.globalSearch}
            aria-keyshortcuts="Control+K Meta+K"
            className="button button-quiet global-search-trigger"
            onClick={() => setSearchOpen(true)}
            type="button"
          >
            <Icon name="search" />
            <span>{ar.app.globalSearch}</span>
            <kbd>تحكم + K</kbd>
          </button>
          <button
            className="mobile-menu-toggle"
            type="button"
            aria-label={menuOpen ? ar.app.closeMenu : ar.app.openMenu}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((value) => !value)}
          >
            <Icon name="menu" />
          </button>
          {visibleQuickActions.length > 0 && (
            <details className="quick-actions quick-actions-desktop" ref={quickActions}>
              <summary className="button button-primary">
                <span aria-hidden="true">＋</span>
                <span>{ar.app.quickActions}</span>
              </summary>
              <nav aria-label={ar.app.quickActions} className="quick-actions-menu">
                {visibleQuickActions.map((item) => (
                  <NavLink
                    key={`${item.to}:${item.label}`}
                    onClick={() => quickActions.current?.removeAttribute('open')}
                    to={item.to}
                  >
                    {item.label}
                  </NavLink>
                ))}
              </nav>
            </details>
          )}
          <label className="theme-control">
            <span className="visually-hidden">{ar.app.themeLabel}</span>
            <input
              aria-label={isLight ? ar.app.themeLight : ar.app.themeDark}
              checked={isLight}
              type="checkbox"
              onChange={(event) => {
                const nextIsLight = event.currentTarget.checked;
                setIsLight(nextIsLight);
                document.documentElement.dataset.theme = nextIsLight ? 'light' : 'dark';
              }}
            />
            <span aria-hidden="true">◐</span>
          </label>
          <div className="topbar-actions">
            <div className="notifications" ref={notificationsPanel}>
              <button
                aria-expanded={notificationsOpen}
                aria-label={`${ar.app.notifications}${unreadNotifications ? ` (${unreadNotifications})` : ''}`}
                className="icon-button notification-trigger"
                onClick={() => setNotificationsOpen((open) => !open)}
                type="button"
              >
                <Icon name="bell" />
              </button>
              {notificationsOpen && (
                <section
                  aria-label={ar.app.notifications}
                  className="notification-panel"
                  role="region"
                >
                  <header className="notification-panel-header">
                    <strong>{ar.app.notifications}{unreadNotifications ? ` (${unreadNotifications})` : ''}</strong>
                  </header>
                  {notifications.isLoading ? <p className="notification-empty">جارٍ تحميل الإشعارات…</p> : notifications.isError ? <p className="notification-empty">تعذر تحميل الإشعارات.</p> : notifications.data?.length ? notifications.data.map((item) => (
                    <button className={`notification-item${item.is_read ? '' : ' notification-item-unread'}`} key={item.id} onClick={() => { if (!item.is_read) void markRead.mutateAsync(item.id); setNotificationsOpen(false); if (item.target_path) navigate(item.target_path); }} type="button">
                      <strong>{item.title}</strong><span>{item.message}</span><small>{new Date(item.created_at).toLocaleString('ar-EG')}</small>
                    </button>
                  )) : <p className="notification-empty">{ar.app.noNotifications}</p>}
                </section>
              )}
            </div>
            <button className="button button-quiet" type="button" onClick={logout}>
              {ar.app.logout}
            </button>
          </div>
        </header>
        <nav className="shell-shortcuts" aria-label={ar.app.navigationShortcuts}>
          {shortcutRoutes.map((title) => {
            const route = visibleRoutes.find((candidate) => candidate.title === title);
            if (!route) return null;
            return (
              <NavLink className="shell-shortcut" key={route.path} to={route.path}>
                {ar.nav[route.title]}
              </NavLink>
            );
          })}
        </nav>
        {logoutError && (
          <div role="alert" className="inline-alert">
            {logoutError}
          </div>
        )}
        {dailyReminderMessage && <div className="inline-success" role="status"><NavLink to="/data/daily-summary" onClick={() => setDailyReminderMessage('')}>{dailyReminderMessage}</NavLink></div>}
        <main className="main-content" tabIndex={0}>
          <Outlet />
        </main>
      </div>
      <Modal
        onClose={() => {
          setSearchOpen(false);
          setSearch('');
        }}
        open={searchOpen}
        title={ar.app.globalSearch}
      >
        <label className="form-field">
          <span>{ar.app.searchRoutes}</span>
          <input
            className="input"
            onChange={(event) => setSearch(event.currentTarget.value)}
            placeholder={ar.common.search}
            ref={searchInput}
            type="search"
            value={search}
          />
        </label>
        <p className="global-search-hint">{ar.app.searchShortcutHint}</p>
        <div className="global-search-results">
          {entitySearch.isLoading && normalizedSearch.length >= 2 && <p className="global-search-hint">جارٍ البحث في السجلات…</p>}
          {entitySearch.isError && normalizedSearch.length >= 2 && <p className="global-search-empty">تعذر البحث في السجلات.</p>}
          {entitySearch.data?.map((item) => (
            <NavLink className="global-search-result" key={item.id} to={item.target} onClick={() => { setSearchOpen(false); setSearch(''); }}>
              <span>{item.title}</span><small>{item.subtitle || item.type}</small>
            </NavLink>
          ))}
          {searchResults.length ? (
            searchResults.map((route) => (
              <NavLink
                className="global-search-result"
                key={route.path}
                aria-label={ar.nav[route.title]}
                onClick={() => {
                  setSearchOpen(false);
                  setSearch('');
                }}
                to={route.path}
              >
                <span>{ar.nav[route.title]}</span>
                <small>{getRouteGroupLabel(route.title)}</small>
              </NavLink>
            ))
          ) : entitySearch.data?.length ? null : (
            <p className="global-search-empty">{ar.app.searchNoResults}</p>
          )}
        </div>
      </Modal>
    </div>
  );
}
