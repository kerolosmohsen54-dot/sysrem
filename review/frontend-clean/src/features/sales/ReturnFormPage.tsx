import { useMutation, useQuery } from '@tanstack/react-query';
import { useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FormField } from '../../shared/components/FormField';
import { Modal } from '../../shared/components/Modal';
import { PageState } from '../../shared/components/PageState';
import { ar } from '../../shared/i18n/ar';
import type { Customer } from '../customers/api';
import { listResource, type ListQuery, type Product, type Warehouse } from '../inventory/api';
import { listInvoices, previewReturn, type ReturnPreview } from './api';
import { formatMoney } from '../../shared/utils/format';

type ReturnMode = 'linked' | 'free';
type ReturnFormPageProps = { embedded?: boolean; onClose?: () => void };

const optionsQuery: ListQuery = { page: 1, perPage: 100, search: '' };

export function ReturnFormPage({ embedded = false, onClose }: ReturnFormPageProps = {}) {
  const navigate = useNavigate();
  const close = onClose ?? (() => navigate('/returns'));
  const wrap = (content: ReactNode) =>
    embedded ? (
      <Modal open title={ar.sales.returnCreateTitle} onClose={close}>
        {content}
      </Modal>
    ) : (
      <>{content}</>
    );
  const [mode, setMode] = useState<ReturnMode>('linked');
  const [customerId, setCustomerId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [productId, setProductId] = useState('');
  const [preview, setPreview] = useState<ReturnPreview | null>(null);
  const [previewError, setPreviewError] = useState('');
  const previewRequestVersion = useRef(0);
  const invoices = useQuery({
    queryKey: ['/invoices', 'return-options'],
    queryFn: () => listInvoices(optionsQuery),
  });
  const customers = useQuery({
    queryKey: ['/customers', 'return-options'],
    queryFn: () => listResource<Customer>('/customers', optionsQuery),
  });
  const warehouses = useQuery({
    queryKey: ['/warehouses', 'return-options'],
    queryFn: () => listResource<Warehouse>('/warehouses', optionsQuery),
  });
  const products = useQuery({
    queryKey: ['/products', 'return-options'],
    queryFn: () => listResource<Product>('/products', optionsQuery),
  });
  const previewMutation = useMutation({
    mutationFn: previewReturn,
  });

  if (invoices.isLoading || customers.isLoading || warehouses.isLoading || products.isLoading) {
    return wrap(<PageState kind="loading" />);
  }
  if (invoices.isError || customers.isError || warehouses.isError || products.isError) {
    return wrap(
      <PageState
        kind="error"
        message={ar.common.requestFailed}
        onRetry={() => {
          void invoices.refetch();
          void customers.refetch();
          void warehouses.refetch();
          void products.refetch();
        }}
      />,
    );
  }

  const requestPreview = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const requestVersion = previewRequestVersion.current;
    setPreviewError('');
    const values = new FormData(event.currentTarget);
    const quantity = String(values.get('quantity') ?? '');
    const unitPrice = String(values.get('unit_price_egp') ?? '');
    if (!/^[1-9]\d*$/.test(quantity) || !/^(0|[1-9][0-9]{0,14})(\.[0-9]{1,4})?$/.test(unitPrice)) {
      setPreviewError(ar.common.invalidAmount);
      return;
    }
    const quantityValue = BigInt(quantity);
    if (quantityValue > BigInt(Number.MAX_SAFE_INTEGER)) {
      setPreviewError(ar.common.quantityMustBeInteger);
      return;
    }
    try {
      const result = await previewMutation.mutateAsync({
        customer_id: Number(customerId),
        issue_date: String(values.get('issue_date') ?? ''),
        original_document_id: null,
        notes: String(values.get('notes') ?? '').trim() || null,
        lines: [
          {
            warehouse_id: Number(warehouseId),
            quantity: Number(quantityValue),
            product_id: Number(productId),
            unit_price_egp: unitPrice,
            description: String(values.get('description') ?? '').trim() || null,
          },
        ],
      });
      if (requestVersion === previewRequestVersion.current) setPreview(result);
    } catch (cause) {
      if (requestVersion === previewRequestVersion.current) {
        setPreview(null);
        setPreviewError(cause instanceof Error ? cause.message : ar.common.requestFailed);
      }
    }
  };

  const changeMode = (nextMode: ReturnMode) => {
    previewRequestVersion.current += 1;
    setPreview(null);
    setPreviewError('');
    setMode(nextMode);
  };
  const eligibleInvoices =
    invoices.data?.data.filter(
      (invoice) => invoice.status === 'issued' || invoice.status === 'paid',
    ) ?? [];

  const content = (
    <section className={embedded ? 'return-form-content' : 'page invoice-form'}>
      {!embedded && (
        <header className="page-heading">
          <div>
            <h1>{ar.sales.returnCreateTitle}</h1>
            <p>{ar.sales.returnCreateDescription}</p>
          </div>
          <Link className="button button-secondary" to="/returns">
            {ar.sales.backToReturns}
          </Link>
        </header>
      )}
      <form
        className="stack-form"
        onChange={() => {
          previewRequestVersion.current += 1;
          setPreview(null);
          setPreviewError('');
        }}
        onSubmit={(event) => void requestPreview(event)}
      >
        <fieldset className="invoice-line-editor">
          <legend>{ar.sales.returnMode}</legend>
          <button
            aria-pressed={mode === 'linked'}
            className={mode === 'linked' ? 'button button-primary' : 'button button-secondary'}
            onClick={() => changeMode('linked')}
            type="button"
          >
            {ar.sales.linkedReturn}
          </button>
          <button
            aria-pressed={mode === 'free'}
            className={mode === 'free' ? 'button button-primary' : 'button button-secondary'}
            onClick={() => changeMode('free')}
            type="button"
          >
            {ar.sales.freeReturn}
          </button>
        </fieldset>

        <div className="inventory-toolbar">
          {mode === 'linked' && (
            <label className="inventory-search">
              <span>{ar.sales.returnSelectInvoice}</span>
              <select className="input" defaultValue="">
                <option value="">{ar.sales.returnSelectInvoice}</option>
                {eligibleInvoices.map((invoice) => (
                  <option key={invoice.id} value={invoice.id}>
                    {invoice.invoice_number} — {invoice.customer_name}
                  </option>
                ))}
              </select>
            </label>
          )}
          {mode === 'free' && (
            <label className="inventory-search">
              <span>{ar.common.customer}</span>
              <select
                className="input"
                name="customer_id"
                onChange={(event) => setCustomerId(event.currentTarget.value)}
                required
                value={customerId}
              >
                <option value="">{ar.sales.selectCustomer}</option>
                {customers.data?.data.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="inventory-search">
            <span>{ar.sales.returnSelectWarehouse}</span>
            <select
              className="input"
              name="warehouse_id"
              onChange={(event) => setWarehouseId(event.currentTarget.value)}
              required
              value={warehouseId}
            >
              <option value="">{ar.sales.returnSelectWarehouse}</option>
              {warehouses.data?.data.map((warehouse) => (
                <option key={warehouse.id} value={warehouse.id}>
                  {warehouse.name}
                </option>
              ))}
            </select>
          </label>
          <FormField
            id="return-date"
            label={ar.common.date}
            name="issue_date"
            type="date"
            defaultValue={new Date().toISOString().slice(0, 10)}
            required
          />
        </div>

        {mode === 'free' ? (
          <section className="invoice-line-editor" aria-labelledby="return-fields-heading">
            <h2 id="return-fields-heading">{ar.sales.returnItems}</h2>
            <label className="form-field">
              <span>{ar.common.product}</span>
              <select
                className="input"
                onChange={(event) => setProductId(event.currentTarget.value)}
                required
                value={productId}
              >
                <option value="">{ar.inventory.selectProduct}</option>
                {(products.data?.data ?? []).map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name} — {product.sku}
                  </option>
                ))}
              </select>
            </label>
            <FormField
              id="return-quantity"
              label={ar.common.quantity}
              name="quantity"
              inputMode="numeric"
              min="1"
              pattern="[1-9][0-9]*"
              required
            />
            <FormField
              id="return-price"
              label={ar.sales.unitPrice}
              name="unit_price_egp"
              inputMode="decimal"
              pattern="^(0|[1-9][0-9]{0,14})(\.[0-9]{1,4})?$"
              required
            />
            <FormField
              id="return-description"
              label={ar.common.description}
              name="description"
              maxLength={500}
            />
            <FormField id="return-notes" label={ar.sales.notes} name="notes" maxLength={1000} />
          </section>
        ) : (
          <p className="inline-alert">{ar.sales.returnCreateWaitingMessage}</p>
        )}
        <section className="invoice-preview-waiting" aria-labelledby="return-preview-heading">
          <h2 id="return-preview-heading">{ar.sales.returnSubmissionWaiting}</h2>
          {previewError && (
            <p className="field-error" role="alert">
              {previewError}
            </p>
          )}
          {preview && (
            <dl className="invoice-detail-summary">
              <div>
                <dt>{ar.sales.previewSubtotal}</dt>
                <dd>{formatMoney(preview.subtotal_egp)}</dd>
              </div>
              <div>
                <dt>{ar.sales.previewDiscount}</dt>
                <dd>{formatMoney(preview.discount_amount_egp)}</dd>
              </div>
              <div>
                <dt>{ar.sales.previewTax}</dt>
                <dd>{formatMoney(preview.tax_amount_egp)}</dd>
              </div>
              <div>
                <dt>{ar.sales.previewTotal}</dt>
                <dd>{formatMoney(preview.grand_total_egp)}</dd>
              </div>
            </dl>
          )}
          <button
            className="button button-secondary"
            type="submit"
            disabled={mode !== 'free' || previewMutation.isPending}
          >
            {ar.sales.previewWaiting}
          </button>
        </section>
        <div className="modal-actions">
          {embedded && (
            <button className="button button-secondary" onClick={close} type="button">
              {ar.common.cancel}
            </button>
          )}
          <button className="button button-primary" disabled type="submit">
            {ar.sales.submitReturn}
          </button>
        </div>
      </form>
    </section>
  );
  return wrap(content);
}
