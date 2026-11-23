<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\DB;
use PHPUnit\Framework\Attributes\Test;
use Tests\Concerns\AuthenticatesApi;
use Tests\TestCase;

final class PhaseDReferenceDataTest extends TestCase
{
    use AuthenticatesApi;

    private function req(array $actor, string $method, string $url, array $body = [], bool $csrf = true)
    {
        return $this->withCredentials()
            ->withUnencryptedCookie($this->apiCookieName(), $actor['token'])
            ->json($method, $url, $body, $csrf ? [$this->apiCsrfHeader() => $actor['csrf']] : []);
    }

    #[Test]
    public function owner_reads_the_egyptian_governorate_catalog_and_driver_catalog(): void
    {
        $owner = $this->actingAsApiUser('owner', true);
        $governorates = $this->req($owner, 'GET', '/api/v1/reference/governorates')->assertOk()->json('data');
        $this->assertGreaterThanOrEqual(27, count($governorates));
        $this->assertSame('القاهرة', $governorates[0]['name']);
        $this->assertArrayHasKey('customers_count', $governorates[0]);
        $this->req($owner, 'GET', '/api/v1/drivers')->assertOk()->assertJsonStructure(['data', 'meta']);
    }

    #[Test]
    public function customer_status_filters_distinguish_active_paused_and_blocked_without_archiving_them(): void
    {
        $owner = $this->actingAsApiUser('owner', true);
        $suffix = bin2hex(random_bytes(4));
        $customerId = (int) DB::table('customers')->insertGetId([
            'name' => 'Blocked customer '.$suffix,
            'phone' => 'BLK'.$suffix,
            'status' => 'blocked',
            'is_active' => false,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->req($owner, 'GET', '/api/v1/customers?status=blocked&search='.urlencode($suffix))
            ->assertOk()->assertJsonPath('data.0.id', $customerId)->assertJsonPath('data.0.status', 'blocked');
        $this->req($owner, 'PATCH', "/api/v1/customers/{$customerId}", ['status' => 'paused'])
            ->assertOk()->assertJsonPath('data.status', 'paused')->assertJsonPath('data.is_active', false);
        $this->assertSame(0, DB::table('trash_items')->where('entity_type', 'customer')->where('entity_id', $customerId)->count());
        $this->req($owner, 'GET', '/api/v1/customers?status=paused&search='.urlencode($suffix))
            ->assertOk()->assertJsonPath('data.0.status', 'paused');
    }

    #[Test]
    public function customer_delete_archives_without_removing_financial_history_and_can_be_restored(): void
    {
        $owner = $this->actingAsApiUser('owner', true);
        $suffix = bin2hex(random_bytes(4));
        $customerId = (int) DB::table('customers')->insertGetId([
            'name' => 'Archive test customer '.$suffix,
            'phone' => 'ARC'.$suffix,
            'status' => 'active',
            'is_active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->req($owner, 'DELETE', "/api/v1/customers/{$customerId}")
            ->assertOk()->assertJsonPath('data.is_active', false)->assertJsonPath('data.status', 'paused');
        $this->req($owner, 'GET', '/api/v1/customers?search='.urlencode($suffix))
            ->assertOk()->assertJsonPath('data', []);
        $this->req($owner, 'GET', "/api/v1/customers/{$customerId}")->assertNotFound();

        $trash = DB::table('trash_items')->where('entity_type', 'customer')->where('entity_id', $customerId)->whereNull('restored_at')->first();
        $this->assertNotNull($trash);
        $this->req($owner, 'POST', "/api/v1/admin/trash/{$trash->id}/restore")
            ->assertOk()->assertJsonPath('data.status', 'restored');
        $this->req($owner, 'GET', '/api/v1/customers?search='.urlencode($suffix))
            ->assertOk()->assertJsonPath('data.0.id', $customerId);
    }

    #[Test]
    public function governorate_changes_are_audited_and_update_customer_names(): void
    {
        $owner = $this->actingAsApiUser('owner', true);
        $created = $this->req($owner, 'POST', '/api/v1/reference/governorates', ['name' => 'محافظة اختبار '.bin2hex(random_bytes(3))])->assertCreated();
        $id = (int) $created->json('data.id');
        $oldName = $created->json('data.name');
        $customerId = (int) DB::table('customers')->insertGetId([
            'name' => 'Governorate test customer '.bin2hex(random_bytes(3)),
            'phone' => 'GOV'.bin2hex(random_bytes(5)),
            'governorate' => $oldName,
            'is_active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $newName = 'محافظة معدلة '.bin2hex(random_bytes(3));
        $this->req($owner, 'PATCH', "/api/v1/reference/governorates/{$id}", ['name' => $newName])
            ->assertOk()->assertJsonPath('data.name', $newName);
        $this->assertSame($newName, DB::table('customers')->where('id', $customerId)->value('governorate'));
        $this->assertSame(2, DB::table('audit_logs')->where('entity_type', 'governorate')->where('entity_id', $id)->count());
    }

    #[Test]
    public function governorate_deactivation_is_distinct_from_trash_deletion_and_can_be_restored(): void
    {
        $owner = $this->actingAsApiUser('owner', true);
        $created = $this->req($owner, 'POST', '/api/v1/reference/governorates', ['name' => 'محافظة أرشفة '.bin2hex(random_bytes(3))])->assertCreated();
        $id = (int) $created->json('data.id');

        $this->req($owner, 'PATCH', "/api/v1/reference/governorates/{$id}", ['is_active' => false])
            ->assertOk()->assertJsonPath('data.is_active', false);
        $this->assertSame(0, DB::table('trash_items')->where('entity_type', 'governorate')->where('entity_id', $id)->whereNull('restored_at')->count());

        $this->req($owner, 'DELETE', "/api/v1/reference/governorates/{$id}")
            ->assertOk()->assertJsonPath('data.is_active', false);
        $trash = DB::table('trash_items')->where('entity_type', 'governorate')->where('entity_id', $id)->whereNull('restored_at')->first();
        $this->assertNotNull($trash);
        $this->req($owner, 'POST', "/api/v1/admin/trash/{$trash->id}/restore")
            ->assertOk()->assertJsonPath('data.status', 'restored');
        $this->assertTrue((bool) DB::table('governorates')->where('id', $id)->value('is_active'));
    }

    #[Test]
    public function shipping_driver_can_be_created_deactivated_and_restored_only(): void
    {
        $owner = $this->actingAsApiUser('owner', true);
        $driver = $this->req($owner, 'POST', '/api/v1/drivers', ['name' => 'Driver '.bin2hex(random_bytes(4)), 'shipping_company' => 'شركة اختبار'])->assertCreated();
        $driverId = (int) $driver->json('data.id');
        $this->req($owner, 'PATCH', "/api/v1/drivers/{$driverId}", ['is_active' => false])->assertOk()->assertJsonPath('data.is_active', false);
        $items = $this->req($owner, 'GET', '/api/v1/admin/trash')->assertOk()->json('data');
        $trash = collect($items)->firstWhere('entity_id', $driverId);
        $this->assertNotNull($trash);
        $this->req($owner, 'POST', "/api/v1/admin/trash/{$trash['id']}/restore")->assertOk()->assertJsonPath('data.status', 'restored');
        $this->assertTrue((bool) DB::table('shipping_drivers')->where('id', $driverId)->value('is_active'));
        $this->req($owner, 'POST', "/api/v1/admin/trash/{$trash['id']}/restore")->assertStatus(409);
        $this->assertSame(0, (int) DB::table('trash_items')->where('id', $trash['id'])->whereNull('restored_at')->count());
    }

    #[Test]
    public function read_only_cannot_access_phase_d_or_write_endpoints(): void
    {
        $readOnly = $this->actingAsApiUser('read_only', true);
        $this->req($readOnly, 'GET', '/api/v1/reference/governorates')->assertStatus(403);
        $this->req($readOnly, 'GET', '/api/v1/drivers')->assertStatus(403);
        $this->req($readOnly, 'GET', '/api/v1/admin/trash')->assertStatus(403);
        $this->req($readOnly, 'POST', '/api/v1/reference/governorates', ['name' => 'Denied'])->assertStatus(403);
        $this->req($readOnly, 'PATCH', '/api/v1/reference/governorates/1', ['name' => 'Denied'])->assertStatus(403);
        $this->req($readOnly, 'POST', '/api/v1/drivers', ['name' => 'Denied'])->assertStatus(403);
        $this->req($readOnly, 'PATCH', '/api/v1/drivers/1', ['is_active' => false])->assertStatus(403);
        $this->req($readOnly, 'POST', '/api/v1/admin/trash/1/restore')->assertStatus(403);
    }

    #[Test]
    public function phase_d_writes_require_csrf_and_report_validation_details_without_finance_step_up(): void
    {
        $owner = $this->actingAsApiUser('owner', true);
        $this->req($owner, 'POST', '/api/v1/reference/governorates', ['name' => 'No csrf'], false)->assertStatus(419);
        $this->req($owner, 'POST', '/api/v1/drivers', ['name' => 'No csrf driver'], false)->assertStatus(419);
        $this->req($owner, 'POST', '/api/v1/reference/governorates', [])->assertStatus(422)->assertJsonStructure(['error' => ['details' => ['name']]]);
        $noStepUp = $this->actingAsApiUser('owner', false);
        $suffix = bin2hex(random_bytes(4));
        $this->req($noStepUp, 'POST', '/api/v1/reference/governorates', ['name' => 'No step '.$suffix])->assertCreated();
        $this->req($noStepUp, 'POST', '/api/v1/drivers', ['name' => 'No step driver '.$suffix])->assertCreated();
    }

    #[Test]
    public function unknown_driver_and_trash_ids_return_404(): void
    {
        $owner = $this->actingAsApiUser('owner', true);
        $this->req($owner, 'PATCH', '/api/v1/drivers/999999', ['is_active' => false])->assertStatus(404);
        $this->req($owner, 'POST', '/api/v1/admin/trash/999999/restore')->assertStatus(404);
    }
}
