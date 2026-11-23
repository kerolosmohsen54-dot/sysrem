const MONEY_PATTERN = /^(-?)(\d+)(?:\.(\d+))?$/;

function groupedDecimal(value: string): string {
  const match = MONEY_PATTERN.exec(value);
  if (!match) throw new TypeError('Expected a decimal value encoded as a string.');
  const [, sign, integer, fraction] = match;
  const groupedInteger = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${sign}${groupedInteger}${fraction === undefined ? '' : `.${fraction}`}`;
}

export function formatMoney(amount: string): string {
  return `${groupedDecimal(amount)} ج.م`;
}

export function formatQuantity(quantity: string): string {
  return groupedDecimal(quantity);
}

export function formatDate(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) throw new TypeError('Expected a valid ISO date.');
  return new Intl.DateTimeFormat('ar-EG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
}
