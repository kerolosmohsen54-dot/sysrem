<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\DB;
use PHPUnit\Framework\Attributes\Test;
use Tests\Concerns\AuthenticatesApi;
use Tests\TestCase;

final class ContainerInlineProductWorkflowTest extends TestCase
{
    use AuthenticatesApi;

    private array $containerIds = [];
    private array $productIds = [];
    private array $locationIds = [];
    private array $userIds = [];

    protected function tearDown(): void
    {
        DB::transaction(function (): void {
            if ($this->containerIds !== []) {
                $receiptIds = DB::table('container_receipts')->whereIn('container_id', $this->containerIds)->pluck('id')->all();
                $movementIds = DB::table('container_receipts')->whereIn('container_id', $this->containerIds)->pluck('inventory_movement_id')->all();
                DB::table('audit_logs')
                    ->where('entity_type', 'container')
                    ->whereIn('entity_id', $this->containerIds)
                    ->delete();
                if ($movementIds !== []) {
                    DB::table('audit_logs')->where('entity_type', 'inventory_movement')->whereIn('entity_id', $movementIds)->delete();
                }
                DB::table('inventory_balances')->whereIn('product_id', $this->productIds)->delete();
                $receiptLineIds = DB::table('container_receipt_lines')->whereIn('container_receipt_id', $receiptIds)->pluck('id');
                if ($receiptLineIds->isNotEmpty()) {
                    DB::table('inventory_movement_lines')->whereIn('container_receipt_line_id', $receiptLineIds)->delete();
                }
                DB::table('container_receipt_lines')->whereIn('container_receipt_id', $receiptIds)->delete();
                DB::table('container_receipts')->whereIn('id', $receiptIds)->delete();
                if ($movementIds !== []) {
                    DB::table('inventory_movement_lines')->whereIn('inventory_movement_id', $movementIds)->delete();
                    DB::table('inventory_movements')->whereIn('id', $movementIds)->delete();
                }
                DB::table('container_tracking_events')->whereIn('container_id', $this->containerIds)->delete();
                DB::table('container_lines')->whereIn('container_id', $this->containerIds)->delete();
                DB::table('container_status_history')->whereIn('container_id', $this->containerIds)->delete();
                DB::table('idempotency_records')->where('resource_type', 'container')->whereIn('resource_id', $this->containerIds)->delete();
                DB::table('containers')->whereIn('id', $this->containerIds)->delete();
            }
            if ($this->locationIds !== []) DB::table('locations')->whereIn('id', $this->locationIds)->delete();
            if ($this->productIds !== []) {
                DB::table('audit_logs')
                    ->where('entity_type', 'product')
                    ->whereIn('entity_id', $this->productIds)
                    ->delete();
                DB::table('products')->whereIn('id', $this->productIds)->delete();
            }
            foreach ($this->userIds as $userId) {
                DB::table('audit_logs')->where('actor_user_id', $userId)->delete();
                DB::table('auth_sessions')->where('user_id', $userId)->delete();
                DB::table('user_roles')->where('user_id', $userId)->delete();
                DB::table('users')->where('id', $userId)->delete();
            }
        });

        parent::tearDown();
    }

    private function requestAs(array $actor, string $method, string $url, array $payload = [], array $headers = [])
    {
        return $this->withCredentials()
            ->withUnencryptedCookie($this->apiCookieName(), $actor['token'])
            ->json($method, $url, $payload, [$this->apiCsrfHeader() => $actor['csrf'], ...$headers]);
    }

