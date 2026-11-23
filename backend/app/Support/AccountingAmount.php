<?php

namespace App\Support;

use InvalidArgumentException;

final class AccountingAmount
{
    public static function units(string $amount): string
    {
        if (! preg_match('/\A([0-9]+)(?:\.([0-9]{1,4}))?\z/', $amount, $matches)) {
            throw new InvalidArgumentException('Expected a non-negative decimal with at most four fractional digits.');
        }
        $whole = ltrim($matches[1], '0');
        $fraction = str_pad($matches[2] ?? '', 4, '0');
        return ExactMoney::add(ExactMoney::multiply($whole === '' ? '0' : $whole, '10000'), $fraction);
    }

    public static function format(string $units): string
    {
        $normalized = ltrim($units, '0');
        $normalized = str_pad($normalized === '' ? '0' : $normalized, 5, '0', STR_PAD_LEFT);
        return substr($normalized, 0, -4).'.'.substr($normalized, -4);
    }

    public static function difference(string $left, string $right): array
    {
        $comparison = ExactMoney::compare($left, $right);
        if ($comparison === 0) return ['sign' => 0, 'units' => '0'];
        return $comparison > 0
            ? ['sign' => 1, 'units' => ExactMoney::subtract($left, $right)]
            : ['sign' => -1, 'units' => ExactMoney::subtract($right, $left)];
    }

    public static function addSigned(array $left, array $right): array
    {
        if ($left['sign'] === 0) return $right;
        if ($right['sign'] === 0) return $left;
        if ($left['sign'] === $right['sign']) {
            return ['sign' => $left['sign'], 'units' => ExactMoney::add($left['units'], $right['units'])];
        }
        $difference = self::difference($left['units'], $right['units']);
        return ['sign' => $difference['sign'] * $left['sign'], 'units' => $difference['units']];
    }

    public static function negate(array $amount): array
    {
        return ['sign' => -$amount['sign'], 'units' => $amount['units']];
    }

    public static function formatSigned(array $amount): string
    {
        return ($amount['sign'] < 0 ? '-' : '').self::format($amount['units']);
    }
}
