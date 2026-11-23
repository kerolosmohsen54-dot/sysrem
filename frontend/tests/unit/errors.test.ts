import { describe, expect, it } from 'vitest';
import { apiErrorMessages, getErrorMessage } from '../../src/shared/api/errors';
import { ar } from '../../src/shared/i18n/ar';

describe('API error messages', () => {
  it.each(Object.entries(apiErrorMessages))('maps %s to an Arabic message', (code, message) => {
    expect(getErrorMessage(code, 400)).toBe(message);
  });

  it('does not treat inherited object property names as known error codes', () => {
    expect(getErrorMessage('toString', 400)).toBe(ar.common.unknownError);
  });

  it('maps state conflicts to a clear Arabic message', () => {
    expect(getErrorMessage('HTTP_ERROR', 409)).toBe(ar.common.conflict);
  });
});
