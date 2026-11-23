import { render, screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { App } from '../../src/app/App';
import { AppProviders, queryClient } from '../../src/app/providers';
import { sessionStore } from '../../src/shared/auth/sessionStore';
import { ar } from '../../src/shared/i18n/ar';
import { formatMoney } from '../../src/shared/utils/format';
import { server } from '../server';

function renderLiquidation() {
  return render(
    <MemoryRouter initialEntries={['/customers/42/liquidation']}>
      <AppProviders><App /></AppProviders>
    </MemoryRouter>,
  );
}

function owner() {
  queryClient.clear();
  sessionStore.setUser({ id: 1, username: 'owner', name: 'Owner', role: 'owner', permissions: ['*'] });
  server.use(http.get('/api/v1/auth/me', () => HttpResponse.json({
    id: 1, username: 'owner', name: 'Owner', role: 'owner', permissions: ['*'],
  })));
}

describe('customer liquidation live integration', () => {
  it('shows the customer ledger totals as read-only decimal strings', async () => {
    owner();
    server.use(http.get('/api/v1/customers/42/liquidation', () => HttpResponse.json({ data: {
      customer: { id: 42, name: 'Customer Example', phone: '01000000000', address: 'Cairo', governorate: 'Cairo', credit_limit: '200.00', is_active: true },
      invoices: [{ id: 10, document_number: 'INV-10', issue_date: '2026-10-10', total_amount: '100.50', status: 'posted' }],
      payments: [{ id: 11, receipt_number: 'REC-11', receipt_date: '2026-10-11', amount: '20.25', status: 'posted' }],
      returns: [{ id: 12, document_number: 'RET-12', issue_date: '2026-10-12', total_amount: '10.25', status: 'posted' }],
      invoice_total_egp: '100.50', collection_total_egp: '20.25', return_total_egp: '10.25', balance_egp: '70.00',
    } })));

    renderLiquidation();
    expect(await screen.findByRole('heading', { name: ar.customers.liquidationTitle })).toBeVisible();
    expect(screen.getByText(/Customer Example/)).toBeVisible();
    expect((await screen.findAllByText(formatMoney('100.50'))).length).toBeGreaterThan(0);
    expect((await screen.findAllByText(formatMoney('20.25'))).length).toBeGreaterThan(0);
    expect((await screen.findAllByText(formatMoney('10.25'))).length).toBeGreaterThan(0);
    expect(screen.getByText(formatMoney('70.00'))).toBeVisible();
    expect(document.querySelector('form')).toBeNull();
  });

  it('shows a no-permission state for API 403', async () => {
    owner();
    server.use(http.get('/api/v1/customers/42/liquidation', () => HttpResponse.json(
      { error: { code: 'FORBIDDEN', details: {} } }, { status: 403 },
    )));

    renderLiquidation();
    expect((await screen.findAllByText(ar.common.permissionDenied)).length).toBeGreaterThan(0);
  });

  it('reads validation details from the API 422 response', async () => {
    owner();
    server.use(http.get('/api/v1/customers/42/liquidation', () => HttpResponse.json(
      { error: { code: 'VALIDATION_FAILED', details: { customerId: ['Invalid customer identifier'] } } },
      { status: 422 },
    )));

    renderLiquidation();
    expect((await screen.findAllByRole('alert')).some((alert) => /[\u0600-\u06FF]/u.test(alert.textContent ?? ''))).toBe(true);
  });
});
