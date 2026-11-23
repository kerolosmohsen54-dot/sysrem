import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DataTable, type DataColumn } from '../../shared/components/DataTable';
import { FormField } from '../../shared/components/FormField';
import { PageState } from '../../shared/components/PageState';
import { ar } from '../../shared/i18n/ar';
import type { ListQuery } from '../inventory/api';
import { listAuditLogs, type AuditLogEntry } from './api';

function renderSafeValue(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'string') return value;
  return JSON.stringify(value) ?? ar.common.notProvided;
}

export function AuditPage() {
  const [query, setQuery] = useState<ListQuery>({
    page: 1,
    perPage: 10,
    search: '',
    sortBy: 'created_at',
    sortDirection: 'desc',
  });
  const [filters, setFilters] = useState({
    user_id: '',
    document_id: '',
    from: '',
    to: '',
  });
  const requestFilters = Object.fromEntries(
    Object.entries(filters).filter(([, value]) => value !== ''),
  );
  const result = useQuery({
    queryKey: ['/audit-logs', query, requestFilters],
    queryFn: () => listAuditLogs(query, requestFilters),
  });
  const columns: DataColumn<AuditLogEntry>[] = [
    { key: 'date', header: ar.admin.auditDate, render: (row) => row.created_at },
    { key: 'actor', header: ar.admin.auditActor, render: (row) => row.actor_name },
    { key: 'action', header: ar.admin.auditAction, render: (row) => row.action },
    { key: 'entity', header: ar.admin.auditEntity, render: (row) => row.entity_type },
    {
      key: 'entity_id',
      header: ar.admin.auditEntityId,
      render: (row) => row.entity_id ?? '—',
    },
    {
      key: 'before',
      header: ar.admin.auditBefore,
      render: (row) => renderSafeValue(row.before),
    },
    {
      key: 'after',
      header: ar.admin.auditAfter,
      render: (row) => renderSafeValue(row.after),
    },
  ];

  return (
    <section className="page inventory-page">
      <header className="page-heading">
        <div>
          <h1>{ar.nav.audit}</h1>
          <p>{ar.admin.auditDescription}</p>
        </div>
      </header>
      <div className="inventory-toolbar">
        <label className="inventory-search">
          <span>{ar.common.search}</span>
          <input
            aria-label={ar.common.search}
            className="input"
            type="search"
            value={query.search}
            onChange={(event) =>
              setQuery((current) => ({ ...current, page: 1, search: event.currentTarget.value }))
            }
          />
        </label>
        <FormField
          id="audit-user-id"
          label={ar.admin.auditUserId}
          min="1"
          type="number"
          value={filters.user_id}
          onChange={(event) => {
            setFilters((current) => ({ ...current, user_id: event.currentTarget.value }));
            setQuery((current) => ({ ...current, page: 1 }));
          }}
        />
        <FormField
          id="audit-document-id"
          label={ar.admin.auditDocumentId}
          min="1"
          type="number"
          value={filters.document_id}
          onChange={(event) => {
            setFilters((current) => ({ ...current, document_id: event.currentTarget.value }));
            setQuery((current) => ({ ...current, page: 1 }));
          }}
        />
        <FormField
          id="audit-from-date"
          label={ar.inventory.fromDate}
          type="date"
          value={filters.from}
          onChange={(event) => {
            setFilters((current) => ({ ...current, from: event.currentTarget.value }));
            setQuery((current) => ({ ...current, page: 1 }));
          }}
        />
        <FormField
          id="audit-to-date"
          label={ar.inventory.toDate}
          type="date"
          value={filters.to}
          onChange={(event) => {
            setFilters((current) => ({ ...current, to: event.currentTarget.value }));
            setQuery((current) => ({ ...current, page: 1 }));
          }}
        />
        <label className="form-field">
          <span>{ar.inventory.sortDirection}</span>
          <select
            className="input"
            value={query.sortDirection}
            onChange={(event) =>
              setQuery((current) => ({
                ...current,
                page: 1,
                sortDirection: event.currentTarget.value as 'asc' | 'desc',
              }))
            }
          >
            <option value="desc">{ar.inventory.descending}</option>
            <option value="asc">{ar.inventory.ascending}</option>
          </select>
        </label>
      </div>
      {result.isLoading ? (
        <PageState kind="loading" />
      ) : result.isError ? (
        <PageState
          kind="error"
          message={ar.common.requestFailed}
          onRetry={() => void result.refetch()}
        />
      ) : result.data ? (
        <>
          <DataTable
            columns={columns}
            rows={result.data.data}
            getRowKey={(row) => row.id}
            emptyMessage={ar.common.noResults}
          />
          <nav aria-label={ar.inventory.paginationLabel} className="inventory-pagination">
            <button
              className="button button-secondary"
              disabled={query.page <= 1}
              onClick={() => setQuery((current) => ({ ...current, page: current.page - 1 }))}
              type="button"
            >
              {ar.common.previous}
            </button>
            <span>
              {ar.common.page} {query.page} {ar.common.of} {result.data.meta.last_page}
            </span>
            <button
              className="button button-secondary"
              disabled={query.page >= result.data.meta.last_page}
              onClick={() => setQuery((current) => ({ ...current, page: current.page + 1 }))}
              type="button"
            >
              {ar.common.next}
            </button>
          </nav>
        </>
      ) : null}
    </section>
  );
}
