import { describe, expect, it } from 'vitest';
import { allocateProportionalCents, centsToMoney, divideRounded, isPositiveMoney, moneyToCents, percentOfCents, proportionalShareCents } from './money';

describe('exact decimal money helpers', () => {
  it('rounds supported decimal input to cents like the API', () => {
    expect(moneyToCents('0.004')).toBe(0n);
    expect(moneyToCents('0.005')).toBe(1n);
    expect(moneyToCents('999999999999999.99')).toBe(99999999999999999n);
    expect(centsToMoney(-123n)).toBe('-1.23');
  });

  it('computes percentage and proportional shares with integer rounding', () => {
    expect(percentOfCents(3750n, '0.29')).toBe(11n);
    expect(proportionalShareCents(11n, 3750n, 3750n)).toBe(11n);
    expect(divideRounded(5n, 2n)).toBe(3n);
  });

  it('keeps rounded allocations nonnegative and equal to the source amount', () => {
    const shares = allocateProportionalCents(3n, [1n, 1n, 1n, 1n, 1n]);
    expect(shares).toEqual([1n, 1n, 1n, 0n, 0n]);
    expect(shares.reduce((sum, share) => sum + share, 0n)).toBe(3n);
    expect(allocateProportionalCents(5n, [0n, 0n])).toEqual([0n, 0n]);
  });

  it('rejects invalid or zero amounts for positive amount validation', () => {
    expect(isPositiveMoney('0.0001')).toBe(false);
    expect(isPositiveMoney('0.00')).toBe(false);
    expect(isPositiveMoney('1e2')).toBe(false);
  });
});
