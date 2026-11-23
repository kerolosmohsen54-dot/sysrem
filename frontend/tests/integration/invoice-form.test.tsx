import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { InvoiceFormPage } from '../../src/features/sales/InvoiceFormPage';
import { ReturnFormPage } from '../../src/features/sales/ReturnFormPage';
import type { InvoiceInput } from '../../src/features/sales/api';
import { AuthProvider } from '../../src/shared/auth/AuthProvider';
import { ar } from '../../src/shared/i18n/ar';
import { server } from '../server';
import { sessionStore } from '../../src/shared/auth/sessionStore';

async function selectAdditionalWarehouse(user: ReturnType<typeof userEvent.setup>) {
  const details = document.querySelector<HTMLDetailsElement>('.invoice-extra-options');
  const summary = details?.querySelector('summary');
  if (!details || !summary) throw new Error('Invoice additional options are unavailable.');
  if (!details.open) await user.click(summary);
  const warehouse = details.querySelector<HTMLSelectElement>('select[aria-label]');
  if (!warehouse) throw new Error('Invoice warehouse selector is unavailable.');
  await user.selectOptions(warehouse, '401');
}

async function linkedReturnSourceLine() {
  let sourceLine: HTMLSelectElement | null = null;
  await waitFor(() => {
    sourceLine = document.querySelector<HTMLSelectElement>('section[aria-labelledby="linked-return-lines-heading"] select');
    if (!sourceLine?.querySelector('option[value="77"]')) throw new Error('The linked source invoice line is unavailable.');
  });
  if (!sourceLine) throw new Error('The linked source invoice line is unavailable.');
  return sourceLine;
}

function invoicePriceField() {
  const field = document.querySelector<HTMLInputElement>('.invoice-line-sale-price input, .invoice-line-price input');
  if (!field) throw new Error('The invoice unit price field is unavailable.');
  return field;
}

function invoiceIssueButton() {
  const button = document.querySelector<HTMLButtonElement>('.invoice-create-actions button.button-primary');
  if (!button) throw new Error('The invoice issue action is unavailable.');
  return button;
}

function authenticateOwner() {
  const user = { id: 1, username: 'owner-demo', name: 'Owner', role: 'owner', permissions: ['*'] };
  sessionStore.setUser(user);
  server.use(
    http.get('/api/v1/auth/me', () => HttpResponse.json(user)),
    http.post('/api/v1/invoices/preview', () => HttpResponse.json({ data: {
      lines: [], subtotal_egp: '450.00', discount_amount_egp: '0.00',
      tax_enabled: false, tax_rate: '0.00', tax_calculation_method: null,
      tax_amount_egp: '0.00', grand_total_egp: '450.00', warnings: [],
    } })),
  );
}

const invoiceDraftStorage = new Map<string, string>();
beforeEach(() => {
  invoiceDraftStorage.clear();
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => invoiceDraftStorage.get(key) ?? null,
      setItem: (key: string, value: string) => invoiceDraftStorage.set(key, String(value)),
      removeItem: (key: string) => invoiceDraftStorage.delete(key),
      clear: () => invoiceDraftStorage.clear(),
    },
  });
});

