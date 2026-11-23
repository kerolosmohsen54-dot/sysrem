import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { InvoiceFormPage } from '../../src/features/sales/InvoiceFormPage';
import { AuthProvider } from '../../src/shared/auth/AuthProvider';
import { sessionStore } from '../../src/shared/auth/sessionStore';
import { server } from '../server';
import '../../src/styles/design-tokens.css';
import '../../src/styles/global.css';

describe('invoice contrast regression', () => {
  it('renders the invoice mode controls and required note with their contrast-fix selectors', async () => {
    const user = { id: 1, username: 'owner', name: 'Owner', role: 'owner', permissions: ['*', 'invoices.create'] };
    sessionStore.setUser(user);
    server.use(http.get('/api/v1/auth/me', () => HttpResponse.json(user)));
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<MemoryRouter><QueryClientProvider client={client}><AuthProvider><InvoiceFormPage /></AuthProvider></QueryClientProvider></MemoryRouter>);
    await screen.findByRole('heading', { level: 1, name: 'إنشاء فاتورة مبيعات جديدة' });
    expect(document.querySelector('.invoice-toggle-active')).toBeInTheDocument();
    expect(document.querySelector('.invoice-required-note')).toBeInTheDocument();
  });
});
