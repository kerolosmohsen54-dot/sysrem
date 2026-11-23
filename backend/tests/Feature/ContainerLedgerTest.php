<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\DB;
use PHPUnit\Framework\Attributes\Test;
use Tests\Concerns\AuthenticatesApi;
use Tests\TestCase;

final class ContainerLedgerTest extends TestCase
{
    use AuthenticatesApi;

    private array $fixtureProducts = [];
    private array $fixtureLocations = [];
    private array $fixtureContainers = [];
    private array $fixtureUsers = [];
    private array $fixtureMovementIds = [];
    private array $fixtureTransferKeys = [];
    private array $fixtureFundKeys = [];

    protected function setUp(): void
    {
        parent::setUp();
        $transferKeys = DB::table('container_location_transfers')->where(function ($query): void {
            $query->where('idempotency_key', 'like', 'container-transfer-%')->orWhere('idempotency_key', 'like', 'ct-%');
        })->pluck('idempotency_key')->all();
        $fundKeys = DB::table('container_fund_movements')->where('idempotency_key', 'like', 'cf-%')->pluck('idempotency_key')->all();
        $transferRows = $transferKeys === [] ? collect() : DB::table('container_location_transfers')->whereIn('idempotency_key', $transferKeys)->get();
        $productIds = $transferRows->pluck('product_id')->all();
        $locationIds = $transferRows->pluck('source_location_id')->merge($transferRows->pluck('destination_location_id'))->unique()->all();
        $movementIds = $transferRows->pluck('inventory_movement_id')->all();
        $oldContainerIds = DB::table('containers')->where('container_number', 'like', 'CL-%')->pluck('id')->all();
        DB::transaction(function () use ($transferKeys, $fundKeys, $productIds, $locationIds, $movementIds, $oldContainerIds): void {
            if ($transferKeys !== []) DB::table('container_location_transfers')->whereIn('idempotency_key', $transferKeys)->delete();
            if ($oldContainerIds !== []) DB::table('container_location_transfers')->whereIn('container_id', $oldContainerIds)->delete();
            if ($fundKeys !== []) DB::table('container_fund_movements')->whereIn('idempotency_key', $fundKeys)->delete();
            if ($oldContainerIds !== []) {
                DB::table('container_fund_movements')->whereIn('container_id', $oldContainerIds)->delete();
                DB::table('container_tracking_events')->whereIn('container_id', $oldContainerIds)->delete();
            }
            if ($locationIds !== []) {
                DB::table('container_tracking_events')->where(function ($query) use ($locationIds): void {
                    $query->whereIn('from_location_id', $locationIds)->orWhereIn('to_location_id', $locationIds);
                })->delete();
            }
            if ($movementIds !== []) {
                DB::table('audit_logs')->where('entity_type', 'inventory_movement')->whereIn('entity_id', $movementIds)->delete();
                DB::table('inventory_movement_lines')->whereIn('inventory_movement_id', $movementIds)->delete();
                DB::table('inventory_movements')->whereIn('id', $movementIds)->delete();
            }
            if ($productIds !== []) {
                DB::table('inventory_balances')->whereIn('product_id', $productIds)->delete();
                DB::table('products')->whereIn('id', $productIds)->delete();
            }
            if ($locationIds !== []) DB::table('locations')->whereIn('id', $locationIds)->delete();
            DB::table('containers')->where('container_number', 'like', 'CL-%')->delete();
        });
    }

    private function trackActor(array $actor): array
    {
        $this->fixtureUsers[] = (int) $actor['user_id'];
        return $actor;
    }

