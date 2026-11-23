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

const owner = { id: 1, username: 'owner', name: 'Owner', role: 'owner', permissions: ['*'] };
const container = {
  id: 16020, container_number: 'CONT-16020', container_name: 'Test shipment', status: 'receiving',
  landed_cost_allocation_basis: 'quantity', supplier_id: null, supplier_name: null, origin: 'Factory', destination: null,
  notes: null, estimated_departure: null, estimated_arrival: null, current_location_id: null, current_location_name: null,
};
const line = {
  id: 1, product_id: 9, product_name: 'Product A', sku: 'P-9', expected_quantity: '10', received_quantity: '4',
  purchase_unit_cost_egp: '5.00', purchase_value_egp: '50.00', notes: null,
};
const containerDetail = {
  data: { container, lines: [line], receipts: [], costs: [], cost_payments: [], status_history: [], tracking_events: [] },
};
const warehousePage = {
  data: [{ id: 22, code: 'WH-22', name: 'Main warehouse', location_type: 'main', is_active: true }],
  meta: { current_page: 1, per_page: 100, total: 1, last_page: 1 },
};

function prepare(path: string) {
  queryClient.clear();
  sessionStore.setUser(owner);
  server.use(
    http.get('/api/v1/auth/me', () => HttpResponse.json(owner)),
    http.get('/api/v1/containers/16020', () => HttpResponse.json(containerDetail)),
    http.get('/api/v1/warehouses', () => HttpResponse.json(warehousePage)),
  );
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppProviders><App /></AppProviders>
    </MemoryRouter>,
  );
}

describe('container receipt workflow', () => {
  it('opens the partial-receipt form and receives only the remaining quantity entered', async () => {
    prepare('/containers/16020/receive');
    let saved: Record<string, unknown> | undefined;
    server.use(http.post('/api/v1/containers/16020/receipts', async ({ request }) => {
      saved = await request.json() as Record<string, unknown>;
      return HttpResponse.json({ data: { receipt_ids: [70] } }, { status: 201 });
    }));

    const user = userEvent.setup();
    expect(await screen.findByRole('heading', { name: /استلام حاوية مسجلة/ })).toBeVisible();
    const quantity = screen.getByLabelText(ar.inventory.containerReceivedQuantity);
    expect(quantity).toHaveValue('6');
    await user.clear(quantity);
    await user.type(quantity, '2');
    await user.selectOptions(screen.getByLabelText(ar.common.warehouse), '22');
    await user.click(screen.getByRole('button', { name: ar.inventory.confirmContainerReceipt }));

    await waitFor(() => expect(saved).toBeDefined());
    expect(saved).toMatchObject({
      warehouse_id: 22,
      lines: [{ container_line_id: 1, expected_quantity: 6, received_quantity: 2, discrepancy_reason: null }],
    });
  });

  it('opens a receipt detail page for a recorded receipt', async () => {
    prepare('/containers/16020/receipts/70');
    server.use(http.get('/api/v1/containers/16020/receipts/70', () => HttpResponse.json({
      data: {
        receipt: { id: 70, inventory_movement_id: 81, received_at: '2026-11-11T10:00:00Z', warehouse_id: 22, warehouse_name: 'Main warehouse', status: 'posted', reason: null },
        lines: [{ container_line_id: 1, expected_quantity: 6, received_quantity: 2, discrepancy_reason: null }],
      },
    })));

    expect(await screen.findByRole('heading', { name: ar.inventory.containerReceipts })).toBeVisible();
    expect(screen.getByText('Main warehouse')).toBeVisible();
    expect(screen.getByText(ar.common.posted)).toBeVisible();
  });
});
