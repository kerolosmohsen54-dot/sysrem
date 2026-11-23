import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { AppProviders } from '../../src/app/providers';
import { apiRequest } from '../../src/shared/api/http';
import { PermissionGate } from '../../src/shared/auth/PermissionGate';
import { IdleSessionMonitor } from '../../src/shared/auth/AuthProvider';
import { sessionStore } from '../../src/shared/auth/sessionStore';
import { ar } from '../../src/shared/i18n/ar';
import { server } from '../server';

const owner = {
  id: 1,
  username: 'owner-demo',
  name: 'المالك',
  role: 'owner',
  permissions: ['*'],
} as const;

function LoginDestination() {
  const location = useLocation();
  const from = location.state?.from;
  return (
    <output>{from ? `${from.pathname}${from.search}${from.hash}` : 'لا يوجد مسار سابق'}</output>
  );
}

function StepUpAction() {
  const submit = async () => {
    try {
      const result = await apiRequest<{ status: string }>('/expenses', {
        method: 'POST',
        body: { amount: '10.00' },
      });
      document.getElementById('step-up-result')!.textContent = result.status;
    } catch {
      document.getElementById('step-up-result')!.textContent = 'تعذر الحفظ';
    }
  };
  return (
    <>
      <button onClick={() => void submit()} type="button">
        تنفيذ العملية المالية
      </button>
      <output id="step-up-result" />
    </>
  );
}

describe('authentication and permission policies', () => {
  it('shows the warning just before the 30-minute idle limit and resets it on activity', () => {
    vi.useFakeTimers();
    try {
      render(
        <IdleSessionMonitor enabled>
          <span>المحتوى</span>
        </IdleSessionMonitor>,
      );

      act(() => {
        vi.advanceTimersByTime(29 * 60 * 1000);
      });
      expect(screen.getByRole('status')).toHaveTextContent(ar.app.idleWarning);

      fireEvent.keyDown(window, { key: 'a' });
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
      act(() => {
        vi.advanceTimersByTime(10_000);
      });
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it('denies a route when the authenticated user lacks its server permission', async () => {
    sessionStore.setUser({ ...owner, role: 'driver', permissions: ['products.view'] });
    server.use(
      http.get('/api/v1/auth/me', () =>
        HttpResponse.json({ ...owner, role: 'driver', permissions: ['products.view'] }),
      ),
    );
    render(
      <MemoryRouter
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        initialEntries={['/inventory']}
      >
        <AppProviders>
          <PermissionGate permission="inventory.view">
            <p>مخزون محمي</p>
          </PermissionGate>
        </AppProviders>
      </MemoryRouter>,
    );

    expect(await screen.findByText(ar.common.permissionDenied)).toBeVisible();
    expect(screen.queryByText('مخزون محمي')).not.toBeInTheDocument();
  });

  it('preserves the requested path, search and hash across a 401 login redirect', async () => {
    const user = userEvent.setup();
    sessionStore.setUser({ ...owner });
    server.use(
      http.get('/api/v1/auth/me', () => HttpResponse.json({ ...owner })),
      http.get('/api/v1/protected-data', () =>
        HttpResponse.json({ error: { code: 'UNAUTHENTICATED' } }, { status: 401 }),
      ),
    );

    function ProtectedPage() {
      const readProtectedData = async () => {
        try {
          await apiRequest('/protected-data');
        } catch {
          return;
        }
      };
      return (
        <button onClick={() => void readProtectedData()} type="button">
          تحميل بيانات محمية
        </button>
      );
    }

    render(
      <MemoryRouter
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        initialEntries={['/inventory?warehouse=2#products']}
      >
        <AppProviders>
          <Routes>
            <Route
              path="/inventory"
              element={
                <PermissionGate>
                  <ProtectedPage />
                </PermissionGate>
              }
            />
            <Route path="/login" element={<LoginDestination />} />
          </Routes>
        </AppProviders>
      </MemoryRouter>,
    );

    await user.click(await screen.findByRole('button', { name: 'تحميل بيانات محمية' }));
    await waitFor(() => expect(screen.getByText('/inventory?warehouse=2#products')).toBeVisible());
  });

  it('reauthenticates through POST /auth/reauth and retries the protected request', async () => {
    const user = userEvent.setup();
    let expenseRequests = 0;
    let reauthBody: unknown;
    server.use(
      http.post('/api/v1/expenses', () => {
        expenseRequests += 1;
        if (expenseRequests === 1) {
          return HttpResponse.json({ error: { code: 'STEP_UP_REQUIRED' } }, { status: 428 });
        }
        return HttpResponse.json({ status: 'تم الحفظ' });
      }),
      http.post('/api/v1/auth/reauth', async ({ request }) => {
        reauthBody = await request.json();
        return new HttpResponse(null, { status: 204 });
      }),
    );

    render(
      <AppProviders>
        <StepUpAction />
      </AppProviders>,
    );

    await user.click(screen.getByRole('button', { name: 'تنفيذ العملية المالية' }));
    const password = await screen.findByLabelText(ar.auth.password, {
      exact: false,
      selector: 'input',
    });
    await user.type(password, 'reauth-password');
    await user.click(screen.getByRole('button', { name: ar.auth.reauthenticate }));

    await waitFor(() => expect(screen.getByText('تم الحفظ')).toBeVisible());
    expect(expenseRequests).toBe(2);
    expect(reauthBody).toEqual({ password: 'reauth-password' });
  });
});
