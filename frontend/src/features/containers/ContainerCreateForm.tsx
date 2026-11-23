import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ApiError } from '../../shared/api/errors';
import { useAuth } from '../../shared/auth/AuthProvider';
import { Modal } from '../../shared/components/Modal';
import { newIdempotencyKey } from '../../shared/api/http';
import { FormField } from '../../shared/components/FormField';
import { ar } from '../../shared/i18n/ar';
import { formatMoney } from '../../shared/utils/format';
import { isPositiveMoney } from '../../shared/utils/money';
import { createDriver, listDrivers } from '../admin/referenceApi';
import { createWarehouse, listResource, type ApiPage, type ListQuery, type Product, type Warehouse } from '../inventory/api';
import { createSupplier, listSuppliers } from '../purchases/api';
import { createContainerIntake } from './intakeApi';

type DraftContainerProduct = { name: string; sku: string; unit_code: string; description: string | null };

type ContainerProductLine = {
  key: string;
  product_id: string;
  quantity: string;
  unit_price: string;
  company_price: string;
  new_product: DraftContainerProduct | null;
};

type ReferenceFormKind = 'supplier' | 'driver' | 'product' | 'warehouse';

const optionsQuery: ListQuery = { page: 1, perPage: 100, search: '' };
const moneyPattern = /^(0|[1-9]\d{0,14})(\.\d{1,4})?$/;

function newLine(): ContainerProductLine {
  return { key: newIdempotencyKey(), product_id: '', quantity: '', unit_price: '', company_price: '', new_product: null };
}

function moneyToUnits4(value: string): bigint {
  if (!moneyPattern.test(value)) return 0n;
  const [integer, fraction = ''] = value.split('.');
  return BigInt(`${integer}${fraction.padEnd(4, '0')}`);
}

function moneyFromUnits4(value: bigint): string {
  return `${value / 10000n}.${(value % 10000n).toString().padStart(4, '0')}`;
}

async function loadAllPages<T>(fetchPage: (query: ListQuery) => Promise<ApiPage<T>>): Promise<T[]> {
  const first = await fetchPage(optionsQuery);
  if (first.meta.last_page <= 1) return first.data;
  const pages = await Promise.all(Array.from({ length: first.meta.last_page - 1 }, (_, index) =>
    fetchPage({ ...optionsQuery, page: index + 2 }),
  ));
  return [...first.data, ...pages.flatMap((page) => page.data)];
}

async function listAllProducts() {
  return (await loadAllPages((query) => listResource<Product>('/products', query))).filter((product) => product.is_active);
}

async function listAllWarehouses() {
  return (await loadAllPages((query) => listResource<Warehouse>('/warehouses', query))).filter((warehouse) => warehouse.is_active && warehouse.location_type !== 'damaged' && warehouse.location_type !== 'vehicle');
}

function generatedCode(prefix: string) {
  return `${prefix}-${newIdempotencyKey().replace(/[^a-zA-Z0-9]/g, '').slice(0, 16).toUpperCase()}`;
}

