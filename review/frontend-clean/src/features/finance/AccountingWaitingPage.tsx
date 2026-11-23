import { PageState } from '../../shared/components/PageState';
import { ar } from '../../shared/i18n/ar';

export function AccountingWaitingPage({ title }: { title: string }) {
  return (
    <section className="page inventory-page">
      <header className="page-heading">
        <div>
          <h1>{title}</h1>
          <p>{ar.finance.accountingWaiting}</p>
        </div>
      </header>
      <PageState kind="empty" title={ar.finance.accountingWaiting} />
    </section>
  );
}
