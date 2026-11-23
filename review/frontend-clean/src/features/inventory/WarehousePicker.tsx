import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PageState } from '../../shared/components/PageState';
import { ar } from '../../shared/i18n/ar';
import { listResource, type ListQuery, type Warehouse } from './api';

type WarehousePickerProps = {
  id: string;
  label: string;
  name: string;
  allowEmpty?: boolean;
  emptyLabel?: string;
  defaultValue?: string;
  value?: string;
  onChange?: (value: string) => void;
};

export function WarehousePicker({
  id,
  label,
  name,
  allowEmpty = false,
  emptyLabel = ar.inventory.selectWarehouse,
  defaultValue = '',
  value,
  onChange,
}: WarehousePickerProps) {
  const [query, setQuery] = useState<ListQuery>({ page: 1, perPage: 10, search: '' });
  const [selectedValue, setSelectedValue] = useState(defaultValue);
  const [selectedWarehouse, setSelectedWarehouse] = useState<Warehouse | null>(null);
  const selected = value ?? selectedValue;
  const result = useQuery({
    queryKey: ['/warehouses', 'picker', name, query],
    queryFn: () => listResource<Warehouse>('/warehouses', query),
  });

  if (result.isError) {
    return (
      <div className="form-field">
        <span>{label}</span>
        <PageState
          kind="error"
          message={ar.common.requestFailed}
          onRetry={() => void result.refetch()}
        />
      </div>
    );
  }

  return (
    <div className="form-field warehouse-picker">
      <label htmlFor={id}>{label}</label>
      <input
        aria-label={`${label} — ${ar.common.search}`}
        className="input"
        type="search"
        value={query.search}
        onChange={(event) => {
          const search = event.currentTarget.value;
          setQuery((current) => ({ ...current, search, page: 1 }));
        }}
      />
      <select
        className="input"
        id={id}
        name={name}
        required={!allowEmpty}
        value={selected}
        onChange={(event) => {
          const nextValue = event.currentTarget.value;
          const nextWarehouse = result.data?.data.find(
            (warehouse) => warehouse.id.toString() === nextValue,
          );
          setSelectedWarehouse(nextWarehouse ?? null);
          if (value === undefined) setSelectedValue(nextValue);
          onChange?.(nextValue);
        }}
        disabled={result.isLoading || !result.data}
      >
        {allowEmpty && <option value="">{emptyLabel}</option>}
        {!allowEmpty && (
          <option value="" disabled>
            {ar.inventory.selectWarehouse}
          </option>
        )}
        {result.data?.data.map((warehouse) => (
          <option key={warehouse.id} value={warehouse.id}>
            {warehouse.name} — {warehouse.code}
          </option>
        ))}
        {defaultValue &&
          selected === defaultValue &&
          !result.data?.data.some((warehouse) => warehouse.id.toString() === defaultValue) &&
          !selectedWarehouse && (
            <option value={defaultValue}>
              {ar.common.warehouse} #{defaultValue}
            </option>
          )}
        {selectedWarehouse &&
          selectedWarehouse.id.toString() === selected &&
          !result.data?.data.some((warehouse) => warehouse.id === selectedWarehouse.id) && (
            <option value={selectedWarehouse.id}>
              {selectedWarehouse.name} — {selectedWarehouse.code}
            </option>
          )}
      </select>
      {result.data && result.data.meta.last_page > 1 && (
        <nav
          className="inventory-pagination warehouse-pagination"
          aria-label={ar.inventory.paginationLabel}
        >
          <button
            className="button button-secondary"
            type="button"
            disabled={query.page <= 1}
            onClick={() => setQuery((current) => ({ ...current, page: current.page - 1 }))}
          >
            {ar.common.previous}
          </button>
          <span>
            {ar.common.page} {query.page} {ar.common.of} {result.data.meta.last_page}
          </span>
          <button
            className="button button-secondary"
            type="button"
            disabled={query.page >= result.data.meta.last_page}
            onClick={() => setQuery((current) => ({ ...current, page: current.page + 1 }))}
          >
            {ar.common.next}
          </button>
        </nav>
      )}
      {result.isLoading && <span className="field-hint">{ar.app.loading}</span>}
    </div>
  );
}
