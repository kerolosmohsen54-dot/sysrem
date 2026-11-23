import { ar } from '../../shared/i18n/ar';

export function CurrenciesPage() {
  return (
    <section className="page inventory-page">
      <header className="page-heading">
        <div>
          <h1>{ar.finance.currencies}</h1>
          <p>{ar.finance.egpOnly}</p>
        </div>
      </header>
      <article className="stat-card">
        <strong dir="ltr">EGP</strong>
        <span>{ar.finance.egpOnlyNote}</span>
      </article>
    </section>
  );
}
