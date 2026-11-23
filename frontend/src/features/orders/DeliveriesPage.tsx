import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../shared/auth/AuthProvider';
import { DataTable, type DataColumn } from '../../shared/components/DataTable';
import { Modal } from '../../shared/components/Modal';
import { PageState } from '../../shared/components/PageState';
import { ar } from '../../shared/i18n/ar';
import { formatDate } from '../../shared/utils/format';
import type { ListQuery } from '../inventory/api';
import { listDeliveries, type DeliveryRecord } from './api';

type DeliveryListFilter = '' | 'draft' | 'active' | 'delivered' | 'cancelled';
type Detector = { detect(source: HTMLVideoElement): Promise<{ rawValue: string }[]> };
type DetectorConstructor = new (options: { formats: string[] }) => Detector;

const statusFilters: DeliveryListFilter[] = ['', 'draft', 'active', 'delivered', 'cancelled'];
const filterLabels: Record<DeliveryListFilter, string> = {
  '': ar.inventory.all,
  draft: 'قيد الانتظار',
  active: 'جاري التجهيز',
  delivered: 'تم التسليم',
  cancelled: ar.orders.deliveryStatuses.cancelled,
};

function deliveryPathFromQr(rawValue: string): string | null {
  const value = rawValue.trim();
  const routeMatch = value.match(/\/deliveries\/(\d+)(?:\/|$)/i);
  if (routeMatch) return `/deliveries/${routeMatch[1]}`;
  if (/^[1-9]\d*$/.test(value)) return `/deliveries/${value}`;
  return null;
}

