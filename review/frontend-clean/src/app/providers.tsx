import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState, type ReactNode } from 'react';
import { AuthProvider } from '../shared/auth/AuthProvider';
import { ar } from '../shared/i18n/ar';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
    mutations: { retry: false },
  },
});

function ErrorToast() {
  const [message, setMessage] = useState('');
  useEffect(() => {
    const handleError = (event: Event) => {
      if (!(event instanceof CustomEvent) || !(event.detail instanceof Error)) return;
      setMessage(event.detail.message || ar.common.unknownError);
    };
    window.addEventListener('api:error', handleError);
    return () => window.removeEventListener('api:error', handleError);
  }, []);

  if (!message) return null;
  return (
    <div className="toast-error" role="alert">
      <span>{message}</span>
      <button
        aria-label={ar.common.close}
        className="icon-button"
        onClick={() => setMessage('')}
        type="button"
      >
        ×
      </button>
    </div>
  );
}

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        {children}
        <ErrorToast />
      </AuthProvider>
    </QueryClientProvider>
  );
}
