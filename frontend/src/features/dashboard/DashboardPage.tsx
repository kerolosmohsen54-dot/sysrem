import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DataTable, type DataColumn } from '../../shared/components/DataTable';
import { PageState } from '../../shared/components/PageState';
import { ar } from '../../shared/i18n/ar';
import { formatDate, formatMoney, formatQuantity } from '../../shared/utils/format';
import { getDashboardSummary } from '../reports/api';

type Period = 'month' | 'week' | 'year';
type LowStockRow = { product_id: number; product_name: string; sku: string; warehouse_name: string; quantity_on_hand: string; minimum_quantity: string };
type ActivityRow = { movement_id: number; reference: string; movement_type: string; movement_date: string; description: string; quantity: string | null; amount_egp?: string | null; user_name: string | null };

export function DashboardPage() {
  const [period, setPeriod] = useState<Period>('month');
  const summary = useQuery({
    queryKey: ['/reports/dashboard', period],
    queryFn: () => getDashboardSummary(period),
  });
  const data = summary.data?.data;
  const periodNames: Record<Period, string> = { month: 'الشهر', week: 'الأسبوع', year: 'السنة' };
  const metrics = [
    { key: 'sales', label: 'إجمالي المبيعات', value: data?.sales_total_egp, tone: 'blue' },
    { key: 'collections', label: 'إجمالي التحصيلات', value: data?.collections_total_egp, tone: 'green' },
    { key: 'expenses', label: 'إجمالي المصروفات', value: data?.expenses_total_egp, tone: 'amber' },
    { key: 'profit', label: 'صافي الربح', value: data?.net_profit_egp, tone: 'green' },
  ].filter((metric): metric is typeof metric & { value: string } => metric.value !== undefined);
  const secondaryMetrics = [
    { key: 'cash', label: 'رصيد الخزائن', value: data?.cash_balance_egp === undefined ? undefined : formatMoney(data.cash_balance_egp) },
    { key: 'low-stock', label: 'منتجات مخزونها منخفض', value: data?.low_stock_count === undefined ? undefined : formatQuantity(String(data.low_stock_count)) },
    { key: 'orders', label: 'طلبات معلقة', value: data?.pending_orders_count === undefined ? undefined : formatQuantity(String(data.pending_orders_count)) },
  ].filter((metric): metric is typeof metric & { value: string } => metric.value !== undefined);
  const lowStockColumns: DataColumn<LowStockRow>[] = [
    { key: 'product', header: 'الصنف', render: (row) => row.product_name },
    { key: 'warehouse', header: 'المخزن', render: (row) => row.warehouse_name },
    { key: 'quantity', header: 'الرصيد / الحد', render: (row) => `${formatQuantity(row.quantity_on_hand)} / ${formatQuantity(row.minimum_quantity)}` },
  ];
  const activityColumns: DataColumn<ActivityRow>[] = [
    { key: 'type', header: 'النوع', render: (row) => row.movement_type },
    { key: 'reference', header: 'المرجع', render: (row) => row.reference },
    { key: 'description', header: 'الطرف / البيان', render: (row) => row.description },
    { key: 'quantity', header: 'المبلغ / الكمية', render: (row) => row.amount_egp ? formatMoney(row.amount_egp) : row.quantity === null ? '—' : formatQuantity(row.quantity) },
    { key: 'date', header: 'التاريخ', render: (row) => formatDate(row.movement_date) },
  ];
  const trend = data?.sales_trend ?? [];
  const maxSales = Math.max(1, ...trend.map((point) => Number(point.sales_egp)));
  const lastUpdated = summary.data?.meta.as_of
    ? new Intl.DateTimeFormat('ar-EG', { hour: 'numeric', minute: '2-digit', day: 'numeric', month: 'short' }).format(new Date(summary.data.meta.as_of))
    : null;

  return (
    <section className="page inventory-page dashboard-page">
      <header className="page-heading dashboard-heading">
        <div>
          <h1>{ar.nav.dashboard}</h1>
          <p>{lastUpdated ? `آخر تحديث: ${lastUpdated}` : 'المؤشرات من بيانات النظام الحالية'}</p>
        </div>
        <div className="dashboard-period-switch" role="group" aria-label="فترة لوحة التحكم">
          {(['month', 'week', 'year'] as const).map((item) => (
            <button aria-pressed={period === item} className={period === item ? 'button button-primary' : 'button button-secondary'} key={item} onClick={() => setPeriod(item)} type="button">{periodNames[item]}</button>
          ))}
        </div>
      </header>

      {summary.isLoading ? (
        <PageState kind="loading" />
      ) : summary.isError ? (
        <PageState kind="error" message={ar.common.requestFailed} onRetry={() => void summary.refetch()} />
      ) : !data || (metrics.length === 0 && secondaryMetrics.length === 0) ? (
        <PageState kind="empty" title="لا توجد مؤشرات متاحة لصلاحيات هذا المستخدم." />
      ) : (
        <>
          <section className="dashboard-metrics" aria-label="مؤشرات الفترة">
            {metrics.map((metric) => (
              <article className={`dashboard-stat-card dashboard-stat-${metric.tone}`} key={metric.key}>
                <span>{metric.label}</span>
                <strong dir="ltr">{formatMoney(metric.value)}</strong>
              </article>
            ))}
          </section>
          <section className="dashboard-secondary-metrics" aria-label="مؤشرات التشغيل">
            {secondaryMetrics.map((metric) => (
              <article className="dashboard-stat-card" key={metric.key}>
                <span>{metric.label}</span>
                <strong>{metric.value}</strong>
              </article>
            ))}
          </section>

          <section className="dashboard-panels" aria-label="تحليلات لوحة التحكم">
            <article className="dashboard-panel dashboard-stock">
              <header><div><h2>هيكل السيولة والمخزون</h2><p>أرصدة فعلية من الخزائن والمخزون والذمم.</p></div></header>
              <div className="dashboard-balance-list">
                {data.cash_balance_egp !== undefined && <div><span>النقد بالخزائن</span><strong dir="ltr">{formatMoney(data.cash_balance_egp)}</strong></div>}
                {data.receivables_egp !== undefined && <div><span>ذمم العملاء</span><strong dir="ltr">{formatMoney(data.receivables_egp)}</strong></div>}
                {data.stock_value_egp !== undefined
                  ? <div><span>قيمة المخزون</span><strong dir="ltr">{formatMoney(data.stock_value_egp)}</strong></div>
                  : data.stock_count !== undefined && <div><span>كمية المخزون الحالية</span><strong>{formatQuantity(data.stock_count)}</strong></div>}
              </div>
            </article>
            <article className="dashboard-panel dashboard-trend">
              <header><div><h2>مسار المبيعات</h2><p>مبيعات الفواتير المرحلة خلال {periodNames[period]} المحدد.</p></div></header>
              {trend.length ? (
                <div className="dashboard-sales-chart" role="img" aria-label="مخطط مبيعات الفترة">
                  {trend.map((point) => (
                    <div className="dashboard-chart-column" key={point.date} title={`${formatDate(point.date)}: ${formatMoney(point.sales_egp)}`}>
                      <span className="dashboard-chart-value">{formatMoney(point.sales_egp)}</span>
                      <span className="dashboard-chart-bar" style={{ height: `${Math.max(5, Number(point.sales_egp) / maxSales * 100)}%` }} />
                      <span className="dashboard-chart-label">{formatDate(point.date)}</span>
                    </div>
                  ))}
                </div>
              ) : <p className="table-empty" role="status">لا توجد مبيعات في الفترة المحددة.</p>}
            </article>
          </section>

          {data.low_stock !== undefined && (
            <section className="dashboard-panel dashboard-activity" aria-labelledby="dashboard-low-stock-heading">
              <header><h2 id="dashboard-low-stock-heading">منتجات المخزون المنخفض</h2><span>{data.low_stock_count ?? data.low_stock.length} صنف</span></header>
              <DataTable columns={lowStockColumns} rows={data.low_stock} getRowKey={(row) => `${row.product_id}-${row.warehouse_name}`} emptyMessage="لا توجد أصناف تحت الحد الأدنى." />
            </section>
          )}

          {data.recent_activity !== undefined && (
            <section className="dashboard-activity dashboard-panel">
              <header><h2>{ar.reports.dashboardRecentActivity}</h2></header>
              <DataTable columns={activityColumns} rows={data.recent_activity} getRowKey={(row) => `${row.movement_id}-${row.reference}`} emptyMessage={ar.common.noResults} />
            </section>
          )}
        </>
      )}
    </section>
  );
}
