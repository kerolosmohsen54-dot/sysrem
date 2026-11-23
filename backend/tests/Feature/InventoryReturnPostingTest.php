<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\DB;
use PHPUnit\Framework\Attributes\Test;
use Tests\Concerns\AuthenticatesApi;
use Tests\TestCase;

final class InventoryReturnPostingTest extends TestCase
{
    use AuthenticatesApi;

    private function callApi(array $actor, string $method, string $uri, array $body = [])
    {
        return $this->withCredentials()->withUnencryptedCookie($this->apiCookieName(), $actor['token'])
            ->json($method, $uri, $body, [$this->apiCsrfHeader() => $actor['csrf']]);
    }

    #[Test]
    public function approving_return_posts_one_movement_and_only_one_balance_change(): void
    {
        $warehouse = DB::table('locations')->insertGetId(['code' => 'WRT'.bin2hex(random_bytes(4)), 'name' => 'Return warehouse', 'location_type' => 'main', 'is_active' => true, 'created_at' => now(), 'updated_at' => now()]);
        $product = DB::table('products')->insertGetId(['sku' => 'WRT'.bin2hex(random_bytes(4)), 'name' => 'Return product', 'unit_code' => 'piece', 'is_active' => true, 'created_at' => now(), 'updated_at' => now()]);
        $owner = $this->actingAsApiUser('owner', true);
        $created = $this->callApi($owner, 'POST', '/api/v1/warehouse-returns', [
            'warehouse_id' => $warehouse, 'return_date' => '2026-10-30', 'reason' => 'Customer return to warehouse',
            'idempotency_key' => 'return-'.bin2hex(random_bytes(8)),
            'lines' => [['product_id' => $product, 'quantity' => 2, 'unit_cost_egp' => '3.1250']],
        ])->assertCreated();
        $returnId = $created->json('data.return.id');
        $this->assertNull(DB::table('inventory_balances')->where('product_id', $product)->where('location_id', $warehouse)->value('quantity_on_hand'));
        $this->callApi($owner, 'POST', "/api/v1/warehouse-returns/$returnId/approve")->assertOk()->assertJsonPath('data.return.status', 'approved');
        $this->callApi($owner, 'POST', "/api/v1/warehouse-returns/$returnId/approve")->assertOk();
        $this->assertSame(2, (int) DB::table('inventory_balances')->where('product_id', $product)->where('location_id', $warehouse)->value('quantity_on_hand'));
        $movement = DB::table('inventory_movements')->where('source_type', 'warehouse_return')->where('source_id', $returnId)->where('movement_type', 'return');
        $this->assertSame(1, $movement->count());
        $lineId = DB::table('inventory_movement_lines')->where('inventory_movement_id', $movement->value('id'))->value('id');
        $this->callApi($owner, 'GET', "/api/v1/inventory/movements/$lineId")->assertOk()->assertJsonPath('data.source_id', $returnId);
        $readonly = $this->actingAsApiUser('read_only', true);
        $this->callApi($readonly, 'POST', "/api/v1/warehouse-returns/$returnId/approve")->assertForbidden();
    }

    #[Test]
    public function opening_stock_is_first_movement_only_and_summary_matches_balance(): void
    {
        $warehouse = DB::table('locations')->insertGetId(['code' => 'OPN'.bin2hex(random_bytes(4)), 'name' => 'Opening warehouse', 'location_type' => 'main', 'is_active' => true, 'created_at' => now(), 'updated_at' => now()]);
        $product = DB::table('products')->insertGetId(['sku' => 'OPN'.bin2hex(random_bytes(4)), 'name' => 'Opening product', 'unit_code' => 'piece', 'is_active' => true, 'created_at' => now(), 'updated_at' => now()]);
        $owner = $this->actingAsApiUser('owner', true);
        $payload = ['product_id' => $product, 'warehouse_id' => $warehouse, 'quantity' => 5, 'unit_cost_egp' => '2.00', 'movement_date' => '2026-10-30', 'reason' => 'First opening'];
        $this->callApi($owner, 'POST', '/api/v1/inventory/opening-stock', $payload)->assertCreated();
        $this->callApi($owner, 'POST', '/api/v1/inventory/opening-stock', $payload)->assertStatus(422)->assertJsonStructure(['error' => ['details' => ['product_id']]]);
        $this->assertSame(5, (int) DB::table('inventory_balances')->where('product_id', $product)->where('location_id', $warehouse)->value('quantity_on_hand'));
        $this->callApi($owner, 'GET', "/api/v1/inventory/summary?warehouse_id=$warehouse&product_id=$product")
            ->assertOk()->assertJsonPath('data.quantity_on_hand', '5');
    }

    #[Test]
    public function warehouse_reference_fields_and_occupancy_are_persisted_and_derived_from_stock(): void
    {
        $owner = $this->actingAsApiUser('owner', true);
        $code = 'WREF-'.bin2hex(random_bytes(4));
        $created = $this->callApi($owner, 'POST', '/api/v1/warehouses', [
            'code' => $code, 'name' => 'Reference warehouse', 'location_type' => 'main',
            'address' => 'Test district', 'manager_name' => 'Fixture manager', 'capacity_units' => 20,
        ])->assertCreated();
        $warehouse = (int) $created->json('data.id');
        $product = DB::table('products')->insertGetId(['sku' => 'WREF-'.bin2hex(random_bytes(4)), 'name' => 'Reference product', 'unit_code' => 'piece', 'is_active' => true, 'created_at' => now(), 'updated_at' => now()]);
        $this->callApi($owner, 'POST', '/api/v1/inventory/opening-stock', [
            'product_id' => $product, 'warehouse_id' => $warehouse, 'quantity' => 5, 'unit_cost_egp' => '2.00',
            'movement_date' => '2026-10-30', 'reason' => 'Reference stock',
        ])->assertCreated();
        $this->callApi($owner, 'GET', '/api/v1/warehouses?search='.$code)
            ->assertOk()->assertJsonPath('data.0.address', 'Test district')
            ->assertJsonPath('data.0.manager_name', 'Fixture manager')
            ->assertJsonPath('data.0.item_count', 1)
            ->assertJsonPath('data.0.occupancy_percentage', '25.0');
    }
}
