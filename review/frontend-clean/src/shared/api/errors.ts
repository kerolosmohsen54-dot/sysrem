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
