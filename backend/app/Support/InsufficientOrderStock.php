<?php

namespace App\Support;

use RuntimeException;

class InsufficientOrderStock extends RuntimeException
{
    public function __construct(
        public readonly int $productId,
        public readonly int $available,
        public readonly int $requested,
    ) {
        parent::__construct("Insufficient available stock for product {$productId}: {$available} available, {$requested} requested.");
    }
}
