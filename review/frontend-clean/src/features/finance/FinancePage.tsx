import { Link } from 'react-router-dom';
import { useAuth } from '../../shared/auth/AuthProvider';
import { PageState } from '../../shared/components/PageState';
import { ar } from '../../shared/i18n/ar';

export function FinancePage() {
  const { user } = useAuth();
  if (!user) return <PageState kind="loading" />;
  const canSee = (permission: string) =>
    user.permissions.includes('*') || user.permissions.includes(permission);
  const links: { to: string; label: string }[] = [];
  if (canSee('treasury.view')) {
    links.push(
      { to: '/finance/treasury', label: ar.finance.treasuryAccounts },
      { to: '/finance/transfers', label: ar.finance.transfers },
      { to: '/finance/currencies', label: ar.finance.currencies },
      { to: '/finance/chart-of-accounts', label: ar.finance.chartOfAccounts },
      { to: '/finance/adjustments', label: ar.finance.financialAdjustments },
    );
  }
  if (canSee('expenses.view')) {
    links.push({ to: '/finance/expenses', label: ar.finance.expenses });
  }

  return (
    <section className="page inventory-page finance-overview-page">
      <header className="page-heading">
        <div>
          <h1>{ar.nav.finance}</h1>
          <p>{ar.finance.financeDescription}</p>
        </div>
      </header>
      <nav aria-label={ar.nav.finance} className="finance-tabs">
        {links.map((item, index) => (
          <Link className={`finance-tab${index === 0 ? ' finance-tab-active' : ''}`} key={item.to} to={item.to}>
            {item.label}
          </Link>
        ))}
      </nav>
      {links.length ? (
        <nav aria-label={ar.nav.finance} className="dashboard-grid finance-link-grid">
          {links.map((item) => (
            <Link className="stat-card" key={item.to} to={item.to}>
              <strong>{item.label}</strong>
            </Link>
          ))}
          {[
            ['الشركاء', 'واجهة مؤجلة لحين توفر عقد الشركاء.'],
            ['دفعات الشركاء', 'واجهة مؤجلة لحين توفر عقد خطط الدفع.'],
            ['فواتير الشراء', 'واجهة مؤجلة لحين توفر عقد الموردين والاستلام.'],
            ['ميزانية المصروفات', 'الميزانية الشهرية لكل بند — قيد الربط.'],
            ['مصروفات متكررة', 'تعريف المصروفات الشهرية ومتابعتها — قيد الربط.'],
            ['مقارنة الشهور', 'مقارنة الإيرادات والمصروفات بين الفترات — قيد الربط.'],
            ['توقع السيولة', 'عرض الداخل والخارج في الأسابيع القادمة — قيد الربط.'],
          ].map(([label, description]) => (
            <article className="stat-card stat-card-disabled" key={label} aria-disabled="true">
              <strong>{label}</strong>
              <small>{description}</small>
              <span className="ui-status-chip">قيد الربط</span>
            </article>
          ))}
        </nav>
      ) : (
        <PageState kind="denied" />
      )}
    </section>
  );
}
