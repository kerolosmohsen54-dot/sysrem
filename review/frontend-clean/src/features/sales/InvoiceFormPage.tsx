import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ApiError } from '../../shared/api/errors';
import { FormField } from '../../shared/components/FormField';
import { Modal } from '../../shared/components/Modal';
import { PageState } from '../../shared/components/PageState';
import { ar } from '../../shared/i18n/ar';
import type { Customer } from '../customers/api';
import { listResource, type ListQuery, type Product, type Warehouse } from '../inventory/api';
import {
  createReturn,
  createCollection,
  createInvoiceDraft,
  getInvoice,
  issueInvoice,
  listInvoices,
  listReturns,
  previewInvoice,
  type InvoiceInput,
  type InvoiceLineInput,
} from './api';
import { formatDate, formatMoney } from '../../shared/utils/format';
import type { ReturnInput } from './api';
import { listTreasuryAccounts } from '../finance/api';

type InvoiceLineDraft = {
  productId: string;
  productSearch: string;
  warehouseId: string;
  quantity: string;
  unitPrice: string;
  discount: string;
  originalLineId?: number;
};

type InvoiceFormPageProps = { initialMode?: 'sale' | 'return' };

const optionsQuery: ListQuery = { page: 1, perPage: 100, search: '' };
const emptyLine = (): InvoiceLineDraft => ({
  productId: '',
  productSearch: '',
  warehouseId: '',
  quantity: '1',
  unitPrice: '',
  discount: '',
});
const amountPattern = /^(0|[1-9][0-9]{0,14})(\.[0-9]{1,4})?$/;

function positiveSafeInteger(value: string): number {
  if (!/^[1-9]\d*$/.test(value)) throw new Error(ar.common.quantityMustBeInteger);
  const integer = BigInt(value);
  if (integer > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new Error(ar.common.quantityMustBeInteger);
  }
  return Number(integer);
}

function makeInvoiceInput(
  customerId: string,
  issueDate: string,
  dueDate: string,
  notes: string,
  lines: InvoiceLineDraft[],
): InvoiceInput {
  if (!lines.length) throw new Error(ar.sales.atLeastOneLine);
  const inputLines: InvoiceLineInput[] = lines.map((line) => {
    if (
      !amountPattern.test(line.unitPrice) ||
      (line.discount && !amountPattern.test(line.discount))
    ) {
      throw new Error(ar.inventory.invalidUnitCost);
    }
    const lineInput: InvoiceLineInput = {
      product_id: positiveSafeInteger(line.productId),
      warehouse_id: positiveSafeInteger(line.warehouseId),
      quantity: positiveSafeInteger(line.quantity),
      unit_price_egp: line.unitPrice,
    };
    if (line.discount) lineInput.discount_amount_egp = line.discount;
    return lineInput;
  });
  return {
    customer_id: positiveSafeInteger(customerId),
    issue_date: issueDate,
    due_date: dueDate || null,
    notes: notes.trim() || null,
    lines: inputLines,
  };
}

