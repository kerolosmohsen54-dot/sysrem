import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '../../shared/api/errors';
import { FormField } from '../../shared/components/FormField';
import { PageState } from '../../shared/components/PageState';
import { ar } from '../../shared/i18n/ar';
import { applyImport, getDailySummary, previewImport, type DailySummary, type ImportPreview, type ImportType } from './dataToolsApi';

const templates: Record<ImportType, string[]> = {
  products: ['sku', 'name', 'unit_code', 'barcode', 'category_code', 'company_price', 'default_location_code', 'minimum_stock', 'description'],
  customers: ['name', 'phone', 'email', 'address', 'governorate', 'credit_limit', 'notes'],
  'opening-stock': ['product_sku', 'warehouse_code', 'quantity', 'unit_cost_egp', 'movement_date', 'reason'],
  'customer-opening-balances': ['customer_phone', 'direction', 'amount_egp', 'issue_date', 'notes'],
};

function csvTemplate(type: ImportType) {
  const example = type === 'products'
    ? ['SKU-001', 'مثال منتج', 'piece', '', '', '100', '', '5', '']
    : type === 'customers'
      ? ['عميل تجريبي', '201000000000', '', '', '', '0', '']
      : type === 'opening-stock'
        ? ['SKU-001', 'MAIN', '10', '80', new Date().toISOString().slice(0, 10), 'رصيد بداية']
        : ['201000000000', 'debit', '100', new Date().toISOString().slice(0, 10), 'رصيد افتتاحي'];
  const content = [templates[type], example].map(row => row.map(value => `"${value.replaceAll('"', '""')}"`).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob([`\uFEFF${content}`], { type: 'text/csv;charset=utf-8' }));
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = `${type}-template.csv`; anchor.click(); URL.revokeObjectURL(url);
}

export function DataImportPage() {
  const client = useQueryClient();
  const [type, setType] = useState<ImportType>('products');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [message, setMessage] = useState('');
  const previewMutation = useMutation({ mutationFn: () => file ? previewImport(type, file) : Promise.reject(new Error('اختر ملف CSV أولاً.')), onSuccess: result => { setPreview(result.data); setMessage(''); } });
  const applyMutation = useMutation({ mutationFn: () => preview ? applyImport(preview.stage_id) : Promise.reject(new Error('لا توجد معاينة صالحة.')), onSuccess: async response => { setMessage(response.data.duplicate ? 'هذا الملف سبق تطبيقه؛ لم تُكرر أي بيانات.' : `تم الاستيراد: ${response.data.imported} سجل.`); setPreview(null); setFile(null); await client.invalidateQueries(); } });
  const errors = preview?.errors ?? {};
  const errorCount = Object.values(errors).reduce((sum, current) => sum + current.length, 0);
  const onSubmit = (event: FormEvent) => { event.preventDefault(); setPreview(null); setMessage(''); previewMutation.mutate(); };
  return <section className="page inventory-page">
    <header className="page-heading"><div><h1>استيراد البيانات</h1><p>ارفع ملف CSV لمعاينته والتحقق من كل صف قبل أي كتابة في قاعدة البيانات.</p></div></header>
    <div className="summary-card"><div className="filter-bar"><label className="form-field"><span>نوع البيانات</span><select className="input" value={type} onChange={event => { setType(event.currentTarget.value as ImportType); setPreview(null); setFile(null); setMessage(''); }}><option value="products">المنتجات</option><option value="customers">العملاء</option><option value="opening-stock">الأرصدة الافتتاحية</option><option value="customer-opening-balances">أرصدة العملاء الافتتاحية</option></select></label><button className="button button-secondary" onClick={() => csvTemplate(type)} type="button">تنزيل نموذج CSV</button></div>
      <p>الأعمدة المطلوبة بالترتيب: {templates[type].join('، ')}. الملفات المدعومة CSV حتى 10MB.</p>
      <form className="stack-form" onSubmit={onSubmit}><FormField id="import-file" label="ملف CSV" type="file" accept=".csv,text/csv" onChange={event => { setFile(event.currentTarget.files?.[0] ?? null); setPreview(null); }} /><button className="button button-primary" disabled={!file || previewMutation.isPending} type="submit">{previewMutation.isPending ? 'جارٍ التحقق…' : 'رفع ومعاينة'}</button></form>
    </div>
    {(previewMutation.error || applyMutation.error) && <p className="field-error" role="alert">{(previewMutation.error ?? applyMutation.error) instanceof ApiError ? (previewMutation.error ?? applyMutation.error as ApiError).message : (previewMutation.error ?? applyMutation.error)?.message}</p>}
    {message && <p className="inline-success" role="status">{message}</p>}
    {preview && <section className="dashboard-panel"><header><h2>معاينة ({preview.row_count} صف)</h2><p>{preview.valid ? 'كل الصفوف صالحة.' : `يوجد ${errorCount} خطأ في الصفوف.`}{preview.duplicate ? ' سبق تطبيق محتوى هذا الملف.' : ''}</p></header>
      {errorCount > 0 && <div className="field-error" role="alert"><strong>أخطاء التحقق</strong><ul>{Object.entries(errors).flatMap(([line, messages]) => messages.map((item, index) => <li key={`${line}-${index}`}>{item}</li>))}</ul></div>}
      <div className="table-wrap" tabIndex={0}><table><thead><tr><th>الصف</th>{templates[type].map(column => <th key={column}>{column}</th>)}</tr></thead><tbody>{preview.rows.map(row => <tr key={row.line}><td>{row.line}</td>{templates[type].map(column => <td key={column}>{row.values[column] ?? '—'}</td>)}</tr>)}</tbody></table></div>
      {preview.row_count > 8 && <p>تعرض المعاينة أول 8 صفوف؛ جرى التحقق من كامل الملف.</p>}
      <button className="button button-primary" disabled={!preview.valid || preview.duplicate || applyMutation.isPending} onClick={() => { if (window.confirm(`سيتم تطبيق ${preview.row_count} صف على البيانات الحقيقية. متابعة؟`)) applyMutation.mutate(); }} type="button">تأكيد تطبيق {preview.row_count} صف</button>
    </section>}
  </section>;
}

