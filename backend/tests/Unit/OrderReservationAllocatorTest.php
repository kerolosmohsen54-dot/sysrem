<?php

namespace Tests\Unit;

use App\Support\OrderReservationAllocator;
use App\Support\InsufficientOrderStock;
use PHPUnit\Framework\Attributes\Test;
use PHPUnit\Framework\TestCase;

class OrderReservationAllocatorTest extends TestCase
{
    #[Test]
    public function it_allocates_each_order_line_over_available_locations_without_using_reserved_stock(): void
    {
        $allocations = (new OrderReservationAllocator)->allocate(
            [
                ['id' => 20, 'product_id' => 5, 'quantity' => 4],
                ['id' => 21, 'product_id' => 5, 'quantity' => 3],
            ],
            [
                ['product_id' => 5, 'location_id' => 2, 'quantity_on_hand' => 7, 'quantity_reserved' => 3],
                ['product_id' => 5, 'location_id' => 1, 'quantity_on_hand' => 4, 'quantity_reserved' => 1],
            ],
        );

        self::assertSame([
            20 => [
                ['location_id' => 1, 'quantity' => 3],
                ['location_id' => 2, 'quantity' => 1],
            ],
            21 => [
                ['location_id' => 2, 'quantity' => 3],
            ],
        ], $allocations);
    }

    #[Test]
    public function it_rejects_a_product_requirement_larger_than_aggregate_available_stock(): void
    {
        try {
            (new OrderReservationAllocator)->allocate(
                [
                    ['id' => 30, 'product_id' => 8, 'quantity' => 6],
                    ['id' => 31, 'product_id' => 8, 'quantity' => 5],
                ],
                [
                    ['product_id' => 8, 'location_id' => 1, 'quantity_on_hand' => 7, 'quantity_reserved' => 2],
                    ['product_id' => 8, 'location_id' => 2, 'quantity_on_hand' => 3, 'quantity_reserved' => 1],
                ],
            );
            self::fail('Insufficient unreserved stock must reject the reservation.');
        } catch (InsufficientOrderStock $exception) {
            self::assertSame(8, $exception->productId);
            self::assertSame(7, $exception->available);
            self::assertSame(11, $exception->requested);
        }
    }
}
