import type { ReactNode } from 'react';

export type DataColumn<T> = {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  className?: string;
};

type DataTableProps<T> = {
  columns: DataColumn<T>[];
  rows: T[];
  getRowKey: (row: T) => string | number;
  emptyMessage: string;
  showHeadersWhenEmpty?: boolean;
  className?: string;
  onRowClick?: (row: T) => void;
};

export function DataTable<T>({
  columns,
  rows,
  getRowKey,
  emptyMessage,
  showHeadersWhenEmpty = false,
  className,
  onRowClick,
}: DataTableProps<T>) {
  if (rows.length === 0 && !showHeadersWhenEmpty) {
    return (
      <p className="table-empty" role="status">
        {emptyMessage}
      </p>
    );
  }

  return (
    <>
      <div
        className={`${rows.length === 0 ? 'table-wrap table-wrap-empty' : 'table-wrap table-wrap-responsive'}${className ? ` ${className}` : ''}`}
        tabIndex={0}
      >
        <table>
          <thead>
            <tr>
              {columns.map((column) => (
                <th className={column.className} key={column.key} scope="col">
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td className="table-empty-cell" colSpan={columns.length} role="status">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr className={onRowClick ? 'data-table-clickable-row' : undefined} key={getRowKey(row)} onClick={onRowClick ? () => onRowClick(row) : undefined}>
                  {columns.map((column) => (
                    <td className={column.className} key={column.key} data-label={column.header}>
                      {column.render(row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="table-cards">
        {rows.map((row) => (
          <article className="data-card" key={getRowKey(row)}>
            {columns.map((column) => (
              <div className="data-card-row" key={column.key}>
                <span className="data-card-label">{column.header}</span>
                <span>{column.render(row)}</span>
              </div>
            ))}
          </article>
        ))}
      </div>
    </>
  );
}
