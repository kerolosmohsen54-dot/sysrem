import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type FormEvent,
  type ReactNode,
} from 'react';
import { apiRequest, configureHttpHandlers } from '../api/http';
import { ApiError } from '../api/errors';
import type { SessionUser } from '../api/types';
import { FormField } from '../components/FormField';
import { Modal } from '../components/Modal';
import { ar } from '../i18n/ar';
import { sessionStore, type SessionState } from './sessionStore';

type AuthContextValue = SessionState & {
  setAuthenticated: (user: SessionUser) => void;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const session = useSyncExternalStore(
    sessionStore.subscribe,
    sessionStore.getSnapshot,
    sessionStore.getSnapshot,
  );
  const stepUpResolver = useRef<((verified: boolean) => void) | null>(null);
  const [stepUpOpen, setStepUpOpen] = useState(false);
  const [stepUpError, setStepUpError] = useState('');

  const requestStepUp = useCallback(
    () =>
      new Promise<boolean>((resolve) => {
        stepUpResolver.current = resolve;
        setStepUpError('');
        setStepUpOpen(true);
      }),
    [],
  );

  const finishStepUp = useCallback((verified: boolean) => {
    setStepUpOpen(false);
    stepUpResolver.current?.(verified);
    stepUpResolver.current = null;
  }, []);

  useEffect(() => {
    const removeHandlers = configureHttpHandlers({
      onUnauthorized: () => sessionStore.clear(),
      onStepUpRequired: requestStepUp,
    });
    void apiRequest<SessionUser>('/auth/me', { skipErrorEvent: true })
      .then((user) => sessionStore.setUser(user))
      .catch((error: unknown) => {
        if (error instanceof ApiError && error.status === 401) return;
        sessionStore.fail();
      });
    return removeHandlers;
  }, [requestStepUp]);

  const setAuthenticated = useCallback((user: SessionUser) => {
    sessionStore.setUser(user);
  }, []);

  const signOut = useCallback(async () => {
    try {
      await apiRequest<void>('/auth/logout', { method: 'POST' });
    } finally {
      sessionStore.clear();
    }
  }, []);

  const submitStepUp = async (password: string) => {
    setStepUpError('');
    try {
      await apiRequest<void>('/auth/reauth', {
        method: 'POST',
        body: { password },
        skipStepUp: true,
      });
      finishStepUp(true);
    } catch (error) {
      setStepUpError(error instanceof Error ? error.message : ar.common.unknownError);
    }
  };

  return (
    <AuthContext.Provider value={{ ...session, setAuthenticated, signOut }}>
      <IdleSessionMonitor enabled={session.status === 'authenticated'}>
        {children}
      </IdleSessionMonitor>
      <StepUpDialog
        open={stepUpOpen}
        error={stepUpError}
        onCancel={() => finishStepUp(false)}
        onSubmit={submitStepUp}
      />
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}

function StepUpDialog({
  open,
  error,
  onCancel,
  onSubmit,
}: {
  open: boolean;
  error: string;
  onCancel: () => void;
  onSubmit: (password: string) => Promise<void>;
}) {
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  useEffect(() => {
    if (!open) {
      setPassword('');
      setSubmitting(false);
    }
  }, [open]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    await onSubmit(password);
    setSubmitting(false);
  };

  return (
    <Modal open={open} title={ar.auth.stepUpTitle} onClose={onCancel}>
      <p>{ar.auth.stepUpDescription}</p>
      <form className="stack-form" onSubmit={submit}>
        <FormField
          autoComplete="current-password"
          id="step-up-password"
          label={ar.auth.password}
          onChange={(event) => setPassword(event.currentTarget.value)}
          required
          type="password"
          value={password}
        />
        {error && (
          <p className="field-error" role="alert">
            {error}
          </p>
        )}
        <div className="modal-actions">
          <button className="button button-secondary" onClick={onCancel} type="button">
            {ar.auth.cancel}
          </button>
          <button
            className="button button-primary"
            disabled={submitting || !password}
            type="submit"
          >
            {ar.auth.reauthenticate}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export function IdleSessionMonitor({
  enabled,
  children,
}: {
  enabled: boolean;
  children: ReactNode;
}) {
  const [warning, setWarning] = useState(false);
  useEffect(() => {
    if (!enabled) {
      setWarning(false);
      return;
    }
    let lastActivity = Date.now();
    const markActivity = () => {
      lastActivity = Date.now();
      setWarning(false);
    };
    const events: (keyof WindowEventMap)[] = ['pointerdown', 'keydown', 'touchstart', 'mousemove'];
    events.forEach((event) => window.addEventListener(event, markActivity));
    const timer = window.setInterval(() => {
      if (Date.now() - lastActivity >= 29 * 60 * 1000) setWarning(true);
    }, 10_000);
    return () => {
      window.clearInterval(timer);
      events.forEach((event) => window.removeEventListener(event, markActivity));
    };
  }, [enabled]);

  return (
    <>
      {warning && (
        <div className="idle-warning" role="status">
          <span>{ar.app.idleWarning}</span>
          <button
            className="button button-secondary"
            type="button"
            onClick={() => setWarning(false)}
          >
            {ar.common.close}
          </button>
        </div>
      )}
      {children}
    </>
  );
}
