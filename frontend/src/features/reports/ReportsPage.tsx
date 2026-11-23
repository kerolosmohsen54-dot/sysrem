import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../shared/auth/AuthProvider';
import { PageState } from '../../shared/components/PageState';
import { ar } from '../../shared/i18n/ar';
import { canViewReport, reportCatalog, reportCount, type ReportCategoryId } from './catalog';

export function ReportsPage() {
  const { user } = useAuth();
  const [selectedId, setSelectedId] = useState<ReportCategoryId | null>(null);
  if (!user) return <PageState kind="loading" />;

  const categories = reportCatalog
    .map((category) => ({
      ...category,
      reports: category.reports.filter((report) => canViewReport(user.permissions, report)),
    }))
    .filter((category) => category.reports.length > 0);
  const selected = categories.find((category) => category.id === selectedId);

  return (
    <section className="page inventory-page reports-center">
      <header className="page-heading">
        <div>
          <h1>مركز التقارير والذكاء التجاري</h1>
          <p>{reportCount} نموذج تقرير جاهز في 6 فئات</p>
        </div>
      </header>

      {categories.length ? (
        <>
          <nav aria-label={ar.nav.reports} className="dashboard-grid reports-category-grid">
            {categories.map((category) => (
              <button
                aria-pressed={selectedId === category.id}
                className={`stat-card report-card report-category-card${selectedId === category.id ? ' active' : ''}`}
                key={category.id}
                onClick={() => setSelectedId((current) => current === category.id ? null : category.id)}
                type="button"
              >
                <span className="report-card-category">{category.reports.length} تقارير</span>
                <strong>{category.name}</strong>
                <small>{category.description}</small>
              </button>
            ))}
          </nav>

          {selected && (
            <section className="report-catalog-list" aria-labelledby="report-category-heading">
              <header className="page-heading">
                <div>
                  <h2 id="report-category-heading">{selected.name}</h2>
                  <p>{selected.reports.length} تقارير متاحة حسب صلاحياتك</p>
                </div>
              </header>
              <div className="report-template-grid">
                {selected.reports.map((report) => (
                  <article className="stat-card report-template-card" key={report.id}>
                    <h3>{report.name}</h3>
                    <p>{report.purpose}</p>
                    <dl>
                      <div><dt>الفلاتر</dt><dd>{report.filters.join('، ')}</dd></div>
                      <div><dt>المخرجات</dt><dd>{report.outputs.join('، ')}</dd></div>
                    </dl>
                    <Link className="button button-primary" to={report.path}>فتح التقرير</Link>
                  </article>
                ))}
              </div>
            </section>
          )}
        </>
      ) : (
        <PageState kind="denied" />
      )}
    </section>
  );
}