describe('invoice creation screen', () => {
  it('creates a linked return with the source invoice line id', async () => {
    authenticateOwner();
    let postedReturn: Record<string, unknown> | null = null;
    server.use(
      http.get('/api/v1/invoices', () => HttpResponse.json({ data: [{
        id: 42,
        document_number: 'INV-LINK-42',
        customer_id: 101,
        customer_name: 'Test customer',
        issue_date: '2026-10-15',
        due_date: null,
        total_amount: '20.00',
        paid_egp: null,
        remaining_egp: '20.00',
        issuer_name_snapshot: 'Owner',
        status: 'posted',
      }], meta: { current_page: 1, per_page: 100, total: 1, last_page: 1 } })),
      http.get('/api/v1/invoices/42', () => HttpResponse.json({ data: {
        document: {
          id: 42,
          document_number: 'INV-LINK-42',
          status: 'posted',
          payment_status: 'unpaid',
          customer_id: 101,
          customer_name_snapshot: 'Test customer',
          issue_date: '2026-10-15',
          due_date: null,
          total_amount: '20.00',
          issuer_name_snapshot: 'Owner',
        },
        lines: [{
          id: 77,
          product_id: 501,
          location_id: 401,
          product_name: 'Test product',
          description_snapshot: 'Test product',
          sku_snapshot: 'P-501',
          quantity: '2',
          remaining_quantity: 2,
          returned_quantity: 0,
          unit_price: '10.00',
          discount_amount: null,
          line_total: '20.00',
        }],
      } })),
      http.get('/api/v1/customers', () => HttpResponse.json({ data: [{ id: 101, name: 'Test customer', is_active: true }], meta: { current_page: 1, per_page: 100, total: 1, last_page: 1 } })),
      http.get('/api/v1/warehouses', () => HttpResponse.json({ data: [{ id: 401, code: 'WH-401', name: 'Test warehouse', location_type: 'main', is_active: true }], meta: { current_page: 1, per_page: 100, total: 1, last_page: 1 } })),
      http.get('/api/v1/products', () => HttpResponse.json({ data: [], meta: { current_page: 1, per_page: 100, total: 0, last_page: 1 } })),
      http.get('/api/v1/invoice-issuers', () => HttpResponse.json({ data: { company: [{ type: 'company', name: 'MASTER' }], partners: [], drivers: [] } })),
      http.post('/api/v1/returns/preview', () => HttpResponse.json({ data: { lines: [], subtotal_egp: '10.00', discount_amount_egp: '0.00', tax_amount_egp: '0.00', grand_total_egp: '10.00', warnings: [] } })),
      http.post('/api/v1/returns', async ({ request }) => {
        postedReturn = await request.json() as Record<string, unknown>;
        return HttpResponse.json({ data: { document: { id: 43, document_number: 'RET-LINK-43' }, lines: [] } }, { status: 201 });
      }),
    );
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <MemoryRouter>
        <QueryClientProvider client={client}>
          <AuthProvider>
            <ReturnFormPage />
          </AuthProvider>
        </QueryClientProvider>
      </MemoryRouter>,
    );
    const user = userEvent.setup();
    const original = await screen.findByRole('combobox', { name: ar.sales.returnSelectInvoice });
    await user.selectOptions(original, '42');
    await user.selectOptions(await linkedReturnSourceLine(), '77');
    await user.selectOptions(screen.getByRole('combobox', { name: ar.sales.returnSelectWarehouse }), '401');
    await user.type(screen.getByLabelText(new RegExp(ar.common.quantity)), '1');
    await user.click(screen.getByRole('button', { name: ar.sales.previewWaiting }));
    await user.click(await screen.findByRole('button', { name: ar.sales.submitReturn }));

    await waitFor(() => expect(postedReturn).not.toBeNull());
    expect(postedReturn).toMatchObject({
      customer_id: 101,
      original_document_id: 42,
      lines: [{ warehouse_id: 401, quantity: 1, original_document_line_id: 77 }],
    });
  }, 15_000);

  it('sends decimal strings to the API and does not calculate a browser preview', async () => {
    authenticateOwner();
    let received: InvoiceInput | null = null;
    server.use(
      http.post('/api/v1/invoices', async ({ request }) => {
        received = (await request.json()) as InvoiceInput;
        return HttpResponse.json(
          { data: { document: { id: 990, document_number: 'INV-DRAFT-990', status: 'draft' } } },
          { status: 201 },
        );
      }),
    );
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <MemoryRouter>
        <QueryClientProvider client={client}>
          <AuthProvider>
            <InvoiceFormPage />
          </AuthProvider>
        </QueryClientProvider>
      </MemoryRouter>,
    );
    const user = userEvent.setup();

    expect(await screen.findByText(ar.sales.previewWaitingMessage)).toBeVisible();
    await user.selectOptions(screen.getByRole('combobox', { name: ar.common.customer }), '101');
    await user.selectOptions(screen.getByLabelText(ar.common.product), '201');
    await selectAdditionalWarehouse(user);
    await user.clear(screen.getByLabelText(new RegExp(ar.common.quantity)));
    await user.type(screen.getByLabelText(new RegExp(ar.common.quantity)), '2');
    await user.type(invoicePriceField(), '123.4500');
    await user.click(screen.getByRole('button', { name: 'الشركة' }));
    await user.click(screen.getAllByRole('button', { name: ar.sales.saveDraft })[0]);

    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(await screen.findByText(ar.sales.invoiceSaved, { exact: false })).toBeVisible();
    expect(received?.lines[0]?.unit_price_egp).toBe('123.4500');
    expect(received?.lines[0]?.quantity).toBe(2);
  }, 15_000);

  it('shows the fixed company price and calculates seller profit above container purchase cost', async () => {
    authenticateOwner();
    server.use(
      http.get('/api/v1/products', () => HttpResponse.json({ data: [{
        id: 201,
        sku: 'CONTAINER-201',
        name: 'منتج الحاوية',
        unit_code: 'قطعة',
        quantity_on_hand: '15',
        available_quantity: '15',
        company_price: '80.00',
        purchase_cost_egp: '50.00',
        is_active: true,
      }], meta: { current_page: 1, per_page: 100, total: 1, last_page: 1 } })),
      http.get('/api/v1/invoice-issuers', () => HttpResponse.json({ data: {
        company: [{ type: 'company', name: 'MASTER' }],
        partners: [{ id: 88, name: 'أبنوب' }],
        drivers: [],
      } })),
    );
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <MemoryRouter>
        <QueryClientProvider client={client}>
          <AuthProvider>
            <InvoiceFormPage />
          </AuthProvider>
        </QueryClientProvider>
      </MemoryRouter>,
    );
    const user = userEvent.setup();
    await user.selectOptions(await screen.findByRole('combobox', { name: ar.common.product }), '201');

    expect(screen.getByText(/رصيد المخزون: 15/)).toBeVisible();
    expect(screen.getByText('سعر الشراء للوحدة')).toBeVisible();
    expect(screen.getByText('تكلفة كمية الفاتورة')).toBeVisible();
    expect(screen.getByText('قيمة كامل رصيد المخزون')).toBeVisible();
    expect(screen.getByText('750.00 ج.م')).toBeVisible();

    const companyPrice = screen.getByLabelText('سعر الشركة للوحدة 1 (ثابت)');
    expect(companyPrice).toHaveValue('80.00 ج.م');
    expect(companyPrice).toHaveAttribute('readonly');

    await user.click(screen.getByRole('button', { name: 'شريك الشركة' }));
    await user.selectOptions(document.querySelector<HTMLSelectElement>('.invoice-issuer-required select')!, '88');
    const quantity = screen.getByLabelText(new RegExp(ar.sales.quantity));
    await user.clear(quantity);
    await user.type(quantity, '3');
    expect(screen.getByText('150.00 ج.م')).toBeVisible();

    const salePrice = screen.getByLabelText('سعر البيع للوحدة 1');
    expect(salePrice).toHaveValue('80.00');
    await user.clear(salePrice);
    await user.type(salePrice, '100');
    expect(screen.getByText('صافي الربح بعد تكلفة الشراء للكمية')).toBeVisible();
    expect(document.querySelector('.invoice-price-surplus strong')).toHaveTextContent('150.00');
    expect(screen.getByText('يُضاف إلى أرباح الشريك الذي اخترته كمُصدر للفاتورة.')).toBeVisible();

    await user.clear(quantity);
    await user.type(quantity, '1');
    await user.clear(salePrice);
    await user.type(salePrice, '100');
    expect(document.querySelector('.invoice-price-surplus strong')).toHaveTextContent('50.00');
    expect(companyPrice).toHaveValue('80.00 ج.م');
  }, 15_000);

  it('keeps an incomplete invoice composition after leaving and reopening the form', async () => {
    authenticateOwner();
    const mountForm = () => {
      const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
      return render(
        <MemoryRouter>
          <QueryClientProvider client={client}>
            <AuthProvider>
              <InvoiceFormPage />
            </AuthProvider>
          </QueryClientProvider>
        </MemoryRouter>,
      );
    };
    const first = mountForm();
    await screen.findByText(ar.sales.previewWaitingMessage);
    const user = userEvent.setup();
    await user.selectOptions(screen.getByRole('combobox', { name: ar.common.customer }), '101');
    await user.selectOptions(screen.getByLabelText(ar.common.product), '201');
    await selectAdditionalWarehouse(user);
    await user.clear(screen.getByLabelText(new RegExp(ar.common.quantity)));
    await user.type(screen.getByLabelText(new RegExp(ar.common.quantity)), '4');
    await user.type(invoicePriceField(), '135');

    const key = 'precision-slate:invoice-compose:1:sale';
    await waitFor(() => expect(localStorage.getItem(key)).toContain('135'));
    first.unmount();
    mountForm();
    await screen.findByText(ar.sales.previewWaitingMessage);

    expect(screen.getByRole('combobox', { name: ar.common.customer })).toHaveValue('101');
    expect(screen.getByLabelText(ar.common.product)).toHaveValue('201');
    expect(screen.getByLabelText(new RegExp(ar.common.quantity))).toHaveValue('4');
    expect(invoicePriceField()).toHaveValue('135');
  }, 15_000);

  it('issues the invoice with Ctrl+Enter through the API', async () => {
    authenticateOwner();
    let issueRequested = false;
    server.use(
      http.post('/api/v1/invoices', () =>
        HttpResponse.json(
          { data: { document: { id: 991, document_number: 'INV-SHORTCUT-991', status: 'draft' } } },
          { status: 201 },
        ),
      ),
      http.post('/api/v1/invoices/991/issue', () => {
        issueRequested = true;
        return HttpResponse.json({ data: { document: {
          id: 991,
          document_number: 'INV-SHORTCUT-991',
          status: 'posted',
        } } });
      }),
    );
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <MemoryRouter>
        <QueryClientProvider client={client}>
          <AuthProvider>
            <InvoiceFormPage />
          </AuthProvider>
        </QueryClientProvider>
      </MemoryRouter>,
    );
    const user = userEvent.setup();

    await screen.findByText(ar.sales.previewWaitingMessage);
    await user.selectOptions(screen.getByRole('combobox', { name: ar.common.customer }), '101');
    await user.selectOptions(screen.getByLabelText(ar.common.product), '201');
    await selectAdditionalWarehouse(user);
    await user.clear(screen.getByLabelText(new RegExp(ar.common.quantity)));
    await user.type(screen.getByLabelText(new RegExp(ar.common.quantity)), '2');
    await user.type(invoicePriceField(), '123.4500');
    await user.click(screen.getByRole('button', { name: 'الشركة' }));
    await user.keyboard('{Control>}{Enter}{/Control}');

    expect(await screen.findByText(ar.sales.invoiceIssued, { exact: false })).toBeVisible();
    expect(issueRequested).toBe(true);
  }, 15_000);

  it('requires a second confirmation before issuing below the company price', async () => {
    authenticateOwner();
    let invoiceCreated = false;
    server.use(
      http.get('/api/v1/products', () => HttpResponse.json({ data: [{
        id: 201,
        sku: 'TOY-OF-001',
        name: 'فلتر زيت تويوتا',
        category_id: 1,
        category_name: 'فلاتر',
        unit_code: 'قطعة',
        quantity_on_hand: '48',
        available_quantity: '48',
        is_active: true,
        company_price: '100.00',
        purchase_cost_egp: '80.00',
      }], meta: { current_page: 1, per_page: 100, total: 1, last_page: 1 } })),
      http.post('/api/v1/invoices', () => {
        invoiceCreated = true;
        return HttpResponse.json({ data: { document: { id: 992, document_number: 'INV-LOSS-992', status: 'draft' } } }, { status: 201 });
      }),
    );
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <MemoryRouter>
        <QueryClientProvider client={client}>
          <AuthProvider>
            <InvoiceFormPage />
          </AuthProvider>
        </QueryClientProvider>
      </MemoryRouter>,
    );
    const user = userEvent.setup();
    await user.selectOptions(await screen.findByRole('combobox', { name: ar.common.customer }), '101');
    await user.selectOptions(screen.getByLabelText(ar.common.product), '201');
    await selectAdditionalWarehouse(user);
    await user.clear(screen.getByLabelText(new RegExp(ar.common.quantity)));
    await user.type(screen.getByLabelText(new RegExp(ar.common.quantity)), '5');
    await user.clear(invoicePriceField());
    await user.type(invoicePriceField(), '90');
    await user.click(screen.getByRole('button', { name: 'الشركة' }));

    await user.click(invoiceIssueButton());
    expect(await screen.findByRole('alert')).toBeVisible();
    expect(invoiceCreated).toBe(false);

    await user.click(invoiceIssueButton());
    await waitFor(() => expect(invoiceCreated).toBe(true));
  }, 15_000);

  it('warns explicitly when the selling price is below product cost', async () => {
    authenticateOwner();
    let invoiceCreated = false;
    server.use(
      http.get('/api/v1/products', () => HttpResponse.json({ data: [{
        id: 201,
        sku: 'TOY-OF-001',
        name: 'فلتر زيت تويوتا',
        category_id: 1,
        category_name: 'فلاتر',
        unit_code: 'قطعة',
        quantity_on_hand: '48',
        available_quantity: '48',
        is_active: true,
        company_price: '100.00',
        purchase_cost_egp: '95.00',
      }], meta: { current_page: 1, per_page: 100, total: 1, last_page: 1 } })),
      http.post('/api/v1/invoices', () => {
        invoiceCreated = true;
        return HttpResponse.json({ data: { document: { id: 993, document_number: 'INV-LOSS-993', status: 'draft' } } }, { status: 201 });
      }),
    );
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <MemoryRouter>
        <QueryClientProvider client={client}>
          <AuthProvider>
            <InvoiceFormPage />
          </AuthProvider>
        </QueryClientProvider>
      </MemoryRouter>,
    );
    const user = userEvent.setup();
    await user.selectOptions(await screen.findByRole('combobox', { name: ar.common.customer }), '101');
    await user.selectOptions(screen.getByLabelText(ar.common.product), '201');
    await selectAdditionalWarehouse(user);
    await user.clear(screen.getByLabelText(new RegExp(ar.common.quantity)));
    await user.type(screen.getByLabelText(new RegExp(ar.common.quantity)), '5');
    await user.clear(invoicePriceField());
    await user.type(invoicePriceField(), '90');
    await user.click(screen.getByRole('button', { name: 'الشركة' }));

    await user.click(invoiceIssueButton());
    expect(await screen.findByRole('alert')).toBeVisible();
    expect(invoiceCreated).toBe(false);
  }, 15_000);
});
