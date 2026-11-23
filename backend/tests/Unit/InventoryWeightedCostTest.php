<?php

namespace Tests\Unit;

use App\Support\ExactMoney;
use PHPUnit\Framework\Attributes\Test;
use PHPUnit\Framework\TestCase;

final class InventoryWeightedCostTest extends TestCase
{
    #[Test]
    public function inbound_cost_and_issue_value_reconcile_without_float_drift(): void
    {
        $opening = ExactMoney::multiply(ExactMoney::toCents('10.00'), 2);
        $receipt = ExactMoney::multiply(ExactMoney::toCents('16.00'), 1);
        $value = ExactMoney::add($opening, $receipt);
        self::assertSame('36.00', ExactMoney::fromCents($value));
        self::assertSame('12.00', ExactMoney::fromCents(ExactMoney::divideRounded($value, 3)));
        $issueValue = ExactMoney::divideRounded(ExactMoney::multiply($value, 1), 3);
        self::assertSame('24.00', ExactMoney::fromCents(ExactMoney::subtract($value, $issueValue)));
    }
}