    protected function tearDown(): void
    {
        DB::transaction(function (): void {
            if ($this->fixtureTransferKeys !== []) DB::table('container_location_transfers')->whereIn('idempotency_key', $this->fixtureTransferKeys)->delete();
            if ($this->fixtureFundKeys !== []) DB::table('container_fund_movements')->whereIn('idempotency_key', $this->fixtureFundKeys)->delete();
            if ($this->fixtureMovementIds !== []) {
                DB::table('audit_logs')->where('entity_type', 'inventory_movement')->whereIn('entity_id', $this->fixtureMovementIds)->delete();
                DB::table('inventory_movement_lines')->whereIn('inventory_movement_id', $this->fixtureMovementIds)->delete();
                DB::table('inventory_movements')->whereIn('id', $this->fixtureMovementIds)->delete();
            }
            if ($this->fixtureProducts !== []) {
                DB::table('inventory_balances')->whereIn('product_id', $this->fixtureProducts)->delete();
                DB::table('products')->whereIn('id', $this->fixtureProducts)->delete();
            }
            if ($this->fixtureLocations !== []) {
                DB::table('container_tracking_events')->where(function ($query): void {
                    $query->whereIn('from_location_id', $this->fixtureLocations)
                        ->orWhereIn('to_location_id', $this->fixtureLocations);
                })->delete();
            }
            if ($this->fixtureLocations !== []) DB::table('locations')->whereIn('id', $this->fixtureLocations)->delete();
            if ($this->fixtureContainers !== []) {
                DB::table('container_fund_movements')->whereIn('container_id', $this->fixtureContainers)->delete();
                DB::table('container_tracking_events')->whereIn('container_id', $this->fixtureContainers)->delete();
                DB::table('containers')->whereIn('id', $this->fixtureContainers)->delete();
            }
            foreach ($this->fixtureUsers as $userId) {
                DB::table('audit_logs')->where('actor_user_id', $userId)->delete();
                DB::table('auth_sessions')->where('user_id', $userId)->delete();
                DB::table('user_roles')->where('user_id', $userId)->delete();
                DB::table('users')->where('id', $userId)->delete();
            }
        });
        parent::tearDown();
    }

    private function requestAs(array $actor, string $method, string $url, array $payload = [], bool $csrf = true, array $headers = [])
    {
        return $this->withCredentials()->withUnencryptedCookie($this->apiCookieName(), $actor['token'])
            ->json($method, $url, $payload, [...($csrf ? [$this->apiCsrfHeader() => $actor['csrf']] : []), ...$headers]);
    }

    private function inventoryFixtures(): array
    {
        $locations = [];
        foreach (['source', 'destination'] as $suffix) {
            $locations[] = (int) DB::table('locations')->insertGetId([
                'code' => 'CL-'.strtoupper($suffix).'-'.bin2hex(random_bytes(4)), 'name' => ucfirst($suffix),
                'location_type' => 'main', 'is_active' => true, 'created_at' => now(), 'updated_at' => now(),
            ]);
        }
        $product = (int) DB::table('products')->insertGetId([
            'sku' => 'CL-'.bin2hex(random_bytes(8)), 'name' => 'Container Ledger Product', 'unit_code' => 'piece',
            'is_active' => true, 'created_at' => now(), 'updated_at' => now(),
        ]);
        DB::table('inventory_balances')->insert([
            'product_id' => $product, 'location_id' => $locations[0], 'quantity_on_hand' => 10,
            'quantity_reserved' => 0, 'average_unit_cost_egp' => '2.50', 'inventory_value_egp' => '25.00', 'updated_at' => now(),
        ]);
        $this->fixtureProducts[] = $product;
        array_push($this->fixtureLocations, ...$locations);
        return [$product, $locations[0], $locations[1]];
    }

    private function containerFixture(): int
    {
        $id = (int) DB::table('containers')->insertGetId([
            'container_number' => 'CL-'.strtoupper(bin2hex(random_bytes(5))), 'status' => 'draft',
            'created_at' => now(), 'updated_at' => now(),
        ]);
        $this->fixtureContainers[] = $id;
        return $id;
    }

    #[Test]
    public function owner_can_transfer_stock_and_replay_idempotently(): void
    {
        [$productId, $sourceId, $destinationId] = $this->inventoryFixtures();
        $containerId = $this->containerFixture();
        $owner = $this->trackActor($this->actingAsApiUser('owner', true));
        $key = 'container-transfer-'.bin2hex(random_bytes(8));
        $this->fixtureTransferKeys[] = $key;
        $payload = [
            'product_id' => $productId, 'container_id' => $containerId,
            'source_location_id' => $sourceId, 'destination_location_id' => $destinationId,
            'quantity' => 3, 'transfer_date' => '2026-11-11', 'reason' => 'Move container stock',
            'idempotency_key' => $key,
        ];
        $created = $this->requestAs($owner, 'POST', '/api/v1/container-transfers', $payload, true, ['Idempotency-Key' => $key])->assertCreated();
        $transferId = (int) $created->json('data.id');
        $this->fixtureMovementIds[] = (int) $created->json('data.inventory_movement_id');
        $this->requestAs($owner, 'POST', '/api/v1/container-transfers', $payload, true, ['Idempotency-Key' => $key])
            ->assertOk()->assertJsonPath('data.id', $transferId);
        $this->requestAs($owner, 'POST', '/api/v1/container-transfers', [...$payload, 'quantity' => 4], true, ['Idempotency-Key' => $key])->assertStatus(409);
        $this->requestAs($owner, 'GET', '/api/v1/container-transfers')->assertOk()->assertJsonPath('data.0.id', $transferId);
        self::assertSame(7, (int) DB::table('inventory_balances')->where('product_id', $productId)->where('location_id', $sourceId)->value('quantity_on_hand'));
        self::assertSame(3, (int) DB::table('inventory_balances')->where('product_id', $productId)->where('location_id', $destinationId)->value('quantity_on_hand'));
        self::assertSame(1, DB::table('container_tracking_events')->where('container_id', $containerId)->where('event_type', 'transfer')->where('source_id', $transferId)->count());
    }

