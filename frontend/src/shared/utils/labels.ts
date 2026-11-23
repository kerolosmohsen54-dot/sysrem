import { ar } from '../i18n/ar';

const statusLabels: Record<string, string> = {
  active: ar.common.active,
  inactive: ar.common.inactive,
  draft: ar.finance.draft,
  posted: ar.common.posted,
  reversed: ar.common.reversed,
  cancelled: '\u0645\u0644\u063a\u0627\u0629',
  canceled: '\u0645\u0644\u063a\u0627\u0629',
  approved: ar.finance.approved,
  rejected: '\u0645\u0631\u0641\u0648\u0636\u0629',
  confirmed: '\u0645\u0624\u0643\u062f',
  estimated: '\u062a\u0642\u062f\u064a\u0631\u064a\u0629',
  incurred: '\u0645\u0633\u062a\u062d\u0642\u0629',
  issued: '\u0635\u0627\u062f\u0631\u0629',
  pending: '\u0642\u064a\u062f \u0627\u0644\u0627\u0646\u062a\u0638\u0627\u0631',
  needs_review: '\u062a\u062d\u062a\u0627\u062c \u0625\u0644\u0649 \u0645\u0631\u0627\u062c\u0639\u0629',
  needs_reviewing: '\u062a\u062d\u062a\u0627\u062c \u0625\u0644\u0649 \u0645\u0631\u0627\u062c\u0639\u0629',
  ignored: '\u0645\u0633\u062a\u0628\u0639\u062f\u0629',
  archived: '\u0645\u0624\u0631\u0634\u0641\u0629',
  new: '\u062c\u062f\u064a\u062f\u0629',
  processing: '\u0642\u064a\u062f \u0627\u0644\u0645\u0639\u0627\u0644\u062c\u0629',
  completed: '\u0645\u0643\u062a\u0645\u0644\u0629',
  failed: '\u0641\u0634\u0644\u062a',
  paid: '\u0645\u062f\u0641\u0648\u0639\u0629',
  partially_paid: '\u0645\u062f\u0641\u0648\u0639\u0629 \u062c\u0632\u0626\u064a\u064b\u0627',
  unpaid: '\u063a\u064a\u0631 \u0645\u062f\u0641\u0648\u0639\u0629',
  fulfilled: '\u0645\u0646\u0641\u0630 \u0628\u0627\u0644\u0643\u0627\u0645\u0644',
  preparing: '\u0642\u064a\u062f \u0627\u0644\u062a\u062c\u0647\u064a\u0632',
  in_transit: '\u0641\u064a \u0627\u0644\u0637\u0631\u064a\u0642',
  at_port: '\u0641\u064a \u0627\u0644\u0645\u064a\u0646\u0627\u0621',
  receiving: '\u062c\u0627\u0631\u064d \u0627\u0644\u0627\u0633\u062a\u0644\u0627\u0645',
  received: '\u062a\u0645 \u0627\u0644\u0627\u0633\u062a\u0644\u0627\u0645',
  delivered: '\u062a\u0645 \u0627\u0644\u062a\u0633\u0644\u064a\u0645',
  open: '\u0645\u0641\u062a\u0648\u062d',
  closed: '\u0645\u063a\u0644\u0642',
};

const movementLabels: Record<string, string> = {
  container_receipt: '\u0627\u0633\u062a\u0644\u0627\u0645 \u062d\u0627\u0648\u064a\u0629',
  receipt: '\u0627\u0633\u062a\u0644\u0627\u0645',
  sale: '\u0628\u064a\u0639',
  sales_invoice: '\u0641\u0627\u062a\u0648\u0631\u0629 \u0628\u064a\u0639',
  invoice: '\u0641\u0627\u062a\u0648\u0631\u0629 \u0628\u064a\u0639',
  return: '\u0645\u0631\u062a\u062c\u0639 \u0628\u064a\u0639',
  sales_return: '\u0645\u0631\u062a\u062c\u0639 \u0628\u064a\u0639',
  warehouse_return: '\u0645\u0631\u062a\u062c\u0639 \u0645\u062e\u0632\u0646\u064a',
  stock_return: '\u0645\u0631\u062a\u062c\u0639 \u0645\u062e\u0632\u0646\u064a',
  transfer: '\u0646\u0642\u0644 \u0645\u062e\u0632\u0648\u0646',
  warehouse_transfer: '\u0646\u0642\u0644 \u0645\u062e\u0632\u0648\u0646',
  adjustment: '\u062a\u0633\u0648\u064a\u0629 \u0645\u062e\u0632\u0648\u0646',
  opening_stock: '\u0631\u0635\u064a\u062f \u0627\u0641\u062a\u062a\u0627\u062d\u064a',
  opening: '\u0631\u0635\u064a\u062f \u0627\u0641\u062a\u062a\u0627\u062d\u064a',
  damaged: '\u062a\u0627\u0644\u0641',
  damage: '\u062a\u0627\u0644\u0641',
  reversal: ar.inventory.reversal,
  count: ar.nav.periodicCount,
  in: '\u0648\u0627\u0631\u062f',
  out: '\u0645\u0646\u0635\u0631\u0641',
};

