import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { server } from './server';
import { resetMockSession } from '../src/mocks/handlers';
import { sessionStore } from '../src/shared/auth/sessionStore';

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  cleanup();
  server.resetHandlers();
  resetMockSession();
  sessionStore.clear();
});
afterAll(() => server.close());
