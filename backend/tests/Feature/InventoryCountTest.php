<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\DB;
use PHPUnit\Framework\Attributes\Test;
use Tests\Concerns\AuthenticatesApi;
use Tests\TestCase;

final class InventoryCountTest extends TestCase
{
    use AuthenticatesApi;

    private array $countIds = [];
    private array $productIds = [];
    private array $locationIds = [];
    private array $userIds = [];

    private function actor(string $role, bool $stepUp = true): array
    {
        $actor = $this->actingAsApiUser($role, $stepUp);
        $this->userIds[] = (int) $actor['user_id'];
        return $actor;
    }

    protected function tearDown(): void
    {
        DB::transaction(function (): void {
            $lines = $this->countIds === [] ? collect() : DB::table('inventory_count_lines')->whereIn('inventory_count_id', $this->countIds)->get();
            $movementIds = $lines->pluck('inventory_movement_id')->filter()->unique()->values()->all();
            if ($this->countIds !== []) DB::table('inventory_count_lines')->whereIn('inventory_count_id', $this->countIds)->delete();
            if ($movementIds !== []) {
                DB::table('audit_logs')->where('entity_type', 'inventory_movement')->whereIn('entity_id', $movementIds)->delete();
                DB::table('inventory_movement_lines')->whereIn('inventory_movement_id', $movementIds)->delete();
                DB::table('inventory_movements')->whereIn('id', $movementIds)->delete();
            }
            if ($this->countIds !== []) {
                DB::table('audit_logs')->where('entity_type', 'inventory_count')->whereIn('entity_id', $this->countIds)->delete();
                DB::table('inventory_counts')->whereIn('id', $this->countIds)->delete();
            }
            if ($this->productIds !== []) {
                DB::table('inventory_balances')->whereIn('product_id', $this->productIds)->delete();
                DB::table('products')->whereIn('id', $this->productIds)->delete();
            }
            if ($this->locationIds !== []) DB::table('locations')->whereIn('id', $this->locationIds)->delete();
            foreach ($this->userIds as $id) {
                DB::table('audit_logs')->where('actor_user_id', $id)->delete();
                DB::table('auth_sessions')->where('user_id', $id)->delete();
                DB::table('user_roles')->where('user_id', $id)->delete();
                DB::table('users')->where('id', $id)->delete();
            }
        });
        parent::tearDown();
    }

    private function fixtures(): array
    {
        $location = (int) DB::table('locations')->insertGetId([
            'code' => 'IC-'.bin2hex(random_bytes(5)), 'name' => 'Count warehouse', 'location_type' => 'main', 'is_active' => true,
            'created_at' => now(), 'updated_at' => now(),
        ]);
        $products = [];
        foreach ([['10', '2.50', '25.00'], ['5', '3.00', '15.00']] as $index => [$qty, $cost, $value]) {
            $product = (int) DB::table('products')->insertGetId([
                'sku' => 'IC-'.bin2hex(random_bytes(8)), 'name' => 'Count product '.$index, 'unit_code' => 'piece',
                'is_active' => true, 'last_purchase_price_reference' => $cost, 'created_at' => now(), 'updated_at' => now(),
            ]);
            DB::table('inventory_balances')->insert([
                'product_id' => $product, 'location_id' => $location, 'quantity_on_hand' => (int) $qty, 'quantity_reserved' => 0,
                'average_unit_cost_egp' => $cost, 'inventory_value_egp' => $value, 'updated_at' => now(),
            ]);
            $products[] = $product;
        }
        $this->locationIds[] = $location; array_push($this->productIds, ...$products);
        return [$location, $products];
    }

    private function payload(int $warehouseId, array $products): array
    {
        return ['warehouse_id' => $warehouseId, 'count_date' => '2026-10-13', 'reason' => 'Periodic inventory count',
            'idempotency_key' => 'ic-'.bin2hex(random_bytes(8)), 'lines' => [
                ['product_id' => $products[0], 'counted_quantity' => 8], ['product_id' => $products[1], 'counted_quantity' => 7],
            ]];
    }

