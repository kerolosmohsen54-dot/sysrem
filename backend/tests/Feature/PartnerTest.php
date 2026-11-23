<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\DB;
use PHPUnit\Framework\Attributes\Test;
use Tests\Concerns\AuthenticatesApi;
use Tests\TestCase;

final class PartnerTest extends TestCase
{
    use AuthenticatesApi;

    private function req(array $auth, string $method, string $uri, array $body = [], bool $csrf = true)
    {
        return $this->withCredentials()
            ->withUnencryptedCookie($this->apiCookieName(), $auth['token'])
            ->json($method, $uri, $body, $csrf ? [$this->apiCsrfHeader() => $auth['csrf']] : []);
    }

    private function partner(array $auth, string $name = 'Partner One')
    {
        return $this->req($auth, 'POST', '/api/v1/partners', [
            'name' => $name,
            'phone' => '01000000000',
            'profit_percentage' => '12.5000',
        ]);
    }

    #[Test]
    public function owner_can_manage_partner_and_unknown_returns_404(): void
    {
        $auth = $this->actingAsApiUser('owner', true);
        $this->req($auth, 'GET', '/api/v1/partners')->assertOk();
        $response = $this->partner($auth)->assertCreated();
        $id = $response->json('data.id');
        $this->req($auth, 'GET', "/api/v1/partners/{$id}")->assertOk()->assertJsonPath('data.partner.id', $id);
        $this->req($auth, 'PATCH', "/api/v1/partners/{$id}", ['name' => 'Updated'])->assertOk();
        $this->req($auth, 'GET', '/api/v1/partners/999999')->assertStatus(404);
    }

    #[Test]
    public function linked_partner_user_is_automatically_scoped_to_its_own_partner(): void
    {
        $owner = $this->actingAsApiUser('owner', true);
        $ownPartnerId = (int) $this->partner($owner, 'Linked Partner')->assertCreated()->json('data.id');
        $otherPartnerId = (int) $this->partner($owner, 'Other Partner')->assertCreated()->json('data.id');
        $userId = $this->createApiUser(['display_name' => 'Linked Partner User']);

        $this->req($owner, 'PATCH', "/api/v1/partners/{$ownPartnerId}", ['user_id' => $userId])->assertOk();
        $partnerRoleId = (int) DB::table('roles')->where('code', 'partner')->value('id');
        self::assertGreaterThan(0, $partnerRoleId);
        self::assertSame(1, DB::table('user_roles')->where('user_id', $userId)->where('role_id', $partnerRoleId)->count());

        $partnerSession = $this->createApiSession($userId, true);
        $auth = ['user_id' => $userId, ...$partnerSession];
        $this->req($auth, 'GET', '/api/v1/partners')->assertOk()
            ->assertJsonPath('data.0.id', $ownPartnerId)
            ->assertJsonPath('total', 1);
        $this->req($auth, 'GET', "/api/v1/partners/{$ownPartnerId}")->assertOk();
        $this->req($auth, 'GET', "/api/v1/partners/{$otherPartnerId}")->assertNotFound();
    }

    #[Test]
    public function read_only_is_forbidden_on_partner_endpoints(): void
    {
        $auth = $this->actingAsApiUser('read_only', true);
        $this->req($auth, 'GET', '/api/v1/partners')->assertStatus(403);
        $this->req($auth, 'GET', '/api/v1/partners/999999')->assertStatus(403);
        $this->req($auth, 'POST', '/api/v1/partners')->assertStatus(403);
    }

    #[Test]
    public function partner_writes_require_csrf_and_step_up(): void
    {
        $auth = $this->actingAsApiUser('owner', true);
        $this->req($auth, 'POST', '/api/v1/partners', ['name' => 'No CSRF'], false)->assertStatus(419);
        $notSteppedUp = $this->actingAsApiUser('owner', false);
        $this->req($notSteppedUp, 'POST', '/api/v1/partners', ['name' => 'No step'])->assertStatus(428);
    }

    #[Test]
    public function partner_validation_uses_error_details(): void
    {
        $auth = $this->actingAsApiUser('owner', true);
        $response = $this->req($auth, 'POST', '/api/v1/partners', ['phone' => 'x'])->assertStatus(422);
        $this->assertArrayHasKey('name', $response->json('error.details'));
        $missingPhone = $this->req($auth, 'POST', '/api/v1/partners', ['name' => 'No WhatsApp'])->assertStatus(422);
        $this->assertArrayHasKey('phone', $missingPhone->json('error.details'));
    }

