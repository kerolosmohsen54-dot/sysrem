import type { ReactNode } from 'react';

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="auth-layout" dir="rtl">
      <div className="auth-brand">
        <span className="brand-crown" aria-hidden="true">
          <svg viewBox="0 0 64 44" fill="none" role="presentation">
            <path d="M8 13l9 8 7-13 8 12 8-12 7 13 9-8-5 19H13L8 13Z" />
            <path d="M14 36h36M18 41h28" />
            <circle cx="8" cy="11" r="2" />
            <circle cx="24" cy="6" r="2" />
            <circle cx="32" cy="19" r="2" />
            <circle cx="40" cy="6" r="2" />
            <circle cx="56" cy="11" r="2" />
          </svg>
        </span>
        <span className="auth-brand-name">MASTER</span>
      </div>
      {children}
    </main>
  );
}