    private function requestAs(array $actor, string $method, string $url, array $body = [], bool $csrf = true)
    {
        return $this->withCredentials()->withUnencryptedCookie($this->apiCookieName(), $actor['token'])
            ->json($method, $url, $body, $csrf ? [$this->apiCsrfHeader() => $actor['csrf']] : []);
    }

    #[Test]
    public function owner_creates_idempotent_count_and_approval_posts_distinct_count_movements(): void
    {
        [$warehouse, $products] = $this->fixtures(); $owner = $this->actor('owner'); $body = $this->payload($warehouse, $products);
        $first = $this->requestAs($owner, 'POST', '/api/v1/inventory/counts', $body)->assertCreated();
        $id = (int) $first->json('data.count.id'); $this->countIds[] = $id;
        $this->requestAs($owner, 'POST', '/api/v1/inventory/counts', $body)->assertOk()->assertJsonPath('data.count.id', $id);
        $this->assertSame(1, DB::table('inventory_counts')->where('idempotency_key', $body['idempotency_key'])->count());
        $this->requestAs($owner, 'GET', '/api/v1/inventory/counts/'.$id)->assertOk()->assertJsonPath('data.lines.0.difference_quantity', -2);
        $this->requestAs($owner, 'POST', '/api/v1/inventory/counts/'.$id.'/approve')->assertOk()->assertJsonPath('data.count.status', 'approved');
        $this->requestAs($owner, 'POST', '/api/v1/inventory/counts/'.$id.'/approve')->assertStatus(409);
        $lineIds = DB::table('inventory_count_lines')->where('inventory_count_id', $id)->pluck('id');
        $this->assertSame(2, DB::table('inventory_movements')->where('movement_type', 'count')->where('source_type', 'inventory_count_line')->whereIn('source_id', $lineIds)->count());
        $this->assertSame(0, DB::table('inventory_movements')->where('source_type', 'inventory_count_line')->where('movement_type', 'adjustment')->whereIn('source_id', $lineIds)->count());
        $this->assertSame(8, (int) DB::table('inventory_balances')->where('product_id', $products[0])->where('location_id', $warehouse)->value('quantity_on_hand'));
        $this->assertSame(7, (int) DB::table('inventory_balances')->where('product_id', $products[1])->where('location_id', $warehouse)->value('quantity_on_hand'));
        $this->assertSame('3.0000', (string) DB::table('inventory_movement_lines as line')->join('inventory_movements as movement', 'movement.id', '=', 'line.inventory_movement_id')->where('movement.source_type', 'inventory_count_line')->where('line.product_id', $products[1])->value('line.unit_cost_egp_snapshot'));
    }

    #[Test]
    public function read_only_cannot_access_or_write_count_endpoints(): void
    {
        [$warehouse, $products] = $this->fixtures(); $owner = $this->actor('owner'); $created = $this->requestAs($owner, 'POST', '/api/v1/inventory/counts', $this->payload($warehouse, $products))->assertCreated();
        $id = (int) $created->json('data.count.id'); $this->countIds[] = $id; $reader = $this->actor('read_only');
        $this->requestAs($reader, 'GET', '/api/v1/inventory/counts')->assertStatus(403);
        $this->requestAs($reader, 'GET', '/api/v1/inventory/counts/'.$id)->assertStatus(403);
        $this->requestAs($reader, 'POST', '/api/v1/inventory/counts', $this->payload($warehouse, $products))->assertStatus(403);
        $this->requestAs($reader, 'POST', '/api/v1/inventory/counts/'.$id.'/approve')->assertStatus(403);
    }

