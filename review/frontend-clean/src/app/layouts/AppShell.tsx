import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { appRoutes } from '../../shared/constants/routes';
import { ar } from '../../shared/i18n/ar';
import { useAuth } from '../../shared/auth/AuthProvider';
import { ApiError } from '../../shared/api/errors';
import { Icon } from '../../shared/components/Icon';
import { Modal } from '../../shared/components/Modal';
import { PageState } from '../../shared/components/PageState';

const navigationGroups = [
  { key: 'sales', routes: ['invoices', 'returns', 'collections'], locked: ['إنشاء فاتورة', 'إنشاء مرتجع'] },
  { key: 'customers', routes: ['customers'], locked: ['إضافة عميل', 'حساب العميل', 'المحافظات', 'تصفية العميل'] },
  {
    key: 'inventory',
    routes: [
      'products',
      'warehouses',
      'inventory',
      'inventoryMovements',
      'inventoryAdjustments',
      'categories',
      'openingStock',
      'inventoryTransfers',
      'damagedStock',
    ],
    locked: ['إضافة إلى المخزون', 'المخزون المرتجع'],
  },
  { key: 'finance', routes: ['finance'], locked: ['الصندوق الوارد', 'السحب', 'المصروفات', 'الحركات', 'الشركاء', 'دفعات الشركاء', 'فواتير الشراء'] },
  { key: 'damaged', routes: ['damagedStock'] },
  { key: 'containers', routes: ['containers'], locked: ['استلام حاوية', 'Landed Cost', 'نقل الحاويات بين المواقع', 'أموال الحاويات'] },
  { key: 'reports', routes: ['reports'], locked: ['تقارير المبيعات', 'تقارير الأرباح', 'تقارير المخزون', 'التقارير المالية'] },
  { key: 'admin', routes: ['users', 'audit', 'settings'], locked: ['سائق شركة الشحن', 'سلة المحذوفات'] },
  { key: 'dashboard', routes: ['dashboard'] },
  { key: 'accounts', routes: [], locked: ['الإعدادات', 'التعديلات المالية', 'العملات', 'دليل الحسابات'] },
  { key: 'advancedFinance', routes: [], locked: ['ميزانية المصروفات', 'مصروفات متكررة', 'مقارنة شهر بشهر', 'توقع السيولة'] },
  { key: 'advancedInventory', routes: [], locked: ['تتبع الحاويات', 'الحد الأدنى للمخزون', 'الجرد الدوري', 'سجل أسعار الشراء'] },
  { key: 'data', routes: [], locked: ['استيراد من Excel', 'الملخص اليومي', 'تثبيت كتطبيق'] },
] as const;
const shortcutRoutes = ['audit', 'dashboard'] as const;

