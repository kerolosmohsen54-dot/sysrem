export type ExportColumn<T> = { label: string; value: (row: T) => string | number | null | undefined };

function download(filename: string, content: BlobPart, type: string): void {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function csvCell(value: unknown): string {
  const text = value == null ? '' : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

export function exportCsv<T>(filename: string, columns: ExportColumn<T>[], rows: T[]): void {
  const lines = [
    columns.map((column) => csvCell(column.label)).join(','),
    ...rows.map((row) => columns.map((column) => csvCell(column.value(row))).join(',')),
  ];
  download(`${filename}.csv`, `\uFEFF${lines.join('\r\n')}`, 'text/csv;charset=utf-8');
}

export function exportExcel<T>(filename: string, columns: ExportColumn<T>[], rows: T[]): void {
  const headers = columns.map((column) => `<th>${escapeHtml(column.label)}</th>`).join('');
  const body = rows.map((row) => `<tr>${columns.map((column) => `<td>${escapeHtml(column.value(row))}</td>`).join('')}</tr>`).join('');
  const html = `<html><head><meta charset="utf-8"></head><body><table><thead><tr>${headers}</tr></thead><tbody>${body}</tbody></table></body></html>`;
  download(`${filename}.xls`, `\uFEFF${html}`, 'application/vnd.ms-excel;charset=utf-8');
}

function escapeHtml(value: unknown): string {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character] ?? character);
}

export function printReport(): void {
  window.print();
}
