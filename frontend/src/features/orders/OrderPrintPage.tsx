import { useMutation, useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { getOrder, markOrderPrinted } from './api';
import { PageState } from '../../shared/components/PageState';
import { ar } from '../../shared/i18n/ar';
import { formatDate, formatMoney, formatQuantity } from '../../shared/utils/format';

export function OrderPrintPage() {
  const { orderId = '' } = useParams();
  const validId = /^[1-9]\d*$/.test(orderId);
  const order = useQuery({ queryKey: ['/orders', orderId], queryFn: () => getOrder(orderId), enabled: validId });
  const print = useMutation({ mutationFn: () => markOrderPrinted(orderId) });

  if (!validId) return <PageState kind="error" title={ar.common.invalidIdentifier} />;
  if (order.isLoading) return <PageState kind="loading" />;
  if (order.isError || !order.data) return <PageState kind="error" message={ar.common.requestFailed} onRetry={() => void order.refetch()} />;

  const current = order.data;
  const printOrder = async () => {
    try {
      await print.mutateAsync();
      window.print();
    } catch {
      // The query mutation exposes the failure in the printable screen alert.
    }
  };
  return (
    <section className="page inventory-page order-print-page" dir="rtl">
      <nav aria-label="إجراءات الطباعة" className="row-actions no-print">
        <Link className="button button-secondary" to={'/orders/' + current.id}>{ar.common.back}</Link>
        <button className="button button-primary" disabled={print.isPending} onClick={() => void printOrder()} type="button">
          {print.isPending ? ar.app.loading : 'طباعة الطلب'}
        </button>
      </nav>
      {print.isError && <p className="field-error" role="alert">تعذر تسجيل الطباعة. أعد المحاولة.</p>}
      <article className="order-print-sheet">
        <header className="order-print-heading">
          <div><h1>MASTER</h1><p>طلب بيع</p></div>
          <div><strong><bdi dir="ltr">{current.order_number}</bdi></strong><p><bdi dir="ltr">{formatDate(current.order_date)}</bdi></p></div>
        </header>
        <dl className="invoice-detail-summary">
          <div><dt>{ar.common.customer}</dt><dd>{current.customer_name}</dd></div>
          <div><dt>المندوب</dt><dd>{current.salesperson_name ?? '—'}</dd></div>
          <div><dt>{ar.common.warehouse}</dt><dd>{current.warehouse_name ?? '—'}</dd></div>
          <div><dt>طريقة الدفع</dt><dd>{current.payment_method ?? '—'}</dd></div>
          <div><dt>{ar.orders.orderStatus}</dt><dd>{ar.orders.orderStatuses[current.status]}</dd></div>
        </dl>
        <table className="invoice-table">
          <thead><tr><th>الصنف</th><th>الكود</th><th>الكمية</th><th>سعر الوحدة</th><th>الخصم</th><th>الإجمالي</th></tr></thead>
          <tbody>{current.lines.map((line) => <tr key={line.id}>
            <td>{line.product_name}</td><td><bdi dir="ltr">{line.sku}</bdi></td>
            <td><bdi dir="ltr">{formatQuantity(line.quantity)}</bdi></td>
            <td><bdi dir="ltr">{formatMoney(line.unit_price_egp)}</bdi></td>
            <td><bdi dir="ltr">{line.discount_percent}%</bdi></td>
            <td><bdi dir="ltr">{formatMoney(line.line_total_egp)}</bdi></td>
          </tr>)}</tbody>
        </table>
        <dl className="invoice-detail-summary order-print-totals">
          <div><dt>الإجمالي قبل الخصم</dt><dd><bdi dir="ltr">{formatMoney(current.subtotal_egp ?? '0.00')}</bdi></dd></div>
          <div><dt>الخصم</dt><dd><bdi dir="ltr">{formatMoney(current.discount_amount_egp ?? '0.00')}</bdi></dd></div>
          <div><dt>الضريبة</dt><dd><bdi dir="ltr">{formatMoney(current.tax_amount_egp ?? '0.00')}</bdi></dd></div>
          <div><dt>الإجمالي النهائي</dt><dd><bdi dir="ltr">{formatMoney(current.total_egp ?? '0.00')}</bdi></dd></div>
        </dl>
        {current.notes && <p className="order-print-notes">ملاحظات: {current.notes}</p>}
        <footer className="order-print-signatures"><span>توقيع العميل</span><span>اعتماد المبيعات</span></footer>
      </article>
    </section>
  );
}
