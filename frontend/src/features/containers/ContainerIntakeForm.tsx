import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ApiError, formatApiErrorDetails } from '../../shared/api/errors';
import { newIdempotencyKey } from '../../shared/api/http';
import { Modal } from '../../shared/components/Modal';
import { ar } from '../../shared/i18n/ar';
import { formatMoney } from '../../shared/utils/format';
import { allocateProportionalCents, centsToMoney, divideRounded, moneyToCents } from '../../shared/utils/money';
import {
  listResource,
  type ApiPage,
  type Category,
  type ListQuery,
  type Product,
  type Warehouse,
} from '../inventory/api';
import {
  createContainerIntake,
  createContainerQuickWarehouse,
  type ContainerIntakeInput,
  type ContainerIntakeResult,
} from './intakeApi';

type DraftProduct = {
  name: string;
  sku: string;
  categoryId: string;
  unitCode: string;
  minimumStock: string;
};
type IntakeLine = {
  key: string;
  search: string;
  product: Product | null;
  draft: DraftProduct | null;
  quantity: string;
  purchaseMode: 'unit' | 'line';
  purchaseAmount: string;
};
type IntakeCost = { label: string; amount: string };

const queryBase: ListQuery = { page: 1, perPage: 100, search: '' };
const costLabels = [
  'عربون المصنع',
  'تحويل خارجي',
  'متبقي المصنع',
  'رسوم البنك',
  'الشحن',
  'المستخلص',
  'الجمارك',
  'الختم',
];
const moneyPattern = /^(0|[1-9]\d{0,14})(\.\d{1,4})?$/;

function emptyLine(): IntakeLine {
  return { key: newIdempotencyKey(), search: '', product: null, draft: null, quantity: '', purchaseMode: 'unit', purchaseAmount: '' };
}

function asCents(value: string): bigint {
  if (!moneyPattern.test(value)) return 0n;
  return moneyToCents(value);
}

function formatCents(cents: bigint): string {
  return formatMoney(centsToMoney(cents));
}

function ProductPickerRow({
  line,
  duplicate,
  onChange,
  onCreate,
  onRemove,
}: {
  line: IntakeLine;
  duplicate: boolean;
  onChange: (patch: Partial<IntakeLine>) => void;
  onCreate: () => void;
  onRemove: () => void;
}) {
  const matches = useQuery({
    queryKey: ['/products', 'container-intake-search', line.key, line.search],
    queryFn: () => listResource<Product>('/products', { ...queryBase, search: line.search }),
    enabled: !line.draft && !line.product && line.search.trim().length > 0,
  });

  return (
    <fieldset className="container-intake-line">
      <legend>صنف الحاوية</legend>
      {line.draft ? (
        <div className="inline-success" role="status">
          منتج جديد مؤقت: {line.draft.name}
          <button className="button button-secondary" type="button" onClick={onCreate}>
            تعديل بيانات المنتج
          </button>
          <button className="button button-secondary" type="button" onClick={() => onChange({ draft: null })}>
            اختيار منتج موجود
          </button>
        </div>
      ) : line.product ? (
        <div className="inline-success" role="status">
          {line.product.name} — {line.product.sku}
          <button className="button button-secondary" type="button" onClick={() => onChange({ product: null, search: '' })}>
            تغيير المنتج
          </button>
        </div>
      ) : (
        <>
          <label className="form-field">
            <span>ابحث باسم المنتج أو الكود</span>
            <input
              className="input"
              value={line.search}
              onChange={(event) => onChange({ search: event.currentTarget.value })}
              type="search"
            />
          </label>
          <label className="form-field">
            <span>المنتجات المطابقة</span>
            <select
              className="input"
              value=""
              onChange={(event) => {
                const product = matches.data?.data.find((item) => item.id === Number(event.currentTarget.value));
                if (product) onChange({ product, search: `${product.name} — ${product.sku}` });
              }}
            >
              <option value="">اختر منتجًا موجودًا</option>
              {matches.data?.data.filter((item) => item.is_active).map((product) => (
                <option key={product.id} value={product.id}>{product.name} — {product.sku}</option>
              ))}
            </select>
          </label>
          <button className="button button-secondary" type="button" onClick={onCreate}>
            + إنشاء منتج جديد
          </button>
          {matches.isError && <p className="field-error" role="alert">تعذر البحث عن المنتجات.</p>}
        </>
      )}
      {duplicate && <p className="field-error" role="alert">لا يمكن تكرار المنتج نفسه في أكثر من سطر.</p>}
      <div className="inventory-toolbar">
        <label className="form-field">
          <span>الكمية</span>
          <input className="input" min="1" inputMode="numeric" pattern="[0-9]*" required value={line.quantity} onChange={(event) => onChange({ quantity: event.currentTarget.value })} />
        </label>
        <label className="form-field">
          <span>قيمة الشراء (ج.م)</span>
          <select className="input" value={line.purchaseMode} onChange={(event) => onChange({ purchaseMode: event.currentTarget.value as 'unit' | 'line', purchaseAmount: '' })}><option value="unit">سعر شراء الوحدة</option><option value="line">إجمالي قيمة السطر</option></select>
          <input className="input" min="0.0001" step="0.0001" inputMode="decimal" required aria-label={line.purchaseMode === 'unit' ? 'سعر شراء الوحدة' : 'إجمالي قيمة السطر'} value={line.purchaseAmount} onChange={(event) => onChange({ purchaseAmount: event.currentTarget.value })} />
        </label>
      </div>
      <button className="button button-secondary" type="button" onClick={onRemove}>
        حذف السطر
      </button>
    </fieldset>
  );
}

