import type { SessionUser } from '../api/types';

export type SessionStatus = 'loading' | 'authenticated' | 'anonymous' | 'error';

export type SessionState = {
  status: SessionStatus;
  user: SessionUser | null;
};

let state: SessionState = { status: 'loading', user: null };
const listeners = new Set<() => void>();

function notify(): void {
  listeners.forEach((listener) => listener());
}

export const sessionStore = {
  getSnapshot: (): SessionState => state,
  subscribe: (listener: () => void): (() => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  setUser: (user: SessionUser): void => {
    state = { status: 'authenticated', user };
    notify();
  },
  clear: (): void => {
    state = { status: 'anonymous', user: null };
    notify();
  },
  fail: (): void => {
    state = { status: 'error', user: null };
    notify();
  },
};