function SummaryCard({ label, value }: { label: string; value: string | null }) {
  return <article className="summary-card"><span>{label}</span><strong>{value ?? 'غير مكتمل'}{value ? ' ج.م' : ''}</strong></article>;
}

export function DailySummaryPage() {
  const summary = useQuery({ queryKey: ['/data/daily-summary'], queryFn: getDailySummary, refetchInterval: 60_000 });
  const data: DailySummary | undefined = summary.data?.data;
  const text = data ? `ملخص يوم ${data.date}\nالمبيعات: ${data.sales_egp} ج.م (${data.invoice_count} فاتورة)\nالتحصيل: ${data.collections_egp} ج.م\nالمصروفات: ${data.expenses_egp} ج.م\nربح المبيعات: ${data.sales_profit_egp ?? 'غير مكتمل'} ج.م\nصافي الربح: ${data.net_profit_egp} ج.م` : '';
  const copy = async () => { await navigator.clipboard.writeText(text); };
  if (summary.isLoading) return <PageState kind="loading" />;
  if (summary.isError || !data) return <PageState kind="error" message={ar.common.requestFailed} onRetry={() => void summary.refetch()} />;
  return <section className="page inventory-page"><header className="page-heading"><div><h1>الملخص اليومي</h1><p>مبيعات اليوم والتحصيل والمصروفات والأرباح من الحركات الحقيقية.</p></div></header>
    <section className="dashboard-panel"><h2>📊 ملخص يوم {data.date}</h2><div className="summary-grid"><article className="summary-card"><span>الفواتير</span><strong>{data.invoice_count}</strong></article><SummaryCard label="المبيعات" value={data.sales_egp} /><SummaryCard label="التحصيل" value={data.collections_egp} /><SummaryCard label="المصروفات" value={data.expenses_egp} /><SummaryCard label="ربح المبيعات" value={data.sales_profit_egp} /><SummaryCard label="صافي الربح المحاسبي" value={data.net_profit_egp} /></div>
      {!data.sales_profit_complete && <p className="page-note">بعض الفواتير لا تحتوي على لقطة تكلفة مكتملة؛ يظهر ربح المبيعات فارغاً حتى تكتمل البيانات.</p>}
      <p className="page-note">آخر تحديث: {new Date(data.updated_at).toLocaleString('ar-EG')}</p>
      <div className="button-row"><button className="button button-primary" onClick={() => { const phone = data.whatsapp_phone?.replace(/\D/g, '') ?? ''; const host = ['wa', 'me'].join('.'); const url = new URL(`//${host}/${phone}`, window.location.href); url.searchParams.set('text', text); window.open(url.toString(), '_blank', 'noopener,noreferrer'); }} type="button">إرسال واتساب</button><button className="button button-secondary" onClick={() => void copy()} type="button">نسخ الملخص</button></div>
    </section>
  </section>;
}
