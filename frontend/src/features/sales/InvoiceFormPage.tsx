import { newIdempotencyKey } from '../../shared/api/http';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { ApiError } from '../../shared/api/errors';
import { useAuth } from '../../shared/auth/AuthProvider';
import { FormField } from '../../shared/components/FormField';
import { Modal } from '../../shared/components/Modal';
import { PageState } from '../../shared/components/PageState';
import { ar } from '../../shared/i18n/ar';
import type { Customer } from '../customers/api';
import { listGovernorates } from '../customers/api';
import { listAllResources, listResource, type ListQuery, type Warehouse } from '../inventory/api';
import { invalidateInventoryQueries } from '../inventory/cache';
import {
  createReturn,
  createInvoiceDraft,
  getCustomerLastPrices,
  getInvoiceIssuerOptions,
  getInvoice,
  issueInvoice,
  listInvoices,
  listInvoiceProducts,
  listReturns,
  previewInvoice,
  type InvoiceInput,
  type InvoiceLineInput,
} from './api';
import { formatDate, formatMoney } from '../../shared/utils/format';
import { centsToMoney, isPositiveMoney, moneyToCents, multiplyCents, percentOfCents, proportionalShareCents, quantityAsBigInt } from '../../shared/utils/money';
import type { ReturnInput } from './api';
import { listTreasuryAccounts } from '../finance/api';

type InvoiceLineDraft = {
  productId: string;
  description: string;
  warehouseId: string;
  quantity: string;
  unitPrice: string;
  discount: string;
  returnCondition?: 'good' | 'damaged';
  originalLineId?: number;
};

type InvoiceFormPageProps = { initialMode?: 'sale' | 'return' };

type InvoiceCompositionState = {
  customerId: string;
  issueDate: string;
  dueDate: string;
  notes: string;
  lines: InvoiceLineDraft[];
  issuer: 'company' | 'partner' | 'driver' | '';
  issuerId: string;
  paymentTerms: 'immediate' | 'deferred';
  immediateCollection: boolean;
  paymentSplits: { accountId: string; amount: string }[];
  treasuryAccountId: string;
  collectionAmount: string;
  collectionMethod: 'cash' | 'bank' | 'cheque';
  invoiceDiscountType: 'fixed' | 'percent';
  invoiceDiscountValue: string;
  driverName: string;
  shippingDriverId: string;
  shippingCompany: string;
  invoiceGovernorate: string;
  issuerOrganization: string;
  warehouseId: string;
};

type InvoiceCompositionDraft = { state: InvoiceCompositionState; fields: Record<string, string> };

function readInvoiceCompositionDraft(key: string): InvoiceCompositionDraft | null {
  try {
    const value = localStorage.getItem(key);
    if (!value) return null;
    const parsed = JSON.parse(value) as InvoiceCompositionDraft;
    return parsed && typeof parsed === 'object' && parsed.state && parsed.fields ? parsed : null;
  } catch {
    return null;
  }
}

const optionsQuery: ListQuery = { page: 1, perPage: 100, search: '' };
const emptyLine = (): InvoiceLineDraft => ({
  productId: '',
  description: '',
  warehouseId: '',
  quantity: '1',
  unitPrice: '',
  discount: '',
});

function defaultSalesWarehouse(warehouses: Warehouse[]): Warehouse | undefined {
  return warehouses.find((warehouse) => warehouse.is_active && warehouse.location_type === 'main')
    ?? warehouses.find((warehouse) => warehouse.is_active && warehouse.location_type !== 'damaged');
}
const amountPattern = /^(0|[1-9][0-9]{0,14})(\.[0-9]{1,4})?$/;

function localDate(daysOffset = 0): string {
  const date = new Date();
  date.setDate(date.getDate() + daysOffset);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

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
  issuer: 'company' | 'partner' | 'driver' | '',
  issuerId: string,
  paymentTerms: 'immediate' | 'deferred',
  issuerOrganization: string,
  shippingDriverId: string,
  shippingDriverName: string,
  shippingCompany: string,
  governorate: string | null,
  discountType: 'fixed' | 'percent',
  discountValue: string,
): InvoiceInput {
  if (!lines.length) throw new Error(ar.sales.atLeastOneLine);
  if (!issuer) throw new Error('اختر مين اللي طلّع الفاتورة');
  if ((issuer === 'partner' || issuer === 'driver') && !issuerId) throw new Error('اختر اسم مُصدر الفاتورة');
  if (!amountPattern.test(discountValue || '0') || (discountType === 'percent' && moneyToCents(discountValue) > 10000n)) {
    throw new Error('أدخل خصمًا صحيحًا لا يتجاوز 100٪.');
  }
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
    if (line.description.trim()) lineInput.description = line.description.trim();
    return lineInput;
  });
  return {
    customer_id: positiveSafeInteger(customerId),
    issuer_type: issuer,
    ...(issuer === 'partner' ? { issuer_partner_id: positiveSafeInteger(issuerId) } : {}),
    ...(issuer === 'driver' ? { issuer_driver_id: positiveSafeInteger(issuerId) } : {}),
    issuer_company: issuerOrganization || 'ماستر',
    payment_terms: paymentTerms,
    ...(shippingDriverId ? { shipping_driver_id: positiveSafeInteger(shippingDriverId) } : {}),
    shipping_driver_name: shippingDriverName || null,
    shipping_company: shippingCompany || null,
    governorate,
    issue_date: issueDate,
    due_date: paymentTerms === 'immediate' ? issueDate : dueDate || null,
    notes: notes.trim() || null,
    discount_type: discountType,
    discount_value: discountValue || '0',
    lines: inputLines,
  };
}