    #[Test]
    public function transfer_requires_csrf_and_permissions_without_finance_step_up(): void
    {
        $owner = $this->trackActor($this->actingAsApiUser('owner', true));
        $reader = $this->trackActor($this->actingAsApiUser('read_only', true));
        [$productId, $sourceId, $destinationId] = $this->inventoryFixtures();
        $payload = ['product_id' => $productId, 'source_location_id' => $sourceId, 'destination_location_id' => $destinationId,
            'quantity' => 1, 'transfer_date' => '2026-11-11', 'reason' => 'Transfer', 'idempotency_key' => 'ct-'.bin2hex(random_bytes(8))];
        $this->requestAs($owner, 'POST', '/api/v1/container-transfers', $payload, false, ['Idempotency-Key' => $payload['idempotency_key']])->assertStatus(419);
        $this->requestAs($reader, 'GET', '/api/v1/container-transfers')->assertForbidden();
        $this->requestAs($reader, 'POST', '/api/v1/container-transfers', $payload, true, ['Idempotency-Key' => $payload['idempotency_key']])->assertForbidden();
    }

    #[Test]
    public function container_fund_ledger_keeps_exact_balance_without_treasury_posting(): void
    {
        $owner = $this->trackActor($this->actingAsApiUser('owner', true));
        $containerId = $this->containerFixture();
        $addKey = 'cf-'.bin2hex(random_bytes(8));
        $this->fixtureFundKeys[] = $addKey;
        $add = ['container_id' => $containerId, 'movement_type' => 'add', 'amount_egp' => '100.25', 'department' => 'Shipping',
            'reason' => 'Initial fund', 'reference' => null, 'notes' => null, 'movement_date' => '2026-11-11', 'idempotency_key' => $addKey];
        $this->requestAs($owner, 'POST', '/api/v1/container-funds', $add, true, ['Idempotency-Key' => $addKey])->assertCreated();
        $this->requestAs($owner, 'POST', '/api/v1/container-funds', $add, true, ['Idempotency-Key' => $addKey])->assertOk();
        $withdrawKey = 'cf-'.bin2hex(random_bytes(8));
        $this->fixtureFundKeys[] = $withdrawKey;
        $withdraw = [...$add, 'movement_type' => 'withdraw', 'amount_egp' => '25.10', 'reason' => 'Pay local freight', 'idempotency_key' => $withdrawKey];
        $this->requestAs($owner, 'POST', '/api/v1/container-funds', $withdraw, true, ['Idempotency-Key' => $withdrawKey])->assertCreated();
        $this->requestAs($owner, 'GET', '/api/v1/container-funds?container_id='.$containerId)->assertOk()
            ->assertJsonPath('meta.balance_egp', '75.15')->assertJsonPath('data.0.movement_type', 'withdraw');
        $overdrawKey = 'cf-'.bin2hex(random_bytes(8));
        $this->fixtureFundKeys[] = $overdrawKey;
        $this->requestAs($owner, 'POST', '/api/v1/container-funds', [...$withdraw, 'amount_egp' => '90.00', 'idempotency_key' => $overdrawKey], true, ['Idempotency-Key' => $overdrawKey])->assertUnprocessable();
    }

    #[Test]
    public function container_funds_reject_invalid_amount_and_read_only_cannot_access_or_write(): void
    {
        $owner = $this->trackActor($this->actingAsApiUser('owner', true));
        $reader = $this->trackActor($this->actingAsApiUser('read_only', true));
        $containerId = $this->containerFixture();
        $key = 'cf-'.bin2hex(random_bytes(8));
        $this->requestAs($owner, 'POST', '/api/v1/container-funds', [
            'container_id' => $containerId, 'movement_type' => 'add', 'amount_egp' => 'invalid',
            'department' => 'Shipping', 'reason' => 'Invalid test', 'movement_date' => '2026-11-11', 'idempotency_key' => $key,
        ], true, ['Idempotency-Key' => $key])->assertUnprocessable();
        $this->requestAs($reader, 'GET', '/api/v1/container-funds?container_id='.$containerId)->assertForbidden();
    }

