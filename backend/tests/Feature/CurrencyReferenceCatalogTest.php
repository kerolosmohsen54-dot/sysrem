<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\DB;
use PHPUnit\Framework\Attributes\Test;
use Tests\Concerns\AuthenticatesApi;
use Tests\TestCase;

final class CurrencyReferenceCatalogTest extends TestCase
{
    use AuthenticatesApi;

    private function req(array $actor, string $method, string $url, array $body = [], bool $csrf = true)
    {
        return $this->withCredentials()
            ->withUnencryptedCookie($this->apiCookieName(), $actor['token'])
            ->json($method, $url, $body, $csrf ? [$this->apiCsrfHeader() => $actor['csrf']] : []);
    }

    #[Test]
    public function owner_can_create_list_update_and_deactivate_a_currency_reference(): void
    {
        $owner = $this->actingAsApiUser('owner', true);
        $code = 'C'.chr(random_int(65, 90)).chr(random_int(65, 90));
        $created = $this->req($owner, 'POST', '/api/v1/currencies', [
            'code' => $code,
            'name' => 'Test currency',
            'symbol' => 'USD',
            'decimal_places' => 3,
        ])->assertCreated()->assertJsonPath('data.code', $code)->assertJsonPath('data.decimal_places', 3);
        $id = (int) $created->json('data.id');
        $this->req($owner, 'POST', '/api/v1/currencies', [
            'code' => $code,
            'name' => 'Duplicate currency',
        ])->assertStatus(422);

        $this->req($owner, 'GET', '/api/v1/currencies?search='.$code)
            ->assertOk()->assertJsonPath('data.0.name', 'Test currency');
        $this->req($owner, 'PATCH', "/api/v1/currencies/{$id}", [
            'name' => 'Updated test currency',
            'is_active' => false,
        ])->assertOk()->assertJsonPath('data.name', 'Updated test currency')->assertJsonPath('data.is_active', false);

        $this->req($owner, 'GET', '/api/v1/currencies?include_inactive=1&search='.$code)
            ->assertOk()->assertJsonPath('data.0.name', 'Updated test currency')->assertJsonPath('data.0.symbol', 'USD');
        $this->assertSame(2, DB::table('audit_logs')->where('entity_type', 'currency_reference')->where('entity_id', $id)->count());
    }

    #[Test]
    public function finance_reader_can_list_but_read_only_and_accountant_cannot_manage_currency_references(): void
    {
        $readOnly = $this->actingAsApiUser('read_only', true);
        $this->req($readOnly, 'GET', '/api/v1/currencies')->assertOk();
        $this->req($readOnly, 'POST', '/api/v1/currencies', ['code' => 'USD', 'name' => 'US dollar'])->assertForbidden();

        $accountant = $this->actingAsApiUser('accountant', true);
        $this->req($accountant, 'GET', '/api/v1/currencies')->assertOk();
        $this->req($accountant, 'PATCH', '/api/v1/currencies/1', ['name' => 'Unauthorized'])->assertForbidden();
    }

    #[Test]
    public function currency_reference_writes_enforce_csrf_step_up_validation_and_not_found(): void
    {
        $owner = $this->actingAsApiUser('owner', true);
        $this->req($owner, 'POST', '/api/v1/currencies', ['code' => 'bad', 'name' => 'Bad'], false)->assertStatus(419);
        $this->req($owner, 'POST', '/api/v1/currencies', ['code' => 'bad', 'name' => 'Bad'])->assertStatus(422);
        $this->req($owner, 'POST', '/api/v1/currencies', ['code' => 'USD', 'name' => 'US dollar', 'decimal_places' => 5])
            ->assertStatus(422)->assertJsonStructure(['error' => ['details' => ['decimal_places']]]);

        $noStepUp = $this->actingAsApiUser('owner', false);
        $this->req($noStepUp, 'POST', '/api/v1/currencies', ['code' => 'USD', 'name' => 'US dollar'])->assertStatus(428);
        $this->req($owner, 'PATCH', '/api/v1/currencies/999999', ['is_active' => false])->assertNotFound();
    }
}
