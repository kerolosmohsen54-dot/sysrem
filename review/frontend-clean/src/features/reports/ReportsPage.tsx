import { Link } from 'react-router-dom';
import { useAuth } from '../../shared/auth/AuthProvider';
import { PageState } from '../../shared/components/PageState';
import { ar } from '../../shared/i18n/ar';

export function ReportsPage() {
  const { user } = useAuth();
  if (!user) return <PageState kind="loading" />;
  const has = (permission: string) =>
    user.permissions.includes('*') || user.permissions.includes(permission);
  const reports: { to: string; label: string; category: string; description: string }[] = [];
  if (has('invoices.view')) {
    reports.push({ to: '/reports/sales', label: ar.reports.sales, category: 'المبيعات', description: 'إيرادات وفواتير وأداء البيع' });
  }
  if (has('profit.view') && has('markup.view')) {
    reports.push({ to: '/reports/invoice-profit', label: ar.reports.invoiceProfit, category: 'الأرباح', description: 'تحليل الربحية وهوامش الفواتير' });
  }
  if (has('inventory.view')) {
    reports.push(
      { to: '/reports/stock', label: ar.reports.stock, category: 'المخزون', description: 'الأرصدة والقيمة الحالية للمخزون' },
      { to: '/reports/stock-movements', label: ar.reports.stockMovements, category: 'المخزون', description: 'حركة الأصناف خلال الفترة' },
    );
  }
  if (has('reports.container_costs.view')) {
    reports.push({ to: '/reports/container-costs', label: ar.reports.containerCosts, category: 'الحاويات', description: 'تكلفة الحاويات والتكاليف الإضافية' });
  }
  if (has('reports.customer_balances.view')) {
    reports.push({ to: '/reports/customer-balances', label: ar.reports.customerBalances, category: 'العملاء والموردون', description: 'الأرصدة وكشوف الحسابات' });
  }
  if (has('reports.dashboard.view')) {
    reports.push({ to: '/reports/financial', label: ar.finance.financialReport, category: 'المالية', description: 'التقارير المالية والملخصات' });
  }

  return (
    <section className="page inventory-page">
      <header className="page-heading">
        <div>
          <h1>{ar.nav.reports}</h1>
          <p>{ar.reports.reportsDescription} · {reports.length} تقرير متاح حسب صلاحياتك</p>
        </div>
      </header>
      {reports.length ? (
        <nav aria-label={ar.nav.reports} className="dashboard-grid">
          {reports.map((report) => (
            <Link className="stat-card report-card" key={report.to} to={report.to}>
              <span className="report-card-category">{report.category}</span>
              <strong>{report.label}</strong>
              <small>{report.description}</small>
            </Link>
          ))}
        </nav>
      ) : (
        <PageState kind="denied" />
      )}
    </section>
  );
}