const roleLabels: Record<string, string> = {
  owner: '\u0627\u0644\u0645\u0627\u0644\u0643',
  admin: '\u0645\u062f\u064a\u0631 \u0627\u0644\u0646\u0638\u0627\u0645',
  administrator: '\u0645\u062f\u064a\u0631 \u0627\u0644\u0646\u0638\u0627\u0645',
  accountant: '\u0645\u062d\u0627\u0633\u0628',
  designated_invoice_issuer: '\u0645\u064f\u0635\u062f\u0631 \u0627\u0644\u0641\u0648\u0627\u062a\u064a\u0631 \u0627\u0644\u0645\u062d\u062f\u062f',
  read_only: '\u0642\u0631\u0627\u0621\u0629 \u0641\u0642\u0637',
  driver: '\u0627\u0644\u0633\u0627\u0626\u0642',
  partner: '\u0634\u0631\u064a\u0643',
  'designated invoice issuer': '\u0645\u064f\u0635\u062f\u0631 \u0627\u0644\u0641\u0648\u0627\u062a\u064a\u0631 \u0627\u0644\u0645\u062d\u062f\u062f',
  'read only': '\u0642\u0631\u0627\u0621\u0629 \u0641\u0642\u0637',
  '\u0627\u0644\u0633\u0648\u0627\u0642': '\u0627\u0644\u0633\u0627\u0626\u0642',
  unknown: '\u0645\u0633\u062a\u062e\u062f\u0645',
};

const unitLabels: Record<string, string> = {
  piece: '\u0642\u0637\u0639\u0629',
  pieces: '\u0642\u0637\u0639\u0629',
  pc: '\u0642\u0637\u0639\u0629',
  pcs: '\u0642\u0637\u0639\u0629',
  unit: '\u0648\u062d\u062f\u0629',
  units: '\u0648\u062d\u062f\u0629',
  kg: '\u0643\u062c\u0645',
  kilogram: '\u0643\u062c\u0645',
  gram: '\u062c\u0645',
  g: '\u062c\u0645',
  box: '\u0635\u0646\u062f\u0648\u0642',
  carton: '\u0643\u0631\u062a\u0648\u0646\u0629',
  set: '\u0637\u0642\u0645',
  liter: '\u0644\u062a\u0631',
  litre: '\u0644\u062a\u0631',
};

function localized(value: string | null | undefined, labels: Record<string, string>, fallback: string): string {
  if (!value) return ar.common.notProvided;
  const key = value.trim().toLocaleLowerCase('en');
  if (labels[key]) return labels[key];
  return /[\u0600-\u06FF]/u.test(value) ? value : fallback;
}

export function displayStatus(value: string | null | undefined): string {
  return localized(value, statusLabels, '\u062d\u0627\u0644\u0629 \u063a\u064a\u0631 \u0645\u0639\u0631\u0648\u0641\u0629');
}

export function displayMovementType(value: string | null | undefined): string {
  return localized(value, movementLabels, '\u062d\u0631\u0643\u0629 \u063a\u064a\u0631 \u0645\u0639\u0631\u0648\u0641\u0629');
}

export function displayRole(value: string | null | undefined): string {
  return localized(value, roleLabels, '\u062f\u0648\u0631 \u063a\u064a\u0631 \u0645\u0639\u0631\u0648\u0641');
}

export function displayRoles(values: string[] | null | undefined): string {
  if (!values?.length) return displayRole('unknown');
  return [...new Set(values.map((value) => displayRole(value)))].join('\u060c ');
}

export function displayUnit(value: string | null | undefined): string {
  return localized(value, unitLabels, ar.common.unit);
}
