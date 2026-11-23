import { describe, expect, it } from 'vitest';
import { formatDate, formatMoney, formatQuantity } from '../../src/shared/utils/format';

describe('string formatters', () => {
  it('groups large money strings without converting to floating point', () => {
    expect(formatMoney('900719925474099312345.67')).toBe('900,719,925,474,099,312,345.67 ج.م');
  });

  it('preserves decimal precision and signs in quantities', () => {
    expect(formatQuantity('-1200000.0050')).toBe('-1,200,000.0050');
  });

  it('preserves zero, negative values and trailing decimal zeros', () => {
    expect(formatMoney('0')).toBe('0 ج.م');
    expect(formatMoney('-1200.5000')).toBe('-1,200.5000 ج.م');
  });

  it('rejects malformed money strings', () => {
    expect(() => formatMoney('1.2.3')).toThrow(TypeError);
  });

  it('formats ISO dates using Arabic locale', () => {
    expect(formatDate('2026-10-11')).toContain('٢٠٢٦');
  });
});
