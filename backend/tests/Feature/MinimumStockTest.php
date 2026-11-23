<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\DB;
use PHPUnit\Framework\Attributes\Test;
use Tests\Concerns\AuthenticatesApi;
use Tests\TestCase;

final class MinimumStockTest extends TestCase
{
    use AuthenticatesApi;

    private array $products = [];
    private array $locations = [];
    private array $users = [];

    private function actor(string $role, bool $stepUp): array
    {
        $actor = $this->actingAsApiUser($role, $stepUp);
        $this->users[] = (int) $actor['user_id'];
        return $actor;
    }

    protected function tearDown(): void
    {
        DB::transaction(function (): void {
            if ($this->products !== []) {
                DB::table('product_location_minimum_stock')->whereIn('product_id', $this->products)->delete();
                DB::table('inventory_balances')->whereIn('product_id', $this->products)->delete();
                DB::table('products')->whereIn('id', $this->products)->delete();
            }
            if ($this->locations !== []) DB::table('locations')->whereIn('id', $this->locations)->delete();
            foreach ($this->users as $id) {
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
            'code' => 'MS-'.bin2hex(random_bytes(5)), 'name' => 'Minimum stock location', 'location_type' => 'main', 'is_active' => true,
            'created_at' => now(), 'updated_at' => now(),
        ]);
        $product = (int) DB::table('products')->insertGetId([
            'sku' => 'MS-'.bin2hex(random_bytes(8)), 'name' => 'Minimum stock product', 'unit_code' => 'piece', 'is_active' => true,
            'created_at' => now(), 'updated_at' => now(),
        ]);
        $this->locations[] = $location; $this->products[] = $product;
        DB::table('inventory_balances')->insert([
            'product_id' => $product, 'location_id' => $location, 'quantity_on_hand' => 3, 'quantity_reserved' => 0,
            'average_unit_cost_egp' => '2.00', 'inventory_value_egp' => '6.00', 'updated_at' => now(),
        ]);
        return [$product, $location];
    }

    private function requestAs(array $actor, string $method, string $url, array $body = [], bool $csrf = true)
    {
        return $this->withCredentials()->withUnencryptedCookie($this->apiCookieName(), $actor['token'])
            ->json($method, $url, $body, $csrf ? [$this->apiCsrfHeader() => $actor['csrf']] : []);
    }

    #[Test]
    public function owner_sets_per_location_threshold_and_below_stock_is_computed_from_balance(): void
    {
        [$product, $location] = $this->fixtures();
        $owner = $this->actor('owner', true);
        $this->requestAs($owner, 'PUT', '/api/v1/inventory/minimum-stock', [
            'product_id' => $product, 'warehouse_id' => $location, 'minimum_quantity' => 5,
        ])->assertOk()->assertJsonPath('data.minimum_quantity', 5);
        $this->assertSame(5, (int) DB::table('product_location_minimum_stock')->where('product_id', $product)->where('location_id', $location)->value('minimum_quantity'));
        $this->assertNull(DB::table('products')->where('id', $product)->value('minimum_stock'));
        $this->requestAs($owner, 'GET', '/api/v1/inventory/minimum-stock?scope=warehouse&below_only=1')
            ->assertOk()->assertJsonPath('data.0.product_id', $product)
            ->assertJsonPath('data.0.warehouse_id', $location)
            ->assertJsonPath('data.0.quantity_on_hand', 3)->assertJsonPath('data.0.is_below_minimum', true);
        $this->assertSame(1, DB::table('audit_logs')->where('actor_user_id', $owner['user_id'])->where('action', 'inventory.minimum_stock.updated')->count());
    }

    #[Test]
    public function minimum_stock_requires_permissions_and_csrf_without_finance_step_up(): void
    {
        [$product, $location] = $this->fixtures();
        $body = ['product_id' => $product, 'warehouse_id' => $location, 'minimum_quantity' => 4];
        $owner = $this->actor('owner', true);
        $this->requestAs($owner, 'PUT', '/api/v1/inventory/minimum-stock', $body, false)->assertStatus(419);
        $noStepUp = $this->actor('owner', false);
        $this->requestAs($noStepUp, 'PUT', '/api/v1/inventory/minimum-stock', $body)->assertOk();
        $reader = $this->actor('read_only', true);
        $this->requestAs($reader, 'GET', '/api/v1/inventory/minimum-stock')->assertStatus(403);
        $this->requestAs($reader, 'PUT', '/api/v1/inventory/minimum-stock', $body)->assertStatus(403);
    }

    #[Test]
    public function minimum_stock_validation_uses_error_details_fields(): void
    {
        $owner = $this->actor('owner', true);
        $this->requestAs($owner, 'PUT', '/api/v1/inventory/minimum-stock', ['warehouse_id' => 1, 'minimum_quantity' => 2])
            ->assertStatus(422)->assertJsonStructure(['error' => ['details' => ['product_id']]]);
        $this->requestAs($owner, 'PUT', '/api/v1/inventory/minimum-stock', ['product_id' => 1, 'warehouse_id' => 1, 'minimum_quantity' => -1])
            ->assertStatus(422)->assertJsonStructure(['error' => ['details' => ['minimum_quantity']]]);
    }
}
