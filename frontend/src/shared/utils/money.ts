const DECIMAL_AMOUNT = /^(-?)(0|[1-9][0-9]{0,14})(?:\.([0-9]{1,4}))?$/;

/** Parse a decimal amount as integer cents using the API's half-up cent rounding. */
export function moneyToCents(value: string | null | undefined): bigint {
  if (!value) return 0n;
  const match = DECIMAL_AMOUNT.exec(value);
  if (!match) return 0n;

  const [, sign, whole, fraction = ''] = match;
  let cents = BigInt(whole) * 100n + BigInt(fraction.padEnd(3, '0').slice(0, 2));
  if (fraction.padEnd(3, '0')[2] >= '5') cents += 1n;
  return sign === '-' ? -cents : cents;
}

export function centsToMoney(cents: bigint): string {
  const negative = cents < 0n;
  const absolute = negative ? -cents : cents;
  const whole = absolute / 100n;
  const fraction = String(absolute % 100n).padStart(2, '0');
  return `${negative && absolute !== 0n ? '-' : ''}${whole}.${fraction}`;
}

export function quantityAsBigInt(value: string | number): bigint {
  const normalized = String(value);
  return /^[0-9]+$/.test(normalized) ? BigInt(normalized) : 0n;
}

export function multiplyCents(cents: bigint, quantity: bigint): bigint {
  return cents * quantity;
}

export function divideRounded(numerator: bigint, denominator: bigint): bigint {
  if (denominator <= 0n) throw new RangeError('The divisor must be positive.');
  const negative = numerator < 0n;
  const absolute = negative ? -numerator : numerator;
  const quotient = (absolute + denominator / 2n) / denominator;
  return negative ? -quotient : quotient;
}

/** A percentage is represented as hundredths of one percent (for example, 12.34% => 1234). */
export function percentOfCents(amountCents: bigint, percent: string): bigint {
  return divideRounded(amountCents * moneyToCents(percent), 10000n);
}

export function proportionalShareCents(amountCents: bigint, weightCents: bigint, totalCents: bigint): bigint {
  return totalCents <= 0n ? 0n : divideRounded(amountCents * weightCents, totalCents);
}

/** Split a nonnegative amount across nonnegative weights without allowing rounded shares to exceed the total. */
export function allocateProportionalCents(amountCents: bigint, weights: bigint[]): bigint[] {
  const negative = amountCents < 0n;
  const amount = negative ? -amountCents : amountCents;
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0n);
  if (totalWeight <= 0n || weights.some((weight) => weight < 0n)) return weights.map(() => 0n);

  let distributed = 0n;
  return weights.map((weight, index) => {
    const remaining = amount - distributed;
    const rounded = index === weights.length - 1 ? remaining : divideRounded(amount * weight, totalWeight);
    const share = rounded > remaining ? remaining : rounded;
    distributed += share;
    return negative ? -share : share;
  });
}

export function isPositiveMoney(value: string): boolean {
  return DECIMAL_AMOUNT.test(value) && moneyToCents(value) > 0n;
}
