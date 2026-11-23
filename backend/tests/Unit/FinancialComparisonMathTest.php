<?php

namespace Tests\Unit;

use App\Support\FinancialComparisonMath;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

final class FinancialComparisonMathTest extends TestCase
{
    #[Test]
    public function change_math_preserves_signed_differences_and_handles_zero_baselines(): void
    {
        self::assertSame('2500', FinancialComparisonMath::difference('12500', '10000'));
        self::assertSame('-100', FinancialComparisonMath::difference('9900', '10000'));
        self::assertSame('-1500', FinancialComparisonMath::difference('-500', '1000'));
        self::assertSame(25.0, FinancialComparisonMath::percentChange('12500', '10000'));
        self::assertSame(120.0, FinancialComparisonMath::ratioPercent('12000', '10000'));
        self::assertSame(-25.0, FinancialComparisonMath::ratioPercent('-12500', '50000'));
        self::assertSame(0.01, FinancialComparisonMath::ratioPercent('1', '10000'));
        self::assertNull(FinancialComparisonMath::percentChange('100', '0'));
    }
}
