<?php

namespace Tests\Unit;

use App\Support\AccountingAmount;
use InvalidArgumentException;
use PHPUnit\Framework\Attributes\Test;
use PHPUnit\Framework\TestCase;

final class AccountingAmountTest extends TestCase
{
    #[Test]
    public function retains_four_decimal_places_and_large_values_without_float_rounding(): void
    {
        self::assertSame('9999999999999999999', AccountingAmount::units('999999999999999.9999'));
        self::assertSame('999999999999999.9999', AccountingAmount::format('9999999999999999999'));
        $difference = AccountingAmount::difference(AccountingAmount::units('0.3000'), AccountingAmount::units('0.3001'));
        self::assertSame('-0.0001', AccountingAmount::formatSigned($difference));
        self::assertSame('0.0000', AccountingAmount::formatSigned(AccountingAmount::addSigned($difference, ['sign' => 1, 'units' => '1'])));
    }

    #[Test]
    public function rejects_amounts_that_cannot_be_stored_exactly(): void
    {
        $this->expectException(InvalidArgumentException::class);
        AccountingAmount::units('1.00001');
    }
}
