import { ar } from '../i18n/ar';
import type { components } from './generated/schema';

export type ApiErrorCode = components['schemas']['Error']['error']['code'];

export const apiErrorMessages: Record<ApiErrorCode, string> = {
  UNAUTHENTICATED: ar.common.sessionExpired,
  AUTHENTICATION_FAILED: ar.common.authenticationFailed,
  REAUTHENTICATION_FAILED: ar.common.reauthenticationFailed,
  FORBIDDEN: ar.common.forbidden,
  CSRF_TOKEN_MISMATCH: ar.common.csrf,
  VALIDATION_FAILED: ar.common.validation,
  STEP_UP_REQUIRED: ar.common.stepUp,
  HTTP_ERROR: ar.common.requestFailed,
  INTERNAL_SERVER_ERROR: ar.common.serverError,
};

export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details: unknown;

  constructor(status: number, code: string, details?: unknown) {
    super(getErrorMessage(code, status));
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function getErrorMessage(code: string, status: number): string {
  if (status === 409) return ar.common.conflict;
  if (Object.hasOwn(apiErrorMessages, code)) return apiErrorMessages[code as ApiErrorCode];
  if (status === 404) return ar.common.notFound;
  if (status === 403) return ar.common.forbidden;
  if (status === 429) return ar.common.rateLimited;
  if (status >= 500) return ar.common.serverError;
  return ar.common.unknownError;
}

export function parseApiError(value: unknown, status: number): ApiError {
  if (typeof value !== 'object' || value === null) {
    return new ApiError(status, 'HTTP_ERROR');
  }
  const error = 'error' in value ? value.error : value;
  if (typeof error !== 'object' || error === null) {
    return new ApiError(status, 'HTTP_ERROR');
  }
  const code = 'code' in error && typeof error.code === 'string' ? error.code : 'HTTP_ERROR';
  const details = 'details' in error ? error.details : undefined;
  return new ApiError(status, code, details);
}


const validationFieldLabels: Record<string, string> = {
  amount: 'المبلغ',
  amount_egp: 'المبلغ بالجنيه',
  allocation_basis: 'أساس التوزيع',
  allocations: 'التوزيعات',
  company_price: 'سعر الشركة',
  container_id: 'الحاوية',
  customer_id: 'العميل',
  date: 'التاريخ',
  email: 'البريد الإلكتروني',
  invoice_id: 'الفاتورة',
  lines: 'الأصناف',
  message: 'الرسالة',
  name: 'الاسم',
  password: 'كلمة المرور',
  payments: 'الدفعات',
  phone: 'رقم الهاتف',
  product_id: 'المنتج',
  quantity: 'الكمية',
  reason: 'السبب',
  role_codes: 'الأدوار',
  source_location_id: 'المخزن المصدر',
  destination_location_id: 'المخزن المستلم',
  treasury_account_id: 'حساب الخزينة',
  unit_cost_egp: 'تكلفة الوحدة',
  username: 'اسم المستخدم',
  warehouse_id: 'المخزن',
};

function localizedValidationMessage(value: unknown): string {
  const message = String(value);
  if (/[\u0600-\u06FF]/u.test(message)) return message;
  const translations: Record<string, string> = {
    'The selected warehouse does not exist or is inactive.': 'المخزن المحدد غير موجود أو غير نشط.',
    'The name has already been taken.': 'هذا الاسم مستخدم بالفعل.',
    'The phone has already been taken.': 'رقم الهاتف مستخدم بالفعل.',
    'The returned quantity exceeds the quantity sold and not yet returned.': 'تتجاوز الكمية المرتجعة الكمية المباعة التي لم تُرجع بعد.',
  };
  if (translations[message]) return translations[message];
  if (/^invalid\b/i.test(message)) return '\u0642\u064a\u0645\u0629 \u063a\u064a\u0631 \u0635\u0627\u0644\u062d\u0629.';
  if (/already exists|has already been taken/i.test(message)) return '\u0647\u0630\u0647 \u0627\u0644\u0642\u064a\u0645\u0629 \u0645\u0633\u062a\u062e\u062f\u0645\u0629 \u0628\u0627\u0644\u0641\u0639\u0644.';
  if (/\brequired\b/i.test(message)) return '\u0647\u0630\u0627 \u0627\u0644\u062d\u0642\u0644 \u0645\u0637\u0644\u0648\u0628.';
  if (/unsupported/i.test(message)) return '\u0647\u0630\u0647 \u0627\u0644\u0642\u064a\u0645\u0629 \u063a\u064a\u0631 \u0645\u062f\u0639\u0648\u0645\u0629.';
  if (/exceeds/i.test(message)) return '\u0627\u0644\u0642\u064a\u0645\u0629 \u062a\u062a\u062c\u0627\u0648\u0632 \u0627\u0644\u062d\u062f \u0627\u0644\u0645\u0633\u0645\u0648\u062d.';
  return ar.common.validation;
}

const additionalValidationFieldLabels: Record<string, string> = {
  cost_egp: '\u0627\u0644\u062a\u0643\u0644\u0641\u0629',
  from_date: '\u062a\u0627\u0631\u064a\u062e \u0627\u0644\u0628\u062f\u0627\u064a\u0629',
  minimum_quantity: '\u0627\u0644\u062d\u062f \u0627\u0644\u0623\u062f\u0646\u0649 \u0644\u0644\u0643\u0645\u064a\u0629',
  customerId: '\u0627\u0644\u0639\u0645\u064a\u0644',
  direction: '\u0627\u0644\u0627\u062a\u062c\u0627\u0647',
  per_page: '\u0639\u062f\u062f \u0627\u0644\u0646\u062a\u0627\u0626\u062c',
  sender_filter: '\u0627\u0644\u0645\u0631\u0633\u0644',
};

export function formatApiErrorDetails(details: unknown): string {
  if (typeof details !== 'object' || details === null) return '';
  return Object.entries(details)
    .map(([field, values]) => {
      const fieldCode = field.split('.').filter((part) => !/^\d+$/.test(part)).at(-1) ?? field;
      const label = validationFieldLabels[field] ??
        additionalValidationFieldLabels[fieldCode] ??
        validationFieldLabels[fieldCode] ??
        '\u0628\u064a\u0627\u0646\u0627\u062a \u0623\u062e\u0631\u0649';
      const messages = Array.isArray(values) ? values : [values];
      return label + ': ' + messages.map(localizedValidationMessage).join('\u060c ');
    })
    .join(' | ');
}
