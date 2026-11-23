import { useCallback, useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { PageState } from '../../shared/components/PageState';
import { ar } from '../../shared/i18n/ar';
import { formatDate, formatMoney, formatQuantity } from '../../shared/utils/format';
import { isPositiveMoney } from '../../shared/utils/money';
import { shareText } from '../../shared/utils/share';
import { getInvoice, markInvoicePrinted } from './api';

function savePdfFile(file: File) {
  const objectUrl = URL.createObjectURL(file);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = file.name;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 30_000);
}

export function InvoicePrintPage() {
  return <InvoiceOutputPage mode="print" />;
}

export function InvoicePdfPage() {
  return <InvoiceOutputPage mode="pdf" />;
}

function InvoiceOutputPage({ mode }: { mode: 'print' | 'pdf' }) {
  const { documentId = '' } = useParams();
  const [shareNotice, setShareNotice] = useState('');
  const [printError, setPrintError] = useState('');
  const [printing, setPrinting] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [generatedPdf, setGeneratedPdf] = useState<File | null>(null);
  const [pdfReady, setPdfReady] = useState(false);
  const paperRef = useRef<HTMLElement | null>(null);
  const autoDownloadStarted = useRef(false);
  const validDocumentId = /^[1-9]\d*$/.test(documentId);
  const invoice = useQuery({
    queryKey: ['/invoices', documentId],
    queryFn: () => getInvoice(documentId),
    enabled: validDocumentId,
  });
  const downloadPdf = useCallback(async () => {
    if (!invoice.data || downloading) return;
    const paper = paperRef.current;
    if (!paper) return;
    setDownloading(true);
    setPrintError('');
    setShareNotice('');
    try {
      await document.fonts?.ready;
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
      ]);
      const canvas = await html2canvas(paper, {
        backgroundColor: '#ffffff',
        scale: Math.min(2, window.devicePixelRatio || 1),
        useCORS: true,
        logging: false,
      });
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
      const margin = 7;
      const pageWidth = pdf.internal.pageSize.getWidth() - margin * 2;
      const pageHeight = pdf.internal.pageSize.getHeight() - margin * 2;
      const pagePixels = Math.max(1, Math.floor(canvas.width * pageHeight / pageWidth));
      for (let offset = 0; offset < canvas.height; offset += pagePixels) {
        if (offset > 0) pdf.addPage();
        const height = Math.min(pagePixels, canvas.height - offset);
        const page = document.createElement('canvas');
        page.width = canvas.width;
        page.height = height;
        page.getContext('2d')?.drawImage(canvas, 0, offset, canvas.width, height, 0, 0, canvas.width, height);
        pdf.addImage(page.toDataURL('image/jpeg', 0.94), 'JPEG', margin, margin, pageWidth, height * pageWidth / canvas.width, undefined, 'FAST');
      }
      const file = new File([pdf.output('blob')], `${invoice.data.invoice_number}.pdf`, { type: 'application/pdf' });
      setGeneratedPdf(file);
      setPdfReady(true);
      savePdfFile(file);

      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: `فاتورة ${invoice.data.invoice_number}` });
        } catch (cause) {
          const cancelled = cause instanceof DOMException && cause.name === 'AbortError';
          setShareNotice(cancelled
            ? 'تم تنزيل الملف. يمكنك فتح المشاركة مرة أخرى من زر مشاركة PDF.'
            : 'تم تنزيل الملف، وتعذرت المشاركة التلقائية. استخدم زر مشاركة PDF للمحاولة مرة أخرى.');
        }
      } else {
        setShareNotice('تم تنزيل ملف PDF. إذا لم تظهر المشاركة تلقائيًا، شاركه من التنزيلات في جهازك.');
      }
    } catch {
      setPrintError('تعذر إنشاء ملف PDF. حاول مرة أخرى.');
    } finally {
      setDownloading(false);
    }
  }, [downloading, invoice.data]);
  useEffect(() => {
    if (mode === 'pdf' && invoice.isSuccess && !autoDownloadStarted.current) {
      autoDownloadStarted.current = true;
      void downloadPdf();
    }
  }, [downloadPdf, invoice.isSuccess, mode]);

  if (!validDocumentId) {
    return <PageState kind="error" title={ar.sales.invoiceNumberInvalid} />;
  }
  if (invoice.isLoading) return <PageState kind="loading" />;
  if (invoice.isError || !invoice.data) {
    return (
      <PageState
        kind="error"
        message={ar.common.requestFailed}
        onRetry={() => void invoice.refetch()}
      />
    );
  }

  const rowAmount = (value: string | null) => (value === null ? '—' : formatMoney(value));
  const shareInvoice = () => {
    const message = `${invoice.data.invoice_number} — ${invoice.data.customer_name} — ${rowAmount(invoice.data.total_egp)}`;
    void shareText(message).then(
      (outcome) => {
        if (outcome === 'shared') setShareNotice('اختار واتساب من قائمة المشاركة لإرسال الفاتورة.');
        else if (outcome === 'copied') setShareNotice('تم نسخ تفاصيل الفاتورة — الصقها في واتساب.');
        else if (outcome === 'unsupported') setShareNotice('المشاركة غير مدعومة في هذا المتصفح.');
      },
      () => setShareNotice('تعذرت مشاركة الفاتورة. حاول مرة أخرى.'),
    );
  };

  const printInvoice = async () => {
    setPrinting(true);
    setPrintError('');
    try {
      await markInvoicePrinted(documentId);
      await invoice.refetch();
      window.print();
    } catch {
      setPrintError('تعذر تسجيل حالة الطباعة، لم تبدأ الطباعة. حاول مرة أخرى.');
    } finally {
      setPrinting(false);
    }
  };

  const shareGeneratedPdf = async () => {
    if (!generatedPdf) return;
    if (!navigator.share || !navigator.canShare?.({ files: [generatedPdf] })) {
      setShareNotice('المشاركة المباشرة للملفات غير مدعومة هنا. افتح ملف PDF من التنزيلات لمشاركته.');
      return;
    }
    try {
      const sharing = navigator.share({ files: [generatedPdf], title: `فاتورة ${invoice.data.invoice_number}` });
      await sharing;
      setShareNotice('تم فتح مشاركة ملف PDF.');
    } catch (cause) {
      const cancelled = cause instanceof DOMException && cause.name === 'AbortError';
      setShareNotice(cancelled ? 'أُلغيت المشاركة. يمكنك المحاولة مرة أخرى.' : 'تعذرت مشاركة الملف. حاول مرة أخرى.');
    }
  };

  const paper = (
    <article
      className={`invoice-print-paper${mode === 'pdf' ? ' invoice-pdf-capture-paper' : ''}`}
      dir="rtl"
      ref={paperRef}
    >
      <div aria-hidden="true" className="invoice-print-watermark">
        <img alt="" src="/master-logo.png" />
      </div>
      <header className="invoice-print-heading">
        <div className="invoice-paper-brand">
          <h2>MASTER</h2>
          <p>شركة ماستر لاستيراد المواتير والمياه</p>
          <span>{invoice.data.document_type === 'credit_note' ? 'مرتجع مبيعات' : 'فاتورة بيع'}</span>
        </div>
        <div className="invoice-paper-title">
          <h3>{invoice.data.document_type === 'credit_note' ? 'مرتجع مبيعات' : 'فاتورة مبيعات'}</h3>
          <dl className="invoice-paper-metadata">
            <div>
              <dt>{ar.sales.invoiceNumber}</dt>
              <dd>{invoice.data.invoice_number}</dd>
            </div>
            <div>
              <dt>{ar.common.date}</dt>
              <dd>{formatDate(invoice.data.issue_date)}</dd>
            </div>
            {invoice.data.posted_at && (
              <div>
                <dt>الوقت</dt>
                <dd>{new Intl.DateTimeFormat('ar-EG', { hour: '2-digit', minute: '2-digit' }).format(new Date(invoice.data.posted_at))}</dd>
              </div>
            )}
            {invoice.data.due_date && (
              <div>
                <dt>{ar.sales.dueDate}</dt>
                <dd>{formatDate(invoice.data.due_date)}</dd>
              </div>
            )}
          </dl>
        </div>
      </header>
      <section aria-label={ar.sales.invoiceCustomer} className="invoice-print-parties">
        <div className="invoice-paper-customer">
          <h3>{ar.sales.invoiceCustomer}</h3>
          <p>{invoice.data.customer_name}</p>
          {invoice.data.customer_phone && (
            <p>
              {ar.sales.invoiceCustomerPhone}: {invoice.data.customer_phone}
            </p>
          )}
          {invoice.data.customer_governorate && <p>{invoice.data.customer_governorate}</p>}
        </div>
      </section>
      <table className="invoice-print-table">
        <thead>
          <tr>
            <th scope="col">#</th>
            <th scope="col">{ar.common.product}</th>
            <th scope="col">الفئة</th>
            <th scope="col">{ar.sales.invoiceQuantity}</th>
            <th scope="col">{ar.sales.invoiceLinePrice}</th>
            <th scope="col">{ar.sales.invoiceLineTotal}</th>
          </tr>
        </thead>
        {invoice.data.lines.length > 0 && (
          <tbody>
            {invoice.data.lines.map((line, index) => (
              <tr key={`${line.sku ?? line.product_name}-${index}`}>
                <td>{index + 1}</td>
                <td>
                  {line.product_name}
                  {line.description && line.description !== line.product_name && (
                    <small className="invoice-line-description-text">{line.description}</small>
                  )}
                </td>
                <td>{line.category_name || '—'}</td>
                <td>{formatQuantity(line.quantity)}</td>
                <td>{formatMoney(line.unit_price_egp)}</td>
                <td>{rowAmount(line.line_total_egp)}</td>
              </tr>
            ))}
          </tbody>
        )}
      </table>
      {invoice.data.lines.length === 0 && (
        <p className="visually-hidden" role="status">
          {ar.sales.invoiceLinesUnavailable}
        </p>
      )}
      <section aria-label={ar.sales.invoiceTotal} className="invoice-print-totals">
        <dl>
          <dt>{ar.sales.invoiceTotal}</dt>
          <dd className="invoice-paper-grand-total">{rowAmount(invoice.data.total_egp)}</dd>
          {isPositiveMoney(invoice.data.paid_egp ?? '0') && (
            <>
              <dt>{ar.sales.paid}</dt>
              <dd>{rowAmount(invoice.data.paid_egp)}</dd>
            </>
          )}
          <dt>{ar.sales.remaining}</dt>
          <dd>{rowAmount(invoice.data.remaining_egp)}</dd>
        </dl>
      </section>
      {invoice.data.notes && (
        <section className="invoice-paper-notes">
          <strong>ملاحظات:</strong>
          <p>{invoice.data.notes}</p>
        </section>
      )}
      <footer className="invoice-print-signatures">
        <p>توقيع البائع</p>
        <p>{ar.sales.invoiceCustomerSignature}</p>
      </footer>
    </article>
  );

  if (mode === 'pdf') {
    return (
      <section className="page invoice-pdf-download-page">
        <header className="page-heading">
          <div>
            <h1>تنزيل ملف PDF</h1>
            <p>فاتورة #{invoice.data.invoice_number}</p>
          </div>
          <div className="row-actions">
            <Link className="button button-secondary" to={`/invoices/${documentId}`}>
              تفاصيل الفاتورة
            </Link>
            {generatedPdf && (
              <>
                <button className="button button-secondary" onClick={() => savePdfFile(generatedPdf)} type="button">
                  تنزيل مرة أخرى
                </button>
                <button className="button button-primary" onClick={() => void shareGeneratedPdf()} type="button">
                  مشاركة PDF
                </button>
              </>
            )}
            {printError && !generatedPdf && (
              <button className="button button-primary" disabled={downloading} onClick={() => void downloadPdf()} type="button">
                إعادة المحاولة
              </button>
            )}
          </div>
        </header>
        {downloading && <p className="invoice-list-notice" role="status">جارٍ تجهيز وتنزيل الفاتورة PDF…</p>}
        {pdfReady && <p className="inline-success" role="status">تم تنزيل الفاتورة. استخدم «مشاركة PDF» لفتح قائمة مشاركة الملف.</p>}
        {shareNotice && <p className="invoice-list-notice" role="status">{shareNotice}</p>}
        {printError && <p className="field-error" role="alert">{printError}</p>}
        <div aria-hidden="true" className="invoice-pdf-capture-stage">{paper}</div>
      </section>
    );
  }

  return (
    <section className="page invoice-print-page">
      <header className="page-heading invoice-print-actions">
        <div>
          <h1>معاينة الطباعة</h1>
          <p>فاتورة #{invoice.data.invoice_number}</p>
        </div>
        <div className="row-actions">
          <Link className="button button-secondary" to="/invoices">
            ← رجوع
          </Link>
          <button className="button button-secondary" onClick={shareInvoice} type="button">
            📱 واتساب
          </button>
          <button className="button button-primary" disabled={printing} onClick={() => void printInvoice()} type="button">
            {ar.sales.printInvoice}
          </button>
        </div>
      </header>
      {shareNotice && (
        <p className="invoice-list-notice" role="status">
          {shareNotice}
        </p>
      )}
      {printError && <p className="field-error" role="alert">{printError}</p>}
      <article className="invoice-print-paper" dir="rtl">
        <div aria-hidden="true" className="invoice-print-watermark">
          <img alt="" src="/master-logo.png" />
        </div>
        <header className="invoice-print-heading">
          <div className="invoice-paper-brand">
            <h2>MASTER</h2>
            <p>شركة ماستر لاستيراد المواتير والمياه</p>
            <span>{invoice.data.document_type === 'credit_note' ? 'مرتجع مبيعات' : 'فاتورة بيع'}</span>
          </div>
          <div className="invoice-paper-title">
            <h3>{invoice.data.document_type === 'credit_note' ? 'مرتجع مبيعات' : 'فاتورة مبيعات'}</h3>
            <dl className="invoice-paper-metadata">
              <div>
                <dt>{ar.sales.invoiceNumber}</dt>
                <dd>{invoice.data.invoice_number}</dd>
              </div>
              <div>
                <dt>{ar.common.date}</dt>
                <dd>{formatDate(invoice.data.issue_date)}</dd>
              </div>
              {invoice.data.posted_at && (
                <div>
                  <dt>الوقت</dt>
                  <dd>{new Intl.DateTimeFormat('ar-EG', { hour: '2-digit', minute: '2-digit' }).format(new Date(invoice.data.posted_at))}</dd>
                </div>
              )}
              {invoice.data.due_date && (
                <div>
                  <dt>{ar.sales.dueDate}</dt>
                  <dd>{formatDate(invoice.data.due_date)}</dd>
                </div>
              )}
            </dl>
          </div>
        </header>
        <section aria-label={ar.sales.invoiceCustomer} className="invoice-print-parties">
          <div className="invoice-paper-customer">
            <h3>{ar.sales.invoiceCustomer}</h3>
            <p>{invoice.data.customer_name}</p>
            {invoice.data.customer_phone && (
              <p>
                {ar.sales.invoiceCustomerPhone}: {invoice.data.customer_phone}
              </p>
            )}
            {invoice.data.customer_governorate && <p>{invoice.data.customer_governorate}</p>}
          </div>
        </section>
        <table className="invoice-print-table">
          <thead>
            <tr>
              <th scope="col">#</th>
              <th scope="col">{ar.common.product}</th>
              <th scope="col">الفئة</th>
              <th scope="col">{ar.sales.invoiceQuantity}</th>
              <th scope="col">{ar.sales.invoiceLinePrice}</th>
              <th scope="col">{ar.sales.invoiceLineTotal}</th>
            </tr>
          </thead>
          {invoice.data.lines.length > 0 && (
            <tbody>
              {invoice.data.lines.map((line, index) => (
                <tr key={`${line.sku ?? line.product_name}-${index}`}>
                  <td>{index + 1}</td>
                  <td>
                    {line.product_name}
                    {line.description && line.description !== line.product_name && (
                      <small className="invoice-line-description-text">{line.description}</small>
                    )}
                  </td>
                  <td>{line.category_name || '—'}</td>
                  <td>{formatQuantity(line.quantity)}</td>
                  <td>{formatMoney(line.unit_price_egp)}</td>
                  <td>{rowAmount(line.line_total_egp)}</td>
                </tr>
              ))}
            </tbody>
          )}
        </table>
        {invoice.data.lines.length === 0 && (
          <p className="visually-hidden" role="status">
            {ar.sales.invoiceLinesUnavailable}
          </p>
        )}
        <section aria-label={ar.sales.invoiceTotal} className="invoice-print-totals">
          <dl>
            <dt>{ar.sales.invoiceTotal}</dt>
            <dd className="invoice-paper-grand-total">{rowAmount(invoice.data.total_egp)}</dd>
            {isPositiveMoney(invoice.data.paid_egp ?? '0') && (
              <>
                <dt>{ar.sales.paid}</dt>
                <dd>{rowAmount(invoice.data.paid_egp)}</dd>
              </>
            )}
            <dt>{ar.sales.remaining}</dt>
            <dd>{rowAmount(invoice.data.remaining_egp)}</dd>
          </dl>
        </section>
        {invoice.data.notes && (
          <section className="invoice-paper-notes">
            <strong>ملاحظات:</strong>
            <p>{invoice.data.notes}</p>
          </section>
        )}
        <footer className="invoice-print-signatures">
          <p>توقيع البائع</p>
          <p>{ar.sales.invoiceCustomerSignature}</p>
        </footer>
      </article>
    </section>
  );
}