export function DeliveriesPage() {
  const { user } = useAuth();
  const canManage = Boolean(user?.permissions.includes('*') || user?.permissions.includes('deliveries.manage'));
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const driverId = searchParams.get('driverId') ?? '';
  const [query, setQuery] = useState<ListQuery>({ page: 1, perPage: 10, search: '' });
  const [status, setStatus] = useState<DeliveryListFilter>('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [scanOpen, setScanOpen] = useState(false);
  const [scanError, setScanError] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const result = useQuery({
    queryKey: ['/deliveries', query, status, driverId, fromDate, toDate],
    queryFn: () => listDeliveries(query, {
      ...(status ? { status } : {}),
      ...(driverId ? { driver_id: driverId } : {}),
      ...(fromDate ? { from_date: fromDate } : {}),
      ...(toDate ? { to_date: toDate } : {}),
    }),
  });

  useEffect(() => {
    if (!scanOpen) return;
    const videoElement = videoRef.current;
    let live = true;
    let stream: MediaStream | undefined;
    let animationFrame = 0;
    const stop = () => stream?.getTracks().forEach((track) => track.stop());
    const start = async () => {
      const DetectorClass = (window as Window & { BarcodeDetector?: DetectorConstructor }).BarcodeDetector;
      if (!navigator.mediaDevices?.getUserMedia || !DetectorClass) {
        setScanError('المتصفح لا يدعم مسح QR بالكاميرا. ابحث برقم الإذن بدلًا من ذلك.');
        return;
      }
      setScanError('');
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } } });
        if (!live) return stop();
        const video = videoElement ?? videoRef.current;
        if (!video) return stop();
        video.srcObject = stream;
        await video.play();
        const detector = new DetectorClass({ formats: ['qr_code'] });
        const scan = async () => {
          if (!live || !videoRef.current) return;
          try {
            const codes = await detector.detect(videoRef.current);
            const rawValue = codes[0]?.rawValue;
            if (rawValue) {
              live = false;
              const path = deliveryPathFromQr(rawValue);
              setScanOpen(false);
              if (path) navigate(path);
              else setQuery((current) => ({ ...current, search: rawValue, page: 1 }));
              return;
            }
          } catch {
            setScanError('تعذر قراءة الرمز. ثبّت الكاميرا على رمز إذن واضح.');
          }
          animationFrame = window.requestAnimationFrame(() => void scan());
        };
        void scan();
      } catch {
        setScanError('تعذر فتح الكاميرا. تحقق من إذن استخدامها أو ابحث برقم الإذن.');
      }
    };
    void start();
    return () => {
      live = false;
      window.cancelAnimationFrame(animationFrame);
      stop();
      if (videoElement) videoElement.srcObject = null;
    };
  }, [scanOpen, navigate]);

  const columns: DataColumn<DeliveryRecord>[] = [
    {
      key: 'number',
      header: ar.orders.deliveryNumber,
      render: (row) => <Link to={`/deliveries/${row.id}`}>{row.delivery_number}</Link>,
    },
    {
      key: 'source', header: 'رقم الطلب', render: (row) => row.sales_order_id
        ? <Link to={`/orders/${row.sales_order_id}`}>{row.source_number}</Link>
        : row.sales_document_id ? <Link to={`/invoices/${row.sales_document_id}`}>{row.source_number}</Link> : row.source_number,
    },
    { key: 'recipient', header: ar.orders.recipient, render: (row) => row.recipient_name || '—' },
    { key: 'delivery_date', header: ar.common.date, render: (row) => row.delivery_date ? formatDate(row.delivery_date) : '—' },
    { key: 'warehouse', header: 'المستودع / المصدر', render: (row) => row.source_location_name || '—' },
    { key: 'required_quantity', header: 'الكمية المطلوبة', render: (row) => String(row.total_quantity ?? 0) },
    { key: 'delivered_quantity', header: 'الكمية المسلّمة', render: (row) => row.status === 'delivered' ? String(row.total_quantity ?? 0) : '—' },
    { key: 'status', header: ar.orders.deliveryStatus, render: (row) => ar.orders.deliveryStatuses[row.status] },
    { key: 'actions', header: ar.common.actions, render: (row) => <Link className="button button-quiet button-sm" to={`/deliveries/${row.id}`}>فتح الإذن</Link> },
  ];
  const summary = result.data?.summary;

  return (
    <section className="page inventory-page">
      <header className="page-heading">
        <div><h1>{ar.nav.deliveries}</h1><p>{ar.orders.deliveryDescription}</p></div>
        <div className="row-actions">
          <button className="button button-secondary" onClick={() => { setScanError(''); setScanOpen(true); }} type="button">مسح رمز QR للتسليم</button>
          {canManage && <Link className="button button-primary" to="/deliveries/new">{ar.orders.newDelivery}</Link>}
        </div>
      </header>
      {driverId && <p className="inline-alert">عرض أذونات السائق رقم {driverId} <Link to="/deliveries">إظهار الكل</Link></p>}
      {summary && <div className="delivery-summary-grid" aria-label="ملخص أذونات التسليم">
        <article className="summary-card"><span>إجمالي التسليمات النشطة</span><strong>{summary.active_count}</strong></article>
        <article className="summary-card"><span>جاري تجهيزها</span><strong>{summary.preparing_count}</strong></article>
        <article className="summary-card"><span>تم تسليمها اليوم</span><strong>{summary.delivered_today_count}</strong></article>
      </div>}
      <label className="inventory-search"><span>{ar.common.search}</span><input className="input" type="search" value={query.search} onChange={(event) => { const search = event.currentTarget.value; setQuery((current) => ({ ...current, search, page: 1 })); }} /></label>
      <div className="inventory-toolbar">
        <label className="form-field"><span>من تاريخ</span><input className="input" type="date" value={fromDate} onChange={(event) => { setFromDate(event.currentTarget.value); setQuery((current) => ({ ...current, page: 1 })); }} /></label>
        <label className="form-field"><span>إلى تاريخ</span><input className="input" type="date" value={toDate} onChange={(event) => { setToDate(event.currentTarget.value); setQuery((current) => ({ ...current, page: 1 })); }} /></label>
      </div>
      <div aria-label={ar.orders.deliveryStatus} className="order-status-filters" role="group">
        {statusFilters.map((item) => (
          <button aria-pressed={status === item} className={status === item ? 'button button-primary' : 'button button-secondary'} key={item || 'all'} onClick={() => { setStatus(item); setQuery((current) => ({ ...current, page: 1 })); }} type="button">
            {filterLabels[item]}
          </button>
        ))}
      </div>
      {result.isLoading ? <PageState kind="loading" /> : result.isError ? (
        <PageState kind="error" message={ar.common.requestFailed} onRetry={() => void result.refetch()} />
      ) : result.data ? (
        <>
          <DataTable columns={columns} rows={result.data.data} getRowKey={(row) => row.id} emptyMessage={ar.common.noResults} />
          <nav aria-label={ar.inventory.paginationLabel} className="inventory-pagination">
            <button className="button button-secondary" disabled={query.page <= 1} onClick={() => setQuery((current) => ({ ...current, page: current.page - 1 }))} type="button">{ar.common.previous}</button>
            <span>{ar.common.page} {query.page} {ar.common.of} {result.data.meta.last_page}</span>
            <button className="button button-secondary" disabled={query.page >= result.data.meta.last_page} onClick={() => setQuery((current) => ({ ...current, page: current.page + 1 }))} type="button">{ar.common.next}</button>
          </nav>
        </>
      ) : null}
      <Modal open={scanOpen} title="مسح رمز QR للتسليم" onClose={() => setScanOpen(false)}>
        <div className="delivery-qr-scanner">
          <video ref={videoRef} autoPlay muted playsInline />
          {scanError && <p className="field-error" role="alert">{scanError}</p>}
          <p className="field-hint">وجّه الكاميرا إلى رمز الإذن. يمكن أيضًا كتابة رقم الإذن في حقل البحث.</p>
        </div>
      </Modal>
    </section>
  );
}