export function InvoiceFormPage({ initialMode }: InvoiceFormPageProps = {}) {
  const { user } = useAuth();
  const client = useQueryClient();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const returnModeRequested = initialMode === 'return' || searchParams.get('mode') === 'return';
  const invoiceDraftKey = `precision-slate:invoice-compose:${user?.id ?? 'user'}:${returnModeRequested ? 'return' : 'sale'}`;
  const savedComposition = useRef(readInvoiceCompositionDraft(invoiceDraftKey));
  const [customerId, setCustomerId] = useState(() => savedComposition.current?.state.customerId ?? '');
  const [issueDate] = useState(() => savedComposition.current?.state.issueDate ?? localDate());
  const [dueDate, setDueDate] = useState(() => savedComposition.current?.state.dueDate ?? localDate(30));
  const [notes, setNotes] = useState(() => savedComposition.current?.state.notes ?? '');
  const [lines, setLines] = useState<InvoiceLineDraft[]>(() => savedComposition.current?.state.lines ?? [emptyLine()]);
  const [previewInput, setPreviewInput] = useState<InvoiceInput | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [issuer, setIssuer] = useState<'company' | 'partner' | 'driver' | ''>(() => savedComposition.current?.state.issuer ?? '');
  const [issuerId, setIssuerId] = useState(() => savedComposition.current?.state.issuerId ?? '');
  const [isReturn, setIsReturn] = useState(
    initialMode === 'return' || searchParams.get('mode') === 'return',
  );
  const [immediateCollection, setImmediateCollection] = useState(() => savedComposition.current?.state.immediateCollection ?? false);
  const [paymentTerms, setPaymentTerms] = useState<'immediate' | 'deferred'>(() => savedComposition.current?.state.paymentTerms ?? 'deferred');
  const [additionalOptions, setAdditionalOptions] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [copyInvoiceOpen, setCopyInvoiceOpen] = useState(false);
  const [copyInvoiceId, setCopyInvoiceId] = useState('');
  const [selectedOriginalId, setSelectedOriginalId] = useState('');
  const [returnReason, setReturnReason] = useState<'damaged' | 'wrong_item' | 'not_as_ordered'>('damaged');
  const [creditConfirmed, setCreditConfirmed] = useState(false);
  const [priceWarningConfirmed, setPriceWarningConfirmed] = useState(false);
  const [recentCustomerIds, setRecentCustomerIds] = useState<number[]>([]);
  const [paymentSplits, setPaymentSplits] = useState<{ accountId: string; amount: string }[]>(() => savedComposition.current?.state.paymentSplits ?? []);
  const [treasuryAccountId, setTreasuryAccountId] = useState(() => savedComposition.current?.state.treasuryAccountId ?? '');
  const [collectionAmount, setCollectionAmount] = useState(() => savedComposition.current?.state.collectionAmount ?? '');
  const [collectionMethod, setCollectionMethod] = useState<'cash' | 'bank' | 'cheque'>(() => savedComposition.current?.state.collectionMethod ?? 'cash');
  const [invoiceDiscountType, setInvoiceDiscountType] = useState<'fixed' | 'percent'>(() => savedComposition.current?.state.invoiceDiscountType ?? 'fixed');
  const [invoiceDiscountValue, setInvoiceDiscountValue] = useState(() => savedComposition.current?.state.invoiceDiscountValue ?? '0');
  const [driverName, setDriverName] = useState(() => savedComposition.current?.state.driverName ?? '');
  const [shippingDriverId, setShippingDriverId] = useState(() => savedComposition.current?.state.shippingDriverId ?? '');
  const [shippingCompany, setShippingCompany] = useState(() => savedComposition.current?.state.shippingCompany ?? '');
  const [invoiceGovernorate, setInvoiceGovernorate] = useState(() => savedComposition.current?.state.invoiceGovernorate ?? '');
  const [issuerOrganization, setIssuerOrganization] = useState(() => savedComposition.current?.state.issuerOrganization ?? 'ماستر');
  const [warehouseId, setWarehouseId] = useState(() => savedComposition.current?.state.warehouseId ?? '');
  const [invoiceSearchNumber, setInvoiceSearchNumber] = useState('');
  const [searchedInvoiceNumber, setSearchedInvoiceNumber] = useState('');
  const createKey = useRef<string | null>(null);
  const issueKey = useRef<string | null>(null);
  const returnKey = useRef<string | null>(null);
  const submitInFlight = useRef(false);
  const invoiceFormRef = useRef<HTMLFormElement>(null);
  const compositionRestored = useRef(false);
  const [draftRevision, setDraftRevision] = useState(0);
  const persistComposition = () => {
    if (!compositionRestored.current || isReturn) return;
    const form = invoiceFormRef.current;
    if (!form) return;
    const fields = Object.fromEntries(
      Array.from(new FormData(form).entries()).map(([name, value]) => [name, typeof value === 'string' ? value : '']),
    );
    const state: InvoiceCompositionState = {
      customerId, issueDate, dueDate, notes, lines, issuer, issuerId, paymentTerms,
      immediateCollection, paymentSplits, treasuryAccountId, collectionAmount, collectionMethod,
      invoiceDiscountType, invoiceDiscountValue, driverName, shippingDriverId, shippingCompany,
      invoiceGovernorate, issuerOrganization, warehouseId,
    };
    try {
      localStorage.setItem(invoiceDraftKey, JSON.stringify({ state, fields } satisfies InvoiceCompositionDraft));
    } catch {
      // The server draft remains available when local storage is unavailable.
    }
  };
  const updateLine = (index: number, field: keyof InvoiceLineDraft, value: string) => {
    setCreditConfirmed(false);
    setPriceWarningConfirmed(false);
    setLines((current) =>
      current.map((item, itemIndex) => (itemIndex === index ? { ...item, [field]: value } : item)),
    );
  };
  const customers = useQuery({
    queryKey: ['/customers', 'invoice-options'],
    queryFn: () => listResource<Customer>('/customers', optionsQuery),
  });
  const products = useQuery({
    queryKey: ['/products', 'invoice-options', 'all'],
    queryFn: listInvoiceProducts,
  });
  const warehouses = useQuery({
    queryKey: ['/warehouses', 'invoice-options'],
    queryFn: () => listAllResources<Warehouse>('/warehouses', optionsQuery),
  });
  const invoiceIssuers = useQuery({
    queryKey: ['/invoice-issuers'],
    queryFn: getInvoiceIssuerOptions,
  });
  const recentCustomerInvoices = useQuery({
    queryKey: ['/invoices', 'recent-customer-options'],
    queryFn: () => listInvoices({ page: 1, perPage: 100, search: '' }),
  });
  const governorates = useQuery({
    queryKey: ['/reference/governorates', 'invoice-options'],
    queryFn: () => listGovernorates(optionsQuery),
  });
  const customerPrices = useQuery({
    queryKey: ['/customers', customerId, 'last-prices'],
    queryFn: () => getCustomerLastPrices(customerId),
    enabled: customerId !== '',
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
  useEffect(() => {
    if (compositionRestored.current || isReturn) return;
    const form = invoiceFormRef.current;
    if (!form) return;
    const saved = savedComposition.current;
    if (saved) {
      for (const field of Array.from(form.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>('[name]'))) {
        const value = saved.fields[field.name];
        if (value === undefined) continue;
        if (field instanceof HTMLInputElement && (field.type === 'checkbox' || field.type === 'radio')) {
          field.checked = value === 'on' || value === 'true';
        } else {
          field.value = value;
        }
      }
    }
    compositionRestored.current = true;
    setDraftRevision((revision) => revision + 1);
  }, [customers.isLoading, governorates.isLoading, invoiceIssuers.isLoading, isReturn, products.isLoading, warehouses.isLoading]);
  useEffect(() => {
    if (!compositionRestored.current || isReturn) return;
    const form = invoiceFormRef.current;
    if (!form) return;
    const fields = Object.fromEntries(
      Array.from(new FormData(form).entries()).map(([name, value]) => [name, typeof value === 'string' ? value : '']),
    );
    const state: InvoiceCompositionState = {
      customerId, issueDate, dueDate, notes, lines, issuer, issuerId, paymentTerms,
      immediateCollection, paymentSplits, treasuryAccountId, collectionAmount, collectionMethod,
      invoiceDiscountType, invoiceDiscountValue, driverName, shippingDriverId, shippingCompany,
      invoiceGovernorate, issuerOrganization, warehouseId,
    };
    try {
      localStorage.setItem(invoiceDraftKey, JSON.stringify({ state, fields } satisfies InvoiceCompositionDraft));
    } catch {
      setError('تعذر حفظ المسودة على هذا الجهاز؛ أكمل الحفظ كمسودة حتى لا تفقد البيانات.');
    }
  }, [
    customerId, issueDate, dueDate, notes, lines, issuer, issuerId, paymentTerms, immediateCollection,
    paymentSplits, treasuryAccountId, collectionAmount, collectionMethod, invoiceDiscountType,
    invoiceDiscountValue, driverName, shippingDriverId, shippingCompany, invoiceGovernorate,
    issuerOrganization, warehouseId, draftRevision, invoiceDraftKey, isReturn,
  ]);
  const selectedCustomer = customers.data?.data.find(
    (customer) => String(customer.id) === customerId,
  );
  const selectedCustomerBalance = selectedCustomer?.balance_egp ?? selectedCustomer?.balance?.balance;
  const recentInvoiceCustomerIds = (recentCustomerInvoices.data?.data ?? [])
    .filter((invoice) => invoice.status !== 'draft' && invoice.status !== 'cancelled')
    .map((invoice) => invoice.customer_id);
  const displayedRecentCustomerIds = [...new Set([...recentCustomerIds, ...recentInvoiceCustomerIds])].slice(0, 3);
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
  const subtotalCents = lines.reduce((amount, line) => amount
    + multiplyCents(moneyToCents(line.unitPrice), quantityAsBigInt(line.quantity))
    - moneyToCents(line.discount), 0n);
  const globalDiscountCents = invoiceDiscountType === 'percent'
    ? percentOfCents(subtotalCents, invoiceDiscountValue || '0')
    : moneyToCents(invoiceDiscountValue);
  const lineNetAfterDiscounts = (line: InvoiceLineDraft) => {
    const product = products.data?.data.find((item) => String(item.id) === line.productId);
    const quantity = quantityAsBigInt(line.quantity);
    const gross = multiplyCents(moneyToCents(line.unitPrice), quantity);
    const beforeInvoiceDiscount = gross > moneyToCents(line.discount) ? gross - moneyToCents(line.discount) : 0n;
    const invoiceDiscountShare = proportionalShareCents(globalDiscountCents, beforeInvoiceDiscount, subtotalCents);
    return { product, quantity, net: beforeInvoiceDiscount - invoiceDiscountShare };
  };
  const priceWarningLines = !isReturn ? lines.map(lineNetAfterDiscounts) : [];
  const belowCompanyPriceWarning = priceWarningLines.some(({ product, quantity, net }) =>
    product?.company_price != null && net < multiplyCents(moneyToCents(product.company_price), quantity),
  );
  const belowCostWarning = priceWarningLines.some(({ product, quantity, net }) =>
    product?.purchase_cost_egp != null && net < multiplyCents(moneyToCents(product.purchase_cost_egp), quantity),
  );
  const invoiceProfitCents = lines.reduce((profit, line) => {
    const product = products.data?.data.find((item) => String(item.id) === line.productId);
    if (product?.purchase_cost_egp == null) return profit;
    const quantity = quantityAsBigInt(line.quantity);
    const gross = multiplyCents(moneyToCents(line.unitPrice), quantity);
    const beforeInvoiceDiscount = gross > moneyToCents(line.discount) ? gross - moneyToCents(line.discount) : 0n;
    const invoiceDiscountShare = proportionalShareCents(globalDiscountCents, beforeInvoiceDiscount, subtotalCents);
    return profit + beforeInvoiceDiscount - invoiceDiscountShare - multiplyCents(moneyToCents(product.purchase_cost_egp), quantity);
  }, 0n);
  const canShowInvoiceProfit = selectedProductLines.length > 0 && selectedProductLines.every(({ product }) => product?.purchase_cost_egp != null);
  const invoiceTotalCents = subtotalCents > globalDiscountCents ? subtotalCents - globalDiscountCents : 0n;
  const invoiceTotalEstimate = centsToMoney(invoiceTotalCents);
  const collectedEstimateCents = immediateCollection
    ? (collectionAmount ? moneyToCents(collectionAmount) : invoiceTotalCents) + paymentSplits.reduce((sum, split) => sum + moneyToCents(split.amount), 0n)
    : 0n;
  const creditWarning =
    selectedCustomer?.credit_limit !== null &&
    selectedCustomer?.credit_limit !== undefined &&
    selectedCustomerBalance !== null &&
    selectedCustomerBalance !== undefined &&
    moneyToCents(selectedCustomerBalance) + (invoiceTotalCents > collectedEstimateCents ? invoiceTotalCents - collectedEstimateCents : 0n) > moneyToCents(selectedCustomer.credit_limit);
  const setTransactionMode = (nextIsReturn: boolean) => {
    if (nextIsReturn) {
      navigate('/returns/new');
      return;
    }
    setIsReturn(nextIsReturn);
    setSearchParams(nextIsReturn ? { mode: 'return' } : {});
    setError('');
    if (!nextIsReturn) setSelectedOriginalId('');
  };
  const onCustomerChange = (nextCustomerId: string) => {
    setCreditConfirmed(false);
    setPriceWarningConfirmed(false);
    setCustomerId(nextCustomerId);
    setInvoiceGovernorate(customers.data?.data.find((item) => String(item.id) === nextCustomerId)?.governorate ?? '');
    const numericId = Number(nextCustomerId);
    if (numericId) {
      setRecentCustomerIds((current) =>
        [numericId, ...current.filter((id) => id !== numericId)].slice(0, 3),
      );
    }
  };
  useEffect(() => {
    const defaultWarehouse = defaultSalesWarehouse(warehouses.data?.data ?? []);
    if (!defaultWarehouse) return;
    const defaultId = String(defaultWarehouse.id);
    setWarehouseId((current) => current || defaultId);
    setLines((current) => current.map((line) => ({
      ...line,
      warehouseId: line.warehouseId || defaultId,
    })));
  }, [warehouses.data]);
  useEffect(() => {
    if (!isReturn || !sourceInvoice.data) return;
    const invoice = sourceInvoice.data;
    setCustomerId(String(invoice.customer_id));
    setInvoiceGovernorate(invoice.customer_governorate ?? '');
    setLines(
      invoice.lines.map((line) => ({
        productId: line.product_id ? String(line.product_id) : '',
        description: line.description ?? '',
        warehouseId: line.warehouse_id
          ? String(line.warehouse_id)
          : line.location_id
            ? String(line.location_id)
            : '',
        quantity: '1',
        unitPrice: line.unit_price_egp,
        discount: line.discount_amount_egp ?? '',
        returnCondition: 'good',
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
        issuer,
        issuerId,
        paymentTerms,
        issuerOrganization,
        shippingDriverId,
        driverName,
        shippingCompany,
        selectedCustomer?.governorate ?? null,
        invoiceDiscountType,
        invoiceDiscountValue,
      );
    } catch {
      setPreviewInput(null);
      return;
    }
    const timer = window.setTimeout(() => setPreviewInput(input), 300);
    return () => window.clearTimeout(timer);
  }, [customerId, issueDate, dueDate, notes, lines, paymentTerms, issuer, issuerId, issuerOrganization, shippingDriverId, driverName, shippingCompany, selectedCustomer?.governorate, invoiceDiscountType, invoiceDiscountValue]);
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
      payments,
    }: {
      input: InvoiceInput;
      issue: boolean;
      payments: { treasury_account_id: number; amount_egp: string; payment_method: string }[];
    }) => {
      createKey.current ??= newIdempotencyKey();
      const draft = await createInvoiceDraft(input, createKey.current);
      if (!issue) return draft;
      issueKey.current ??= newIdempotencyKey();
      return issueInvoice(draft.id, issueKey.current, payments);
    },
    onSuccess: async (invoice) => {
      createKey.current = null;
      issueKey.current = null;
      try { localStorage.removeItem(invoiceDraftKey); } catch { /* the server invoice is already saved */ }
      setSuccess(
        invoice.status === 'issued'
          ? `${ar.sales.invoiceIssued} ${invoice.invoice_number}`
          : `${ar.sales.invoiceSaved} ${invoice.invoice_number}`,
      );
      await client.invalidateQueries({ queryKey: ['/invoices'] });
      if (invoice.status === 'issued') {
        await invalidateInventoryQueries(client);
        navigate(`/invoices/${invoice.id}/print`, {
          state: { success: `${ar.sales.invoiceIssued} ${invoice.invoice_number}` },
        });
      }
    },
  });

  if (customers.isLoading || products.isLoading || warehouses.isLoading || invoiceIssuers.isLoading || governorates.isLoading) {
    return <PageState kind="loading" />;
  }
  if (customers.isError || products.isError || warehouses.isError || invoiceIssuers.isError || governorates.isError) {
    return (
      <PageState
        kind="error"
        message={ar.common.requestFailed}
        onRetry={() => {
          void customers.refetch();
          void products.refetch();
          void warehouses.refetch();
          void invoiceIssuers.refetch();
          void governorates.refetch();
        }}
      />
    );
  }

  const submit = async (issue: boolean) => {
    if (submitInFlight.current) return;
    submitInFlight.current = true;
    setError('');
    setSuccess('');
    try {
      if (issue && !issuer) throw new Error('اختر مين اللي طلّع الفاتورة (كراس / أبنوب / السائق)');
      if (issue && (issuer === 'partner' || issuer === 'driver') && !issuerId) throw new Error('اختر اسم مُصدر الفاتورة');
      if (issue && !customerId) throw new Error('اختر العميل أولًا');
      if (issue && !lines.some((line) => line.productId && Number(line.quantity) > 0)) {
        throw new Error('اختر صنفًا واحدًا على الأقل من المخزون وحدد الكمية');
      }
      if (stockWarning || preview.data?.warnings.some((warning) => warning.code === 'insufficient_stock' || warning.code === 'LOW_STOCK')) throw new Error('الكمية أكبر من المتاح في موقع الصرف المحدد');
      if ((creditWarning || preview.data?.warnings.some((warning) => warning.code === 'credit_limit_exceeded')) && issue && !creditConfirmed) {
        setCreditConfirmed(true);
        setError('اضغط «إصدار الفاتورة» مرة أخرى للتأكيد رغم التجاوز');
        return;
      }
      if ((belowCompanyPriceWarning || belowCostWarning) && issue && !priceWarningConfirmed) {
        setPriceWarningConfirmed(true);
        setError(belowCostWarning
          ? 'سعر البيع أقل من تكلفة الصنف (ربح سالب). اضغط «إصدار الفاتورة» مرة أخرى للتأكيد.'
          : 'سعر البيع أقل من سعر الشركة. اضغط «إصدار الفاتورة» مرة أخرى للتأكيد.');
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
          issuer_type: issuer || 'company',
          ...(issuer === 'partner' ? { issuer_partner_id: positiveSafeInteger(issuerId) } : {}),
          ...(issuer === 'driver' ? { issuer_driver_id: positiveSafeInteger(issuerId) } : {}),
          issuer_company: issuerOrganization || 'ماستر',
          ...(shippingDriverId ? { shipping_driver_id: positiveSafeInteger(shippingDriverId) } : {}),
          shipping_driver_name: driverName || null,
          shipping_company: shippingCompany || null,
          governorate: invoiceGovernorate || null,
          issue_date: issueDate,
          original_document_id: sourceInvoice.data.id,
          return_reason: returnReason,
          notes: notes.trim() || null,
          lines: lines.map((line) => ({
            warehouse_id: positiveSafeInteger(line.warehouseId),
            quantity: positiveSafeInteger(line.quantity),
            return_condition: line.returnCondition ?? 'good',
            original_document_line_id: line.originalLineId,
          })),
        };
        returnKey.current ??= newIdempotencyKey();
        const created = await createReturn(returnInput, returnKey.current);
        returnKey.current = null;
        setSuccess('تم تسجيل المرتجع وإرجاع الكميات للمخزون');
        await Promise.all([
          client.invalidateQueries({ queryKey: ['/returns'] }),
          client.invalidateQueries({ queryKey: ['/invoices'] }),
          invalidateInventoryQueries(client),
        ]);
        navigate(`/returns/${created.document.id}/print`, {
          state: { success: 'تم تسجيل المرتجع وإرجاع الكميات للمخزون' },
        });
        return;
      }
      if (issue && immediateCollection) {
        if (!treasuryAccountId) throw new Error('اختر حساب الاستلام (المالية)');
        const totalCents = moneyToCents(preview.data?.grand_total_egp ?? invoiceTotalEstimate);
        const amounts = [collectionAmount || centsToMoney(totalCents), ...paymentSplits.map((split) => split.amount)];
        const collectedCents = amounts.reduce((sum, amount) => sum + moneyToCents(amount), 0n);
        if (
          amounts.some((amount) => !amountPattern.test(amount) || !isPositiveMoney(amount)) ||
          paymentSplits.some((split) => !split.accountId)
        ) {
          throw new Error('أدخل مبلغًا وحسابًا صحيحين لكل وسيلة دفع');
        }
        if (collectedCents > totalCents) {
          throw new Error('إجمالي التحصيل أكبر من إجمالي الفاتورة');
        }
      }
      const input = makeInvoiceInput(
        customerId,
        issueDate,
        dueDate,
        notes,
        lines,
        issuer,
        issuerId,
        paymentTerms,
        issuerOrganization,
        shippingDriverId,
        driverName,
        shippingCompany,
        invoiceGovernorate || selectedCustomer?.governorate || null,
        invoiceDiscountType,
        invoiceDiscountValue,
      );
      const payments = issue && immediateCollection
        ? [
            { treasury_account_id: positiveSafeInteger(treasuryAccountId), amount_egp: collectionAmount || preview.data?.grand_total_egp || invoiceTotalEstimate, payment_method: collectionMethod },
            ...paymentSplits.map((split) => ({
              treasury_account_id: positiveSafeInteger(split.accountId),
              amount_egp: split.amount,
              payment_method: treasuryAccounts.data?.data.find((account) => String(account.id) === split.accountId)?.account_type ?? 'other',
            })),
          ]
        : [];
      if (issue && !isReturn) {
        const preflight = await previewInvoice(input);
        const warnings = preflight.warnings ?? [];
        if (warnings.some((warning) => warning.code === 'insufficient_stock' || warning.code === 'LOW_STOCK')) {
          throw new Error('الكمية المطلوبة تتجاوز المتاح في موقع الصرف المحدد.');
        }
        if (warnings.some((warning) => warning.code === 'credit_limit_exceeded') && !creditConfirmed) {
          setCreditConfirmed(true);
          setError('اضغط «إصدار الفاتورة» مرة أخرى للتأكيد رغم تجاوز حد الائتمان.');
          return;
        }
      }
      await saveInvoice.mutateAsync({ input, issue, payments });
    } catch (cause) {
      setError(
        cause instanceof ApiError
          ? cause.message
          : cause instanceof Error
            ? cause.message
            : ar.sales.invoiceRequestFailed,
      );
    } finally {
      submitInFlight.current = false;
    }
  };

  if (isReturn) {
    const invoiceId = searchParams.get('invoiceId');
    return <Navigate replace to={invoiceId ? `/returns/new?invoiceId=${encodeURIComponent(invoiceId)}` : '/returns/new'} />;
  }

  return (
    <>
    <section className="page inventory-page invoice-create-page">
      <header className="page-heading invoice-create-heading">
        <div>
          <h1>{isReturn ? 'إنشاء فاتورة مرتجع' : ar.sales.invoiceCreateTitle}</h1>
          <p>إدارة المبيعات › {isReturn ? 'إنشاء مرتجع' : 'إنشاء فاتورة'}{!isReturn ? ' · تحفظ المسودة تلقائيًا على هذا الجهاز' : ''}</p>
        </div>
        <div className="invoice-create-actions">
          {!isReturn && <button className="button button-quiet button-sm" onClick={() => {
            if (!window.confirm('هل تريد مسح محتوى المسودة المحفوظة على هذا الجهاز؟')) return;
            try { localStorage.removeItem(invoiceDraftKey); } catch { /* storage may be unavailable */ }
            window.location.reload();
          }} type="button">مسح المسودة</button>}
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
        ref={invoiceFormRef}
        id="invoice-create-form"
        className="stack-form invoice-form invoice-form-layout"
        onInput={persistComposition}
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
        <div className="invoice-form-main">
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
                  }}
                  type="button"
                >
                  لا — بدون تحصيل الآن
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
            {([
              ['company', 'الشركة'],
              ['partner', 'شريك الشركة'],
              ['driver', 'سائق'],
            ] as const).map(([type, name]) => (
              <button
                aria-pressed={issuer === type}
                className={issuer === type ? 'invoice-issuer-option-active' : ''}
                key={type}
                onClick={() => {
                  setIssuer(type);
                  setIssuerId('');
                }}
                type="button"
              >
                {name}
              </button>
            ))}
          </div>
          {issuer === 'partner' && (
            <label className="form-field">
              <span>شريك الشركة الذي أصدر الفاتورة *</span>
              <select className="input" onChange={(event) => setIssuerId(event.currentTarget.value)} required value={issuerId}>
                <option value="">اختر الشريك</option>
                {invoiceIssuers.data?.partners.map((partner) => <option key={partner.id} value={partner.id}>{partner.name}</option>)}
              </select>
            </label>
          )}
          {issuer === 'driver' && (
            <label className="form-field">
              <span>السائق الذي أصدر الفاتورة *</span>
              <select className="input" onChange={(event) => setIssuerId(event.currentTarget.value)} required value={issuerId}>
                <option value="">اختر السائق</option>
                {invoiceIssuers.data?.drivers.map((driver) => <option key={driver.id} value={driver.id}>{driver.name}</option>)}
              </select>
            </label>
          )}
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
                    .filter((invoice) => ['issued', 'paid', 'partially_paid', 'overdue'].includes(invoice.status) && invoice.customer_id === Number(customerId))
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
                  onChange={(event) => setReturnReason(event.currentTarget.value as typeof returnReason)}
                  value={returnReason}
                >
                  <option value="damaged">تالف</option>
                  <option value="wrong_item">خطأ في الصنف</option>
                  <option value="not_as_ordered">غير مطابق للطلب</option>
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
            <Link className="invoice-text-action" to="/customers">+ إضافة عميل جديد</Link>
          </label>
          {displayedRecentCustomerIds.length > 0 && (
            <div aria-label="آخر العملاء" className="invoice-recent-customers">
              {displayedRecentCustomerIds.map((id) => {
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
                value={selectedCustomerBalance ? formatMoney(selectedCustomerBalance) : '—'}
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
                  setDueDate(terms === 'immediate' ? issueDate : dueDate && dueDate > issueDate ? dueDate : localDate(30));
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
            <summary>{additionalOptions ? '▾' : '▸'} خيارات إضافية (السائق، المخزن، المحافظة، الشحن)</summary>
            <div className="invoice-form-grid">
              <label className="form-field">
                <span>السائق / المندوب</span>
                <select
                  className="input"
                  onChange={(event) => {
                    const driver = invoiceIssuers.data?.drivers.find((item) => String(item.id) === event.currentTarget.value);
                    setShippingDriverId(event.currentTarget.value);
                    setDriverName(driver?.name ?? '');
                    if (driver?.shipping_company) setShippingCompany(driver.shipping_company);
                  }}
                  value={shippingDriverId}
                >
                  <option value="">بدون سائق محدد</option>
                  {invoiceIssuers.data?.drivers.map((driver) => <option key={driver.id} value={driver.id}>{driver.name}</option>)}
                </select>
              </label>
              <label className="form-field">
                <span>الجهة المصدّرة</span>
                <select className="input" onChange={(event) => setIssuerOrganization(event.currentTarget.value)} value={issuerOrganization}>
                  <option value="ماستر">ماستر</option>
                </select>
              </label>
              <label className="form-field">
                <span>المحافظة</span>
                <select className="input" onChange={(event) => setInvoiceGovernorate(event.currentTarget.value)} value={invoiceGovernorate || selectedCustomer?.governorate || ''}>
                  <option value="">اختر المحافظة</option>
                  {governorates.data?.data.map((governorate) => <option key={governorate.id} value={governorate.name}>{governorate.name}</option>)}
                </select>
              </label>
              <label className="form-field">
                <span>شركة الشحن</span>
                <input className="input" onChange={(event) => setShippingCompany(event.currentTarget.value)} value={shippingCompany} />
              </label>
              <label className="form-field">
                <span>المستودع الافتراضي (خيارات إضافية)</span>
                <select
                  aria-label="المستودع الافتراضي — الخيارات الإضافية"
                  className="input"
                  onChange={(event) => {
                    const nextWarehouseId = event.currentTarget.value;
                    setWarehouseId(nextWarehouseId);
                    if (nextWarehouseId) setLines((current) => current.map((line) => ({ ...line, warehouseId: nextWarehouseId })));
                  }}
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
          {preview.data?.warnings.some((warning) => warning.code === 'insufficient_stock' || warning.code === 'LOW_STOCK') && !stockWarning && (
            <p className="invoice-stock-alert" role="alert">الكمية المطلوبة تتجاوز المتاح في موقع الصرف المحدد.</p>
          )}
          {(creditWarning || preview.data?.warnings.some((warning) => warning.code === 'credit_limit_exceeded')) && (
            <p className="invoice-credit-alert" role="status">
              ⚠️ تجاوز الحد الائتماني
            </p>
          )}
        <div className="invoice-line-list">
          {lines.map((line, index) => {
            const selectedProduct = products.data?.data.find((product) => String(product.id) === line.productId);
            const customerPrice = customerPrices.data?.find((price) => price.product_id === Number(line.productId));
            const companyPrice = selectedProduct?.company_price;
            const purchaseCost = selectedProduct?.purchase_cost_egp;
            const quantity = quantityAsBigInt(line.quantity);
            const stockQuantity = Number(selectedProduct?.quantity_on_hand) || 0;
            const priceSurplus = !isReturn && purchaseCost != null && line.unitPrice !== ''
              ? lineNetAfterDiscounts(line).net - multiplyCents(moneyToCents(purchaseCost), quantity)
              : null;
            const lineTotalCents = multiplyCents(moneyToCents(line.unitPrice), quantity) - moneyToCents(line.discount);
            return (
              <fieldset className="invoice-line-editor" key={index}>
                <legend>الصنف {index + 1}</legend>
                <div className="invoice-line-primary-fields">
                  <label className="form-field invoice-line-product" htmlFor={`invoice-product-${index}`}>
                    <span>المنتج *</span>
                    <select
                      aria-label={index === 0 ? ar.common.product : `${ar.common.product} ${index + 1}`}
                      className="input"
                      id={`invoice-product-${index}`}
                      onChange={(event) => {
                        const productId = event.currentTarget.value;
                        const product = products.data?.data.find((item) => String(item.id) === productId);
                        const defaultLocation = product?.default_location_id
                          ? warehouses.data?.data.find((warehouse) => warehouse.id === product.default_location_id && warehouse.is_active && warehouse.location_type !== 'damaged')
                          : undefined;
                        setCreditConfirmed(false);
                        setPriceWarningConfirmed(false);
                        setLines((current) => current.map((item, itemIndex) => itemIndex === index ? {
                          ...item,
                          productId,
                          description: product?.description ?? '',
                          unitPrice: productId ? product?.company_price ?? '' : '',
                          warehouseId: productId ? String(defaultLocation?.id ?? (item.warehouseId || warehouseId)) : '',
                        } : item));
                      }}
                      required
                      value={line.productId}
                    >
                      <option value="">اختر المنتج</option>
                      {products.data?.data.filter((product) => product.is_active).map((product) => (
                        <option key={product.id} value={product.id}>{product.name} — {product.sku}</option>
                      ))}
                    </select>
                    {selectedProduct && (
                      <small className="invoice-field-hint">
                        الوحدة: {selectedProduct.unit_code} · رصيد المخزون: {selectedProduct.quantity_on_hand ?? '—'} · المتاح للبيع: {selectedProduct.available_quantity ?? '—'}
                        {selectedProduct.category_name ? ` · ${selectedProduct.category_name}` : ''}
                      </small>
                    )}
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
                </div>
                {!isReturn && selectedProduct && (
                  <>
                  <div aria-label={`تفاصيل تسعير الصنف ${index + 1}`} className="invoice-line-pricing-summary">
                    {purchaseCost != null && (
                      <div className="invoice-line-pricing-metric">
                        <span>سعر الشراء للوحدة</span>
                        <strong>{formatMoney(purchaseCost)}</strong>
                      </div>
                    )}
                    {purchaseCost != null && (
                      <div className="invoice-line-pricing-metric">
                        <span>تكلفة كمية الفاتورة</span>
                        <strong>{formatMoney(centsToMoney(multiplyCents(moneyToCents(purchaseCost), quantity)))}</strong>
                      </div>
                    )}
                    {purchaseCost != null && selectedProduct.quantity_on_hand != null && (
                      <div className="invoice-line-pricing-metric">
                        <span>قيمة كامل رصيد المخزون</span>
                        <strong>{formatMoney(centsToMoney(multiplyCents(moneyToCents(purchaseCost), BigInt(stockQuantity))))}</strong>
                      </div>
                    )}
                  </div>
                  <div className="invoice-line-price-pair">
                    <label className="form-field invoice-line-fixed-company-price" htmlFor={`invoice-company-price-${index}`}>
                      <span>سعر الشركة للوحدة (ثابت)</span>
                      <input
                        aria-label={`سعر الشركة للوحدة ${index + 1} (ثابت)`}
                        className="input"
                        id={`invoice-company-price-${index}`}
                        readOnly
                        value={companyPrice != null ? formatMoney(companyPrice) : ''}
                        placeholder="غير مسجل على المنتج"
                      />
                      <small className="invoice-field-hint">يُسحب من سعر المنتج المسجل، ولا يتغير من الفاتورة.</small>
                    </label>
                    <label className="form-field invoice-line-sale-price" htmlFor={`invoice-sale-price-${index}`}>
                      <span>سعر البيع للوحدة *</span>
                      <input
                        aria-label={`سعر البيع للوحدة ${index + 1}`}
                        className="input"
                        id={`invoice-sale-price-${index}`}
                        inputMode="decimal"
                        onChange={(event) => updateLine(index, 'unitPrice', event.currentTarget.value)}
                        pattern={amountPattern.source}
                        required
                        value={line.unitPrice}
                      />
                      <small className="invoice-field-hint">يبدأ بسعر الشركة ويمكن تعديله.</small>
                    </label>
                  </div>
                  </>
                )}
                {isReturn && (
                  <label className="form-field invoice-line-price">
                    <span>{ar.sales.unitPrice} *</span>
                    <input
                      aria-label={`${ar.sales.unitPrice} ${index + 1}`}
                      className="input"
                      inputMode="decimal"
                      onChange={(event) => updateLine(index, 'unitPrice', event.currentTarget.value)}
                      pattern="^(0|[1-9][0-9]{0,14})(\.[0-9]{1,4})?$"
                      required
                      value={line.unitPrice}
                    />
                    {companyPrice != null && <small className="invoice-field-hint">سعر الشركة للوحدة: {formatMoney(companyPrice)}</small>}
                    {purchaseCost != null && <small className="invoice-field-hint">تكلفة الشراء للوحدة: {formatMoney(purchaseCost)}</small>}
                  </label>
                )}
                {customerPrice && customerPrice.unit_price_egp !== line.unitPrice && (
                  <button className="invoice-text-action" onClick={() => updateLine(index, 'unitPrice', customerPrice.unit_price_egp)} type="button">
                    آخر سعر للعميل: {formatMoney(customerPrice.unit_price_egp)} — استخدام
                  </button>
                )}
                {priceSurplus != null && (
                  <div
                    aria-label={`ربح مُصدر الفاتورة من الصنف ${index + 1}`}
                    className={`invoice-price-surplus${priceSurplus < 0n ? ' invoice-price-surplus-negative' : ''}`}
                    role="status"
                  >
                    <div>
                      <span>صافي الربح بعد تكلفة الشراء للكمية</span>
                      <strong>{formatMoney(centsToMoney(priceSurplus))}</strong>
                    </div>
                    <p>الحساب: سعر البيع × الكمية − الخصومات − تكلفة الشراء للكمية.</p>
                    <p>{issuer === 'partner'
                      ? 'يُضاف إلى أرباح الشريك الذي اخترته كمُصدر للفاتورة.'
                      : issuer === 'driver'
                        ? 'يُسجل للشركة عند إصدار السائق للفاتورة.'
                        : issuer === 'company'
                          ? 'يُسجل للشركة.'
                          : 'اختر مُصدر الفاتورة لتحديد المستفيد من الفرق.'}</p>
                  </div>
                )}
                <label className="form-field invoice-line-description">
                  <span>الوصف (اختياري)</span>
                  <input className="input" maxLength={500} onChange={(event) => updateLine(index, 'description', event.currentTarget.value)} value={line.description} />
                </label>
                <div className="invoice-line-actions">
                  <strong className="invoice-line-total">إجمالي الصنف: {formatMoney(centsToMoney(lineTotalCents))}</strong>
                  <details className="invoice-line-options">
                    <summary>تفاصيل إضافية للصنف</summary>
                    <div className="invoice-line-options-grid">
                      <label className="form-field">
                        <span>{ar.common.warehouse} *</span>
                        <select className="input" onChange={(event) => updateLine(index, 'warehouseId', event.currentTarget.value)} required value={line.warehouseId}>
                          <option value="">{ar.sales.selectWarehouse}</option>
                          {warehouses.data?.data.filter((warehouse) => warehouse.is_active && warehouse.location_type !== 'damaged').map((warehouse) => (
                            <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>
                          ))}
                        </select>
                      </label>
                      <FormField
                        id={`invoice-discount-${index}`}
                        inputMode="decimal"
                        label={ar.sales.discountAmount}
                        onChange={(event) => updateLine(index, 'discount', event.currentTarget.value)}
                        pattern="^(0|[1-9][0-9]{0,14})(\.[0-9]{1,4})?$"
                        value={line.discount}
                      />
                    </div>
                  </details>
                  {lines.length > 1 && (
                    <button aria-label={`حذف الصنف ${index + 1}`} className="button button-quiet button-sm" onClick={() => setLines((current) => current.filter((_, itemIndex) => itemIndex !== index))} type="button">
                      حذف الصنف
                    </button>
                  )}
                </div>
              </fieldset>
            );
          })}
        </div>
        </section>
        <div className="invoice-bottom-grid">
          <section aria-labelledby="invoice-account-title" className="invoice-form-card">
            <header className="invoice-card-heading">
              <h2 id="invoice-account-title">الحساب</h2>
            </header>
            <div className="invoice-form-grid">
              <label className="form-field">
                <span>نوع الخصم على الفاتورة</span>
                <select className="input" onChange={(event) => { setCreditConfirmed(false); setPriceWarningConfirmed(false); setInvoiceDiscountType(event.currentTarget.value as 'fixed' | 'percent'); }} value={invoiceDiscountType}>
                  <option value="fixed">مبلغ ثابت</option>
                  <option value="percent">نسبة مئوية</option>
                </select>
              </label>
              <label className="form-field">
                <span>{invoiceDiscountType === 'percent' ? 'نسبة الخصم (%)' : 'قيمة الخصم (ج.م)'}</span>
                <input className="input" inputMode="decimal" onChange={(event) => { setCreditConfirmed(false); setPriceWarningConfirmed(false); setInvoiceDiscountValue(event.currentTarget.value); }} pattern="^(0|[1-9][0-9]{0,14})(\.[0-9]{1,4})?$" value={invoiceDiscountValue} />
              </label>
            </div>
            <dl className="invoice-account-list">
              {canShowInvoiceProfit && (
                <div className={invoiceProfitCents < 0n ? 'invoice-profit-negative' : undefined}>
                  <dt>{issuer === 'partner' ? 'ربح الشريك بعد تكلفة الشراء' : 'ربح الشركة بعد تكلفة الشراء'}</dt>
                  <dd>{formatMoney(centsToMoney(invoiceProfitCents))}</dd>
                </div>
              )}
              <div>
                <dt>الدفع</dt>
                <dd>
                  <input
                    aria-label="الدفع"
                    className="input invoice-payment-amount"
                    inputMode="decimal"
                    onChange={(event) => { setCreditConfirmed(false); setCollectionAmount(event.currentTarget.value); }}
                    value={collectionAmount}
                  />
                </dd>
              </div>
            </dl>
            <p className="invoice-account-hint">
              {issuer === 'partner'
                ? 'تُسجّل الزيادة فوق سعر الشركة للشريك الذي أصدر الفاتورة.'
                : issuer === 'driver'
                  ? 'تُسجّل الزيادة فوق سعر الشركة للشركة عند إصدار السائق للفاتورة.'
                  : 'تُسجّل الزيادة فوق سعر الشركة للشركة، وتُسند للشريك إذا كان هو مُصدر الفاتورة.'}{' '}
              يُوزَّع خصم الفاتورة على البنود عند الحفظ، ويُرفض الخصم إذا تجاوز الإجمالي الفرعي.
            </p>
            {immediateCollection && (
              <div className="invoice-collection-fields">
                <label className="form-field">
                  <span>المبلغ المحصّل</span>
                  <input
                    className="input"
                    inputMode="decimal"
                    onChange={(event) => { setCreditConfirmed(false); setCollectionAmount(event.currentTarget.value); }}
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
                      onChange={(event) => {
                        const accountId = event.currentTarget.value;
                        setPaymentSplits((current) =>
                          current.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, accountId } : item,
                          ),
                        );
                      }}
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
                      onChange={(event) => {
                        setCreditConfirmed(false);
                        const amount = event.currentTarget.value;
                        setPaymentSplits((current) =>
                          current.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, amount } : item,
                          ),
                        );
                      }}
                      value={split.amount}
                    />
                    <button
                      className="button button-quiet button-sm"
                      onClick={() => { setCreditConfirmed(false); setPaymentSplits((current) => current.filter((_, itemIndex) => itemIndex !== index)); }}
                      type="button"
                    >
                      حذف
                    </button>
                  </div>
                ))}
                <button
                  className="invoice-text-action"
                  onClick={() => { setCreditConfirmed(false); setPaymentSplits((current) => [...current, { accountId: '', amount: '' }]); }}
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
                        centsToMoney(linkedReturns.reduce((sum, item) => sum + moneyToCents(item.amount_egp), 0n)),
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
                      navigate(`/returns/new?invoiceId=${searchedInvoice.id}`);
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
        </div>
        <aside aria-labelledby="invoice-summary-title" className="invoice-form-summary">
          <h2 id="invoice-summary-title">ملخص الفاتورة</h2>
          {preview.isFetching ? (
            <p role="status">{ar.app.loading}</p>
          ) : preview.isError ? (
            <p className="field-error" role="alert">
              {preview.error instanceof ApiError ? preview.error.message : ar.common.requestFailed}
            </p>
          ) : preview.data ? (
            <dl className="invoice-detail-summary">
              <div><dt>{ar.sales.previewSubtotal}</dt><dd>{formatMoney(preview.data.subtotal_egp)}</dd></div>
              <div><dt>{ar.sales.previewDiscount}</dt><dd>{formatMoney(preview.data.discount_amount_egp)}</dd></div>
              <div><dt>{ar.sales.previewTax}</dt><dd>{formatMoney(preview.data.tax_amount_egp)}</dd></div>
              <div className="invoice-grand-total-row"><dt>{ar.sales.previewTotal}</dt><dd>{formatMoney(preview.data.grand_total_egp)}</dd></div>
              {immediateCollection && (
                <div>
                  <dt>المتبقي بعد التحصيل</dt>
                  <dd>{formatMoney(centsToMoney(moneyToCents(preview.data.grand_total_egp) - collectedEstimateCents))}</dd>
                </div>
              )}
            </dl>
          ) : (
            <>
              <p>{ar.sales.previewWaitingMessage}</p>
              <dl className="invoice-detail-summary">
                <div><dt>{ar.sales.previewSubtotal}</dt><dd>{formatMoney(centsToMoney(subtotalCents))}</dd></div>
                <div><dt>{ar.sales.previewDiscount}</dt><dd>{formatMoney(centsToMoney(globalDiscountCents + lines.reduce((sum, line) => sum + moneyToCents(line.discount), 0n)))}</dd></div>
                <div className="invoice-grand-total-row"><dt>{ar.sales.previewTotal}</dt><dd>{formatMoney(invoiceTotalEstimate)}</dd></div>
              </dl>
            </>
          )}
          {immediateCollection && (
            <button className="button button-primary" onClick={() => void submit(true)} type="button">
              حفظ الفاتورة وتسجيل التحصيل
            </button>
          )}
        </aside>
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
                description: line.description ?? '',
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