export function AppShell() {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [logoutError, setLogoutError] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [mockFeature, setMockFeature] = useState<string | null>(null);
  const [isLight, setIsLight] = useState(() => document.documentElement.dataset.theme === 'light');
  const searchInput = useRef<HTMLInputElement>(null);
  const quickActions = useRef<HTMLDetailsElement>(null);
  const notificationsPanel = useRef<HTMLDivElement>(null);
  const currentRoute = appRoutes.find(
    (route) => route.path === location.pathname || location.pathname.startsWith(`${route.path}/`),
  );

  const canCreateInvoice =
    !!user && (user.permissions.includes('*') || user.permissions.includes('invoices.create'));
  const canCreateOrder =
    !!user && (user.permissions.includes('*') || user.permissions.includes('orders.manage'));
  const canCreateCustomer =
    !!user &&
    (user.permissions.includes('*') ||
      (user.permissions.includes('customers.view') &&
        user.permissions.includes('customers.create')));
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
    (route) =>
      !normalizedSearch || ar.nav[route.title].toLocaleLowerCase('ar').includes(normalizedSearch),
  );

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
      <button
        className="mobile-menu-toggle"
        type="button"
        aria-label={menuOpen ? ar.app.closeMenu : ar.app.openMenu}
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen((value) => !value)}
      >
        <Icon name="menu" />
      </button>
      {menuOpen && (
        <button
          className="mobile-backdrop"
          aria-label={ar.common.close}
          onClick={() => setMenuOpen(false)}
        />
      )}
      <aside className={`sidebar${menuOpen ? ' sidebar-open' : ''}`}>
        <div className="sidebar-brand">
          <span className="brand-mark" aria-hidden="true">
            PS
          </span>
          <span>
            <strong>{ar.app.name}</strong>
            <small>{ar.app.subtitle}</small>
          </span>
        </div>
        <nav className="sidebar-nav" aria-label={ar.app.name}>
          {navigationGroups.map((group) => {
            const routes = group.routes
              .map((title) => visibleRoutes.find((route) => route.title === title))
              .filter((route) => route !== undefined);
            const locked = 'locked' in group ? group.locked : [];
            if (!routes.length && !locked.length) return null;
            if (user.role === 'driver' && ['finance', 'reports', 'advancedFinance'].includes(group.key)) return null;
            const groupLabel = group.key in ar.navGroups
              ? ar.navGroups[group.key as keyof typeof ar.navGroups]
              : ({
                  damaged: 'مرتجع المخازن',
                  advancedFinance: 'مالية متقدمة',
                  advancedInventory: 'مخزون وحاويات متقدم',
                  accounts: 'الإعدادات والحسابات',
                  data: 'البيانات',
                } as Record<string, string>)[group.key] ?? group.key;
            return (
              <details className="nav-group" key={group.key} open>
                <summary>{groupLabel}</summary>
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
                {locked.map((label) => (
                  <button
                    className="nav-link nav-link-locked"
                    key={label}
                    onClick={() => setMockFeature(label)}
                    type="button"
                    aria-label={`${label} — قيد الربط`}
                  >
                    <span aria-hidden="true">○</span>
                    <span>{label}</span>
                    <small>قيد الربط</small>
                  </button>
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
            <small>{user.role}</small>
          </span>
          <button className="icon-button" type="button" aria-label={ar.app.logout} onClick={logout}>
            <Icon name="logout" />
          </button>
        </div>
      </aside>
      <div className="main-column">
        <header className="topbar">
          <div className="breadcrumbs">
            <span>{ar.app.name}</span>
            <span aria-hidden="true">/</span>
            <strong>{currentRoute ? ar.nav[currentRoute.title] : ar.common.pageNotFound}</strong>
          </div>
          <button
            aria-label={ar.app.globalSearch}
            aria-keyshortcuts="Control+K Meta+K"
            className="button button-quiet global-search-trigger"
            onClick={() => setSearchOpen(true)}
            type="button"
          >
            <Icon name="search" />
            <span>{ar.app.globalSearch}</span>
            <kbd>Ctrl K</kbd>
          </button>
          {(canCreateInvoice || canCreateOrder || canCreateCustomer) && (
            <details className="quick-actions" ref={quickActions}>
              <summary className="button button-secondary">{ar.app.quickActions}</summary>
              <nav aria-label={ar.app.quickActions} className="quick-actions-menu">
                {canCreateInvoice && (
                  <NavLink
                    onClick={() => quickActions.current?.removeAttribute('open')}
                    to="/invoices/new"
                  >
                    {ar.app.createInvoice}
                  </NavLink>
                )}
                {canCreateOrder && (
                  <NavLink
                    onClick={() => quickActions.current?.removeAttribute('open')}
                    to="/orders/new"
                  >
                    {ar.app.createOrder}
                  </NavLink>
                )}
                {canCreateCustomer && (
                  <NavLink
                    onClick={() => quickActions.current?.removeAttribute('open')}
                    to="/customers"
                  >
                    {ar.app.createCustomer}
                  </NavLink>
                )}
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
                aria-label={ar.app.notifications}
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
                    <strong>{ar.app.notifications}</strong>
                  </header>
                  <p className="notification-empty">{ar.app.noNotifications}</p>
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
        <Modal
          open={mockFeature !== null}
          title={mockFeature ?? ''}
          onClose={() => setMockFeature(null)}
        >
          <div className="mock-feature-shell" data-ui="local-mock">
            <div className="mock-feature-banner">
              <strong>واجهة تجريبية محلية</strong>
              <span>الخدمة دي قيد التجهيز — البيانات المعروضة Mock ولا يوجد اتصال بالخادم.</span>
            </div>
            <div className="summary-grid">
              <article className="summary-card"><span>الحالة</span><strong>جاهز للعرض</strong></article>
              <article className="summary-card"><span>مصدر البيانات</span><strong>Mock محلي</strong></article>
              <article className="summary-card"><span>السجلات</span><strong>0</strong></article>
            </div>
            <div className="table-wrap table-wrap-empty">
              <table>
                <thead><tr><th>البند</th><th>الحالة</th><th>ملاحظات</th></tr></thead>
                <tbody><tr><td colSpan={3}>لا توجد بيانات محلية لهذا البند حالياً</td></tr></tbody>
              </table>
            </div>
          </div>
        </Modal>
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
          {searchResults.length ? (
            searchResults.map((route) => (
              <NavLink
                className="global-search-result"
                key={route.path}
                onClick={() => {
                  setSearchOpen(false);
                  setSearch('');
                }}
                to={route.path}
              >
                {ar.nav[route.title]}
              </NavLink>
            ))
          ) : (
            <p className="global-search-empty">{ar.app.searchNoResults}</p>
          )}
        </div>
      </Modal>
    </div>
  );
}
