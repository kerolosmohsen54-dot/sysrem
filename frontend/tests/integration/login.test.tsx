import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { AppProviders } from '../../src/app/providers';
import { LoginPage } from '../../src/features/auth/LoginPage';
import { ar } from '../../src/shared/i18n/ar';

describe('login', () => {
  it('authenticates through the API mock and reaches the protected shell route', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        initialEntries={['/login']}
      >
        <AppProviders>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/dashboard" element={<h1>{ar.nav.dashboard}</h1>} />
          </Routes>
        </AppProviders>
      </MemoryRouter>,
    );

    const username = await screen.findByLabelText(ar.auth.username, { exact: false });
    await user.selectOptions(username, 'owner-demo');
    await user.type(screen.getByLabelText(ar.auth.password, { exact: false }), 'sample');
    await user.click(screen.getByRole('button', { name: ar.auth.submit }));

    await waitFor(() =>
      expect(screen.getByRole('heading', { name: ar.nav.dashboard })).toBeVisible(),
    );
  });

  it('sends a driver to the first route allowed by server permissions', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        initialEntries={['/login']}
      >
        <AppProviders>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/customers" element={<h1>{ar.nav.customers}</h1>} />
          </Routes>
        </AppProviders>
      </MemoryRouter>,
    );

    await user.selectOptions(
      await screen.findByLabelText(ar.auth.username, { exact: false }),
      'driver-demo',
    );
    await user.type(screen.getByLabelText(ar.auth.password, { exact: false }), 'sample');
    await user.click(screen.getByRole('button', { name: ar.auth.submit }));

    await waitFor(() =>
      expect(screen.getByRole('heading', { name: ar.nav.customers })).toBeVisible(),
    );
  });
});
