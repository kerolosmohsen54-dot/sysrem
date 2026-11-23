import { ar } from '../i18n/ar';

type PageStateProps = {
  kind: 'loading' | 'empty' | 'error' | 'denied';
  title?: string;
  message?: string;
  onRetry?: () => void;
};

export function PageState({ kind, title, message, onRetry }: PageStateProps) {
  if (kind === 'loading') {
    return (
      <div className="page-state" role="status" aria-live="polite">
        <span className="spinner" aria-hidden="true" />
        <span>{title ?? ar.app.loading}</span>
      </div>
    );
  }

  return (
    <section className={`page-state page-state-${kind}`} aria-live="polite">
      <h2>{title ?? (kind === 'denied' ? ar.common.permissionDenied : ar.common.requestFailed)}</h2>
      {message && <p>{message}</p>}
      {kind === 'error' && onRetry && (
        <button className="button button-secondary" type="button" onClick={onRetry}>
          {ar.common.retry}
        </button>
      )}
    </section>
  );
}
