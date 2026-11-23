<?php

namespace Tests\Feature;

use Database\Seeders\RolePermissionMatrixSeeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Route;
use PHPUnit\Framework\Attributes\Test;
use RuntimeException;
use Symfony\Component\HttpFoundation\Cookie;
use Tests\TestCase;

class AuthenticationEngineTest extends TestCase
{
    private ?string $authTestConnection = null;

    protected function setUp(): void
    {
        parent::setUp();

        $connection = getenv('AUTH_TEST_CONNECTION');

        if (! is_string($connection) || ! in_array($connection, ['mysql_test', 'mariadb_test'], true)) {
            $this->markTestSkipped('Set AUTH_TEST_CONNECTION to mysql_test or mariadb_test to run engine integration coverage.');
        }

        $this->authTestConnection = $connection;
        config(['database.default' => $connection]);
        DB::setDefaultConnection($connection);

        $configuredDatabase = config("database.connections.{$connection}.database");

        if ($configuredDatabase !== 'erp_acceptance_tests') {
            throw new RuntimeException("Authentication integration tests require the erp_acceptance_tests database; configured target is {$configuredDatabase}.");
        }

        DB::purge($connection);

        $database = DB::selectOne('SELECT DATABASE() AS database_name')->database_name ?? null;

        if ($database !== 'erp_acceptance_tests') {
            throw new RuntimeException("Authentication integration tests require the erp_acceptance_tests database; received {$database}.");
        }

        DB::statement(<<<'SQL'
            CREATE TEMPORARY TABLE users (
                id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(100) NULL UNIQUE,
                display_name VARCHAR(160) NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                is_active TINYINT(1) NOT NULL DEFAULT 1,
                password_changed_at DATETIME NULL,
                last_login_at DATETIME NULL,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            SQL);
        DB::statement(<<<'SQL'
            CREATE TEMPORARY TABLE auth_sessions (
                id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
                user_id BIGINT UNSIGNED NOT NULL,
                token_hash BINARY(32) NOT NULL UNIQUE,
                csrf_token_hash BINARY(32) NULL,
                expires_at DATETIME NOT NULL,
                last_seen_at DATETIME NULL,
                step_up_verified_at DATETIME NULL,
                revoked_at DATETIME NULL,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            SQL);
        DB::statement(<<<'SQL'
            CREATE TEMPORARY TABLE roles (
                id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
                code VARCHAR(80) NOT NULL UNIQUE,
                name VARCHAR(120) NOT NULL,
                description VARCHAR(500) NULL,
                is_system TINYINT(1) NOT NULL DEFAULT 0,
                is_active TINYINT(1) NOT NULL DEFAULT 1,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            SQL);
        DB::statement(<<<'SQL'
            CREATE TEMPORARY TABLE permissions (
                id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
                code VARCHAR(120) NOT NULL UNIQUE,
                description VARCHAR(500) NULL,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            SQL);
        DB::statement(<<<'SQL'
            CREATE TEMPORARY TABLE user_roles (
                user_id BIGINT UNSIGNED NOT NULL,
                role_id BIGINT UNSIGNED NOT NULL,
                granted_by_user_id BIGINT UNSIGNED NULL,
                granted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (user_id, role_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            SQL);
        DB::statement(<<<'SQL'
            CREATE TEMPORARY TABLE role_permissions (
                role_id BIGINT UNSIGNED NOT NULL,
                permission_id BIGINT UNSIGNED NOT NULL,
                granted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (role_id, permission_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            SQL);

        app(RolePermissionMatrixSeeder::class)->run();
        $this->registerPermissionTestRoutes();
    }

    protected function tearDown(): void
    {
        if ($this->authTestConnection !== null) {
            DB::statement('DROP TEMPORARY TABLE IF EXISTS auth_sessions');
            DB::statement('DROP TEMPORARY TABLE IF EXISTS role_permissions');
            DB::statement('DROP TEMPORARY TABLE IF EXISTS user_roles');
            DB::statement('DROP TEMPORARY TABLE IF EXISTS permissions');
            DB::statement('DROP TEMPORARY TABLE IF EXISTS roles');
            DB::statement('DROP TEMPORARY TABLE IF EXISTS users');
            DB::purge($this->authTestConnection);
        }

        parent::tearDown();
    }

    #[Test]
    public function login_session_lookup_and_csrf_logout_work_with_binary_hash_columns(): void
    {
        $userId = (int) DB::table('users')->insertGetId([
            'username' => 'engine-test-user',
            'display_name' => 'Engine Test User',
            'password_hash' => Hash::make('engine test password'),
            'is_active' => true,
        ]);
        $this->assignRole($userId, 'read_only');

        $login = $this->postJson('/api/v1/auth/login', [
            'username' => 'engine-test-user',
            'password' => 'engine test password',
        ]);
        $login->assertOk()->assertJsonPath('data.user.id', $userId);

        $sessionCookie = $this->responseCookie($login, 'precision_slate_session');
        $csrfCookie = $this->responseCookie($login, 'XSRF-TOKEN');
        $tokenHash = hash('sha256', $sessionCookie->getValue(), true);
        $csrfHash = hash('sha256', $csrfCookie->getValue(), true);

        self::assertSame(1, DB::table('auth_sessions')->where('token_hash', $tokenHash)->count());
        self::assertSame(1, DB::table('auth_sessions')->where('csrf_token_hash', $csrfHash)->count());

        $this->withCredentials()
            ->withUnencryptedCookie('precision_slate_session', $sessionCookie->getValue())
            ->getJson('/api/v1/auth/me')
            ->assertOk()
            ->assertJsonPath('data.user.username', 'engine-test-user');

        $this->withCredentials()
            ->withUnencryptedCookie('precision_slate_session', $sessionCookie->getValue())
            ->postJson('/api/v1/auth/logout', [], ['X-CSRF-Token' => $csrfCookie->getValue()])
            ->assertOk();

        self::assertNotNull(DB::table('auth_sessions')->where('token_hash', $tokenHash)->value('revoked_at'));
    }

    #[Test]
    public function sessions_have_a_twelve_hour_absolute_lifetime_that_activity_does_not_extend(): void
    {
        $startedAt = now()->startOfSecond();
        $this->travelTo($startedAt);
        $userId = (int) DB::table('users')->insertGetId([
            'username' => 'engine-absolute-timeout-user',
            'display_name' => 'Engine Absolute Timeout User',
            'password_hash' => Hash::make('engine test password'),
            'is_active' => true,
        ]);
        $this->assignRole($userId, 'read_only');

        $login = $this->postJson('/api/v1/auth/login', [
            'username' => 'engine-absolute-timeout-user',
            'password' => 'engine test password',
        ]);
        $login->assertOk();
        $sessionCookie = $this->responseCookie($login, 'precision_slate_session');
        $session = DB::table('auth_sessions')->where('user_id', $userId)->first();

        self::assertSame($startedAt->copy()->addHours(12)->toDateTimeString(), $session->expires_at);

        $this->travelTo($startedAt->copy()->addHours(11)->addMinutes(59));
        DB::table('auth_sessions')->where('id', $session->id)->update(['last_seen_at' => now()]);
        $this->withCredentials()
            ->withUnencryptedCookie('precision_slate_session', $sessionCookie->getValue())
            ->getJson('/api/v1/auth/me')
            ->assertOk();
        self::assertSame(
            $startedAt->copy()->addHours(12)->toDateTimeString(),
            DB::table('auth_sessions')->where('id', $session->id)->value('expires_at'),
        );

        $this->travelTo($startedAt->copy()->addHours(12));
        $this->withCredentials()
            ->withUnencryptedCookie('precision_slate_session', $sessionCookie->getValue())
            ->getJson('/api/v1/auth/me')
            ->assertUnauthorized()
            ->assertJsonPath('error.code', 'UNAUTHENTICATED');
    }

    #[Test]
    public function sessions_are_valid_before_the_thirty_minute_idle_boundary_and_rejected_at_it(): void
    {
        $startedAt = now()->startOfSecond();
        $this->travelTo($startedAt);
        $userId = (int) DB::table('users')->insertGetId([
            'username' => 'engine-idle-timeout-user',
            'display_name' => 'Engine Idle Timeout User',
            'password_hash' => Hash::make('engine test password'),
            'is_active' => true,
        ]);
        $this->assignRole($userId, 'read_only');
        $token = bin2hex(random_bytes(32));
        $sessionId = (int) DB::table('auth_sessions')->insertGetId([
            'user_id' => $userId,
            'token_hash' => hash('sha256', $token, true),
            'csrf_token_hash' => hash('sha256', bin2hex(random_bytes(32)), true),
            'created_at' => $startedAt,
            'last_seen_at' => $startedAt,
            'expires_at' => $startedAt->copy()->addHours(12),
        ]);

        $this->travelTo($startedAt->copy()->addMinutes(29)->addSeconds(59));
        $this->withCredentials()
            ->withUnencryptedCookie('precision_slate_session', $token)
            ->getJson('/api/v1/auth/me')
            ->assertOk();

        $this->travelTo($startedAt->copy()->addMinutes(59)->addSeconds(59));
        $this->withCredentials()
            ->withUnencryptedCookie('precision_slate_session', $token)
            ->getJson('/api/v1/auth/me')
            ->assertUnauthorized()
            ->assertJsonPath('error.code', 'UNAUTHENTICATED');

        self::assertNotNull(DB::table('auth_sessions')->where('id', $sessionId)->value('revoked_at'));
    }

    #[Test]
    public function expired_absolute_lifetime_is_revoked_on_the_request(): void
    {
        $userId = (int) DB::table('users')->insertGetId([
            'username' => 'engine-expiry-user',
            'display_name' => 'Engine Expiry User',
            'password_hash' => Hash::make('engine test password'),
            'is_active' => true,
        ]);
        $token = bin2hex(random_bytes(32));
        $hash = hash('sha256', $token, true);
        $sessionId = (int) DB::table('auth_sessions')->insertGetId([
            'user_id' => $userId,
            'token_hash' => $hash,
            'csrf_token_hash' => hash('sha256', bin2hex(random_bytes(32)), true),
            'expires_at' => now()->subSecond(),
            'last_seen_at' => now(),
        ]);

        $this->withCredentials()
            ->withUnencryptedCookie('precision_slate_session', $token)
            ->getJson('/api/v1/auth/me')
            ->assertUnauthorized();

        self::assertNotNull(DB::table('auth_sessions')->where('id', $sessionId)->value('revoked_at'));
    }

    #[Test]
    public function both_current_owners_can_access_every_permission_including_sensitive_financial_and_user_management(): void
    {
        foreach ([
            ['owner-anoub-test', 'ابنوب'],
            ['owner-karras-test', 'كراس'],
        ] as [$username, $displayName]) {
            $identity = $this->createIdentity('owner', $username, $displayName);

            foreach ($this->permissionRoutes() as $permission => $_route) {
                $this->requestWithIdentity($identity, $permission)->assertOk();
            }
        }
    }

    #[Test]
    public function future_invoice_issuer_role_template_remains_restricted_and_has_no_current_owner_identity(): void
    {
        foreach ([
            ['future-issuer-one', 'Future Issuer One'],
            ['future-issuer-two', 'Future Issuer Two'],
        ] as [$username, $displayName]) {
            $identity = $this->createIdentity('designated_invoice_issuer', $username, $displayName);

            foreach (['users.view_self', 'sessions.revoke_self', 'invoices.create', 'customers.view', 'products.view'] as $permission) {
                $this->requestWithIdentity($identity, $permission)->assertOk();
            }

            foreach ([
                'invoices.view',
                'customers.create',
                'customers.opening_balance',
                'orders.view',
                'orders.manage',
                'deliveries.view',
                'deliveries.manage',
                'products.manage',
                'warehouses.manage',
                'inventory.view',
                'inventory.manage',
                'collections.create',
                'returns.create',
                'documents.edit',
                'documents.cancel',
                'documents.reverse',
                'documents.correct',
                'users.manage',
                'costs.view',
                'profit.view',
                'markup.view',
            ] as $permission) {
                $this->requestWithIdentity($identity, $permission)->assertForbidden();
            }
        }
    }

    #[Test]
    public function future_read_only_role_template_cannot_mutate_or_view_sensitive_data(): void
    {
        $identity = $this->createIdentity('read_only', 'read-only-user', 'Read Only');

        foreach (['users.view_self', 'sessions.revoke_self', 'invoices.view', 'customers.view', 'products.view'] as $permission) {
            $this->requestWithIdentity($identity, $permission)->assertOk();
        }

        foreach ([
            'invoices.create',
            'customers.opening_balance',
            'orders.view',
            'orders.manage',
            'deliveries.view',
            'deliveries.manage',
            'products.manage',
            'warehouses.manage',
            'inventory.view',
            'inventory.manage',
            'customers.create',
            'collections.create',
            'returns.create',
            'documents.edit',
            'documents.cancel',
            'documents.reverse',
            'documents.correct',
            'users.manage',
            'costs.view',
            'profit.view',
            'markup.view',
        ] as $permission) {
            $this->requestWithIdentity($identity, $permission)->assertForbidden();
        }
    }

    #[Test]
    public function authorization_denies_unauthenticated_and_permissionless_requests_by_default(): void
    {
        $this->getJson('/api/v1/_authorization/customers-view')->assertUnauthorized();
        $this->getJson('/api/v1/unknown-route')->assertNotFound();

        $identity = $this->createIdentity('read_only', 'permissionless-user', 'Permissionless');
        $this->withCredentials()
            ->withUnencryptedCookie('precision_slate_session', $identity['token'])
            ->getJson('/api/v1/_authorization/no-permission')
            ->assertForbidden();

        $owner = $this->createIdentity('owner', 'unknown-route-owner', 'Owner');
        $this->withCredentials()
            ->withUnencryptedCookie('precision_slate_session', $owner['token'])
            ->getJson('/api/v1/_authorization/no-permission')
            ->assertForbidden();
        $this->withCredentials()
            ->withUnencryptedCookie('precision_slate_session', $owner['token'])
            ->getJson('/api/v1/unknown-route')
            ->assertNotFound();
    }

    #[Test]
    public function authenticated_user_without_any_role_is_denied_every_permission(): void
    {
        $identity = $this->createIdentity(null, 'roleless-user', 'Roleless');

        foreach ($this->permissionRoutes() as $permission => $_route) {
            $this->requestWithIdentity($identity, $permission)->assertForbidden();
        }
    }

    #[Test]
    public function driver_role_is_seeded_with_configurable_grants_and_no_current_assignment(): void
    {
        $driverRole = DB::table('roles')->where('code', 'driver')->first();
        self::assertNotNull($driverRole);
        self::assertSame('السائق', $driverRole->name);
        self::assertSame(0, DB::table('user_roles')->where('role_id', $driverRole->id)->count());

        $driver = $this->createIdentity('driver', 'future-driver', 'السواق');
        $allowed = [
            'users.view_self',
            'sessions.revoke_self',
            'invoices.create',
            'customers.view',
            'products.view',
            'inventory.view',
            'orders.view',
            'orders.manage',
            'deliveries.view',
            'deliveries.manage',
        ];
        foreach ($allowed as $permission) {
            $this->requestWithIdentity($driver, $permission)->assertOk();
        }

        $denied = [
            'invoices.view',
            'customers.create',
            'customers.opening_balance',
            'inventory.manage',
            'collections.create',
            'collections.view',
            'returns.create',
            'returns.view',
            'documents.edit',
            'documents.cancel',
            'documents.reverse',
            'documents.correct',
            'users.manage',
            'costs.view',
            'profit.view',
            'markup.view',
            'sales_tax.manage',
            'treasury.view',
            'treasury.manage',
            'treasury.post',
            'expenses.view',
            'expenses.post',
            'expense_categories.manage',
        ];
        foreach ($denied as $permission) {
            $this->requestWithIdentity($driver, $permission)->assertForbidden();
        }

        $this->withCredentials()
            ->withUnencryptedCookie('precision_slate_session', 'invalid-session')
            ->getJson('/api/v1/_authorization/driver-financial')
            ->assertUnauthorized();
        $sessionId = DB::table('auth_sessions')
            ->where('token_hash', hash('sha256', $driver['token'], true))
            ->value('id');
        DB::table('auth_sessions')->where('id', $sessionId)->update(['step_up_verified_at' => now()]);
        $this->withCredentials()
            ->withUnencryptedCookie('precision_slate_session', $driver['token'])
            ->getJson('/api/v1/_authorization/driver-financial')
            ->assertForbidden();
        $this->withCredentials()
            ->withUnencryptedCookie('precision_slate_session', $driver['token'])
            ->getJson('/api/v1/_authorization/treasury-financial')
            ->assertForbidden();

        $costPermissionId = DB::table('permissions')->where('code', 'costs.view')->value('id');
        DB::table('role_permissions')->insert([
            'role_id' => $driverRole->id,
            'permission_id' => $costPermissionId,
        ]);
        app(RolePermissionMatrixSeeder::class)->run();
        $this->requestWithIdentity($driver, 'costs.view')->assertOk();
    }

    #[Test]
    public function treasury_access_requires_a_finance_permission_and_recent_step_up(): void
    {
        $owner = $this->createIdentity('owner', 'treasury-owner-test', 'Treasury Owner');
        DB::statement('CREATE TEMPORARY TABLE treasury_accounts (id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, code VARCHAR(80) NOT NULL, name VARCHAR(160) NOT NULL, account_type VARCHAR(10) NOT NULL, is_active TINYINT(1) NOT NULL DEFAULT 1, notes VARCHAR(500) NULL, created_at TIMESTAMP NULL, updated_at TIMESTAMP NULL) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci');
        $this->withCredentials()
            ->withUnencryptedCookie('precision_slate_session', $owner['token'])
            ->getJson('/api/v1/treasury/accounts')
            ->assertStatus(428);

        $sessionId = DB::table('auth_sessions')
            ->where('token_hash', hash('sha256', $owner['token'], true))
            ->value('id');
        DB::table('auth_sessions')->where('id', $sessionId)->update(['step_up_verified_at' => now()]);
        $this->withCredentials()
            ->withUnencryptedCookie('precision_slate_session', $owner['token'])
            ->getJson('/api/v1/treasury/accounts')
            ->assertOk();

        $driver = $this->createIdentity('driver', 'treasury-driver-test', 'Treasury Driver');
        $driverSessionId = DB::table('auth_sessions')
            ->where('token_hash', hash('sha256', $driver['token'], true))
            ->value('id');
        DB::table('auth_sessions')->where('id', $driverSessionId)->update(['step_up_verified_at' => now()]);
        $this->withCredentials()
            ->withUnencryptedCookie('precision_slate_session', $driver['token'])
            ->getJson('/api/v1/treasury/accounts')
            ->assertForbidden();
    }

    /**
     * @return array<string, array{method: string, path: string}>
     */
    #[Test]
    public function accountant_and_admin_follow_the_documented_safe_permission_defaults(): void
    {
        $accountant = $this->createIdentity('accountant', 'accountant-policy-user', 'Accountant');
        $this->requestWithIdentity($accountant, 'treasury.view')->assertOk();
        $this->requestWithIdentity($accountant, 'expenses.view')->assertOk();
        $this->requestWithIdentity($accountant, 'expenses.post')->assertOk();
        foreach (['users.manage', 'damaged_stock.approve', 'financial_adjustments.manage', 'inventory_counts.approve'] as $permission) {
            $this->requestWithIdentity($accountant, $permission)->assertForbidden();
        }

        $admin = $this->createIdentity('admin', 'admin-policy-user', 'Administrator');
        $this->requestWithIdentity($admin, 'treasury.manage')->assertOk();
        $this->requestWithIdentity($admin, 'inventory_counts.approve')->assertOk();
        foreach (['users.manage', 'damaged_stock.approve', 'financial_adjustments.manage'] as $permission) {
            $this->requestWithIdentity($admin, $permission)->assertForbidden();
        }

        $owner = $this->createIdentity('owner', 'owner-policy-user', 'Owner');
        foreach (['users.manage', 'damaged_stock.approve', 'financial_adjustments.manage'] as $permission) {
            $this->requestWithIdentity($owner, $permission)->assertOk();
        }
    }
    private function permissionRoutes(): array
    {
        return [
            'users.view_self' => ['method' => 'GET', 'path' => '/api/v1/_authorization/users-view-self'],
            'sessions.revoke_self' => ['method' => 'POST', 'path' => '/api/v1/_authorization/sessions-revoke-self'],
            'invoices.view' => ['method' => 'GET', 'path' => '/api/v1/_authorization/invoices-view'],
            'invoices.create' => ['method' => 'POST', 'path' => '/api/v1/_authorization/invoices-create'],
            'customers.view' => ['method' => 'GET', 'path' => '/api/v1/_authorization/customers-view'],
            'customers.manage' => ['method' => 'PATCH', 'path' => '/api/v1/_authorization/customers-manage'],
            'customers.opening_balance' => ['method' => 'POST', 'path' => '/api/v1/_authorization/customers-opening-balance'],
            'products.view' => ['method' => 'GET', 'path' => '/api/v1/_authorization/products-view'],
            'products.manage' => ['method' => 'POST', 'path' => '/api/v1/_authorization/products-manage'],
            'warehouses.manage' => ['method' => 'POST', 'path' => '/api/v1/_authorization/warehouses-manage'],
            'inventory.view' => ['method' => 'GET', 'path' => '/api/v1/_authorization/inventory-view'],
            'inventory.manage' => ['method' => 'POST', 'path' => '/api/v1/_authorization/inventory-manage'],
            'customers.create' => ['method' => 'POST', 'path' => '/api/v1/_authorization/customers-create'],
            'collections.create' => ['method' => 'POST', 'path' => '/api/v1/_authorization/collections-create'],
            'collections.view' => ['method' => 'GET', 'path' => '/api/v1/_authorization/collections-view'],
            'returns.create' => ['method' => 'POST', 'path' => '/api/v1/_authorization/returns-create'],
            'returns.view' => ['method' => 'GET', 'path' => '/api/v1/_authorization/returns-view'],
            'documents.edit' => ['method' => 'PATCH', 'path' => '/api/v1/_authorization/documents-edit'],
            'documents.cancel' => ['method' => 'POST', 'path' => '/api/v1/_authorization/documents-cancel'],
            'documents.reverse' => ['method' => 'POST', 'path' => '/api/v1/_authorization/documents-reverse'],
            'documents.correct' => ['method' => 'PATCH', 'path' => '/api/v1/_authorization/documents-correct'],
            'users.manage' => ['method' => 'POST', 'path' => '/api/v1/_authorization/users-manage'],
            'costs.view' => ['method' => 'GET', 'path' => '/api/v1/_authorization/costs-view'],
            'profit.view' => ['method' => 'GET', 'path' => '/api/v1/_authorization/profit-view'],
            'markup.view' => ['method' => 'GET', 'path' => '/api/v1/_authorization/markup-view'],
            'sales_tax.manage' => ['method' => 'PUT', 'path' => '/api/v1/_authorization/sales-tax-manage'],
            'orders.view' => ['method' => 'GET', 'path' => '/api/v1/_authorization/orders-view'],
            'orders.manage' => ['method' => 'POST', 'path' => '/api/v1/_authorization/orders-manage'],
            'deliveries.view' => ['method' => 'GET', 'path' => '/api/v1/_authorization/deliveries-view'],
            'deliveries.manage' => ['method' => 'POST', 'path' => '/api/v1/_authorization/deliveries-manage'],
            'treasury.view' => ['method' => 'GET', 'path' => '/api/v1/_authorization/treasury-view'],
            'treasury.manage' => ['method' => 'POST', 'path' => '/api/v1/_authorization/treasury-manage'],
            'treasury.post' => ['method' => 'POST', 'path' => '/api/v1/_authorization/treasury-post'],
            'expenses.view' => ['method' => 'GET', 'path' => '/api/v1/_authorization/expenses-view'],
            'expenses.post' => ['method' => 'POST', 'path' => '/api/v1/_authorization/expenses-post'],
            'expense_categories.manage' => ['method' => 'POST', 'path' => '/api/v1/_authorization/expense-categories-manage'],
            'damaged_stock.approve' => ['method' => 'POST', 'path' => '/api/v1/_authorization/damaged-stock-approve'],
            'financial_adjustments.manage' => ['method' => 'POST', 'path' => '/api/v1/_authorization/financial-adjustments-manage'],
            'inventory_counts.approve' => ['method' => 'POST', 'path' => '/api/v1/_authorization/inventory-counts-approve'],
        ];
    }

    /**
     * @return array{token: string, csrf: string}
     */
    private function createIdentity(?string $roleCode, string $username, string $displayName): array
    {
        $userId = (int) DB::table('users')->insertGetId([
            'username' => $username,
            'display_name' => $displayName,
            'password_hash' => Hash::make('engine test password'),
            'is_active' => true,
        ]);
        if ($roleCode !== null) {
            $roleId = DB::table('roles')->where('code', $roleCode)->value('id');
            self::assertNotNull($roleId);
            DB::table('user_roles')->insert(['user_id' => $userId, 'role_id' => $roleId]);
        }

        $token = bin2hex(random_bytes(32));
        $csrf = bin2hex(random_bytes(32));
        DB::table('auth_sessions')->insert([
            'user_id' => $userId,
            'token_hash' => hash('sha256', $token, true),
            'csrf_token_hash' => hash('sha256', $csrf, true),
            'expires_at' => now()->addHours(12),
            'last_seen_at' => now(),
        ]);

        return ['token' => $token, 'csrf' => $csrf];
    }

    private function assignRole(int $userId, string $roleCode): void
    {
        $roleId = DB::table('roles')->where('code', $roleCode)->value('id');
        self::assertNotNull($roleId);
        DB::table('user_roles')->insert(['user_id' => $userId, 'role_id' => $roleId]);
    }

    /**
     * @param  array{token: string, csrf: string}  $identity
     */
    private function requestWithIdentity(array $identity, string $permission)
    {
        $route = $this->permissionRoutes()[$permission];
        $request = $this->withCredentials()
            ->withUnencryptedCookie('precision_slate_session', $identity['token'])
            ->withHeader('X-CSRF-Token', $identity['csrf']);

        return match ($route['method']) {
            'GET' => $request->getJson($route['path']),
            'POST' => $request->postJson($route['path']),
            'PUT' => $request->putJson($route['path']),
            'PATCH' => $request->patchJson($route['path']),
        };
    }

    private function registerPermissionTestRoutes(): void
    {
        foreach ($this->permissionRoutes() as $permission => $route) {
            $middleware = ['api.session'];

            if ($route['method'] !== 'GET') {
                $middleware[] = 'api.csrf';
            }

            $middleware[] = "api.permission:{$permission}";
            Route::match(
                [$route['method']],
                $route['path'],
                fn () => response()->json(['data' => ['allowed' => true]]),
            )->middleware($middleware);
        }

        Route::get('/api/v1/_authorization/no-permission', fn () => response()->json(['data' => ['allowed' => true]]))
            ->middleware(['api.session', 'api.permission']);

        Route::get('/api/v1/_authorization/driver-financial', fn () => response()->json(['data' => ['allowed' => true]]))
            ->middleware(['api.session', 'api.step_up', 'api.permission:costs.view']);
        Route::get('/api/v1/_authorization/treasury-financial', fn () => response()->json(['data' => ['allowed' => true]]))
            ->middleware(['api.session', 'api.permission:treasury.view', 'api.step_up']);
    }

    private function responseCookie($response, string $name): Cookie
    {
        foreach ($response->headers->getCookies() as $cookie) {
            if ($cookie->getName() === $name) {
                return $cookie;
            }
        }

        self::fail("Expected response cookie {$name} was not set.");
    }
}
