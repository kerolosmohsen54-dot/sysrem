<?php

namespace App\Support;

class OrderReservationAllocator
{
    /**
     * @param  list<array{id: int, product_id: int, quantity: int}>  $lines
     * @param  list<array{product_id: int, location_id: int, quantity_on_hand: int, quantity_reserved: int}>  $balances
     * @return array<int, list<array{location_id: int, quantity: int}>>
     */
    public function allocate(array $lines, array $balances): array
    {
        usort($balances, static fn (array $left, array $right): int => [
            $left['product_id'], $left['location_id'],
        ] <=> [
            $right['product_id'], $right['location_id'],
        ]);

        $remainingByBalance = [];
        $balanceIdsByProduct = [];
        foreach ($balances as $index => $balance) {
            $remaining = max(0, $balance['quantity_on_hand'] - $balance['quantity_reserved']);
            $remainingByBalance[$index] = $remaining;
            $balanceIdsByProduct[$balance['product_id']][] = $index;
        }

        $requiredByProduct = [];
        foreach ($lines as $line) {
            $requiredByProduct[$line['product_id']] = ($requiredByProduct[$line['product_id']] ?? 0) + $line['quantity'];
        }
        foreach ($requiredByProduct as $productId => $required) {
            $available = array_sum(array_map(
                static fn (int $index): int => $remainingByBalance[$index],
                $balanceIdsByProduct[$productId] ?? [],
            ));
            if ($available < $required) {
                throw new InsufficientOrderStock((int) $productId, $available, $required);
            }
        }

        $allocations = [];
        foreach ($lines as $line) {
            $toAllocate = $line['quantity'];
            $allocations[$line['id']] = [];
            foreach ($balanceIdsByProduct[$line['product_id']] ?? [] as $index) {
                if ($toAllocate === 0) {
                    break;
                }
                $quantity = min($toAllocate, $remainingByBalance[$index]);
                if ($quantity === 0) {
                    continue;
                }
                $allocations[$line['id']][] = [
                    'location_id' => $balances[$index]['location_id'],
                    'quantity' => $quantity,
                ];
                $remainingByBalance[$index] -= $quantity;
                $toAllocate -= $quantity;
            }
        }

        return $allocations;
    }
}