    #[Test]
    public function count_create_and_approval_require_csrf_but_not_finance_step_up_and_unknown_id_is_404(): void
    {
        [$warehouse, $products] = $this->fixtures(); $owner = $this->actor('owner'); $body = $this->payload($warehouse, $products);
        $this->requestAs($owner, 'POST', '/api/v1/inventory/counts', $body, false)->assertStatus(419);
        $draft = $this->requestAs($this->actor('owner', false), 'POST', '/api/v1/inventory/counts', $body)->assertCreated();
        $id = (int) $draft->json('data.count.id'); $this->countIds[] = $id;
        $this->requestAs($owner, 'POST', '/api/v1/inventory/counts/'.$id.'/approve', [], false)->assertStatus(419);
        $this->requestAs($this->actor('owner', false), 'POST', '/api/v1/inventory/counts/'.$id.'/approve')->assertOk();
        $this->requestAs($owner, 'GET', '/api/v1/inventory/counts/999999')->assertStatus(404);
    }

    #[Test]
    public function positive_count_from_zero_without_weighted_average_cost_is_not_approved(): void
    {
        $warehouse = (int) DB::table('locations')->insertGetId([
            'code' => 'IC-ZERO-'.bin2hex(random_bytes(4)), 'name' => 'Zero stock warehouse', 'location_type' => 'main', 'is_active' => true,
            'created_at' => now(), 'updated_at' => now(),
        ]);
        $product = (int) DB::table('products')->insertGetId([
            'sku' => 'IC-ZERO-'.bin2hex(random_bytes(6)), 'name' => 'Unvalued count product', 'unit_code' => 'piece', 'is_active' => true,
            'created_at' => now(), 'updated_at' => now(),
        ]);
        DB::table('inventory_balances')->insert([
            'product_id' => $product, 'location_id' => $warehouse, 'quantity_on_hand' => 0, 'quantity_reserved' => 0,
            'average_unit_cost_egp' => null, 'inventory_value_egp' => '0.00', 'updated_at' => now(),
        ]);
        $this->productIds[] = $product; $this->locationIds[] = $warehouse;
        $owner = $this->actor('owner');
        $body = ['warehouse_id' => $warehouse, 'count_date' => '2026-10-13', 'reason' => 'Count with no cost basis',
            'idempotency_key' => 'ic-zero-'.bin2hex(random_bytes(8)), 'lines' => [['product_id' => $product, 'counted_quantity' => 2]]];
        $created = $this->requestAs($owner, 'POST', '/api/v1/inventory/counts', $body)->assertCreated();
        $id = (int) $created->json('data.count.id'); $this->countIds[] = $id;
        $this->requestAs($owner, 'POST', '/api/v1/inventory/counts/'.$id.'/approve')->assertStatus(422)
            ->assertJsonStructure(['error' => ['details' => ['unit_cost_egp']]]);
        $this->assertSame('draft', DB::table('inventory_counts')->where('id', $id)->value('status'));
        $lineIds = DB::table('inventory_count_lines')->where('inventory_count_id', $id)->pluck('id');
        $this->assertSame(0, DB::table('inventory_movements')->where('source_type', 'inventory_count_line')->whereIn('source_id', $lineIds)->count());
    }

    #[Test]
    public function count_validation_reports_missing_warehouse_and_invalid_counted_quantity(): void
    {
        [$warehouse, $products] = $this->fixtures(); $owner = $this->actor('owner'); $body = $this->payload($warehouse, $products);
        unset($body['warehouse_id']);
        $this->requestAs($owner, 'POST', '/api/v1/inventory/counts', $body)->assertStatus(422)->assertJsonStructure(['error' => ['details' => ['warehouse_id']]]);
        $body = $this->payload($warehouse, $products); $body['lines'][0]['counted_quantity'] = -1;
        $this->requestAs($owner, 'POST', '/api/v1/inventory/counts', $body)->assertStatus(422)->assertJsonStructure(['error' => ['details' => ['lines.0.counted_quantity']]]);
    }
}