export function InvoiceFormPage({ initialMode }: InvoiceFormPageProps = {}) {
  const client = useQueryClient();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [customerId, setCustomerId] = useState('');
  const [issueDate] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  });
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<InvoiceLineDraft[]>([emptyLine()]);
  const [previewInput, setPreviewInput] = useState<InvoiceInput | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [issuer, setIssuer] = useState('');
  const [isReturn, setIsReturn] = useState(
    initialMode === 'return' || searchParams.get('mode') === 'return',
  );
  const [immediateCollection, setImmediateCollection] = useState(false);
  const [paymentTerms, setPaymentTerms] = useState<'immediate' | 'deferred'>('deferred');
  const [additionalOptions, setAdditionalOptions] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [copyInvoiceOpen, setCopyInvoiceOpen] = useState(false);
  const [copyInvoiceId, setCopyInvoiceId] = useState('');
  const [selectedOriginalId, setSelectedOriginalId] = useState('');
  const [returnReason, setReturnReason] = useState('تالف');
  const [discountWarning, setDiscountWarning] = useState('');
  const [creditConfirmed, setCreditConfirmed] = useState(false);
  const [recentCustomerIds, setRecentCustomerIds] = useState<number[]>([]);
  const [paymentSplits, setPaymentSplits] = useState<{ accountId: string; amount: string }[]>([]);
  const [treasuryAccountId, setTreasuryAccountId] = useState('');
  const [collectionAmount, setCollectionAmount] = useState('');
  const [collectionMethod, setCollectionMethod] = useState<'cash' | 'bank' | 'cheque'>('cash');
  const [driverName, setDriverName] = useState('');
  const [issuerOrganization, setIssuerOrganization] = useState('MASTER');
  const [warehouseId, setWarehouseId] = useState('');
  const [invoiceSearchNumber, setInvoiceSearchNumber] = useState('');
  const [searchedInvoiceNumber, setSearchedInvoiceNumber] = useState('');
  const createKey = useRef<string | null>(null);
  const issueKey = useRef<string | null>(null);
  const returnKey = useRef<string | null>(null);
  const updateLine = (index: number, field: keyof InvoiceLineDraft, value: string) => {
    setLines((current) =>
      current.map((item, itemIndex) => (itemIndex === index ? { ...item, [field]: value } : item)),
    );
  };
  const customers = useQuery({
    queryKey: ['/customers', 'invoice-options'],
    queryFn: () => listResource<Customer>('/customers', optionsQuery),
  });
  const products = useQuery({
    queryKey: ['/products', 'invoice-options'],
    queryFn: () => listResource<Product>('/products', optionsQuery),
  });
  const warehouses = useQuery({
    queryKey: ['/warehouses', 'invoice-options'],
    queryFn: () => listResource<Warehouse>('/warehouses', optionsQuery),
  });
  const sourceInvoices = useQuery({
    queryKey: ['/invoices', 'return-options'],
    queryFn: () => listInvoices(optionsQuery),
    enabled: isReturn,
  });
  const sourceInvoice = useQuery({
    queryKey: ['/invoices', selectedOriginalId, 'return-source'],
    queryFn: () => getInvoice(selectedOriginalId),
    enabled: isReturn && selectedOriginalId !== '',
  });
  const previousInvoices = useQuery({
    queryKey: ['/invoices', 'customer-copy-options', customerId],
    queryFn: () => listInvoices(optionsQuery, { customer_id: customerId }),
    enabled: copyInvoiceOpen && customerId !== '',
  });
  const invoiceToCopy = useQuery({
    queryKey: ['/invoices', copyInvoiceId, 'copy-source'],
    queryFn: () => getInvoice(copyInvoiceId),
    enabled: copyInvoiceOpen && copyInvoiceId !== '',
  });
  const invoiceLookup = useQuery({
    queryKey: ['/invoices', 'lookup', searchedInvoiceNumber],
    queryFn: () => listInvoices({ ...optionsQuery, search: searchedInvoiceNumber }),
    enabled: searchedInvoiceNumber !== '',
  });
  const returnsForLookup = useQuery({
    queryKey: ['/returns', 'invoice-lookup', searchedInvoiceNumber],
    queryFn: () => listReturns({ page: 1, perPage: 100, search: searchedInvoiceNumber }),
    enabled: searchedInvoiceNumber !== '',
  });
  const recentReturns = useQuery({
    queryKey: ['/returns', 'recent'],
    queryFn: () => listReturns({ page: 1, perPage: 6, search: '' }),
  });
  const treasuryAccounts = useQuery({
    queryKey: ['/treasury/accounts', 'invoice-options'],
    queryFn: () => listTreasuryAccounts(optionsQuery),
  });
  const selectedCustomer = customers.data?.data.find(
    (customer) => String(customer.id) === customerId,
  );
  const searchedInvoice = invoiceLookup.data?.data.find(
    (invoice) => invoice.invoice_number.toLowerCase() === searchedInvoiceNumber.toLowerCase(),
  );
  const linkedReturns =
    returnsForLookup.data?.data.filter(
      (item) => item.original_invoice_number?.toLowerCase() === searchedInvoiceNumber.toLowerCase(),
    ) ?? [];
  const selectedProductLines = lines
    .map((line) => ({
      line,
      product: products.data?.data.find((product) => String(product.id) === line.productId),
    }))
    .filter((item) => item.product);
  const stockWarning = selectedProductLines.find(
    ({ line, product }) =>
      product?.available_quantity !== undefined &&
      Number(line.quantity || 0) > Number(product.available_quantity),
  );
  const subtotal = lines.reduce((amount, line) => {
    const quantity = Number(line.quantity) || 0;
    const price = Number(line.unitPrice) || 0;
    return amount + quantity * price - (Number(line.discount) || 0);
  }, 0);
  const creditWarning =
    selectedCustomer?.credit_limit !== null &&
    selectedCustomer?.credit_limit !== undefined &&
    selectedCustomer?.balance_egp !== null &&
    selectedCustomer?.balance_egp !== undefined &&
    Number(selectedCustomer.balance_egp) + subtotal > Number(selectedCustomer.credit_limit);
  const setTransactionMode = (nextIsReturn: boolean) => {
    setIsReturn(nextIsReturn);
    setSearchParams(nextIsReturn ? { mode: 'return' } : {});
    setError('');
    if (!nextIsReturn) setSelectedOriginalId('');
  };
  const onCustomerChange = (nextCustomerId: string) => {
    setCustomerId(nextCustomerId);
    const numericId = Number(nextCustomerId);
    if (numericId) {
      setRecentCustomerIds((current) =>
        [numericId, ...current.filter((id) => id !== numericId)].slice(0, 5),
      );
    }
  };
  useEffect(() => {
    if (!isReturn || !sourceInvoice.data) return;
    const invoice = sourceInvoice.data;
    setCustomerId(String(invoice.customer_id));
    setLines(
      invoice.lines.map((line) => ({
        productId: line.product_id ? String(line.product_id) : '',
        productSearch: `${line.product_name} — ${line.sku ?? ''}`,
        warehouseId: line.warehouse_id
          ? String(line.warehouse_id)
          : line.location_id
            ? String(line.location_id)
            : '',
        quantity: '1',
        unitPrice: line.unit_price_egp,
        discount: line.discount_amount_egp ?? '',
        ...(line.id ? { originalLineId: line.id } : {}),
      })),
    );
  }, [isReturn, sourceInvoice.data]);
  useEffect(() => {
    let input: InvoiceInput | null = null;
    try {
      input = makeInvoiceInput(
        customerId,
        issueDate,
        paymentTerms === 'immediate' ? '' : dueDate,
        notes,
        lines,
      );
    } catch {
      setPreviewInput(null);
      return;
    }
    const timer = window.setTimeout(() => setPreviewInput(input), 300);
    return () => window.clearTimeout(timer);
  }, [customerId, issueDate, dueDate, notes, lines, paymentTerms]);
  const preview = useQuery({
    queryKey: ['/invoices/preview', previewInput],
    queryFn: () => {
      if (!previewInput) throw new Error(ar.common.requestFailed);
      return previewInvoice(previewInput);
    },
    enabled: !isReturn && previewInput !== null,
  });
  const saveInvoice = useMutation({
    mutationFn: async ({
      input,
      issue,
      collect,
    }: {
      input: InvoiceInput;
      issue: boolean;
      collect: boolean;
    }) => {
      createKey.current ??= crypto.randomUUID();
      const draft = await createInvoiceDraft(input, createKey.current);
      if (!issue) return draft;
      issueKey.current ??= crypto.randomUUID();
      const issued = await issueInvoice(draft.id, issueKey.current);
      if (collect) {
        try {
          const amount = collectionAmount || preview.data?.grand_total_egp || '';
          await createCollection(
            {
              customer_id: input.customer_id,
              treasury_account_id: positiveSafeInteger(treasuryAccountId),
              receipt_date: input.issue_date,
              amount_egp: amount,
              allocations: [{ document_id: draft.id, amount_egp: amount }],
            },
            crypto.randomUUID(),
          );
          for (const split of paymentSplits) {
            await createCollection(
              {
                customer_id: input.customer_id,
                treasury_account_id: positiveSafeInteger(split.accountId),
                receipt_date: input.issue_date,
                amount_egp: split.amount,
                allocations: [{ document_id: draft.id, amount_egp: split.amount }],
              },
              crypto.randomUUID(),
            );
          }
        } catch (cause) {
          const message = cause instanceof Error ? cause.message : ar.sales.invoiceRequestFailed;
          throw new Error(`تم إصدار الفاتورة ${issued.invoice_number} لكن تعذّر تسجيل التحصيل: ${message}`);
        }
      }
      return issued;
    },
    onSuccess: async (invoice) => {
      createKey.current = null;
      issueKey.current = null;
      setSuccess(
        invoice.status === 'issued'
          ? `${ar.sales.invoiceIssued} ${invoice.invoice_number}`
          : `${ar.sales.invoiceSaved} ${invoice.invoice_number}`,
      );
      await client.invalidateQueries({ queryKey: ['/invoices'] });
      if (invoice.status === 'issued') {
        navigate(`/invoices/${invoice.id}/print`, {
          state: { success: `${ar.sales.invoiceIssued} ${invoice.invoice_number}` },
        });
      }
    },
  });

  if (customers.isLoading || products.isLoading || warehouses.isLoading) {
    return <PageState kind="loading" />;
  }
  if (customers.isError || products.isError || warehouses.isError) {
    return (
      <PageState
        kind="error"
        message={ar.common.requestFailed}
        onRetry={() => {
          void customers.refetch();
          void products.refetch();
          void warehouses.refetch();
        }}
      />
    );
  }

  const submit = async (issue: boolean) => {
    setError('');
    setSuccess('');
    try {
      if (issue && !issuer) throw new Error('اختر مين اللي طلّع الفاتورة (كراس / أبنوب / السائق)');
      if (issue && !customerId) throw new Error('اختر العميل أولًا');
      if (issue && !lines.some((line) => line.productId && Number(line.quantity) > 0)) {
        throw new Error('اختر صنفًا واحدًا على الأقل من المخزون وحدد الكمية');
      }
      if (lines.some((line) => line.productSearch && !line.productId)) {
        throw new Error('الصنف غير موجود — اختر من القائمة أو اكتب الكود الصحيح');
      }
      if (stockWarning) throw new Error('الكمية أكبر من المتاح');
      if (creditWarning && issue && !creditConfirmed) {
        setCreditConfirmed(true);
        setError('اضغط «إصدار الفاتورة» مرة أخرى للتأكيد رغم التجاوز');
        return;
      }
      if (isReturn && !issue) {
        throw new Error('حفظ المرتجع كمسودة غير مدعوم — راجع الفاتورة الأصلية ثم أصدر المرتجع');
      }
      if (isReturn) {
        if (!selectedOriginalId || !sourceInvoice.data) {
          throw new Error('اختر الفاتورة الأصلية أولًا');
        }
        if (!lines.length || lines.some((line) => !line.originalLineId || !line.warehouseId)) {
          throw new Error('أصناف الفاتورة الأصلية غير متاحة للمرتجع');
        }
        const returnInput: ReturnInput = {
          customer_id: sourceInvoice.data.customer_id,
          issue_date: issueDate,
          original_document_id: sourceInvoice.data.id,
          notes: notes.trim() ? `سبب المرتجع: ${returnReason}\n${notes.trim()}` : `سبب المرتجع: ${returnReason}`,
          lines: lines.map((line) => ({
            warehouse_id: positiveSafeInteger(line.warehouseId),
            quantity: positiveSafeInteger(line.quantity),
            original_document_line_id: line.originalLineId,
          })),
        };
        returnKey.current ??= crypto.randomUUID();
        const created = await createReturn(returnInput, returnKey.current);
        returnKey.current = null;
        setSuccess('تم تسجيل المرتجع وإرجاع الكميات للمخزون');
        await Promise.all([
          client.invalidateQueries({ queryKey: ['/returns'] }),
          client.invalidateQueries({ queryKey: ['/invoices'] }),
          client.invalidateQueries({ queryKey: ['/inventory'] }),
        ]);
        navigate(`/returns/${created.document.id}/print`, {
          state: { success: 'تم تسجيل المرتجع وإرجاع الكميات للمخزون' },
        });
        return;
      }
      if (issue && immediateCollection) {
        if (!treasuryAccountId) throw new Error('اختر حساب الاستلام (المالية)');
        const total = Number(preview.data?.grand_total_egp ?? subtotal);
        const amounts = [collectionAmount || String(total), ...paymentSplits.map((split) => split.amount)];
        if (
          amounts.some((amount) => !amountPattern.test(amount) || Number(amount) <= 0) ||
          paymentSplits.some((split) => !split.accountId)
        ) {
          throw new Error('أدخل مبلغًا وحسابًا صحيحين لكل وسيلة دفع');
        }
        if (amounts.reduce((sum, amount) => sum + Number(amount), 0) > total) {
          throw new Error('إجمالي التحصيل أكبر من إجمالي الفاتورة');
        }
      }
      const input = makeInvoiceInput(
        customerId,
        issueDate,
        paymentTerms === 'immediate' ? '' : dueDate,
        notes,
        lines,
      );
      await saveInvoice.mutateAsync({ input, issue, collect: issue && immediateCollection });
    } catch (cause) {
      setError(
        cause instanceof ApiError
          ? cause.message
          : cause instanceof Error
            ? cause.message
            : ar.sales.invoiceRequestFailed,
      );
    }
  };

  return (
    <>
    <section className="page inventory-page invoice-create-page">
      <header className="page-heading invoice-create-heading">
        <div>
          <h1>{isReturn ? 'إنشاء فاتورة مرتجع' : ar.sales.invoiceCreateTitle}</h1>
          <p>إدارة المبيعات › {isReturn ? 'إنشاء مرتجع' : 'إنشاء فاتورة'}</p>
        </div>
        <div className="invoice-create-actions">
          <Link className="button button-quiet button-sm" to="/invoices">
            إلغاء
          </Link>
          <button
            className="button button-quiet button-sm"
            onClick={() => {
              if (previewInput) setPreviewOpen(true);
              else setError('أكمل العميل والأصناف لمعاينة الفاتورة.');
            }}
            type="button"
          >
            👁 معاينة الفاتورة
          </button>
          <button
            className="button button-quiet button-sm"
            onClick={() => setTransactionMode(!isReturn)}
            type="button"
          >
            {isReturn ? '← فاتورة بيع' : '↩ إنشاء مرتجع'}
          </button>
          <button
            className="button button-secondary button-sm"
            disabled={isReturn}
            onClick={() => void submit(false)}
            title={isReturn ? 'حفظ المرتجع كمسودة غير مدعوم' : undefined}
            type="button"
          >
            حفظ كمسودة
          </button>
          <button className="button button-primary button-sm" onClick={() => void submit(true)} type="button">
            {isReturn ? 'إصدار المرتجع' : 'إصدار الفاتورة'} <kbd>Ctrl+↵</kbd>
          </button>
        </div>
      </header>
      <form
        id="invoice-create-form"
        className="stack-form invoice-form"
        onKeyDown={(event) => {
          if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
            event.preventDefault();
            if (event.currentTarget.reportValidity()) void submit(true);
          }
        }}
        onSubmit={(event) => {
          event.preventDefault();
          void submit(false);
        }}
      >
        <section aria-labelledby="invoice-mode-title" className="invoice-form-card">
          <header className="invoice-card-heading">
            <h2 id="invoice-mode-title">نوع العملية</h2>
          </header>
          <div className="invoice-mode-grid">
            <fieldset className="invoice-toggle-field">
              <legend>هل الفاتورة مرتجع؟</legend>
              <div className="invoice-toggle-group">
                <button
                  aria-pressed={!isReturn}
                  className={!isReturn ? 'invoice-toggle-active' : ''}
                  onClick={() => setTransactionMode(false)}
                  type="button"
                >
                  فاتورة بيع
                </button>
                <button
                  aria-pressed={isReturn}
                  className={isReturn ? 'invoice-toggle-active' : ''}
                  onClick={() => setTransactionMode(true)}
                  type="button"
                >
                  مرتجع
                </button>
              </div>
            </fieldset>
            <fieldset className="invoice-toggle-field">
              <legend>هل سيتم التحصيل الآن؟</legend>
              <div className="invoice-toggle-group">
                <button
                  aria-pressed={immediateCollection}
                  className={immediateCollection ? 'invoice-toggle-active' : ''}
                  onClick={() => {
                    setImmediateCollection(true);
                    setPaymentTerms('immediate');
                    setDueDate('');
                  }}
                  type="button"
                >
                  نعم — تحصيل فوري
                </button>
                <button
                  aria-pressed={!immediateCollection}
                  className={!immediateCollection ? 'invoice-toggle-active' : ''}
                  onClick={() => {
                    setImmediateCollection(false);
                    setPaymentTerms('deferred');
                  }}
                  type="button"
                >
                  لا — آجل
                </button>
              </div>
            </fieldset>
          </div>
        </section>
        <section aria-labelledby="invoice-issuer-title" className={`invoice-form-card invoice-issuer-required${error.includes('مين اللي طلّع') ? ' invoice-field-error' : ''}`}>
          <header className="invoice-card-heading">
            <h2 id="invoice-issuer-title">مين اللي طلّع الفاتورة <span>*</span></h2>
            <span className="invoice-required-note">إجباري</span>
          </header>
          <div aria-label="مين اللي طلّع الفاتورة" className="invoice-issuer-options" role="group">
            {['كراس', 'أبنوب', 'السائق'].map((name) => (
              <button
                aria-pressed={issuer === name}
                className={issuer === name ? 'invoice-issuer-option-active' : ''}
                key={name}
                onClick={() => setIssuer(name)}
                type="button"
              >
                {name}
              </button>
            ))}
          </div>
        </section>
        {isReturn && (
          <section aria-labelledby="invoice-original-title" className="invoice-form-card">
            <header className="invoice-card-heading">
              <h2 id="invoice-original-title">الفاتورة الأصلية المرتجع منها</h2>
            </header>
            <div className="invoice-form-grid">
              <label className="form-field invoice-original-select">
                <span>الفاتورة الأصلية *</span>
                <select
                  className="input"
                  onChange={(event) => setSelectedOriginalId(event.currentTarget.value)}
                  required
                  value={selectedOriginalId}
                >
                  <option value="">— اختر الفاتورة الأصلية —</option>
                  {sourceInvoices.data?.data
                    .filter((invoice) => invoice.status === 'issued' || invoice.status === 'paid')
                    .map((invoice) => (
                      <option key={invoice.id} value={invoice.id}>
                        {invoice.invoice_number} — {invoice.customer_name}
                      </option>
                    ))}
                </select>
              </label>
              <label className="form-field">
                <span>سبب المرتجع</span>
                <select
                  className="input"
                  onChange={(event) => setReturnReason(event.currentTarget.value)}
                  value={returnReason}
                >
                  {['تالف', 'خطأ في الصنف', 'غير مطابق للطلب'].map((reason) => (
                    <option key={reason}>{reason}</option>
                  ))}
                </select>
              </label>
              {sourceInvoice.isLoading && <span role="status">{ar.app.loading}</span>}
              {sourceInvoice.isError && (
                <p className="field-error" role="alert">{ar.common.requestFailed}</p>
              )}
            </div>
          </section>
        )}
        <section aria-labelledby="invoice-customer-title" className={`invoice-form-card${error.includes('العميل') ? ' invoice-field-error' : ''}`}>
          <header className="invoice-card-heading">
            <h2 id="invoice-customer-title">العميل</h2>
          </header>
          <label className="form-field">
            <span>{ar.common.customer} *</span>
            <select
              aria-label={ar.common.customer}
              className="input"
              onChange={(event) => onCustomerChange(event.currentTarget.value)}
              required
              value={customerId}
            >
              <option value="">— اختر العميل —</option>
              {customers.data?.data.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name} — {customer.phone ?? ''}
                </option>
              ))}
            </select>
          </label>
          {recentCustomerIds.length > 0 && (
            <div aria-label="آخر العملاء" className="invoice-recent-customers">
              {recentCustomerIds.map((id) => {
                const customer = customers.data?.data.find((item) => item.id === id);
                return customer ? (
                  <button
                    className={customerId === String(id) ? 'invoice-recent-customer-active' : ''}
                    key={id}
                    onClick={() => onCustomerChange(String(id))}
                    type="button"
                  >
                    {customer.name}
                  </button>
                ) : null;
              })}
            </div>
          )}
          <div className="invoice-customer-facts">
            <label>
              <span>رقم الهاتف</span>
              <input className="input" disabled value={selectedCustomer?.phone ?? '—'} />
            </label>
            <label>
              <span>الرصيد المستحق الحالي</span>
              <input
                className="input"
                disabled
                value={selectedCustomer?.balance_egp ? formatMoney(selectedCustomer.balance_egp) : '—'}
              />
            </label>
            <label>
              <span>حد الائتمان</span>
              <input
                className="input"
                disabled
                value={selectedCustomer?.credit_limit ? formatMoney(selectedCustomer.credit_limit) : '—'}
              />
            </label>
          </div>
        </section>
        <section aria-labelledby="invoice-data-title" className="invoice-form-card">
          <header className="invoice-card-heading">
            <h2 id="invoice-data-title">بيانات الفاتورة</h2>
          </header>
          <div className="invoice-form-grid">
            <label className="form-field">
              <span>{ar.common.date}</span>
              <input className="input" disabled value={issueDate} />
            </label>
            <label className="form-field">
              <span>الوقت</span>
              <input className="input" disabled value={new Intl.DateTimeFormat('ar-EG', { hour: '2-digit', minute: '2-digit' }).format(new Date())} />
            </label>
            <label className="form-field">
              <span>رقم الفاتورة</span>
              <input className="input" disabled value="يُنشأ تلقائيًا عند الحفظ" />
            </label>
            <label className="form-field">
              <span>شروط الدفع</span>
              <select
                className="input"
                onChange={(event) => {
                  const terms = event.currentTarget.value as 'immediate' | 'deferred';
                  setPaymentTerms(terms);
                  setDueDate(terms === 'immediate' ? '' : dueDate);
                  setImmediateCollection(terms === 'immediate');
                }}
                value={paymentTerms}
              >
                <option value="immediate">فوري</option>
                <option value="deferred">آجل</option>
              </select>
            </label>
            {paymentTerms === 'deferred' && (
              <FormField
                id="invoice-due-date"
                label={ar.sales.dueDate}
                onChange={(event) => setDueDate(event.currentTarget.value)}
                type="date"
                value={dueDate}
              />
            )}
          </div>
          <details className="invoice-extra-options" open={additionalOptions} onToggle={(event) => setAdditionalOptions(event.currentTarget.open)}>
            <summary>{additionalOptions ? '▾' : '▸'} خيارات إضافية (السائق، المخزن)</summary>
            <div className="invoice-form-grid">
              <label className="form-field">
                <span>السائق / المندوب</span>
                <input className="input" onChange={(event) => setDriverName(event.currentTarget.value)} placeholder="اختياري" value={driverName} />
              </label>
              <label className="form-field">
                <span>الجهة المصدّرة</span>
                <select className="input" onChange={(event) => setIssuerOrganization(event.currentTarget.value)} value={issuerOrganization}>
                  <option>MASTER</option>
                </select>
              </label>
              <label className="form-field">
                <span>المستودع الافتراضي (خيارات إضافية)</span>
                <select
                  aria-label="المستودع الافتراضي — الخيارات الإضافية"
                  className="input"
                  onChange={(event) => setWarehouseId(event.currentTarget.value)}
                  value={warehouseId}
                >
                  <option value="">اختر المستودع</option>
                  {warehouses.data?.data.map((warehouse) => (
                    <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>
                  ))}
                </select>
              </label>
            </div>
          </details>
        </section>
        <section aria-labelledby="invoice-lines-title" className="invoice-form-card invoice-lines-card">
          <header className="invoice-card-heading invoice-lines-toolbar">
            <h2 id="invoice-lines-title">الأصناف</h2>
            <div>
              <button
                className="button button-quiet button-sm"
                disabled={!customerId}
                onClick={() => setCopyInvoiceOpen(true)}
                type="button"
              >
                📋 نسخ من فاتورة سابقة لنفس العميل
              </button>
              <button className="button button-primary button-sm" onClick={() => setLines((current) => [...current, emptyLine()])} type="button">
                + إضافة صنف
              </button>
            </div>
          </header>
          {stockWarning && (
            <p className="invoice-stock-alert" role="alert">
              ⛔ {stockWarning.product?.name}: المتاح {stockWarning.product?.available_quantity}
            </p>
          )}
          {creditWarning && (
            <p className="invoice-credit-alert" role="status">
              ⚠️ تجاوز الحد الائتماني
            </p>
          )}
        <div className="invoice-line-list">
          {lines.map((line, index) => (
            <fieldset className="invoice-line-editor" key={index}>
              <legend>
                # {index + 1}
              </legend>
              <div className={`form-field invoice-product-search${line.productSearch && !products.data?.data.some((product) =>
                [product.name, product.sku, product.barcode, `${product.name} — ${product.sku}`]
                  .filter(Boolean)
                  .some((value) => value?.toLowerCase() === line.productSearch.toLowerCase()),
              ) ? ' invoice-field-error' : ''}`}>
                <label htmlFor={`invoice-product-${index}`}>اسم الصنف — ابحث بالاسم أو الكود أو الباركود</label>
                <input
                  aria-label={index === 0 ? ar.common.product : `${ar.common.product} ${index + 1}`}
                  className="input"
                  id={`invoice-product-${index}`}
                  onChange={(event) => {
                    const search = event.currentTarget.value;
                    const product = products.data?.data.find((item) =>
                      [item.name, item.sku, item.barcode, `${item.name} — ${item.sku}`]
                        .filter(Boolean)
                        .some((value) => value?.toLowerCase() === search.toLowerCase()),
                    );
                    updateLine(index, 'productSearch', search);
                    updateLine(index, 'productId', product ? String(product.id) : '');
                    if (product?.company_price) updateLine(index, 'unitPrice', product.company_price);
                  }}
                  list={`invoice-products-${index}`}
                  placeholder="اكتب اسم الصنف أو الكود أو امسح الباركود"
                  required
                  value={line.productSearch}
                />
                <datalist id={`invoice-products-${index}`}>
                  {products.data?.data.map((product) => (
                    <option key={`${product.id}-name`} value={`${product.name} — ${product.sku}`} />
                  ))}
                  {products.data?.data.map((product) => (
                    <option key={`${product.id}-sku`} value={product.sku} />
                  ))}
                  {products.data?.data.filter((product) => product.barcode).map((product) => (
                    <option key={`${product.id}-barcode`} value={product.barcode ?? ''} />
                  ))}
                </datalist>
                {line.productSearch && !line.productId && (
                  <small className="field-error">الصنف غير موجود — اختر من القائمة أو اكتب الكود الصحيح</small>
                )}
                <small className="invoice-field-hint">
                  {products.data?.data.find((product) => String(product.id) === line.productId)?.available_quantity
                    ? `المتاح في المخزن: ${products.data.data.find((product) => String(product.id) === line.productId)?.available_quantity}`
                    : 'اختر صنفًا لعرض الكمية المتاحة'}
                </small>
              </div>
              <label className="form-field">
                <span>الفئة</span>
                <input
                  className="input"
                  disabled
                  value={
                    products.data?.data.find((product) => String(product.id) === line.productId)?.category_name ??
                    '—'
                  }
                />
              </label>
              <label className="form-field">
                <span>{ar.common.warehouse}</span>
                <select
                  className="input"
                  onChange={(event) => updateLine(index, 'warehouseId', event.currentTarget.value)}
                  required
                  value={line.warehouseId}
                >
                  <option disabled value="">
                    {ar.sales.selectWarehouse}
                  </option>
                  {warehouses.data?.data.map((warehouse) => (
                    <option key={warehouse.id} value={warehouse.id}>
                      {warehouse.name}
                    </option>
                  ))}
                </select>
              </label>
              <FormField
                id={`invoice-quantity-${index}`}
                inputMode="numeric"
                label={ar.sales.quantity}
                min="1"
                onChange={(event) => updateLine(index, 'quantity', event.currentTarget.value)}
                pattern="[1-9][0-9]*"
                required
                value={line.quantity}
              />
              <label className="form-field">
                <span>{ar.sales.unitPrice}</span>
                <input
                  aria-label={`${ar.sales.unitPrice} ${index + 1}`}
                  className="input"
                  inputMode="decimal"
                  onChange={(event) => updateLine(index, 'unitPrice', event.currentTarget.value)}
                  pattern="^(0|[1-9][0-9]{0,14})(\.[0-9]{1,4})?$"
                  readOnly={
                    !isReturn &&
                    products.data?.data.find((product) => String(product.id) === line.productId)?.company_price !=
                      null
                  }
                  required
                  title="سعر الشركة — تلقائي ولا يُعدَّل"
                  value={line.unitPrice}
                />
                <small className="invoice-field-hint">سعر الشركة — تلقائي ولا يُعدَّل</small>
              </label>
              <button
                className="invoice-line-total"
                onClick={() => setDiscountWarning('سعر الوحدة ثابت على سعر الشركة')}
                type="button"
              >
                {formatMoney(
                  String(
                    (Number(line.quantity) || 0) * (Number(line.unitPrice) || 0) -
                      (Number(line.discount) || 0),
                  ),
                )}
              </button>
              <FormField
                id={`invoice-discount-${index}`}
                inputMode="decimal"
                label={ar.sales.discountAmount}
                onChange={(event) => updateLine(index, 'discount', event.currentTarget.value)}
                pattern="^(0|[1-9][0-9]{0,14})(\.[0-9]{1,4})?$"
                value={line.discount}
              />
              <button
                aria-label={`حذف الصنف ${index + 1}`}
                className="icon-button invoice-remove-line"
                onClick={() => setLines((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                type="button"
              >
                🗑
              </button>
            </fieldset>
          ))}
        </div>
        </section>
        {discountWarning && <p className="invoice-list-notice" role="status">{discountWarning}</p>}
        <div className="invoice-bottom-grid">
          <section aria-labelledby="invoice-account-title" className="invoice-form-card">
            <header className="invoice-card-heading">
              <h2 id="invoice-account-title">الحساب</h2>
            </header>
            <dl className="invoice-account-list">
              <div>
                <dt>الإجمالي الفرعي</dt>
                <dd>{preview.data ? formatMoney(preview.data.subtotal_egp) : formatMoney(subtotal.toFixed(2))}</dd>
              </div>
              <div>
                <dt>الدفع</dt>
                <dd>
                  <input
                    aria-label="الدفع"
                    className="input invoice-payment-amount"
                    inputMode="decimal"
                    onChange={(event) => setCollectionAmount(event.currentTarget.value)}
                    value={collectionAmount}
                  />
                </dd>
              </div>
              <div className="invoice-balance-row">
                <dt>المتبقي</dt>
                <dd>{formatMoney(
                  (Number(preview.data?.grand_total_egp ?? subtotal.toFixed(2)) -
                    Number(collectionAmount || 0)).toFixed(2),
                )}</dd>
              </div>
              <div className="invoice-grand-total-row">
                <dt>الإجمالي النهائي</dt>
                <dd>{preview.data ? formatMoney(preview.data.grand_total_egp) : formatMoney(subtotal.toFixed(2))}</dd>
              </div>
            </dl>
            <p className="invoice-account-hint">
              سعر الوحدة ثابت على سعر الشركة. الخصم يُسجَّل على الصنف؛ تعديل الإجمالي يدويًا غير متاح عبر واجهة الخادم الحالية.
            </p>
            {immediateCollection && (
              <div className="invoice-collection-fields">
                <label className="form-field">
                  <span>المبلغ المحصّل</span>
                  <input
                    className="input"
                    inputMode="decimal"
                    onChange={(event) => setCollectionAmount(event.currentTarget.value)}
                    value={collectionAmount || preview.data?.grand_total_egp || ''}
                  />
                </label>
                <label className="form-field">
                  <span>وسيلة الدفع</span>
                  <select
                    className="input"
                    onChange={(event) => {
                      setCollectionMethod(event.currentTarget.value as 'cash' | 'bank' | 'cheque');
                      setTreasuryAccountId('');
                    }}
                    value={collectionMethod}
                  >
                    <option value="cash">كاش — الخزينة الرئيسية</option>
                    <option value="bank">تحويل بنكي</option>
                    <option value="cheque">شيك</option>
                  </select>
                </label>
                <label className="form-field">
                  <span>حساب الاستلام (المالية)</span>
                  <select
                    className="input"
                    onChange={(event) => setTreasuryAccountId(event.currentTarget.value)}
                    required
                    value={treasuryAccountId}
                  >
                    <option value="">اختر حساب الاستلام</option>
                    {treasuryAccounts.data?.data
                      .filter(
                        (account) =>
                          account.is_active &&
                          account.account_type ===
                            (collectionMethod === 'cheque' ? 'other' : collectionMethod),
                      )
                      .map((account) => (
                        <option key={account.id} value={account.id}>
                          {account.name}
                        </option>
                      ))}
                  </select>
                </label>
                {paymentSplits.map((split, index) => (
                  <div className="invoice-payment-split" key={index}>
                    <select
                      aria-label={`حساب الدفع الإضافي ${index + 1}`}
                      className="input"
                      onChange={(event) =>
                        setPaymentSplits((current) =>
                          current.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, accountId: event.currentTarget.value } : item,
                          ),
                        )
                      }
                      value={split.accountId}
                    >
                      <option value="">اختر الحساب</option>
                      {treasuryAccounts.data?.data.map((account) => (
                        <option key={account.id} value={account.id}>{account.name}</option>
                      ))}
                    </select>
                    <input
                      aria-label={`مبلغ الدفع الإضافي ${index + 1}`}
                      className="input"
                      onChange={(event) =>
                        setPaymentSplits((current) =>
                          current.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, amount: event.currentTarget.value } : item,
                          ),
                        )
                      }
                      value={split.amount}
                    />
                    <button
                      className="button button-quiet button-sm"
                      onClick={() => setPaymentSplits((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                      type="button"
                    >
                      حذف
                    </button>
                  </div>
                ))}
                <button
                  className="invoice-text-action"
                  onClick={() => setPaymentSplits((current) => [...current, { accountId: '', amount: '' }])}
                  type="button"
                >
                  + تقسيم الدفع على وسيلة أخرى
                </button>
              </div>
            )}
          </section>
          <section aria-labelledby="invoice-notes-title" className="invoice-form-card">
            <header className="invoice-card-heading">
              <h2 id="invoice-notes-title">ملاحظات</h2>
            </header>
            <label className="form-field" htmlFor="invoice-notes">
              <span>{ar.sales.notes}</span>
              <textarea
                className="input"
                id="invoice-notes"
                placeholder="اكتب أي ملاحظة تظهر أسفل الأصناف في الفاتورة"
                onChange={(event) => setNotes(event.currentTarget.value)}
                rows={6}
                value={notes}
              />
            </label>
          </section>
        </div>
        <section aria-labelledby="invoice-preview-heading" className="invoice-preview-waiting">
          <header className="invoice-card-heading">
            <h2 id="invoice-preview-heading">{ar.sales.previewWaiting}</h2>
          </header>
          {preview.isFetching ? (
            <p role="status">{ar.app.loading}</p>
          ) : preview.isError ? (
            <p className="field-error" role="alert">
              {preview.error instanceof ApiError
                ? preview.error.message
                : ar.common.requestFailed}
            </p>
          ) : preview.data ? (
            <dl className="invoice-detail-summary">
              <div>
                <dt>{ar.sales.previewSubtotal}</dt>
                <dd>{formatMoney(preview.data.subtotal_egp)}</dd>
              </div>
              <div>
                <dt>{ar.sales.previewDiscount}</dt>
                <dd>{formatMoney(preview.data.discount_amount_egp)}</dd>
              </div>
              <div>
                <dt>{ar.sales.previewTax}</dt>
                <dd>{formatMoney(preview.data.tax_amount_egp)}</dd>
              </div>
              <div>
                <dt>{ar.sales.previewTotal}</dt>
                <dd>{formatMoney(preview.data.grand_total_egp)}</dd>
              </div>
            </dl>
          ) : (
            <p>{ar.sales.previewWaitingMessage}</p>
          )}
          {immediateCollection && (
            <button className="button button-primary" onClick={() => void submit(true)} type="button">
              حفظ الفاتورة وتسجيل التحصيل
            </button>
          )}
        </section>
        <section aria-labelledby="invoice-returns-title" className="invoice-form-card invoice-recent-returns">
          <header className="invoice-card-heading">
            <h2 id="invoice-returns-title">المرتجعات — هل لفاتورة مرتجع؟</h2>
          </header>
          <div className="invoice-return-search">
            <input
              aria-label="رقم الفاتورة للبحث عن مرتجعاتها"
              className="input"
              onChange={(event) => setInvoiceSearchNumber(event.currentTarget.value)}
              placeholder="رقم الفاتورة (مثال INV-2026-005)"
              value={invoiceSearchNumber}
            />
            <button
              className="button button-primary button-sm"
              disabled={!invoiceSearchNumber.trim()}
              onClick={() => setSearchedInvoiceNumber(invoiceSearchNumber.trim())}
              type="button"
            >
              بحث
            </button>
            <Link className="button button-quiet button-sm" to="/returns">كل المرتجعات</Link>
          </div>
          {searchedInvoiceNumber && (
            <div className="invoice-return-lookup" aria-live="polite">
              {invoiceLookup.isFetching || returnsForLookup.isFetching ? (
                <p role="status">{ar.app.loading}</p>
              ) : invoiceLookup.isError || returnsForLookup.isError ? (
                <p className="field-error" role="alert">{ar.common.requestFailed}</p>
              ) : searchedInvoice ? (
                <>
                  <p>
                    {searchedInvoice.invoice_number} — {searchedInvoice.customer_name} —{' '}
                    {formatDate(searchedInvoice.issue_date)} — إجمالي{' '}
                    {searchedInvoice.total_egp ? formatMoney(searchedInvoice.total_egp) : '—'}
                  </p>
                  {linkedReturns.length ? (
                    <p className="invoice-credit-alert">
                      ⚠ لها {linkedReturns.length} مرتجع بقيمة{' '}
                      {formatMoney(
                        linkedReturns.reduce((sum, item) => sum + Number(item.amount_egp ?? 0), 0).toFixed(2),
                      )}
                      :{' '}
                      {linkedReturns.map((item) => (
                        <Link key={item.id} to={`/returns/${item.id}/print`}>{item.return_number} </Link>
                      ))}
                    </p>
                  ) : (
                    <p className="inline-success">لا يوجد عليها مرتجع</p>
                  )}
                  <button
                    className="button button-secondary button-sm"
                    onClick={() => {
                      setTransactionMode(true);
                      setSelectedOriginalId(String(searchedInvoice.id));
                    }}
                    type="button"
                  >
                    ↩ إنشاء مرتجع لهذه الفاتورة
                  </button>
                </>
              ) : (
                <p className="field-error">لا توجد فاتورة بيع بهذا الرقم</p>
              )}
            </div>
          )}
          <h3>آخر المرتجعات</h3>
          {recentReturns.isLoading ? (
            <p role="status">{ar.app.loading}</p>
          ) : recentReturns.isError ? (
            <p className="field-error" role="alert">{ar.common.requestFailed}</p>
          ) : recentReturns.data?.data.length ? (
            <ul>
              {recentReturns.data.data.slice(0, 6).map((item) => (
                <li key={item.id}>
                  <Link to={`/returns/${item.id}/print`}>
                    {item.return_number} — {item.customer_name} — {item.amount_egp ? formatMoney(item.amount_egp) : '—'} — على {item.original_invoice_number ?? '—'}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p>لا توجد مرتجعات مسجلة حتى الآن.</p>
          )}
        </section>
        {error && (
          <p className="field-error" role="alert">
            {error}
          </p>
        )}
        {success && (
          <p className="inline-success" role="status">
            {success}
          </p>
        )}
        <div className="modal-actions">
          <button
            className="button button-secondary"
            disabled={saveInvoice.isPending}
            type="submit"
          >
            {ar.sales.saveDraft}
          </button>
          <button
            className="button button-primary"
            disabled={saveInvoice.isPending}
            onClick={(event) => {
              const form = event.currentTarget.form;
              if (form?.reportValidity()) void submit(true);
            }}
            type="button"
          >
            {saveInvoice.isPending ? ar.app.loading : ar.sales.issueNow}
          </button>
        </div>
      </form>
    </section>
    <Modal
      onClose={() => setPreviewOpen(false)}
      open={previewOpen}
      title="معاينة الفاتورة"
    >
      {preview.isFetching ? (
        <p role="status">{ar.app.loading}</p>
      ) : preview.isError ? (
        <p className="field-error" role="alert">{ar.common.requestFailed}</p>
      ) : preview.data ? (
        <div className="invoice-preview-modal">
          <p>{selectedCustomer?.name ?? '—'}</p>
          <p>{lines.length} صنف</p>
          <strong>{formatMoney(preview.data.grand_total_egp)}</strong>
        </div>
      ) : (
        <p>{ar.sales.previewWaitingMessage}</p>
      )}
    </Modal>
    <Modal
      onClose={() => {
        setCopyInvoiceOpen(false);
        setCopyInvoiceId('');
      }}
      open={copyInvoiceOpen}
      title="نسخ الأصناف من فاتورة سابقة"
    >
      {previousInvoices.isLoading ? (
        <p role="status">{ar.app.loading}</p>
      ) : previousInvoices.isError ? (
        <p className="field-error" role="alert">{ar.common.requestFailed}</p>
      ) : (
        <label className="form-field">
          <span>اختر فاتورة للعميل</span>
          <select
            className="input"
            onChange={(event) => setCopyInvoiceId(event.currentTarget.value)}
            value={copyInvoiceId}
          >
            <option value="">— اختر الفاتورة —</option>
            {previousInvoices.data?.data
              .filter((invoice) => invoice.status === 'issued' || invoice.status === 'paid')
              .map((invoice) => (
                <option key={invoice.id} value={invoice.id}>
                  {invoice.invoice_number} — {formatDate(invoice.issue_date)}
                </option>
              ))}
          </select>
        </label>
      )}
      {invoiceToCopy.isError && (
        <p className="field-error" role="alert">{ar.common.requestFailed}</p>
      )}
      <div className="modal-actions">
        <button
          className="button button-secondary"
          onClick={() => {
            setCopyInvoiceOpen(false);
            setCopyInvoiceId('');
          }}
          type="button"
        >
          إلغاء
        </button>
        <button
          className="button button-primary"
          disabled={!invoiceToCopy.data || invoiceToCopy.isFetching}
          onClick={() => {
            if (!invoiceToCopy.data) return;
            setLines(
              invoiceToCopy.data.lines.map((line) => ({
                productId: line.product_id ? String(line.product_id) : '',
                productSearch: `${line.product_name} — ${line.sku ?? ''}`,
                warehouseId: line.warehouse_id
                  ? String(line.warehouse_id)
                  : line.location_id
                    ? String(line.location_id)
                    : '',
                quantity: line.quantity,
                unitPrice: line.unit_price_egp,
                discount: line.discount_amount_egp ?? '',
              })),
            );
            setCopyInvoiceOpen(false);
            setCopyInvoiceId('');
          }}
          type="button"
        >
          نسخ الأصناف
        </button>
      </div>
    </Modal>
    </>
  );
}
