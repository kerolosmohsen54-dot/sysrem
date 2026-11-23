<?php

namespace Tests\Unit;

use App\Support\ExactMoney;
use PHPUnit\Framework\TestCase;

final class ExactMoneyTest extends TestCase
{
    public function test_proportional_allocation_never_creates_negative_shares_and_preserves_total(): void
    {
        $shares = ExactMoney::allocateProportionally('3', [1 => '1', 2 => '1', 3 => '1', 4 => '1', 5 => '1']);

        self::assertSame([1 => '1', 2 => '1', 3 => '1', 4 => '0', 5 => '0'], $shares);
        self::assertSame('3', array_reduce($shares, static fn (string $sum, string $share): string => ExactMoney::add($sum, $share), '0'));
    }

    public function test_zero_weight_allocations_are_zero(): void
    {
        self::assertSame([1 => '0', 2 => '0'], ExactMoney::allocateProportionally('5', [1 => '0', 2 => '0']));
    }
}