function CreateProductDraftModal({
  open,
  draft,
  categories,
  onClose,
  onSave,
  onChooseExisting,
}: {
  open: boolean;
  draft: DraftProduct;
  categories: Category[];
  onClose: () => void;
  onSave: (draft: DraftProduct) => void;
  onChooseExisting: (product: Product) => void;
}) {
  const [current, setCurrent] = useState(draft);
  const matches = useQuery({
    queryKey: ['/products', 'container-intake-name-check', current.name],
    queryFn: () => listResource<Product>('/products', { ...queryBase, search: current.name }),
    enabled: current.name.trim().length > 1,
  });
  const exactMatch = matches.data?.data.find((product) => product.name.trim().toLocaleLowerCase() === current.name.trim().toLocaleLowerCase());

  return (
    <Modal open={open} title="إنشاء منتج جديد داخل الحاوية" onClose={onClose}>
      <form className="stack-form" onSubmit={(event) => { event.preventDefault(); onSave(current); }}>
        <label className="form-field"><span>اسم المنتج</span><input className="input" required maxLength={200} value={current.name} onChange={(event) => { const name = event.currentTarget.value; setCurrent((value) => ({ ...value, name })); }} /></label>
        {exactMatch && <p className="field-error" role="alert">يوجد منتج بهذا الاسم. اختره بدل إنشاء نسخة جديدة.</p>}
        {matches.data?.data.filter((product) => product.is_active).slice(0, 5).map((product) => (
          <button className="button button-secondary" key={product.id} type="button" onClick={() => onChooseExisting(product)}>
            اختيار الموجود: {product.name} — {product.sku}
          </button>
        ))}
        <label className="form-field"><span>الفئة</span><select className="input" value={current.categoryId} onChange={(event) => { const categoryId = event.currentTarget.value; setCurrent((value) => ({ ...value, categoryId })); }}><option value="">بدون فئة</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
        <label className="form-field"><span>الوحدة</span><input className="input" required maxLength={32} value={current.unitCode} onChange={(event) => { const unitCode = event.currentTarget.value; setCurrent((value) => ({ ...value, unitCode })); }} /></label>
        <label className="form-field"><span>الكود (يُنشأ تلقائيًا إذا تُرك فارغًا)</span><input className="input" maxLength={100} value={current.sku} onChange={(event) => { const sku = event.currentTarget.value; setCurrent((value) => ({ ...value, sku })); }} /></label>
        <label className="form-field"><span>الحد الأدنى للمخزون (اختياري)</span><input className="input" type="number" min="0" step="1" inputMode="numeric" value={current.minimumStock} onChange={(event) => { const minimumStock = event.currentTarget.value; setCurrent((value) => ({ ...value, minimumStock })); }} /></label>
        <p className="field-hint">سيبقى المنتج مؤقتًا في النموذج ولن يُحفظ إلا مع الحاوية.</p>
        <div className="modal-actions"><button className="button button-secondary" type="button" onClick={onClose}>{ar.common.cancel}</button><button className="button button-primary" type="submit" disabled={Boolean(exactMatch)}>إضافة للسطر</button></div>
      </form>
    </Modal>
  );
}

function QuickWarehouseModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (warehouse: Warehouse) => void;
}) {
  const client = useQueryClient();
  const [error, setError] = useState('');
  const create = useMutation({
    mutationFn: createContainerQuickWarehouse,
    onSuccess: async (warehouse) => {
      setError('');
      client.setQueryData<ApiPage<Warehouse>>(['/warehouses', 'container-intake'], (page) => page ? { ...page, data: [warehouse, ...page.data.filter((item) => item.id !== warehouse.id)] } : page);
      await client.invalidateQueries({ queryKey: ['/warehouses'] });
      onCreated(warehouse);
    },
    onError: (cause) => setError(cause instanceof ApiError ? cause.message : 'تعذر إضافة المخزن.'),
  });
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    create.mutate({
      name: String(data.get('name') ?? '').trim(),
      location_type: String(data.get('location_type') ?? 'sub') as 'main' | 'sub' | 'vehicle',
      address: String(data.get('address') ?? '').trim() || null,
    });
  };

  return (
    <Modal open={open} title="إضافة مخزن" onClose={onClose}>
      <form className="stack-form" onSubmit={submit}>
        <label className="form-field"><span>اسم المخزن</span><input className="input" name="name" required maxLength={160} /></label>
        <label className="form-field"><span>النوع</span><select className="input" name="location_type" defaultValue="sub"><option value="main">رئيسي</option><option value="sub">فرعي</option><option value="vehicle">سيارة</option></select></label>
        <label className="form-field"><span>العنوان (اختياري)</span><input className="input" name="address" maxLength={500} /></label>
        {error && <p className="field-error" role="alert">{error}</p>}
        <div className="modal-actions"><button className="button button-secondary" type="button" onClick={onClose}>إلغاء</button><button className="button button-primary" disabled={create.isPending} type="submit">{create.isPending ? ar.app.loading : 'حفظ المخزن'}</button></div>
      </form>
    </Modal>
  );
}

