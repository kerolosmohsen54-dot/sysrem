import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useAuth } from '../../shared/auth/AuthProvider';
import { PageState } from '../../shared/components/PageState';
import { ar } from '../../shared/i18n/ar';
import { formatDate, formatMoney } from '../../shared/utils/format';
import { getDashboardSummary } from '../reports/api';

type FinanceLink = {
  to: string;
  label: string;
  description: string;
  permission: string | string[];
};

type FinanceSection = {
  title: string;
  links: FinanceLink[];
};

const sections: FinanceSection[] = [
  {
    title: 'الصندوق والحسابات',
    links: [
      { to: '/finance/inbox', label: 'الصندوق الوارد', description: 'تسجيل ومراجعة المبالغ الواردة.', permission: 'treasury.view' },
      { to: '/finance/withdrawals', label: 'السحب', description: 'تسجيل المبالغ الخارجة من الحسابات.', permission: 'treasury.view' },
      { to: '/finance/movements', label: 'كل الحركات', description: 'مراجعة الوارد والصادر المسجل.', permission: 'treasury.view' },
      { to: '/finance/treasury', label: 'حسابات الخزينة', description: 'الأرصدة النقدية والبنكية.', permission: 'treasury.view' },
      { to: '/finance/transfers', label: 'تحويل بين حسابين', description: 'نقل مبلغ مسجل من حساب إلى آخر.', permission: 'treasury.view' },
      { to: '/finance/mobile-inbox', label: 'رسائل تطبيق الهاتف', description: 'مراجعة الرسائل المستوردة من تطبيق الهاتف.', permission: 'mobile.messages.view' },
      { to: '/finance/mobile-channels', label: 'قنوات الدفع عبر الهاتف', description: 'إدارة قنوات استقبال الرسائل المالية.', permission: 'mobile.channels.view' },
    ],
  },
  {
    title: 'المصروفات والعملات',
    links: [
      { to: '/finance/expenses', label: ar.finance.expenses, description: 'تسجيل المصروفات ومراجعة ما سجله النظام.', permission: 'expenses.view' },
      { to: '/finance/currencies', label: ar.finance.currencies, description: 'إدارة بيانات العملات المرجعية.', permission: 'currencies.view' },
    ],
  },
  {
    title: 'الشركاء والمشتريات',
    links: [
      { to: '/partners', label: ar.nav.partners, description: 'اسم الشريك ورقم واتساب، وأرباح هامش الفواتير التي أصدرها.', permission: 'partners.view' },
      { to: '/purchase-invoices', label: ar.nav.purchaseInvoices, description: 'فواتير الموردين المسجلة والمشتريات.', permission: 'purchases.view' },
    ],
  },
  {
    title: 'أموال الحاويات والمرتجعات',
    links: [
      { to: '/containers', label: 'الحاويات والتكاليف', description: 'تفاصيل الحاويات والتكاليف المسجلة عليها.', permission: 'containers.view' },
      { to: '/warehouse-returns', label: 'مرتجعات المخازن', description: 'متابعة المرتجعات المسجلة للمخازن.', permission: 'warehouse_returns.view' },
      { to: '/reports/container-costs', label: 'تقرير تكلفة الحاويات', description: 'مراجعة التكلفة المسجلة والمدفوعة والمتبقية.', permission: 'reports.container_costs.view' },
    ],
  },
  {
    title: 'التقارير المالية',
    links: [
      { to: '/reports/financial', label: ar.finance.financialReport, description: 'القوائم المالية من القيود المرحلة للفترة المحددة.', permission: 'accounting.reports.view' },
      { to: '/reports/customer-balances', label: 'أرصدة العملاء', description: 'مراجعة أرصدة العملاء المسجلة.', permission: 'reports.customer_balances.view' },
      { to: '/collections', label: 'تحصيلات العملاء', description: 'مراجعة عمليات التحصيل المسجلة.', permission: 'collections.view' },
      { to: '/returns', label: 'مرتجعات العملاء', description: 'مراجعة المرتجعات المسجلة على فواتير البيع.', permission: 'returns.view' },
    ],
  },
  {
    title: 'التهيئة المحاسبية',
    links: [
      { to: '/finance/chart-of-accounts', label: ar.finance.chartOfAccounts, description: 'إدارة شجرة الحسابات والأرصدة المرحلة.', permission: 'chart_of_accounts.view' },
      { to: '/finance/adjustments', label: ar.finance.financialAdjustments, description: 'تسويات مرتبطة بقيود مرحّلة وسجل تدقيق.', permission: 'financial_adjustments.view' },
    ],
  },
  {
    title: 'التخطيط المالي والسيولة',
    links: [
      { to: '/finance/pending-funds', label: 'الأموال المنتظرة', description: 'توقعات التحصيل ومصادرها ومواعيدها، منفصلة عن النقد الفعلي.', permission: 'pending_funds.view' },
      { to: '/finance/expense-budgets', label: 'ميزانية المصروفات', description: 'مقارنة الميزانية الشهرية لكل تصنيف بما تم ترحيله فعلياً.', permission: 'expense_budgets.view' },
      { to: '/finance/recurring-expenses', label: 'المصروفات المتكررة', description: 'قوالب دورية واستحقاق واحد لكل دورة.', permission: 'recurring_expenses.view' },
      { to: '/finance/monthly-comparison', label: 'مقارنة شهر بشهر', description: 'مقارنة المبيعات والمصروفات والربح بين فترتين.', permission: 'finance_reports.view' },
      { to: '/finance/cash-forecast', label: 'توقع السيولة', description: 'التدفقات الفعلية والمستحقة والرصيد المتوقع لكل أسبوع.', permission: 'finance_reports.view' },
    ],
  },
];

