import { render, screen, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import {
  CategoriesPage,
  ProductsPage,
  WarehousesPage,
} from '../../src/features/inventory/CatalogPages';
import { ar } from '../../src/shared/i18n/ar';
import { AuthProvider } from '../../src/shared/auth/AuthProvider';
import { server } from '../server';

function renderPage(page: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <MemoryRouter>
      <QueryClientProvider client={client}>
        <AuthProvider>{page}</AuthProvider>
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

describe('catalog screens', () => {
  it('renders fixture products and makes the list search accessible', async () => {
    renderPage(<ProductsPage />);

    expect(await screen.findByRole('heading', { name: ar.nav.products })).toBeVisible();
    expect(await screen.findAllByText('فلتر زيت تويوتا')).not.toHaveLength(0);
    expect(screen.getByRole('searchbox', { name: ar.common.search })).toBeVisible();
  });

  it('renders category and warehouse records from their API routes', async () => {
    renderPage(
      <>
        <CategoriesPage />
        <WarehousesPage />
      </>,
    );

    expect(await screen.findAllByText('فلاتر')).not.toHaveLength(0);
    expect(await screen.findAllByText('المستودع الرئيسي')).not.toHaveLength(0);
  });

  it('shows create controls only when the API session grants owner permissions', async () => {
    server.use(
      http.get('/api/v1/auth/me', () =>
        HttpResponse.json({
          id: 1,
          username: 'owner-demo',
          name: 'مالك',
          role: 'owner',
          permissions: ['*'],
        }),
      ),
    );
    renderPage(<ProductsPage />);

    expect(
      await screen.findByRole('button', { name: `${ar.common.add} ${ar.nav.products}` }),
    ).toBeVisible();
  });

  it('edits and deactivates catalog records through the documented update routes', async () => {
    server.use(
      http.get('/api/v1/auth/me', () =>
        HttpResponse.json({
          id: 1,
          username: 'owner-demo',
          name: 'مالك',
          role: 'owner',
          permissions: ['*'],
        }),
      ),
    );
    const user = userEvent.setup();
    const categoryPage = renderPage(<CategoriesPage />);
    await screen.findAllByText('فلاتر');
    await user.click((await screen.findAllByRole('button', { name: ar.common.edit }))[0]);
    const categoryDialog = screen.getByRole('dialog');
    const categoryName = within(categoryDialog).getByLabelText(/الاسم/);
    await user.clear(categoryName);
    await user.type(categoryName, 'فلاتر معدلة');
    await user.click(within(categoryDialog).getByRole('button', { name: ar.common.save }));
    expect(await screen.findAllByText('فلاتر معدلة')).not.toHaveLength(0);
    await user.click((await screen.findAllByRole('button', { name: ar.common.deactivate }))[0]);
    const categoryDeactivateDialog = screen.getByRole('dialog');
    await user.click(within(categoryDeactivateDialog).getByRole('button', { name: ar.common.deactivate }));
    expect(await screen.findAllByText(ar.common.inactive)).not.toHaveLength(0);
    categoryPage.unmount();

    const productPage = renderPage(<ProductsPage />);
    await screen.findAllByText('فلتر زيت تويوتا');
    await user.click((await screen.findAllByRole('button', { name: ar.common.edit }))[0]);
    const productDialog = screen.getByRole('dialog');
    const productName = within(productDialog).getByLabelText(/الاسم/);
    await user.clear(productName);
    await user.type(productName, 'فلتر تويوتا معدل');
    const companyPrice = within(productDialog).getByLabelText(ar.common.companyPrice);
    await user.clear(companyPrice);
    await user.type(companyPrice, '375.50');
    await user.click(within(productDialog).getByRole('button', { name: ar.common.save }));
    expect(await screen.findAllByText('فلتر تويوتا معدل')).not.toHaveLength(0);
    expect(await screen.findAllByText('375.50')).not.toHaveLength(0);
    productPage.unmount();

    renderPage(<WarehousesPage />);
    await screen.findAllByText('المستودع الرئيسي');
    await user.click((await screen.findAllByRole('button', { name: ar.common.edit }))[0]);
    const warehouseDialog = screen.getByRole('dialog');
    const warehouseName = within(warehouseDialog).getByLabelText(/الاسم/);
    await user.clear(warehouseName);
    await user.type(warehouseName, 'المستودع الرئيسي المعدل');
    await user.click(within(warehouseDialog).getByLabelText(ar.common.active));
    await user.click(within(warehouseDialog).getByRole('button', { name: ar.common.save }));
    expect(await screen.findAllByText('المستودع الرئيسي المعدل')).not.toHaveLength(0);
    expect(await screen.findAllByText(ar.common.inactive)).not.toHaveLength(0);
  }, 15000);
});
