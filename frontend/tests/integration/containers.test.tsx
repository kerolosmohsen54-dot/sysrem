import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { App } from '../../src/app/App';
import { AppProviders, queryClient } from '../../src/app/providers';
import { sessionStore } from '../../src/shared/auth/sessionStore';
import { ar } from '../../src/shared/i18n/ar';
import { server } from '../server';

const owner = { id: 1, username: 'owner-demo', name: 'Owner', role: 'owner', permissions: ['*'] };
const emptyPage = { data: [], meta: { current_page: 1, per_page: 100, total: 0, last_page: 1 } };
const productPage = {
  data: [{ id: 201, sku: 'P-201', name: 'Widget', category_id: null, unit_code: 'piece', minimum_stock: null, is_active: true }],
  meta: { current_page: 1, per_page: 100, total: 1, last_page: 1 },
};
const warehousePage = {
  data: [{ id: 401, code: 'WH-401', name: 'Main warehouse', location_type: 'main', parent_location_id: null, is_active: true, notes: null }],
  meta: { current_page: 1, per_page: 100, total: 1, last_page: 1 },
};

function prepare() {
  queryClient.clear();
  sessionStore.setUser(owner);
  server.use(
    http.get('/api/v1/auth/me', () => HttpResponse.json(owner)),
    http.get('/api/v1/products', () => HttpResponse.json(productPage)),
    http.get('/api/v1/warehouses', () => HttpResponse.json(warehousePage)),
    http.get('/api/v1/suppliers', () => HttpResponse.json(emptyPage)),
    http.get('/api/v1/drivers', () => HttpResponse.json(emptyPage)),
  );
}

function renderContainers() {
  return render(
    <MemoryRouter initialEntries={['/containers']}>
      <AppProviders><App /></AppProviders>
    </MemoryRouter>,
  );
}

function field(name: string) {
  const input = document.querySelector(`[name="${name}"]`);
  if (!(input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement)) throw new Error(`Missing field ${name}`);
  return input;
}

describe('container creation workflow', () => {
  it('lists real containers and opens the single container creation form', async () => {
    prepare();
    server.use(http.get('/api/v1/containers', () => HttpResponse.json({
      data: [{
        id: 11, container_name: 'First container', container_number: 'CONT-11', origin: 'Factory',
        destination: 'Main', status: 'received', estimated_arrival: null, expenses_egp: '0.00', posted_receipt_count: 1,
      }],
      meta: { current_page: 1, per_page: 10, total: 1, last_page: 1 },
    })));

    renderContainers();
    expect(await screen.findByRole('heading', { name: ar.nav.containers })).toBeVisible();
    const listedLinks = await screen.findAllByRole('link', { name: 'First container' });
    expect(listedLinks.some((link) => link.getAttribute('href') === '/containers/11')).toBe(true);
    await userEvent.setup().click(screen.getByRole('button', { name: ar.inventory.createContainer }));
    expect(await screen.findByRole('heading', { name: ar.inventory.createContainer })).toBeVisible();
    expect(screen.getByLabelText(ar.common.product)).toBeVisible();
    expect(screen.getAllByRole('spinbutton')).toHaveLength(3);
  });

  it('posts container metadata and product quantity/unit price as one atomic intake request', async () => {
    prepare();
    let created = false;
    let savedContainer: Record<string, unknown> | undefined;
    server.use(
      http.get('/api/v1/containers', () => HttpResponse.json(created ? {
        data: [{ id: 12, container_name: 'Factory batch', container_number: 'CONT-NEW-1', status: 'received', expenses_egp: '0.00' }],
        meta: { current_page: 1, per_page: 10, total: 1, last_page: 1 },
      } : emptyPage)),
      http.post('/api/v1/containers/intake', async ({ request }) => {
        const body = await request.json() as Record<string, unknown>;
        savedContainer = body;
        expect(request.headers.get('Idempotency-Key')).toBeTruthy();
        created = true;
        return HttpResponse.json({ data: { id: 12, container_name: 'Factory batch', container_number: 'CONT-NEW-1', status: 'received' } }, { status: 201 });
      }),
    );

    renderContainers();
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: ar.inventory.createContainer }));
    await screen.findByRole('heading', { name: ar.inventory.createContainer });
    await user.type(field('container_name'), 'Factory batch');
    await user.type(field('container_number'), 'CONT-NEW-1');
    await user.type(field('origin'), 'Factory A');
    await user.selectOptions(document.querySelector('[name="received_location_id"]')!, '401');
    await user.selectOptions(screen.getByLabelText(ar.common.product), '201');
    const numericFields = screen.getAllByRole('spinbutton');
    await user.type(numericFields[0], '3');
    await user.type(numericFields[1], '12.50');
    await user.type(numericFields[2], '25');
    await user.click(screen.getByRole('button', { name: ar.common.save }));
    await waitFor(() => expect(savedContainer).toBeDefined());
    expect(savedContainer).toMatchObject({
      container_name: 'Factory batch',
      container_number: 'CONT-NEW-1',
      warehouse_id: 401,
      origin: 'Factory A',
      allocation_basis: 'quantity',
      costs: [],
      lines: [{ product_id: 201, quantity: 3, purchase_unit_cost_egp: '12.5', company_price_egp: '25' }],
    });
    const createdLinks = await screen.findAllByRole('link', { name: 'Factory batch' });
    expect(createdLinks.some((link) => link.getAttribute('href') === '/containers/12')).toBe(true);
  });

  it('keeps a new product temporary until the atomic container intake request succeeds', async () => {
    prepare();
    let savedContainer: Record<string, unknown> | undefined;
    let created = false;
    server.use(
      http.get('/api/v1/containers', () => HttpResponse.json(created ? {
        data: [{ id: 13, container_name: 'Factory batch', container_number: 'CONT-NEW-2', status: 'received', expenses_egp: '0.00' }],
        meta: { current_page: 1, per_page: 10, total: 1, last_page: 1 },
      } : emptyPage)),
      http.post('/api/v1/containers/intake', async ({ request }) => {
        savedContainer = await request.json() as Record<string, unknown>;
        created = true;
        return HttpResponse.json({ data: { id: 13, container_number: 'CONT-NEW-2', status: 'received' } }, { status: 201 });
      }),
    );

    renderContainers();
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: ar.inventory.createContainer }));
    await screen.findByRole('heading', { name: ar.inventory.createContainer });
    await user.type(field('container_name'), 'Factory batch');
    await user.type(field('container_number'), 'CONT-NEW-2');
    await user.type(field('origin'), 'Factory B');
    await user.selectOptions(document.querySelector('[name="received_location_id"]')!, '401');
    await user.click(screen.getByRole('button', { name: /إضافة منتج/ }));
    await user.type(document.querySelector('input[name="name"]')!, 'New container product');
    await user.click(screen.getByRole('button', { name: /حفظ وإضافة للاختيار/ }));
    expect(screen.getByText('منتج جديد — New container product (يُحفظ مع الحاوية)')).toBeVisible();
    const numericFields = screen.getAllByRole('spinbutton');
    await user.type(numericFields[0], '2');
    await user.type(numericFields[1], '8.75');
    await user.type(numericFields[2], '18');
    await user.click(screen.getByRole('button', { name: ar.common.save }));

    await screen.findAllByRole('link', { name: 'Factory batch' });
    expect(savedContainer?.lines).toEqual([{
      new_product: {
        name: 'New container product', sku: null, category_id: null, unit_code: 'piece', minimum_stock: null, description: null,
      },
      quantity: 2, purchase_unit_cost_egp: '8.75', company_price_egp: '18',
    }]);
  });
});
