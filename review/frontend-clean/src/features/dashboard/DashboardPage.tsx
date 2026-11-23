import { useQuery } from '@tanstack/react-query';
import { PageState } from '../../shared/components/PageState';
import { ar } from '../../shared/i18n/ar';
import { getDashboardSummary } from '../reports/api';

export function DashboardPage() {
  const summary = useQuery({
    queryKey: ['/reports/dashboard'],
    queryFn: getDashboardSummary,
  });

  return (
    <section className="page inventory-page dashboard-page">
      <header className="page-heading dashboard-heading">
        <div>
          <h1>{ar.nav.dashboard}</h1>
          <p>{ar.reports.reportsDescription}</p>
        </div>
      </header>

      {summary.isLoading ? (
        <PageState kind="loading" />
      ) : summary.isError ? (
        <PageState
          kind="error"
          message={ar.common.requestFailed}
          onRetry={() => void summary.refetch()}
        />
      ) : (
        <>
          <section className="dashboard-metrics" aria-label={ar.reports.dashboardMetricsLabel}>
            {Object.values(ar.reports.dashboardMetrics).map((label) => (
              <article className="dashboard-stat-card" key={label}>
                <span>{label}</span>
                <strong>{ar.common.notProvided}</strong>
              </article>
            ))}
          </section>
          <section className="dashboard-panels" aria-label={ar.reports.dashboardAnalytics}>
            <article className="dashboard-panel dashboard-stock">
              <header>
                <h2>{ar.reports.dashboardStock}</h2>
              </header>
              <div className="dashboard-stock-empty" role="status">
                {ar.reports.dashboardSchemaWaiting}
              </div>
            </article>
            <article className="dashboard-panel dashboard-trend">
              <header>
                <div>
                  <h2>{ar.reports.dashboardTrend}</h2>
                  <p>{ar.reports.dashboardTrendDescription}</p>
                </div>
                <span>{ar.reports.dashboardChartLegend}</span>
              </header>
              <div className="dashboard-chart-empty" role="status">
                {ar.reports.dashboardSchemaWaiting}
              </div>
            </article>
          </section>
          <section className="dashboard-activity dashboard-panel">
            <header>
              <h2>{ar.reports.dashboardRecentActivity}</h2>
            </header>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    {Object.values(ar.reports.dashboardActivityColumns).map((label) => (
                      <th key={label} scope="col">
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="dashboard-table-empty" colSpan={5}>
                      {ar.reports.dashboardSchemaWaiting}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </section>
  );
}