export function ContainerIntakeForm({ onClose }: { onClose: () => void }) {
  const client = useQueryClient();
  const categories = useQuery({
    queryKey: ['/categories', 'container-intake'],
    queryFn: () => listResource<Category>('/categories', queryBase),
  });
  const warehouses = useQuery({
    queryKey: ['/warehouses', 'container-intake'],
    queryFn: () => listResource<Warehouse>('/warehouses', queryBase),
  });
  const [lines, setLines] = useState<IntakeLine[]>([emptyLine()]);
  const [costs, setCosts] = useState<IntakeCost[]>(costLabels.map((label) => ({ label, amount: '' })));
  const [allocationBasis, setAllocationBasis] = useState<'value' | 'quantity'>('quantity');
  const [warehouseId, setWarehouseId] = useState('');
  const [productDraftKey, setProductDraftKey] = useState<string | null>(null);
  const [quickWarehouseOpen, setQuickWarehouseOpen] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState<ContainerIntakeResult | null>(null);
  const intakeKey = useRef<string | null>(null);
  const activeProductDraftLine = lines.find((line) => line.key === productDraftKey);

  const totals = useMemo(() => {
    const quantities = lines.map((line) => Number(line.quantity) || 0);
    const totalQuantity = quantities.reduce((sum, value) => sum + value, 0);
    const lineValues = lines.map((line, index) => line.purchaseMode === 'unit' ? asCents(line.purchaseAmount) * BigInt(quantities[index]) : asCents(line.purchaseAmount));
    const goodsCents = lineValues.reduce((sum, value) => sum + value, 0n);
    const costAmounts = costs.map((cost) => asCents(cost.amount));
    const costsCents = costAmounts.reduce((sum, value) => sum + value, 0n);
    const allocatedByLine = Array.from({ length: lines.length }, () => 0n);
    for (const costCents of costAmounts) {
      const weights = lines.map((_line, index) => allocationBasis === 'quantity' ? BigInt(quantities[index]) : lineValues[index]);
      const shares = allocateProportionalCents(costCents, weights);
      shares.forEach((allocated, index) => {
        allocatedByLine[index] += allocated;
      });
    }
    const rows = lines.map((_line, index) => {
      const allocated = allocatedByLine[index];
      return {
        quantity: quantities[index],
        unitCostCents: quantities[index] > 0 ? divideRounded(lineValues[index] + allocated, BigInt(quantities[index])) : 0n,
      };
    });
    return { totalQuantity, goodsCents, costsCents, rows, totalCents: goodsCents + costsCents };
  }, [allocationBasis, costs, lines]);

  const create = useMutation({
    mutationFn: (input: ContainerIntakeInput) => {
      intakeKey.current ??= newIdempotencyKey();
      return createContainerIntake(input, intakeKey.current);
    },
    onSuccess: async (result) => {
      intakeKey.current = null;
      setSaved(result);
      setError('');
      await Promise.all([
        client.invalidateQueries({ queryKey: ['/containers'] }),
        client.invalidateQueries({ queryKey: ['/products'] }),
        client.invalidateQueries({ queryKey: ['/inventory'] }),
        client.invalidateQueries({ queryKey: ['/warehouses'] }),
      ]);
    },
    onError: (cause) => {
      if (cause instanceof ApiError && cause.status < 500) intakeKey.current = null;
      setError(cause instanceof ApiError ? `${cause.message} ${formatApiErrorDetails(cause.details)}` : cause instanceof Error ? cause.message : 'تعذر حفظ الحاوية.');
    },
  });

  const updateLine = (key: string, patch: Partial<IntakeLine>) => setLines((current) => current.map((line) => line.key === key ? { ...line, ...patch } : line));
  const duplicatedIds = useMemo(() => {
    const selected = lines.flatMap((line) => line.product ? [line.product.id] : []);
    return new Set(selected.filter((id) => selected.filter((value) => value === id).length > 1));
  }, [lines]);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    if (!warehouseId) { setError('اختر مخزن الاستلام قبل الحفظ.'); return; }
    if (lines.some((line) => (!line.product && !line.draft) || !(Number(line.quantity) > 0) || !Number.isInteger(Number(line.quantity)) || !moneyPattern.test(line.purchaseAmount) || asCents(line.purchaseAmount) <= 0n)) {
      setError('أكمل المنتج والكمية الموجبة وسعر شراء الوحدة لكل سطر.'); return;
    }
    if (duplicatedIds.size > 0) { setError('احذف تكرار الصنف قبل الحفظ.'); return; }
    const data = new FormData(event.currentTarget);
    const totalQuantity = lines.reduce((sum, line) => sum + Number(line.quantity), 0);
    const input: ContainerIntakeInput = {
      container_name: String(data.get('container_name') ?? '').trim(),
      container_number: String(data.get('container_number') ?? '').trim(),
      origin: String(data.get('origin') ?? '').trim(),
      destination: String(data.get('destination') ?? '').trim() || null,
      notes: String(data.get('notes') ?? '').trim() || null,
      warehouse_id: Number(warehouseId),
      allocation_basis: allocationBasis,
      movement_date: String(data.get('movement_date') ?? ''),
      lines: lines.map((line) => ({
        ...(line.product ? { product_id: line.product.id } : {}),
        ...(line.draft ? { new_product: {
          name: line.draft.name.trim(),
          sku: line.draft.sku.trim() || null,
          category_id: line.draft.categoryId ? Number(line.draft.categoryId) : null,
          unit_code: line.draft.unitCode.trim(),
          minimum_stock: line.draft.minimumStock.trim() ? Number(line.draft.minimumStock) : null,
        } } : {}),
        quantity: Number(line.quantity),
        ...(line.purchaseMode === 'unit' ? { purchase_unit_cost_egp: line.purchaseAmount } : { purchase_value_egp: line.purchaseAmount }),
      })),
      costs: costs.filter((cost) => cost.amount.trim() !== '').map((cost) => ({ cost_type: cost.label, amount_egp: cost.amount.trim(), description: null })),
    };
    if (!input.container_name || !input.container_number || !input.origin || !input.movement_date || totalQuantity <= 0) {
      setError('أكمل اسم الحاوية ورقمها وجهة القدوم وتاريخ الاستلام.'); return;
    }
    if (costs.some((cost) => cost.amount.trim() !== '' && (!moneyPattern.test(cost.amount) || asCents(cost.amount) < 0n))) {
      setError('راجع مبالغ المصروفات؛ أدخل أرقامًا موجبة أو اترك الحقل فارغًا.'); return;
    }
    create.mutate(input);
  };

  const saveProductDraft = (draft: DraftProduct) => {
    if (!activeProductDraftLine) return;
    const normalizedName = draft.name.trim().toLocaleLowerCase();
    if (lines.some((line) => line.key !== activeProductDraftLine.key && line.draft?.name.trim().toLocaleLowerCase() === normalizedName)) {
      setError('لا يمكن تكرار اسم المنتج الجديد في أكثر من سطر.');
      return;
    }
    updateLine(activeProductDraftLine.key, { draft, product: null, search: '' });
    setProductDraftKey(null);
  };
  const chooseExistingProduct = (product: Product) => {
    if (!activeProductDraftLine) return;
    updateLine(activeProductDraftLine.key, { product, draft: null, search: `${product.name} — ${product.sku}` });
    setProductDraftKey(null);
  };

  if (saved) {
    return (
      <div className="stack-form" role="status">
        <h3>تم حفظ الحاوية واستلام الأصناف</h3>
        <p>إجمالي الأصناف: {saved.total_quantity} · التكلفة الكلية: {formatMoney(saved.total_landed_cost_egp)} · متوسط تكلفة الوحدة: {formatMoney(saved.average_unit_cost_egp)}.</p>
        <p>المخزن: {saved.warehouse.name}</p>
        <ul>{saved.created_products.map((product) => <li key={product.id}><Link to={`/products/${product.id}`}>{product.name} — {product.sku}</Link></li>)}</ul>
        <div className="modal-actions"><Link className="button button-secondary" to="/warehouses">فتح شاشة المخازن</Link><Link className="button button-primary" to={`/containers/${saved.container.id}`}>فتح الحاوية {saved.container.container_number}</Link><button className="button button-secondary" type="button" onClick={onClose}>إغلاق</button></div>
      </div>
    );
  }

  return (
    <>
      <form className="stack-form container-intake-form" onSubmit={submit}>
        <div className="inventory-toolbar">
          <label className="form-field"><span>اسم الحاوية</span><input className="input" name="container_name" required maxLength={160} /></label>
          <label className="form-field"><span>رقم الحاوية (فريد)</span><input className="input" name="container_number" required maxLength={100} /></label>
        </div>
        <div className="inventory-toolbar">
          <label className="form-field"><span>جهة القدوم</span><input className="input" name="origin" required maxLength={160} /></label>
          <label className="form-field"><span>جهة الوصول (اختياري)</span><input className="input" name="destination" maxLength={160} /></label>
          <label className="form-field"><span>تاريخ الاستلام</span><input className="input" name="movement_date" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} /></label>
        </div>

        <section>
          <h3>أصناف الحاوية</h3>
          {lines.map((line) => <ProductPickerRow key={line.key} line={line} duplicate={Boolean(line.product && duplicatedIds.has(line.product.id))} onChange={(patch) => updateLine(line.key, patch)} onCreate={() => setProductDraftKey(line.key)} onRemove={() => setLines((current) => current.length > 1 ? current.filter((item) => item.key !== line.key) : current)} />)}
          <button className="button button-secondary" type="button" onClick={() => setLines((current) => [...current, emptyLine()])}>+ إضافة صنف</button>
        </section>

        <section>
          <h3>مصروفات الحاوية</h3>
          <p className="field-hint">أدخل المبالغ التي تدخل في تكلفة الشحنة. تُسجل كمستحقات للحاوية وتوزع على الأصناف.</p>
          <div className="container-intake-costs">{costs.map((cost, index) => <label className="form-field" key={cost.label}><span>{cost.label} (ج.م)</span><input className="input" inputMode="decimal" value={cost.amount} onChange={(event) => { const amount = event.currentTarget.value; setCosts((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, amount } : item)); }} /></label>)}</div>
          <label className="form-field"><span>أساس توزيع المصروفات</span><select className="input" value={allocationBasis} onChange={(event) => setAllocationBasis(event.currentTarget.value as 'quantity' | 'value')}><option value="quantity">حسب الكمية</option><option value="value">حسب قيمة الشراء</option></select></label>
        </section>

        <section>
          <h3>مخزن الاستلام</h3>
          {warehouses.isLoading ? <p>جارٍ تحميل المخازن…</p> : warehouses.isError ? <p className="field-error" role="alert">تعذر تحميل المخازن. أعد المحاولة أو افتح شاشة المخازن.</p> : warehouses.data?.data.filter((item) => item.is_active).length ? <label className="form-field"><span>اختر مخزن الاستلام</span><select className="input" required value={warehouseId} onChange={(event) => setWarehouseId(event.currentTarget.value)}><option value="">اختر مخزنًا</option>{warehouses.data.data.filter((item) => item.is_active).map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>)}</select></label> : <div className="inline-success" role="status"><strong>لا يوجد مخزن</strong><button className="button button-secondary" type="button" onClick={() => setQuickWarehouseOpen(true)}>+ إضافة مخزن</button></div>}
          {Boolean(warehouses.data?.data.some((item) => item.is_active)) && <button className="button button-secondary" type="button" onClick={() => setQuickWarehouseOpen(true)}>+ إضافة مخزن</button>}
        </section>

        <section>
          <h3>المعاينة قبل الحفظ</h3>
          <div className="table-wrap"><table className="data-table"><thead><tr><th>الصنف</th><th>النوع</th><th>الكمية</th><th>تكلفة الوحدة بعد التوزيع</th><th>مخزن الاستلام</th></tr></thead><tbody>{lines.map((line, index) => <tr key={line.key}><td>{line.draft?.name ?? line.product?.name ?? 'لم يُحدد'}</td><td>{line.draft ? 'جديد' : 'موجود'}</td><td>{line.quantity || '—'}</td><td>{formatCents(totals.rows[index]?.unitCostCents ?? 0)}</td><td>{warehouses.data?.data.find((item) => item.id === Number(warehouseId))?.name ?? 'لم يُحدد'}</td></tr>)}</tbody><tfoot><tr><th colSpan={2}>الإجمالي</th><th>{totals.totalQuantity}</th><th colSpan={2}>{formatCents(totals.totalCents)}</th></tr></tfoot></table></div>
          <p>قيمة الشراء: {formatCents(totals.goodsCents)} · المصروفات الموزعة: {formatCents(totals.costsCents)} · متوسط التكلفة: {totals.totalQuantity ? formatCents(divideRounded(totals.totalCents, BigInt(totals.totalQuantity))) : formatCents(0n)}.</p>
        </section>
        <label className="form-field"><span>ملاحظات</span><textarea className="input" name="notes" maxLength={2000} /></label>
        {error && <p className="field-error" role="alert">{error}</p>}
        <div className="modal-actions"><button className="button button-secondary" type="button" onClick={onClose}>إلغاء</button><button className="button button-primary" type="submit" disabled={create.isPending || warehouses.isLoading || warehouses.isError || !warehouseId}>{create.isPending ? ar.app.loading : 'حفظ الحاوية واستلام الأصناف'}</button></div>
      </form>
      {activeProductDraftLine && <CreateProductDraftModal key={activeProductDraftLine.key} open draft={activeProductDraftLine.draft ?? { name: '', sku: '', categoryId: '', unitCode: 'piece', minimumStock: '' }} categories={categories.data?.data ?? []} onClose={() => setProductDraftKey(null)} onSave={saveProductDraft} onChooseExisting={chooseExistingProduct} />}
      <QuickWarehouseModal open={quickWarehouseOpen} onClose={() => setQuickWarehouseOpen(false)} onCreated={(warehouse) => { setWarehouseId(String(warehouse.id)); setQuickWarehouseOpen(false); }} />
    </>
  );
}
