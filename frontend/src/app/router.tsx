import { BrowserRouter } from 'react-router-dom';
import { App } from './App';
import { AppProviders } from './providers';

export function AppRouter() {
  return (
    <BrowserRouter>
      <AppProviders>
        <App />
      </AppProviders>
    </BrowserRouter>
  );
}
