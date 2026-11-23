<?php

namespace App\Support;

use InvalidArgumentException;

final class ExactMoney
{
    private const MAX_DECIMAL_19_4_CENTS = '99999999999999999';

    public static function toCents(string $amount): string
    {
        if (! preg_match('/\A(?:0|[1-9][0-9]{0,14})(?:\.([0-9]{1,4}))?\z/', $amount, $matches)) {
            throw new InvalidArgumentException('The amount is outside the supported decimal range.');
        }

        $parts = explode('.', $amount, 2);
        $fraction = str_pad($parts[1] ?? '', 3, '0');
        $cents = self::add(
            self::multiply($parts[0], 100),
            substr($fraction, 0, 2),
        );

        if ((int) $fraction[2] >= 5) {
            $cents = self::add($cents, '1');
        }

        if (self::compare($cents, self::MAX_DECIMAL_19_4_CENTS) > 0) {
            throw new InvalidArgumentException('The rounded amount exceeds the supported decimal range.');
        }

        return $cents;
    }

    public static function fromCents(string $cents): string
    {
        $cents = self::normalize($cents);

        if (self::compare($cents, self::MAX_DECIMAL_19_4_CENTS) > 0) {
            throw new InvalidArgumentException('The amount exceeds the supported decimal range.');
        }

        if (strlen($cents) < 3) {
            $cents = str_pad($cents, 3, '0', STR_PAD_LEFT);
        }

        return substr($cents, 0, -2).'.'.substr($cents, -2);
    }

    public static function multiply(string $left, int|string $right): string
    {
        $left = self::normalize($left);
        $right = self::normalize((string) $right);

        if ($left === '0' || $right === '0') {
            return '0';
        }

        $leftDigits = array_reverse(array_map('intval', str_split($left)));
        $rightDigits = array_reverse(array_map('intval', str_split($right)));
        $result = array_fill(0, count($leftDigits) + count($rightDigits), 0);

        foreach ($leftDigits as $leftIndex => $leftDigit) {
            foreach ($rightDigits as $rightIndex => $rightDigit) {
                $position = $leftIndex + $rightIndex;
                $value = $result[$position] + ($leftDigit * $rightDigit);
                $result[$position] = $value % 10;
                $result[$position + 1] += intdiv($value, 10);
            }
        }

        return self::normalize(implode('', array_reverse($result)));
    }

    public static function subtract(string $left, string $right): string
    {
        $left = self::normalize($left);
        $right = self::normalize($right);

        if (self::compare($left, $right) < 0) {
            throw new InvalidArgumentException('Exact money subtraction cannot produce a negative amount.');
        }

        $leftDigits = array_reverse(array_map('intval', str_split($left)));
        $rightDigits = array_reverse(array_map('intval', str_split($right)));
        $result = [];
        $borrow = 0;

        foreach ($leftDigits as $index => $leftDigit) {
            $digit = $leftDigit - ($rightDigits[$index] ?? 0) - $borrow;
            $borrow = $digit < 0 ? 1 : 0;
            $result[] = $digit < 0 ? $digit + 10 : $digit;
        }

        return self::normalize(implode('', array_reverse($result)));
    }

    public static function add(string $left, string $right): string
    {
        $leftDigits = array_reverse(array_map('intval', str_split(self::normalize($left))));
        $rightDigits = array_reverse(array_map('intval', str_split(self::normalize($right))));
        $length = max(count($leftDigits), count($rightDigits));
        $result = [];
        $carry = 0;

        for ($index = 0; $index < $length; $index++) {
            $sum = ($leftDigits[$index] ?? 0) + ($rightDigits[$index] ?? 0) + $carry;
            $result[] = $sum % 10;
            $carry = intdiv($sum, 10);
        }

        if ($carry > 0) {
            $result[] = $carry;
        }

        return self::normalize(implode('', array_reverse($result)));
    }

    public static function divideRounded(string $numerator, int $denominator): string
    {
        $quotient = self::divideRoundedInteger($numerator, $denominator);

        if (self::compare($quotient, self::MAX_DECIMAL_19_4_CENTS) > 0) {
            throw new InvalidArgumentException('The rounded amount exceeds the supported decimal range.');
        }

        return $quotient;
    }

    /** Integer division for ratios whose result is not a monetary amount. */
    public static function divideRoundedInteger(string $numerator, int $denominator): string
    {
        if ($denominator < 1) {
            throw new InvalidArgumentException('The divisor must be positive.');
        }

        $quotient = '';
        $remainder = 0;

        foreach (str_split(self::normalize($numerator)) as $digit) {
            $partial = ($remainder * 10) + (int) $digit;
            $quotient .= (string) intdiv($partial, $denominator);
            $remainder = $partial % $denominator;
        }

        $quotient = self::normalize($quotient);

        if (($remainder * 2) >= $denominator) {
            $quotient = self::add($quotient, '1');
        }

        return $quotient;
    }

    /**
     * Split a nonnegative amount across nonnegative weights while preserving the total
     * even when independently rounded shares would otherwise exceed it.
     *
     * @param array<int|string, string> $weights
     * @return array<int|string, string>
     */
    public static function allocateProportionally(string $amount, array $weights): array
    {
        $amount = self::normalize($amount);
        $totalWeight = array_reduce($weights, static fn (string $sum, string $weight): string => self::add($sum, $weight), '0');
        if ($totalWeight === '0') {
            return array_fill_keys(array_keys($weights), '0');
        }
        if (self::compare($totalWeight, (string) PHP_INT_MAX) > 0) {
            throw new InvalidArgumentException('The allocation basis exceeds the supported exact integer range.');
        }

        $distributed = '0';
        $shares = [];
        $lastIndex = array_key_last($weights);
        foreach ($weights as $key => $weight) {
            $weight = self::normalize($weight);
            $remaining = self::subtract($amount, $distributed);
            $rounded = $key === $lastIndex
                ? $remaining
                : self::divideRounded(self::multiply($amount, $weight), (int) $totalWeight);
            $share = self::compare($rounded, $remaining) > 0 ? $remaining : $rounded;
            $shares[$key] = $share;
            $distributed = self::add($distributed, $share);
        }

        return $shares;
    }

    public static function compare(string $left, string $right): int
    {
        $left = self::normalize($left);
        $right = self::normalize($right);

        return strlen($left) <=> strlen($right) ?: strcmp($left, $right);
    }

    private static function normalize(string $value): string
    {
        if ($value === '' || ! ctype_digit($value)) {
            throw new InvalidArgumentException('Exact money operations require unsigned integer strings.');
        }

        $normalized = ltrim($value, '0');

        return $normalized === '' ? '0' : $normalized;
    }
}
