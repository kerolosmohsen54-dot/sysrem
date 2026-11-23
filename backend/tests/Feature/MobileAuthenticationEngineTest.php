<?php

namespace Tests\Feature;

use Database\Seeders\RolePermissionMatrixSeeder;
use Illuminate\Routing\Middleware\ThrottleRequests;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use PHPUnit\Framework\Attributes\Test;
use RuntimeException;
use Tests\TestCase;

class MobileAuthenticationEngineTest extends TestCase
{
    private ?string $connection = null;

    private bool $transactionStarted = false;

    protected function setUp(): void
    {
        parent::setUp();

        $connection = getenv('AUTH_TEST_CONNECTION');
        if (! is_string($connection) || ! in_array($connection, ['mysql_test', 'mariadb_test'], true)) {
            $this->markTestSkipped('Set AUTH_TEST_CONNECTION to mysql_test or mariadb_test to run mobile authentication coverage.');
        }

        $this->connection = $connection;
        config(['database.default' => $connection]);
        DB::setDefaultConnection($connection);
        DB::purge($connection);
        if (config("database.connections.{$connection}.database") !== 'erp_acceptance_tests'
            || (DB::selectOne('SELECT DATABASE() AS database_name')->database_name ?? null) !== 'erp_acceptance_tests') {
            throw new RuntimeException('Mobile authentication integration tests require the erp_acceptance_tests database.');
        }

        DB::beginTransaction();
        $this->transactionStarted = true;
        app(RolePermissionMatrixSeeder::class)->run();
    }

    protected function tearDown(): void
    {
        if ($this->transactionStarted && $this->connection !== null
            && DB::connection($this->connection)->transactionLevel() > 0) {
            DB::rollBack();
        }

        if ($this->connection !== null) {
            DB::purge($this->connection);
        }
        parent::tearDown();
    }

    #[Test]
    public function mobile_login_issues_a_separate_scoped_token_and_driver_login_is_denied(): void
    {
        $ownerId = $this->createUser('owner');
        $login = $this->login($ownerId);
        $token = $login['data']['access_token'];
        $deviceId = $login['data']['device']['id'];

        self::assertSame(hash('sha256', $token), DB::table('mobile_devices')->where('id', $deviceId)->value('token_hash'));
        $me = $this->withToken($token)->getJson('/api/v1/mobile/auth/me');
        $me->assertOk()
            ->assertJsonPath('data.user.id', $ownerId)
            ->assertJsonPath('data.device.id', $deviceId);
        self::assertContains('mobile.use', $me->json('data.user.permissions'));

        $this->withToken($token)->getJson('/api/v1/auth/me')->assertUnauthorized();
        $this->withoutHeader('Authorization')
            ->withUnencryptedCookie('precision_slate_session', bin2hex(random_bytes(32)))
            ->getJson('/api/v1/mobile/auth/me')
            ->assertUnauthorized();

        $driverId = $this->createUser('driver');
        $this->postJson('/api/v1/mobile/auth/login', [
            'username' => DB::table('users')->where('id', $driverId)->value('username'),
            'password' => 'Correct mobile password 123',
            'device_name' => 'Driver phone',
            'device_model' => 'Test model',
        ])->assertForbidden()->assertJsonPath('error.code', 'FORBIDDEN');
        self::assertSame(0, DB::table('mobile_devices')->where('user_id', $driverId)->count());

        self::assertSame(1, DB::table('audit_logs')
            ->where('action', 'mobile.auth.login')
            ->where('entity_id', $deviceId)
            ->count());
        self::assertStringNotContainsString($token, (string) DB::table('audit_logs')
            ->where('entity_id', $deviceId)
            ->value('after_data'));
    }

    #[Test]
    public function one_owner_can_register_more_than_ten_devices(): void
    {
        $this->withoutMiddleware(ThrottleRequests::class);
        $ownerId = $this->createUser('owner');

        for ($deviceNumber = 1; $deviceNumber <= 11; $deviceNumber++) {
            $this->login($ownerId, 'Owner phone '.$deviceNumber);
        }

        self::assertSame(11, DB::table('mobile_devices')->where('user_id', $ownerId)->count());
        self::assertSame(11, DB::table('mobile_devices')->where('user_id', $ownerId)
            ->whereNull('revoked_at')->count());
    }