export function FinancePage() {
  const { user } = useAuth();
  const canSee = (permission: string) =>
    user?.permissions.includes('*') || user?.permissions.includes(permission) || false;
  const canViewSummary = canSee('reports.dashboard.view');
  const summary = useQuery({
    queryKey: ['/reports/dashboard', 'finance-overview'],
    queryFn: () => getDashboardSummary(),
    enabled: canViewSummary,
    retry: false,
  });

  if (!user) return <PageState kind="loading" />;

  const accountingSection: FinanceSection = {
    title: 'المحاسبة',
    links: [
      { to: '/finance/journals', label: 'قيود اليومية', description: 'إنشاء القيود المتوازنة وترحيلها وعكسها.', permission: 'journal_entries.view' },
      { to: '/finance/ledger', label: 'دفتر الأستاذ', description: 'حركة حساب ورصيده في الفترة المحددة.', permission: 'accounting.reports.view' },
      { to: '/finance/trial-balance', label: 'ميزان المراجعة', description: 'أرصدة الحسابات والتحقق من توازنها.', permission: 'accounting.reports.view' },
      { to: '/finance/auto-posting-mappings', label: 'ربط الحسابات التلقائي', description: 'إدارة الحسابات التي تستقبل قيود المستندات المرحلة.', permission: 'chart_of_accounts.view' },
    ],
  };
  const financeHierarchy: FinanceSection = {
    title: 'ترتيب دورة الحسابات',
    links: [
      { to: '/reports/customer-balances', label: 'حسابات العملاء', description: 'أرصدة العملاء وحركات التحصيل المستحقة.', permission: 'reports.customer_balances.view' },
      { to: '/finance/treasury', label: 'الصناديق والخزائن', description: 'أرصدة النقد والبنوك وحركاتها.', permission: 'treasury.view' },
      { to: '/finance/expenses', label: ar.finance.expenses, description: 'تسجيل المصروفات ومراجعة مرحلها.', permission: 'expenses.view' },
      { to: '/finance/transfers', label: 'التحويلات بين الحسابات', description: 'نقل مسجل بين حسابات الخزينة.', permission: 'treasury.view' },
      { to: '/finance/adjustments', label: ar.finance.financialAdjustments, description: 'التسويات المالية مع أثرها المحاسبي.', permission: 'financial_adjustments.view' },
      { to: '/finance/currencies', label: ar.finance.currencies, description: 'قائمة العملات المرجعية.', permission: 'currencies.view' },
      { to: '/finance/chart-of-accounts', label: ar.finance.chartOfAccounts, description: 'دليل الحسابات والأرصدة المرحلة.', permission: 'chart_of_accounts.view' },
    ],
  };
  const referencePaths = new Set(financeHierarchy.links.map((link) => link.to));
  const visibleSections = [financeHierarchy, ...sections, accountingSection]
    .map((section) => ({ ...section, links: section.links.filter((item) => item.to !== '/finance/partner-installments' && (Array.isArray(item.permission) ? item.permission.some(canSee) : canSee(item.permission))) }))
    .map((section, index) => index === 0 ? section : { ...section, links: section.links.filter((item) => !referencePaths.has(item.to)) })
    .filter((section) => section.links.length > 0);
  const quickActions = [
    ...(canSee('expenses.post') && canSee('expenses.view')
      ? [{ to: '/finance/expenses#new-expense', label: 'تسجيل مصروف' }]
      : []),
    ...(canSee('purchases.manage')
      ? [{ to: '/purchase-invoices/new', label: 'إنشاء فاتورة شراء' }]
      : []),
    ...(canSee('treasury.post')
      ? [{ to: '/finance/treasury', label: 'تسجيل حركة خزينة' }]
      : []),
  ];
  const data = summary.data?.data;
  const accountBalances = data?.treasury_balances ?? [];
  const metrics = [
    ...(data?.today_sales_egp !== undefined
      ? [{ label: 'مبيعات اليوم', value: formatMoney(data.today_sales_egp) }]
      : []),
    ...(data?.receivables_egp !== undefined
      ? [{ label: 'مستحقات العملاء', value: formatMoney(data.receivables_egp) }]
      : []),
  ];

  return (
    <section className="page inventory-page finance-overview-page">
      <header className="finance-overview-heading">
        <div>
          <span className="finance-eyebrow">إدارة الأموال والحسابات</span>
          <h1>{ar.nav.finance}</h1>
          <p>كل أقسام المالية في مكان واحد. الأرقام المعروضة هنا مصدرها النظام، والعملة هي الجنيه المصري.</p>
        </div>
        {summary.data?.meta.as_of && (
          <span className="finance-updated-at">آخر تحديث: {formatDate(summary.data.meta.as_of.slice(0, 10))}</span>
        )}
      </header>

      {quickActions.length > 0 && (
        <nav aria-label="إجراءات مالية سريعة" className="finance-quick-actions">
          {quickActions.map((action) => (
            <Link className="button button-primary" key={action.to} to={action.to}>{action.label}</Link>
          ))}
        </nav>
      )}

      {canViewSummary && summary.isLoading && (
        <section className="finance-data-notice" aria-live="polite" role="status">
          جاري تحميل المؤشرات المالية...
        </section>
      )}
      {canViewSummary && summary.isError && (
        <section className="finance-data-notice" role="status">
          <p>تعذر تحميل المؤشرات المالية الآن. تظل روابط الأقسام متاحة.</p>
          <button className="button button-secondary" onClick={() => void summary.refetch()} type="button">إعادة المحاولة</button>
        </section>
      )}
      {metrics.length > 0 && (
        <section aria-label="ملخص مالي من الخادم" className="finance-metric-grid">
          {metrics.map((metric) => (
            <article className="finance-metric-card" key={metric.label}>
              <span>{metric.label}</span>
              <strong>{metric.value}</strong>
            </article>
          ))}
        </section>
      )}

      {accountBalances.length > 0 && (
        <section aria-labelledby="finance-account-balances" className="finance-balances-panel">
          <header>
            <div>
              <h2 id="finance-account-balances">أرصدة الحسابات</h2>
              <p>الرصيد المسجل لكل حساب كما أعاده الخادم.</p>
            </div>
            {canSee('treasury.view') && <Link to="/finance/treasury">عرض حسابات الخزينة</Link>}
          </header>
          <div className="finance-balance-grid">
            {accountBalances.map((account) => (
              <article className="finance-balance-card" key={account.account_id}>
                <span>{account.name}</span>
                <small>{account.code}</small>
                <strong>{formatMoney(account.balance_egp)}</strong>
              </article>
            ))}
          </div>
        </section>
      )}

      <div className="finance-sections">
        {visibleSections.map((section) => (
          <section aria-label={section.title} className="finance-section" key={section.title}>
            <header><h2>{section.title}</h2></header>
            <div className="finance-link-grid">
              {section.links.map((item) => (
                <Link className="finance-link-card" key={item.to} to={item.to}>
                  <strong>{item.label}</strong>
                  <small>{item.description}</small>
                  <span aria-hidden="true">←</span>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>

    </section>
  );
}
