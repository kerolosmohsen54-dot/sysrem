import { ar } from '../../shared/i18n/ar';
import { StatementsPanel } from '../finance/AccountingPages';

export function FinancialReportPage() {
  return (
    <section className="page inventory-page financial-report-page">
      <header className="page-heading">
        <div>
          <h1>{ar.finance.financialReport}</h1>
          <p>القوائم المالية مشتقة من القيود المحاسبية المرحلة للفترة المختارة.</p>
        </div>
      </header>
      <StatementsPanel />
    </section>
  );
}