    #[Test]
    public function password_confirmation_is_audited_for_ten_minutes_and_logout_revokes_the_token(): void
    {
        $userId = $this->createUser('owner');
        $token = $this->login($userId)['data']['access_token'];

        $this->withToken($token)->postJson('/api/v1/mobile/auth/confirm-password', [
            'password' => 'wrong password',
        ])->assertUnauthorized()->assertJsonPath('error.code', 'PASSWORD_CONFIRMATION_FAILED');

        $confirmed = $this->withToken($token)->postJson('/api/v1/mobile/auth/confirm-password', [
            'password' => 'Correct mobile password 123',
        ])->assertOk();
        $confirmedAt = Carbon::parse($confirmed->json('data.confirmed_at'));
        self::assertSame(
            $confirmedAt->copy()->addMinutes(10)->toDateTimeString(),
            $confirmed->json('data.expires_at'),
        );
        self::assertSame(1, DB::table('audit_logs')->where('action', 'mobile.auth.password_confirmed')->count());

        $this->withToken($token)->postJson('/api/v1/mobile/auth/logout')->assertOk()
            ->assertJsonPath('data.status', 'signed_out');
        self::assertNull(DB::table('mobile_devices')->where('token_hash', hash('sha256', $token))->value('token_hash'));
        $this->withToken($token)->getJson('/api/v1/mobile/auth/me')->assertUnauthorized();
        self::assertSame(1, DB::table('audit_logs')->where('action', 'mobile.auth.logout')->count());
    }

    #[Test]
    public function mobile_token_expires_and_is_invalidated_when_the_users_password_changes(): void
    {
        $userId = $this->createUser('owner');
        $token = $this->login($userId)['data']['access_token'];
        DB::table('mobile_devices')->where('token_hash', hash('sha256', $token))
            ->update(['token_expires_at' => now()->subSecond()]);
        $this->withToken($token)->getJson('/api/v1/mobile/auth/me')->assertUnauthorized();

        $freshToken = $this->login($userId)['data']['access_token'];
        DB::table('users')->where('id', $userId)->update(['password_changed_at' => now()->addSecond()]);
        $this->withToken($freshToken)->getJson('/api/v1/mobile/auth/me')->assertUnauthorized();
        self::assertNotNull(DB::table('mobile_devices')->where('token_hash', null)->where('user_id', $userId)->value('revoked_at'));
    }

    #[Test]
    public function device_admin_routes_keep_permissions_and_csrf_without_finance_step_up(): void
    {
        $ownerId = $this->createUser('owner');
        $token = $this->login($ownerId, 'Mobile phone')['data']['access_token'];
        $siblingToken = $this->login($ownerId, 'Sibling phone')['data']['access_token'];
        $deviceId = (int) DB::table('mobile_devices')->where('token_hash', hash('sha256', $token))->value('id');

        $session = $this->createWebSession($ownerId, false);
        $this->withCredentials()
            ->withUnencryptedCookie('precision_slate_session', $session['token'])
            ->getJson('/api/v1/mobile/devices')
            ->assertOk();

        $this->withCredentials()->withUnencryptedCookie('precision_slate_session', $session['token'])
            ->withHeader('X-CSRF-Token', $session['csrf'])
            ->patchJson('/api/v1/mobile/devices/'.$deviceId, ['name' => 'No step-up'])
            ->assertOk();

        $session = $this->createWebSession($ownerId, true);
        $this->withCredentials()->withUnencryptedCookie('precision_slate_session', $session['token'])
            ->patchJson('/api/v1/mobile/devices/'.$deviceId, ['name' => 'No CSRF'])
            ->assertStatus(419)->assertJsonPath('error.code', 'CSRF_TOKEN_MISMATCH');
        $this->withCredentials()->withUnencryptedCookie('precision_slate_session', $session['token'])
            ->getJson('/api/v1/mobile/devices')
            ->assertOk()
            ->assertJsonFragment(['name' => 'No step-up'])
            ->assertJsonMissingPath('data.0.token_hash');
        self::assertSame(2, DB::table('mobile_devices')->where('user_id', $ownerId)->count());

        $this->withCredentials()
            ->withUnencryptedCookie('precision_slate_session', '')
            ->withToken($token)
            ->getJson('/api/v1/mobile/devices')
            ->assertUnauthorized();

        $this->withCredentials()->withUnencryptedCookie('precision_slate_session', $session['token'])
            ->withHeader('X-CSRF-Token', $session['csrf'])
            ->patchJson('/api/v1/mobile/devices/'.$deviceId, ['name' => 'Renamed phone'])
            ->assertOk()
            ->assertJsonPath('data.name', 'Renamed phone');

        $this->withCredentials()->withUnencryptedCookie('precision_slate_session', $session['token'])
            ->withHeader('X-CSRF-Token', $session['csrf'])
            ->postJson('/api/v1/mobile/devices/'.$deviceId.'/revoke')
            ->assertOk()
            ->assertJsonPath('data.status', 'revoked');
        $this->withToken($token)->getJson('/api/v1/mobile/auth/me')->assertUnauthorized();
        $this->withToken($siblingToken)->getJson('/api/v1/mobile/auth/me')->assertOk()
            ->assertJsonPath('data.device.name', 'Sibling phone');
        self::assertSame(2, DB::table('audit_logs')->where('action', 'mobile.device.renamed')->count());
        self::assertSame(1, DB::table('audit_logs')->where('action', 'mobile.device.revoked')->count());
    }