    #[Test]
    public function company_partner_payout_writes_are_disabled_without_database_effects(): void
    {
        $auth = $this->actingAsApiUser('owner', true);
        $partnerId = (int) $this->partner($auth, 'Earnings only partner')->assertCreated()->json('data.id');
        $ledgerCount = DB::table('partner_profit_ledger')->count();
        $treasuryCount = DB::table('treasury_entries')->count();

        $this->req($auth, 'GET', '/api/v1/partner-payments')->assertOk();
        $this->req($auth, 'POST', '/api/v1/partner-payments', [
            'partner_id' => $partnerId,
            'amount_egp' => '10.2500',
            'payment_date' => '2026-10-13',
            'idempotency_key' => 'disabled-payout-'.bin2hex(random_bytes(5)),
        ])->assertStatus(409)->assertJsonPath('error.code', 'COMPANY_PARTNER_PAYOUTS_DISABLED');
        $this->req($auth, 'POST', '/api/v1/partner-payments/999999/approve')
            ->assertStatus(409)->assertJsonPath('error.code', 'COMPANY_PARTNER_PAYOUTS_DISABLED');

        self::assertSame(0, DB::table('partner_payments')->where('partner_id', $partnerId)->count());
        self::assertSame($ledgerCount, DB::table('partner_profit_ledger')->count());
        self::assertSame($treasuryCount, DB::table('treasury_entries')->count());
    }

    #[Test]
    public function read_only_is_forbidden_on_payment_endpoints(): void
    {
        $auth = $this->actingAsApiUser('read_only', true);
        $this->req($auth, 'GET', '/api/v1/partner-payments')->assertStatus(403);
        $this->req($auth, 'POST', '/api/v1/partner-payments')->assertStatus(403);
        $this->req($auth, 'POST', '/api/v1/partner-payments/999999/approve')->assertStatus(403);
    }

    #[Test]
    public function payment_write_endpoints_keep_csrf_step_up_and_permission_guards(): void
    {
        $auth = $this->actingAsApiUser('owner', true);
        $paymentCount = DB::table('partner_payments')->count();
        $payload = [
            'partner_id' => 1,
            'amount_egp' => '3.00',
            'payment_date' => '2026-10-13',
            'idempotency_key' => 'guard-'.bin2hex(random_bytes(5)),
        ];
        $this->req($auth, 'POST', '/api/v1/partner-payments', $payload, false)->assertStatus(419);
        $this->req($auth, 'POST', '/api/v1/partner-payments/999999/approve', [], false)->assertStatus(419);

        $notSteppedUp = $this->actingAsApiUser('owner', false);
        $this->req($notSteppedUp, 'POST', '/api/v1/partner-payments', $payload)->assertStatus(428);
        $this->req($notSteppedUp, 'POST', '/api/v1/partner-payments/999999/approve')->assertStatus(428);

        $this->req($auth, 'POST', '/api/v1/partner-payments', $payload)
            ->assertStatus(409)->assertJsonPath('error.code', 'COMPANY_PARTNER_PAYOUTS_DISABLED');
        $this->req($auth, 'POST', '/api/v1/partner-payments/999999/approve')
            ->assertStatus(409)->assertJsonPath('error.code', 'COMPANY_PARTNER_PAYOUTS_DISABLED');
        self::assertSame($paymentCount, DB::table('partner_payments')->count());
    }

    #[Test]
    public function partner_profit_summary_exposes_earned_profit_without_payout_balances(): void
    {
        $auth = $this->actingAsApiUser('owner', true);
        $partner = $this->partner($auth, 'Exact decimal target')->assertCreated()->assertJsonPath('data.profit_percentage', '12.5000');
        $partnerId = (int) $partner->json('data.id');
        $response = $this->req($auth, 'GET', "/api/v1/partners/{$partnerId}")->assertOk();
        $response->assertJsonPath('data.profit_summary.profit_egp', '0.00')
            ->assertJsonMissingPath('data.profit_summary.paid_egp')
            ->assertJsonMissingPath('data.profit_summary.due_egp');
    }

    #[Test]
    public function partner_patch_requires_csrf_and_step_up(): void
    {
        $auth = $this->actingAsApiUser('owner', true);
        $id = $this->partner($auth, 'Patch guard target')->assertCreated()->json('data.id');
        $this->req($auth, 'PATCH', "/api/v1/partners/{$id}", ['name' => 'Changed'], false)->assertStatus(419);
        $notSteppedUp = $this->actingAsApiUser('owner', false);
        $this->req($notSteppedUp, 'PATCH', "/api/v1/partners/{$id}", ['name' => 'Changed'])->assertStatus(428);
    }
}
