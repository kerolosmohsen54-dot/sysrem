import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { InvoicePdfPage, InvoicePrintPage } from '../../src/features/sales/InvoicePrintPage';
import { AuthProvider } from '../../src/shared/auth/AuthProvider';
import { ar } from '../../src/shared/i18n/ar';
import { server } from '../server';

vi.mock('html2canvas', () => ({
  default: vi.fn(async () => {
    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 800;
    return canvas;
  }),
}));
vi.mock('jspdf', () => ({
  jsPDF: class {
    internal = { pageSize: { getWidth: () => 210, getHeight: () => 297 } };
    addPage = vi.fn();
    addImage = vi.fn();
    output = vi.fn(() => new Blob(['pdf bytes'], { type: 'application/pdf' }));
  },
}));

describe('invoice print screen', () => {
  it('renders server-provided invoice totals and does not invent unavailable lines', async () => {
    server.use(http.get('/api/v1/invoices/701', () => HttpResponse.json({
      data: {
        document: {
          id: 701,
          document_number: 'INV-2026-1041',
          document_type: 'invoice',
          status: 'posted',
          customer_id: 101,
          customer_name_snapshot: 'عميل تجريبي',
          issue_date: '2026-10-16',
          due_date: null,
          total_amount: '7800.00',
          paid_egp: '3000.00',
          remaining_egp: '4800.00',
          subtotal: '8000.00',
          discount_amount: '200.00',
          issuer_name_snapshot: 'مالك النظام',
        },
        lines: [],
      },
    })));
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <MemoryRouter initialEntries={['/invoices/701/print']}>
        <QueryClientProvider client={client}>
          <AuthProvider>
            <Routes>
              <Route path="/invoices/:documentId/print" element={<InvoicePrintPage />} />
            </Routes>
          </AuthProvider>
        </QueryClientProvider>
      </MemoryRouter>,
    );

    expect(await screen.findAllByText(/INV-2026-1041/)).not.toHaveLength(0);
    expect(screen.getByText('7,800.00 ج.م')).toBeVisible();
    expect(screen.getByText('3,000.00 ج.م')).toBeVisible();
    expect(screen.getByText(ar.sales.invoiceLinesUnavailable)).toBeVisible();
    expect(screen.queryByText('مالك النظام')).not.toBeInTheDocument();
    expect(screen.queryByText('الخصم')).not.toBeInTheDocument();
    expect(screen.queryByText('الإجمالي الفرعي')).not.toBeInTheDocument();
  });

  it('downloads the PDF from its own screen and opens file sharing without the print dialog', async () => {
    server.use(http.get('/api/v1/invoices/702', () => HttpResponse.json({
      data: {
        document: {
          id: 702, document_number: 'INV-PDF-702', document_type: 'invoice', status: 'posted',
          customer_id: 101, customer_name_snapshot: 'عميل PDF', issue_date: '2026-10-16', due_date: null,
          total_amount: '100.00', paid_egp: null, remaining_egp: '100.00', subtotal: '100.00',
          discount_amount: '0.00', issuer_name_snapshot: 'مالك النظام',
        },
        lines: [],
      },
    })));
    const events: string[] = [];
    const share = vi.fn(async () => { events.push('share'); });
    Object.defineProperty(navigator, 'canShare', { configurable: true, value: () => true });
    Object.defineProperty(navigator, 'share', { configurable: true, value: share });
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: () => 'blob:invoice-pdf' });
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() });
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ drawImage: vi.fn() } as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/jpeg;base64,AA==');
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      events.push(`download:${this.download}`);
    });
    const print = vi.spyOn(window, 'print').mockImplementation(() => undefined);
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <MemoryRouter initialEntries={['/invoices/702/pdf']}>
        <QueryClientProvider client={client}>
          <AuthProvider>
            <Routes><Route path="/invoices/:documentId/pdf" element={<InvoicePdfPage />} /></Routes>
          </AuthProvider>
        </QueryClientProvider>
      </MemoryRouter>,
    );

    await screen.findAllByText(/INV-PDF-702/);
    await waitFor(() => expect(share).toHaveBeenCalledOnce());
    expect(screen.getByRole('heading', { name: 'تنزيل ملف PDF' })).toBeVisible();
    expect(screen.queryByRole('button', { name: ar.sales.printInvoice })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'معاينة الطباعة' })).not.toBeInTheDocument();
    expect(events[0]).toBe('download:INV-PDF-702.pdf');
    expect(events[1]).toBe('share');
    expect(share.mock.calls[0][0].files?.[0]).toMatchObject({ type: 'application/pdf', name: 'INV-PDF-702.pdf' });
    expect(print).not.toHaveBeenCalled();
  });
});