    #[Test]
    public function read_only_mobile_user_can_view_but_cannot_write_even_on_legacy_routes(): void
    {
        $roleId = DB::table('roles')->where('code', 'read_only')->value('id');
        $permissionId = DB::table('permissions')->where('code', 'mobile.use')->value('id');
        DB::table('role_permissions')->insert([
            'role_id' => $roleId,
            'permission_id' => $permissionId,
            'granted_at' => now(),
        ]);
        $userId = $this->createUser('read_only');
        $login = $this->login($userId);
        $token = $login['data']['access_token'];

        $this->withToken($token)->getJson('/api/v1/mobile/auth/me')->assertOk();
        $this->withToken($token)->postJson('/api/v1/mobile/messages/batch', ['messages' => []])
            ->assertForbidden()->assertJsonPath('error.code', 'FORBIDDEN');
        $this->withToken($token)->postJson('/api/v1/mobile/messages/capture', [])
            ->assertForbidden()->assertJsonPath('error.code', 'FORBIDDEN');
        $this->withToken($token)->postJson('/api/v1/mobile/deposits/manual', [])
            ->assertForbidden()->assertJsonPath('error.code', 'FORBIDDEN');
        $this->withToken($token)->postJson('/api/v1/mobile/auth/logout')->assertOk();
        $this->withToken($token)->getJson('/api/v1/mobile/auth/me')->assertUnauthorized();
    }

    #[Test]
    public function mobile_login_is_rate_limited(): void
    {
        for ($attempt = 1; $attempt <= 5; $attempt++) {
            $this->postJson('/api/v1/mobile/auth/login', [
                'username' => 'unknown-mobile-user',
                'password' => 'wrong password',
                'device_name' => 'Rate test',
            ])->assertUnauthorized();
        }

        $this->postJson('/api/v1/mobile/auth/login', [
            'username' => 'unknown-mobile-user',
            'password' => 'wrong password',
            'device_name' => 'Rate test',
        ])->assertTooManyRequests();
    }

    /**
     * @return array<string, mixed>
     */
    private function login(int $userId, string $deviceName = 'Test phone'): array
    {
        $response = $this->postJson('/api/v1/mobile/auth/login', [
            'username' => DB::table('users')->where('id', $userId)->value('username'),
            'password' => 'Correct mobile password 123',
            'device_name' => $deviceName,
            'device_model' => 'ERP Mobile Test Device',
        ])->assertCreated();

        return $response->json();
    }

    private function createUser(string $role): int
    {
        $suffix = bin2hex(random_bytes(4));
        $userId = (int) DB::table('users')->insertGetId([
            'username' => 'mobile-'.$role.'-'.$suffix,
            'display_name' => 'Mobile '.ucfirst($role),
            'password_hash' => Hash::make('Correct mobile password 123'),
            'is_active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        DB::table('user_roles')->insert([
            'user_id' => $userId,
            'role_id' => DB::table('roles')->where('code', $role)->value('id'),
            'granted_at' => now(),
        ]);

        return $userId;
    }

    /**
     * @return array{token: string, csrf: string}
     */
    private function createWebSession(int $userId, bool $stepUp): array
    {
        $token = bin2hex(random_bytes(32));
        $csrf = bin2hex(random_bytes(32));
        DB::table('auth_sessions')->insert([
            'user_id' => $userId,
            'token_hash' => hash('sha256', $token, true),
            'csrf_token_hash' => hash('sha256', $csrf, true),
            'expires_at' => now()->addHours(12),
            'last_seen_at' => now(),
            'step_up_verified_at' => $stepUp ? now() : null,
            'created_at' => now(),
        ]);

        return ['token' => $token, 'csrf' => $csrf];
    }
}
