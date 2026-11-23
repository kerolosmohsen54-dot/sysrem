import type { ReactNode } from 'react';

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="auth-layout" dir="rtl">
      <div className="auth-brand">
        <img alt="MASTER" className="auth-brand-logo" src="/master-logo.png" />
      </div>
      {children}
    </main>
  );
}