    #[Test]
    public function owner_creates_a_container_with_product_lines_and_posts_stock_once(): void
    {
        $user = $this->actingAsApiUser('owner', true);
        $this->userIds[] = $user['user_id'];

        $productResponse = $this->requestAs($user, 'POST', '/api/v1/products', [
            'sku' => 'CIP-'.bin2hex(random_bytes(6)),
            'name' => 'Container inline product',
            'unit_code' => 'piece',
            'company_price' => '15.25',
            'is_active' => true,
        ])->assertCreated();
        $productId = (int) $productResponse->json('data.id');
        $this->productIds[] = $productId;
        $this->assertSame('15.25', $productResponse->json('data.company_price'));

        $warehouseId = (int) $this->requestAs($user, 'POST', '/api/v1/warehouses', [
            'code' => 'CIP-WH-'.bin2hex(random_bytes(6)),
            'name' => 'Container receipt warehouse',
            'location_type' => 'main',
        ])->assertCreated()->json('data.id');
        $this->locationIds[] = $warehouseId;

        $payload = [
            'container_name' => 'CIP container',
            'container_number' => 'CIP-'.bin2hex(random_bytes(6)),
            'received_location_id' => $warehouseId,
            'supplier_id' => null,
            'shipping_driver_id' => null,
            'origin' => 'Factory',
            'destination' => 'Main warehouse',
            'lines' => [[
                'product_id' => $productId,
                'quantity' => 10,
                'purchase_unit_cost_egp' => '12.50',
                'company_price_egp' => '17.75',
            ]],
        ];
        $idempotencyKey = 'container-create-'.bin2hex(random_bytes(6));
        $containerResponse = $this->requestAs($user, 'POST', '/api/v1/containers', $payload, ['Idempotency-Key' => $idempotencyKey])
            ->assertCreated();
        $containerId = (int) $containerResponse->json('data.id');
        $this->containerIds[] = $containerId;
        $this->requestAs($user, 'POST', '/api/v1/containers', $payload, ['Idempotency-Key' => $idempotencyKey])
            ->assertCreated()->assertJsonPath('data.id', $containerId);

        self::assertSame(1, DB::table('container_receipts')->where('container_id', $containerId)->count());
        self::assertSame(1, DB::table('container_lines')->where('container_id', $containerId)->count());
        self::assertSame(10, (int) DB::table('inventory_balances')->where('product_id', $productId)->where('location_id', $warehouseId)->value('quantity_on_hand'));
        self::assertSame('12.5000', (string) DB::table('inventory_balances')->where('product_id', $productId)->where('location_id', $warehouseId)->value('average_unit_cost_egp'));
        self::assertSame('17.7500', (string) DB::table('products')->where('id', $productId)->value('company_price'));
        self::assertSame('12.5000', (string) DB::table('products')->where('id', $productId)->value('purchase_cost_egp'));
        $invoiceIssuer = $this->actingAsApiUser('designated_invoice_issuer');
        $this->userIds[] = $invoiceIssuer['user_id'];
        $this->requestAs($invoiceIssuer, 'GET', "/api/v1/products/{$productId}")
            ->assertOk()
            ->assertJsonPath('data.company_price', '17.75')
            ->assertJsonMissingPath('data.purchase_cost_egp');
        self::assertSame(1, DB::table('inventory_movements')->where('source_type', 'container_receipt')
            ->where('source_id', DB::table('container_receipts')->where('container_id', $containerId)->value('id'))->count());

        $this->requestAs($user, 'GET', "/api/v1/containers/{$containerId}")
            ->assertOk()
            ->assertJsonPath('data.container.container_number', $payload['container_number'])
            ->assertJsonPath('data.lines.0.product_name', 'Container inline product')
            ->assertJsonPath('data.lines.0.sku', $productResponse->json('data.sku'))
            ->assertJsonPath('data.lines.0.expected_quantity', 10)
            ->assertJsonPath('data.lines.0.company_price', '17.7500')
            ->assertJsonPath('data.receipts.0.status', 'posted');

        $this->requestAs($user, 'PATCH', "/api/v1/products/{$productId}", [
            'name' => 'Container inline product updated',
        ])->assertOk()->assertJsonPath('data.name', 'Container inline product updated');

        $this->requestAs($user, 'GET', "/api/v1/containers/{$containerId}")
            ->assertOk()
            ->assertJsonPath('data.lines.0.product_name', 'Container inline product updated');
    }
}
