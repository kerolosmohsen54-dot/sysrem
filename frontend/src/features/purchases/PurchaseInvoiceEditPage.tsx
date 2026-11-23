import { useQuery } from '@tanstack/react-query';
import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ApiError } from '../../shared/api/errors';
import { FormField } from '../../shared/components/FormField';
import { PageState } from '../../shared/components/PageState';
import { ar } from '../../shared/i18n/ar';
import { formatMoney } from '../../shared/utils/format';
import { centsToMoney, moneyToCents, multiplyCents, quantityAsBigInt } from '../../shared/utils/money';
import type { ListQuery } from '../inventory/api';
import {
  getPurchaseInvoice,
  listPurchaseProducts,
  listPurchasePartners,
  listPurchaseWarehouses,
  listSuppliers,
  updatePurchaseInvoice,
  type PurchaseInvoiceInput,
} from './api';

type EditLine = { productId: string; quantity: string; unitCost: string; companyPrice: string };
const optionsQuery: ListQuery = { page: 1, perPage: 100, search: '' };

export function PurchaseInvoiceEditPage() {
  const { invoiceId = '' } = useParams();
  const navigate = useNavigate();
  const detail = useQuery({ queryKey: ['/purchase-invoices', invoiceId], queryFn: () => getPurchaseInvoice(invoiceId) });
  const suppliers = useQuery({ queryKey: ['/suppliers', 'purchase-edit'], queryFn: () => listSuppliers(optionsQuery) });
  const partners = useQuery({ queryKey: ['/partners', 'purchase-edit'], queryFn: () => listPurchasePartners(optionsQuery) });
  const warehouses = useQuery({ queryKey: ['/warehouses', 'purchase-edit'], queryFn: () => listPurchaseWarehouses(optionsQuery) });
  const products = useQuery({ queryKey: ['/products', 'purchase-edit'], queryFn: () => listPurchaseProducts(optionsQuery) });
  const [lines, setLines] = useState<EditLine[]>([{ productId: '', quantity: '1', unitCost: '', companyPrice: '' }]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const existing = detail.data?.data.lines;
    if (existing) setLines(existing.map(line => ({ productId: String(line.product_id), quantity: String(line.quantity), unitCost: line.unit_cost_egp, companyPrice: line.company_price_egp ?? '' })));
  }, [detail.data]);

  if (detail.isLoading || suppliers.isLoading || partners.isLoading || warehouses.isLoading || products.isLoading) return <PageState kind="loading" />;
  if (detail.isError || suppliers.isError || partners.isError || warehouses.isError || products.isError || !detail.data?.data.invoice) {
    return <PageState kind="error" message={detail.error instanceof ApiError && detail.error.status === 404 ? ar.common.notFound : ar.common.requestFailed} onRetry={() => { void detail.refetch(); void suppliers.refetch(); void partners.refetch(); void warehouses.refetch(); void products.refetch(); }} />;
  }
  const { invoice } = detail.data.data;
  if (invoice.status !== 'draft') return <PageState kind="error" message="يمكن تعديل مسودة فاتورة الشراء فقط." />;

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const input: PurchaseInvoiceInput = {
      invoice_number: String(form.get('invoice_number') ?? '').trim(),
      supplier_id: Number(form.get('supplier_id')),
      seller_partner_id: String(form.get('seller_partner_id') ?? '') ? Number(form.get('seller_partner_id')) : null,
      warehouse_id: String(form.get('warehouse_id') ?? '') ? Number(form.get('warehouse_id')) : null,
      invoice_date: String(form.get('invoice_date') ?? ''),
      discount_egp: String(form.get('discount_egp') ?? '0'),
      tax_egp: String(form.get('tax_egp') ?? '0'),
      notes: String(form.get('notes') ?? '').trim() || null,
      lines: lines.map(line => ({ product_id: Number(line.productId), quantity: Number(line.quantity), unit_cost_egp: line.unitCost, company_price_egp: line.companyPrice || null })),
    };
    setSaving(true);
    setError('');
    try {
      await updatePurchaseInvoice(invoiceId, input);
      navigate(`/purchase-invoices/${invoiceId}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : ar.common.requestFailed);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="page invoice-form">
      <header className="page-heading"><div><h1>تعديل مسودة فاتورة الشراء</h1><p>{invoice.invoice_number}</p></div><Link className="button button-secondary" to={`/purchase-invoices/${invoice.id}`}>{ar.common.cancel}</Link></header>
      <form className="stack-form" onSubmit={event => void submit(event)}>
        {error && <p className="field-error" role="alert">{error}</p>}
        <div className="inventory-toolbar">
          <FormField id="purchase-edit-number" label="رقم فاتورة المورد" name="invoice_number" required maxLength={64} defaultValue={invoice.invoice_number} />
          <label className="form-field"><span>المورد</span><select className="input" name="supplier_id" required defaultValue={invoice.supplier_id}>{(suppliers.data?.data ?? []).map(row => <option key={row.id} value={row.id}>{row.name}</option>)}</select></label>
          <label className="form-field"><span>المخزن</span><select className="input" name="warehouse_id" defaultValue={invoice.warehouse_id ?? ''}><option value="">بدون مخزن</option>{(warehouses.data?.data ?? []).map(row => <option key={row.id} value={row.id}>{row.name}</option>)}</select></label>
          <FormField id="purchase-edit-date" label="تاريخ الفاتورة" name="invoice_date" type="date" required defaultValue={invoice.invoice_date} />
          <label className="form-field"><span>الشريك البائع (اختياري)</span><select className="input" name="seller_partner_id" defaultValue={invoice.seller_partner_id ?? ''}><option value="">لا يوجد شريك بائع</option>{(partners.data?.data ?? []).filter(partner => partner.status === 'active').map(partner => <option key={partner.id} value={partner.id}>{partner.name}</option>)}</select></label>
        </div>
        <section className="invoice-line-editor">
          <header className="page-heading"><h2>الأصناف</h2><button className="button button-secondary" onClick={() => setLines(value => [...value, { productId: '', quantity: '1', unitCost: '', companyPrice: '' }])} type="button">إضافة صنف</button></header>
          {lines.map((line, index) => <div className="inventory-toolbar" key={index}>
            <label className="form-field"><span>المنتج</span><select className="input" required value={line.productId} onChange={event => { const productId = event.currentTarget.value; const product = products.data?.data.find(row => String(row.id) === productId); setLines(value => value.map((item, row) => row === index ? { ...item, productId, companyPrice: product?.company_price ?? '', unitCost: product?.purchase_cost_egp ?? '' } : item)); }}><option value="">اختر المنتج</option>{(products.data?.data ?? []).map(row => <option key={row.id} value={row.id}>{row.name} ({row.sku})</option>)}</select></label>
            <FormField id={`purchase-edit-quantity-${index}`} label="الكمية" name={`quantity-${index}`} type="number" min="1" step="1" required value={line.quantity} onChange={event => { const quantity = event.currentTarget.value; setLines(value => value.map((item, row) => row === index ? { ...item, quantity } : item)); }} />
            <FormField id={`purchase-edit-cost-${index}`} label="سعر الشراء الفعلي للوحدة (ج.م)" name={`cost-${index}`} inputMode="decimal" required value={line.unitCost} onChange={event => { const unitCost = event.currentTarget.value; setLines(value => value.map((item, row) => row === index ? { ...item, unitCost } : item)); }} />
            {lines.length > 1 && <button className="button button-secondary" onClick={() => setLines(value => value.filter((_, row) => row !== index))} type="button">حذف الصنف</button>}
            <FormField id={`purchase-edit-company-price-${index}`} label="سعر الشركة للوحدة (ج.م)" name={`company_price-${index}`} inputMode="decimal" value={line.companyPrice} onChange={event => { const companyPrice = event.currentTarget.value; setLines(value => value.map((item, row) => row === index ? { ...item, companyPrice } : item)); }} />
            {line.unitCost && line.companyPrice && <p className="invoice-field-hint">زيادة البائع لهذا السطر: {formatMoney(centsToMoney(multiplyCents(moneyToCents(line.unitCost) > moneyToCents(line.companyPrice) ? moneyToCents(line.unitCost) - moneyToCents(line.companyPrice) : 0n, quantityAsBigInt(line.quantity))))}</p>}
          </div>)}
        </section>
        <div className="inventory-toolbar"><FormField id="purchase-edit-discount" label="الخصم (ج.م)" name="discount_egp" inputMode="decimal" required defaultValue={invoice.discount_egp ?? '0'} /><FormField id="purchase-edit-tax" label="الضريبة (ج.م)" name="tax_egp" inputMode="decimal" required defaultValue={invoice.tax_egp ?? '0'} /><FormField id="purchase-edit-notes" label={ar.sales.notes} name="notes" defaultValue={invoice.notes ?? ''} /></div>
        <div className="modal-actions"><button className="button button-primary" disabled={saving} type="submit">{saving ? ar.app.loading : ar.common.save}</button></div>
      </form>
    </section>
  );
}
