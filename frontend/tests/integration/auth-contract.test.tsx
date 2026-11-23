import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import { App } from '../../src/app/App';
import { AppProviders } from '../../src/app/providers';
import { sessionStore } from '../../src/shared/auth/sessionStore';
import { ar } from '../../src/shared/i18n/ar';
import { server } from '../server';

afterEach(() => sessionStore.clear());

describe('live API authentication response contract', () => {
  it('loads the nested authenticated user after login instead of rendering a blank shell', async () => {
    let authenticated = false;
    server.use(
      http.get('/api/v1/auth/login-options', () => HttpResponse.json({ data: [
        { username: 'manual_owner', display_name: 'Manual Owner' },
      ] })),
      http.get('/api/v1/auth/me', () =>
        authenticated
          ? HttpResponse.json({
              data: {
                user: {
                  id: 7,
                  username: 'manual_owner',
                  display_name: 'Manual Owner',
                  permissions: ['*'],
                },
              },
            })
          : HttpResponse.json({ error: { code: 'UNAUTHENTICATED' } }, { status: 401 }),
      ),
      http.post('/api/v1/auth/login', () => {
        authenticated = true;
        return HttpResponse.json({
          data: {
            user: { id: 7, username: 'manual_owner', display_name: 'Manual Owner' },
            csrf_token: 'test-csrf-token',
          },
        });
      }),
    );

    render(
      <MemoryRouter initialEntries={['/login']}>
        <AppProviders>
          <App />
        </AppProviders>
      </MemoryRouter>,
    );

    await waitFor(() => expect(document.getElementById('login-username')).toBeInTheDocument());
    const username = document.getElementById('login-username');
    const password = document.getElementById('login-password');
    const form = document.querySelector('form');
    if (!(username instanceof HTMLSelectElement) || !(password instanceof HTMLInputElement) || !form) {
      throw new Error('Login form controls were not rendered');
    }
    await waitFor(() => expect(username.querySelector('option[value="manual_owner"]')).not.toBeNull());
    fireEvent.change(username, { target: { value: 'manual_owner' } });
    fireEvent.change(password, { target: { value: 'sample-password' } });
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: ar.auth.submit }));

    expect(await screen.findByRole('heading', { name: ar.nav.dashboard }, { timeout: 10_000 })).toBeVisible();
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
  });
});