export function ContainerCreateForm({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [supplierId, setSupplierId] = useState('');
  const [driverId, setDriverId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [referenceTargetLine, setReferenceTargetLine] = useState<string | null>(null);
  const [referenceForm, setReferenceForm] = useState<ReferenceFormKind | null>(null);
  const [referenceError, setReferenceError] = useState('');
  const [savingReference, setSavingReference] = useState(false);
  const [lines, setLines] = useState<ContainerProductLine[]>([newLine()]);
  const intakeKey = useRef<string | null>(null);
  const canCreateSupplier = Boolean(user?.permissions.includes('*') || user?.permissions.includes('purchases.manage'));
  const canCreateDriver = Boolean(user?.permissions.includes('*') || user?.permissions.includes('shipping_drivers.manage'));
  const canCreateProduct = Boolean(user?.permissions.includes('*') || user?.permissions.includes('products.manage'));
  const canCreateWarehouse = Boolean(user?.permissions.includes('*') || user?.permissions.includes('warehouses.manage'));
  const products = useQuery({ queryKey: ['/products', 'container-create-options'], queryFn: listAllProducts });
  const warehouses = useQuery({ queryKey: ['/warehouses', 'container-create-options'], queryFn: listAllWarehouses });
  const suppliers = useQuery({ queryKey: ['/suppliers', 'container-create-options'], queryFn: () => loadAllPages(listSuppliers) });
  const drivers = useQuery({ queryKey: ['/drivers', 'container-create-options'], queryFn: () => loadAllPages((query) => listDrivers(query)) });

  useEffect(() => {
    if (!warehouseId && warehouses.data?.length === 1) setWarehouseId(String(warehouses.data[0].id));
  }, [warehouseId, warehouses.data]);

  const updateLine = (key: string, patch: Partial<ContainerProductLine>) => {
    setLines((current) => current.map((line) => line.key === key ? { ...line, ...patch } : line));
  };

  const openReferenceForm = (kind: ReferenceFormKind, lineKey: string | null = null) => {
    setReferenceError('');
    setReferenceTargetLine(lineKey);
    setReferenceForm(kind);
  };

  const saveReference = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!referenceForm) return;
    setReferenceError('');
    setSavingReference(true);
    const values = new FormData(event.currentTarget);
    const name = String(values.get('name') ?? '').trim();
    try {
      if (referenceForm === 'supplier') {
        const created = await createSupplier({ name, phone: String(values.get('phone') ?? '').trim() || null });
        await queryClient.invalidateQueries({ queryKey: ['/suppliers'] });
        setSupplierId(String(created.data.id));
      } else if (referenceForm === 'driver') {
        const created = await createDriver({ name, shipping_company: String(values.get('shipping_company') ?? '').trim() || null });
        await queryClient.invalidateQueries({ queryKey: ['/drivers'] });
        setDriverId(String(created.data.id));
      } else if (referenceForm === 'warehouse') {
        const created = await createWarehouse({
          code: String(values.get('code') ?? '').trim() || generatedCode('WH'),
          name,
          location_type: String(values.get('location_type') ?? 'main') as Warehouse['location_type'],
          parent_location_id: null,
          is_active: true,
          notes: null,
          address: String(values.get('address') ?? '').trim() || null,
          manager_name: null,
          capacity_units: null,
        });
        await queryClient.invalidateQueries({ queryKey: ['/warehouses'] });
        setWarehouseId(String(created.id));
      } else {
        if (!referenceTargetLine) throw new Error('اختر سطر الصنف الذي ستضيف إليه المنتج.');
        const input: DraftContainerProduct = {
          sku: String(values.get('sku') ?? '').trim(),
          name,
          unit_code: String(values.get('unit_code') ?? 'piece'),
          description: String(values.get('description') ?? '').trim() || null,
        };
        updateLine(referenceTargetLine, { product_id: '', new_product: input });
      }
      setReferenceForm(null);
    } catch (cause) {
      setReferenceError(cause instanceof Error ? cause.message : ar.common.requestFailed);
    } finally {
      setSavingReference(false);
    }
  };

  const totalQuantity = lines.reduce((sum, line) => sum + (Number(line.quantity) || 0), 0);
  const totalValueUnits = lines.reduce((sum, line) => {
    const quantity = Number.isInteger(Number(line.quantity)) ? BigInt(line.quantity || '0') : 0n;
    return sum + (moneyToUnits4(line.unit_price) * quantity);
  }, 0n);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    if (!warehouseId || !warehouses.data?.some((warehouse) => String(warehouse.id) === warehouseId)) {
      setError('اختر مخزنًا نشطًا أو أضف مخزنًا قبل حفظ الحاوية.');
      return;
    }
    if (products.isLoading || products.isError) {
      setError('تعذر تحميل قائمة المنتجات. أعد المحاولة قبل حفظ الحاوية.');
      return;
    }
    const usedProductIds = lines.map((line) => line.product_id).filter(Boolean);
    const newProductNames = lines.map((line) => line.new_product?.name.trim().toLocaleLowerCase()).filter((name): name is string => Boolean(name));
    if (lines.some((line) => (!line.product_id && !line.new_product) || !Number.isInteger(Number(line.quantity)) || Number(line.quantity) <= 0 || !moneyPattern.test(line.unit_price) || !isPositiveMoney(line.unit_price) || !moneyPattern.test(line.company_price) || !isPositiveMoney(line.company_price))) {
      setError('أكمل المنتج والكمية وسعر الشراء وسعر الشركة لكل سطر.');
      return;
    }
    if (new Set(usedProductIds).size !== usedProductIds.length || new Set(newProductNames).size !== newProductNames.length) {
      setError('لا يمكن تكرار المنتج نفسه في أكثر من سطر.');
      return;
    }

    setSaving(true);
    const values = new FormData(event.currentTarget);
    try {
      intakeKey.current ??= newIdempotencyKey();
      await createContainerIntake({
        container_name: String(values.get('container_name') ?? '').trim(),
        container_number: String(values.get('container_number') ?? '').trim(),
        warehouse_id: Number(warehouseId),
        supplier_id: supplierId ? Number(supplierId) : null,
        shipping_driver_id: driverId ? Number(driverId) : null,
        trip_reference: String(values.get('trip_reference') ?? '').trim() || null,
        origin: String(values.get('origin') ?? '').trim(),
        destination: String(values.get('destination') ?? '').trim() || null,
        notes: String(values.get('notes') ?? '').trim() || null,
        estimated_departure: String(values.get('estimated_departure') ?? '') || null,
        estimated_arrival: String(values.get('estimated_arrival') ?? '') || null,
        allocation_basis: 'quantity',
        movement_date: (() => { const now = new Date(); return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`; })(),
        costs: [],
        lines: lines.map((line) => ({
          ...(line.product_id ? { product_id: Number(line.product_id) } : {
            new_product: {
              name: line.new_product!.name,
              sku: line.new_product!.sku || null,
              category_id: null,
              unit_code: line.new_product!.unit_code,
              minimum_stock: null,
              description: line.new_product!.description || null,
            },
          }),
          quantity: Number(line.quantity),
          purchase_unit_cost_egp: line.unit_price.trim(),
          company_price_egp: line.company_price.trim(),
        })),
      }, intakeKey.current);
      intakeKey.current = null;
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['/products'] }),
        queryClient.invalidateQueries({ queryKey: ['/warehouses'] }),
        queryClient.invalidateQueries({ queryKey: ['/inventory'] }),
        queryClient.invalidateQueries({ queryKey: ['/inventory/movements'] }),
      ]);
      onCreated();
      onClose();
    } catch (cause) {
      if (cause instanceof ApiError && cause.status < 500) intakeKey.current = null;
      setError(cause instanceof ApiError || cause instanceof Error ? cause.message : ar.common.requestFailed);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
    <form className="stack-form container-create-form" onSubmit={submit}>
      <section>
        <h3>بيانات الحاوية</h3>
        <div className="container-create-metadata">
          <FormField id="container-name" label="اسم الحاوية" name="container_name" maxLength={160} required />
          <FormField id="container-number" label={ar.inventory.containerNumber} name="container_number" maxLength={100} required />
          <label className="form-field">
            <span>المخزن الذي ستدخل إليه الكمية</span>
            <div className="container-reference-select">
              <select className="input" name="received_location_id" value={warehouseId} onChange={(event) => setWarehouseId(event.currentTarget.value)} required>
                <option value="">اختر المخزن</option>
                {warehouses.data?.map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.name} — {warehouse.code}</option>)}
              </select>
              {canCreateWarehouse && <button className="button button-secondary" onClick={() => openReferenceForm('warehouse')} type="button">+ إضافة مخزن</button>}
            </div>
            {warehouses.isError && <small className="field-error">تعذر تحميل المخازن. أعد المحاولة قبل حفظ الحاوية.</small>}
          </label>
          <label className="form-field">
            <span>المصنع / المورد</span>
            <div className="container-reference-select">
              <select className="input" name="supplier_id" value={supplierId} onChange={(event) => setSupplierId(event.currentTarget.value)}>
                <option value="">بدون مصنع / مورد</option>
                {suppliers.data?.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
              </select>
              {canCreateSupplier && <button className="button button-secondary" onClick={() => openReferenceForm('supplier')} type="button">+ إضافة</button>}
            </div>
            {suppliers.isError && <small className="field-hint">تعذر تحميل الموردين؛ يمكنك حفظ الحاوية بدونه.</small>}
          </label>
          <FormField id="container-origin" label={ar.inventory.containerOrigin} name="origin" maxLength={160} required />
          <FormField id="container-destination" label={ar.inventory.containerDestination} name="destination" maxLength={160} />
          <label className="form-field">
            <span>مندوب الشحن</span>
            <div className="container-reference-select">
              <select className="input" name="shipping_driver_id" value={driverId} onChange={(event) => setDriverId(event.currentTarget.value)}>
                <option value="">بدون مندوب شحن</option>
                {drivers.data?.filter((driver) => driver.is_active).map((driver) => <option key={driver.id} value={driver.id}>{driver.name}{driver.shipping_company ? ` — ${driver.shipping_company}` : ''}</option>)}
              </select>
              {canCreateDriver && <button className="button button-secondary" onClick={() => openReferenceForm('driver')} type="button">+ إضافة</button>}
            </div>
            {drivers.isError && <small className="field-hint">تعذر تحميل مندوبي الشحن؛ يمكنك حفظ الحاوية بدونه.</small>}
          </label>
          <FormField id="container-trip-reference" label="مرجع الرحلة" name="trip_reference" maxLength={100} />
          <FormField id="container-departure" label={ar.inventory.containerDeparture} name="estimated_departure" type="date" />
          <FormField id="container-arrival" label={ar.inventory.containerArrival} name="estimated_arrival" type="date" />
        </div>
      </section>

      <section className="container-create-products">
        <div className="container-create-section-heading">
          <div>
            <h3>أصناف الحاوية</h3>
            <p className="field-hint">عند حفظ الحاوية، تدخل الكميات فورًا إلى المخزن المحدد وتُسجل كحركة استلام.</p>
          </div>
          <button className="button button-secondary" onClick={() => setLines((current) => [...current, newLine()])} type="button">+ إضافة صنف</button>
        </div>
        {products.isLoading ? <p>{ar.app.loading}</p> : products.isError ? <p className="field-error" role="alert">تعذر تحميل المنتجات.</p> : lines.map((line, index) => (
          <fieldset className="container-create-line" key={line.key}>
            <legend>الصنف {index + 1}</legend>
            <label className="form-field">
              <span>{ar.common.product}</span>
              <div className="container-reference-select">
              {line.new_product && <p className="inline-success" role="status">منتج جديد — {line.new_product.name} (يُحفظ مع الحاوية)</p>}
              <select className="input" value={line.product_id} required={!line.new_product} onChange={(event) => {
                  const productId = event.currentTarget.value;
                  const product = products.data?.find((item) => String(item.id) === productId);
                  updateLine(line.key, {
                    product_id: productId,
                  new_product: null,
                    unit_price: product?.purchase_cost_egp ?? '',
                    company_price: product?.company_price ?? '',
                  });
                }}>
                  <option value="">{ar.common.select}</option>
                  {products.data?.map((product) => <option key={product.id} value={product.id}>{product.name} — {product.sku}</option>)}
                </select>
                {canCreateProduct && <button className="button button-secondary" onClick={() => openReferenceForm('product', line.key)} type="button">+ إضافة منتج</button>}
              </div>
            </label>
            <label className="form-field">
              <span>الكمية</span>
              <input className="input" type="number" min="1" step="1" inputMode="numeric" value={line.quantity} onChange={(event) => updateLine(line.key, { quantity: event.currentTarget.value })} required />
            </label>
            <label className="form-field">
              <span>سعر الشراء للوحدة (ج.م)</span>
              <input className="input" type="number" min="0.0001" step="0.0001" inputMode="decimal" value={line.unit_price} onChange={(event) => updateLine(line.key, { unit_price: event.currentTarget.value })} required />
            </label>
            <label className="form-field">
              <span>سعر الشركة للوحدة (ج.م)</span>
              <input className="input" type="number" min="0.0001" step="0.0001" inputMode="decimal" value={line.company_price} onChange={(event) => updateLine(line.key, { company_price: event.currentTarget.value })} required />
            </label>
            <button className="button button-secondary" disabled={lines.length === 1} onClick={() => setLines((current) => current.filter((item) => item.key !== line.key))} type="button">حذف</button>
          </fieldset>
        ))}
        <div className="container-create-totals" aria-live="polite">
          <span>إجمالي الكمية: <strong>{totalQuantity || '—'}</strong></span>
          <span>إجمالي قيمة الأصناف: <strong>{formatMoney(moneyFromUnits4(totalValueUnits))}</strong></span>
        </div>
      </section>

      <label className="form-field">
        <span>{ar.customers.notes}</span>
        <textarea className="input" name="notes" rows={3} />
      </label>
      {error && <p className="field-error" role="alert">{error}</p>}
      <div className="modal-actions">
        <button className="button button-secondary" onClick={onClose} type="button">{ar.common.cancel}</button>
        <button className="button button-primary" disabled={saving || products.isLoading || products.isError || warehouses.isLoading || warehouses.isError} type="submit">{saving ? ar.app.loading : ar.common.save}</button>
      </div>
    </form>
    <Modal
      open={referenceForm !== null}
      title={referenceForm === 'supplier' ? 'إضافة مصنع / مورد' : referenceForm === 'driver' ? 'إضافة مندوب شحن' : referenceForm === 'product' ? 'إضافة منتج للحاوية' : 'إضافة مخزن'}
      onClose={() => { if (!savingReference) setReferenceForm(null); }}
    >
      <form className="stack-form" onSubmit={(event) => { void saveReference(event); }}>
        <FormField
          id="container-reference-name"
          label={referenceForm === 'supplier' ? 'اسم المصنع / المورد' : referenceForm === 'driver' ? 'اسم المندوب' : referenceForm === 'product' ? 'اسم المنتج المؤقت' : 'اسم المخزن'}
          name="name"
          maxLength={referenceForm === 'supplier' ? 200 : referenceForm === 'product' ? 200 : 160}
          required
        />
        {referenceForm === 'supplier' && <FormField id="container-reference-phone" label="رقم الهاتف" name="phone" maxLength={32} />}
        {referenceForm === 'driver' && <FormField id="container-reference-company" label="شركة الشحن" name="shipping_company" maxLength={160} />}
        {referenceForm === 'product' && <>
          <FormField id="container-reference-sku" label="كود المنتج (اختياري)" name="sku" maxLength={100} />
          <label className="form-field"><span>وحدة القياس</span><select className="input" name="unit_code" defaultValue="piece"><option value="piece">قطعة</option><option value="box">كرتونة</option><option value="kg">كيلوجرام</option><option value="liter">لتر</option></select></label>
          <FormField id="container-reference-description" label={ar.common.description} name="description" />
        </>}
        {referenceForm === 'warehouse' && <>
          <FormField id="container-reference-code" label="كود المخزن (اختياري)" name="code" maxLength={80} />
          <label className="form-field"><span>نوع المخزن</span><select className="input" name="location_type" defaultValue="main"><option value="main">رئيسي</option><option value="sub">فرعي</option><option value="other">أخرى</option></select></label>
          <FormField id="container-reference-address" label="العنوان (اختياري)" name="address" maxLength={500} />
        </>}
        <p className="field-hint">لن يُحفظ المنتج في الكتالوج إلا مع نجاح حفظ الحاوية والاستلام.</p>
        {referenceError && <p className="field-error" role="alert">{referenceError}</p>}
        <div className="modal-actions">
          <button className="button button-secondary" disabled={savingReference} onClick={() => setReferenceForm(null)} type="button">{ar.common.cancel}</button>
          <button className="button button-primary" disabled={savingReference} type="submit">{savingReference ? ar.app.loading : 'حفظ وإضافة للاختيار'}</button>
        </div>
      </form>
    </Modal>
    </>
  );
}