    #[Test]
    public function post_receipt_cost_revalues_only_remaining_stock_and_keeps_sold_cost_snapshot(): void
    {
        $connection = DB::connection();
        $connection->beginTransaction();
        try {
            [$product, , $warehouse] = $this->inventoryFixtures();
            $owner = $this->trackActor($this->actingAsApiUser('owner', true));
            $containerResponse = $this->requestAs($owner, 'POST', '/api/v1/containers', [
                'container_name' => 'Cost test container',
                'container_number' => 'CL-COST-'.strtoupper(bin2hex(random_bytes(5))),
                'received_location_id' => $warehouse,
                'supplier_id' => null,
                'origin' => 'Test origin',
                'destination' => 'Test warehouse',
                'lines' => [[
                    'product_id' => $product,
                    'quantity' => 10,
                    'purchase_unit_cost_egp' => '10.00',
                ]],
            ], true, ['Idempotency-Key' => 'container-cost-create-'.bin2hex(random_bytes(6))])->assertCreated();
            $containerId = (int) $containerResponse->json('data.id');

            $customerId = $this->requestAs($owner, 'POST', '/api/v1/customers', ['name' => 'Container cost snapshot customer'])
                ->assertCreated()->json('data.id');
            $invoiceId = $this->requestAs($owner, 'POST', '/api/v1/invoices', [
                'customer_id' => $customerId,
                'issuer_type' => 'company',
                'issue_date' => '2026-10-16',
                'lines' => [[
                    'product_id' => $product,
                    'warehouse_id' => $warehouse,
                    'quantity' => 6,
                    'unit_price_egp' => '15.00',
                ]],
            ])->assertCreated()->json('data.document.id');
            $issueResponse = $this->requestAs($owner, 'POST', "/api/v1/invoices/{$invoiceId}/issue", [], true, [
                'Idempotency-Key' => 'container-cost-issue-'.bin2hex(random_bytes(6)),
            ]);
            self::assertSame(200, $issueResponse->status(), $issueResponse->getContent());
            $invoiceLineId = (int) DB::table('sales_document_lines')->where('sales_document_id', $invoiceId)->value('id');
            self::assertSame('10.0000', (string) DB::table('sales_document_lines')->where('id', $invoiceLineId)->value('unit_cost_egp_snapshot'));
            self::assertSame(4, (int) DB::table('inventory_balances')->where('product_id', $product)->where('location_id', $warehouse)->value('quantity_on_hand'));

            $costType = 'post-receipt-test-'.bin2hex(random_bytes(4));
            $costTypeResponse = $this->requestAs($owner, 'PUT', '/api/v1/container-cost-types/'.$costType, ['include_in_inventory_cost' => true]);
            self::assertSame(200, $costTypeResponse->status(), $costTypeResponse->getContent());
            $costId = $this->requestAs($owner, 'POST', "/api/v1/containers/{$containerId}/costs", [
                'cost_type' => $costType,
                'amount_egp' => '20.00',
                'description' => 'Additional post-receipt freight',
                'cost_date' => '2026-10-16',
            ])->assertCreated()->json('data.id');

            $balance = DB::table('inventory_balances')->where('product_id', $product)->where('location_id', $warehouse)->first();
            self::assertSame(4, (int) $balance->quantity_on_hand);
            self::assertSame('60.0000', (string) $balance->inventory_value_egp);
            self::assertSame('15.0000', (string) $balance->average_unit_cost_egp);
            self::assertSame('15.0000', (string) DB::table('products')->where('id', $product)->value('purchase_cost_egp'));
            self::assertSame('10.0000', (string) DB::table('sales_document_lines')->where('id', $invoiceLineId)->value('unit_cost_egp_snapshot'));
            self::assertSame('20.0000', (string) DB::table('container_cost_revaluations')->where('container_cost_id', $costId)->value('capitalized_amount_egp'));
            self::assertSame('0.0000', (string) DB::table('container_cost_revaluations')->where('container_cost_id', $costId)->value('unapplied_amount_egp'));

            $this->requestAs($owner, 'GET', "/api/v1/containers/{$containerId}")
                ->assertOk()
                ->assertJsonPath('data.container.status', 'received')
                ->assertJsonPath('data.lines.0.purchase_unit_cost_egp', '10.0000')
                ->assertJsonPath('data.costs.0.amount_egp', '20.0000');
        } finally {
            if ($connection->transactionLevel() > 0) {
                $connection->rollBack();
            }
        }
    }
}
