import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AppRouter } from './app/router';
import { ar } from './shared/i18n/ar';
import './styles/design-tokens.css';
import './styles/global.css';
import './styles/rtl.css';

async function startApp(): Promise<void> {
  if ('serviceWorker' in navigator && !import.meta.env.DEV) {
    void navigator.serviceWorker.register('/sw.js').catch(() => undefined);
  }
  if (import.meta.env.DEV && import.meta.env.MODE === 'test' && import.meta.env.VITE_MOCK_API === 'true') {
    const { worker } = await import('./mocks/browser');
    await worker.start({ onUnhandledRequest: 'bypass' });
  }
  const rootElement = document.getElementById('root');
  if (!rootElement) throw new Error('Root element is missing from index.html');
  createRoot(rootElement).render(
    <StrictMode>
      <AppRouter />
    </StrictMode>,
  );
}

void startApp().catch((error: unknown) => {
  const rootElement = document.getElementById('root');
  if (rootElement) rootElement.textContent = ar.common.unknownError;
  console.error(error);
});
