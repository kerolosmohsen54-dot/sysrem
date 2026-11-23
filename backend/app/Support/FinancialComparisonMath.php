<?php

namespace App\Support;

final class FinancialComparisonMath
{
    public static function difference(string $current, string $baseline): string
    {
        return self::addSigned($current, self::negate($baseline));
    }

    public static function percentChange(string $current, string $baseline): ?float
    {
        if ($baseline === '0' || $baseline === '-0') return null;
        return self::ratioPercent(self::difference($current, $baseline), $baseline);
    }

    public static function ratioPercent(string $numerator, string $denominator): float
    {
        $numeratorNegative = str_starts_with($numerator, '-');
        $denominatorNegative = str_starts_with($denominator, '-');
        $numeratorMagnitude = $numeratorNegative ? substr($numerator, 1) : $numerator;
        $denominatorMagnitude = $denominatorNegative ? substr($denominator, 1) : $denominator;
        if ($denominatorMagnitude === '0') return 0.0;

        $hundredths = ExactMoney::divideRoundedInteger(
            ExactMoney::multiply($numeratorMagnitude, '10000'),
            (int) $denominatorMagnitude,
        );
        $percent = (float) $hundredths / 100;
        return $numeratorNegative !== $denominatorNegative ? -$percent : $percent;
    }

    private static function addSigned(string $left, string $right): string
    {
        $leftNegative = str_starts_with($left, '-');
        $rightNegative = str_starts_with($right, '-');
        $leftMagnitude = $leftNegative ? substr($left, 1) : $left;
        $rightMagnitude = $rightNegative ? substr($right, 1) : $right;
        if ($leftNegative === $rightNegative) {
            $sum = ExactMoney::add($leftMagnitude, $rightMagnitude);
            return $leftNegative && $sum !== '0' ? '-'.$sum : $sum;
        }
        $comparison = ExactMoney::compare($leftMagnitude, $rightMagnitude);
        if ($comparison === 0) return '0';
        if ($comparison > 0) {
            $difference = ExactMoney::subtract($leftMagnitude, $rightMagnitude);
            return $leftNegative ? '-'.$difference : $difference;
        }
        $difference = ExactMoney::subtract($rightMagnitude, $leftMagnitude);
        return $rightNegative ? '-'.$difference : $difference;
    }

    private static function negate(string $amount): string
    {
        if ($amount === '0') return '0';
        return str_starts_with($amount, '-') ? substr($amount, 1) : '-'.$amount;
    }
}
