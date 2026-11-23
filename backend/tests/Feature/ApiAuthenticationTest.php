<?php

namespace Tests\Feature;

use App\Models\User;
use Database\Seeders\RolePermissionMatrixSeeder;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;
use PHPUnit\Framework\Attributes\Test;
use RuntimeException;
use Symfony\Component\HttpFoundation\Cookie;
use Tests\TestCase;

class ApiAuthenticationTest extends TestCase
{
    private bool $usesTemporaryTables = false;

    protected function setUp(): void
    {
        parent::setUp();

        $connection = DB::connection();
        $driver = $connection->getDriverName();

        if (in_array($driver, ['mysql', 'mariadb'], true)) {
            if ($connection->getDatabaseName() !== 'erp_acceptance_tests') {
                throw new RuntimeException('Authentication integration tests require the erp_acceptance_tests database.');
            }

            $this->usesTemporaryTables = true;
            $this->createTemporaryAuthTables();
            app(RolePermissionMatrixSeeder::class)->run();

            return;
        }

        Schema::dropIfExists('role_permissions');
        Schema::dropIfExists('user_roles');
        Schema::dropIfExists('permissions');
        Schema::dropIfExists('roles');
        Schema::dropIfExists('audit_logs');
        Schema::dropIfExists('auth_sessions');
        Schema::dropIfExists('users');
        Schema::create('users', function (Blueprint $table): void {
            $table->bigIncrements('id');
            $table->string('username', 100)->nullable()->unique();
            $table->string('phone', 32)->nullable()->unique();
            $table->string('email', 254)->nullable()->unique();
            $table->string('display_name', 160);
            $table->string('password_hash', 255);
            $table->boolean('is_active')->default(true);
            $table->dateTime('password_changed_at')->nullable();
            $table->dateTime('last_login_at')->nullable();
            $table->timestamps();
        });
        Schema::create('auth_sessions', function (Blueprint $table): void {
            $table->bigIncrements('id');
            $table->unsignedBigInteger('user_id');
            $table->binary('token_hash', 32)->unique();
            $table->binary('csrf_token_hash', 32)->nullable();
            $table->dateTime('expires_at');
            $table->dateTime('last_seen_at')->nullable();
            $table->dateTime('step_up_verified_at')->nullable();
            $table->dateTime('revoked_at')->nullable();
            $table->timestamp('created_at')->useCurrent();
        });
        Schema::create('roles', function (Blueprint $table): void {
            $table->bigIncrements('id');
            $table->string('code', 80)->unique();
            $table->string('name', 120);
            $table->string('description', 500)->nullable();
            $table->boolean('is_system')->default(false);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
        Schema::create('permissions', function (Blueprint $table): void {
            $table->bigIncrements('id');
            $table->string('code', 120)->unique();
            $table->string('description', 500)->nullable();
            $table->timestamp('created_at')->useCurrent();
        });
        Schema::create('user_roles', function (Blueprint $table): void {
            $table->unsignedBigInteger('user_id');
            $table->unsignedBigInteger('role_id');
            $table->unsignedBigInteger('granted_by_user_id')->nullable();
            $table->timestamp('granted_at')->useCurrent();
            $table->primary(['user_id', 'role_id']);
        });
        Schema::create('role_permissions', function (Blueprint $table): void {
            $table->unsignedBigInteger('role_id');
            $table->unsignedBigInteger('permission_id');
            $table->timestamp('granted_at')->useCurrent();
            $table->primary(['role_id', 'permission_id']);
        });
        Schema::create('audit_logs', function (Blueprint $table): void {
            $table->bigIncrements('id');
            $table->unsignedBigInteger('actor_user_id')->nullable();
            $table->string('actor_name_snapshot', 160)->nullable();
            $table->string('action', 100);
            $table->string('entity_type', 100);
            $table->unsignedBigInteger('entity_id')->nullable();
            $table->string('reason', 1000)->nullable();
            $table->longText('before_data')->nullable();
            $table->longText('after_data')->nullable();
            $table->string('request_id', 100)->nullable();
            $table->binary('ip_address', 16)->nullable();
            $table->string('user_agent', 500)->nullable();
            $table->timestamp('created_at')->useCurrent();
        });
        app(RolePermissionMatrixSeeder::class)->run();
    }

    protected function tearDown(): void
    {
        if ($this->usesTemporaryTables) {
            DB::statement('DROP TEMPORARY TABLE IF EXISTS auth_sessions');
            DB::statement('DROP TEMPORARY TABLE IF EXISTS role_permissions');
            DB::statement('DROP TEMPORARY TABLE IF EXISTS user_roles');
            DB::statement('DROP TEMPORARY TABLE IF EXISTS permissions');
            DB::statement('DROP TEMPORARY TABLE IF EXISTS roles');
            DB::statement('DROP TEMPORARY TABLE IF EXISTS audit_logs');
            DB::statement('DROP TEMPORARY TABLE IF EXISTS user_account_limits');
            DB::statement('DROP TEMPORARY TABLE IF EXISTS users');
        }

        parent::tearDown();
    }

    #[Test]
    public function login_issues_an_http_only_session_cookie_and_readable_csrf_cookie(): void
    {
        $userId = $this->createUser();

        $response = $this->postJson('/api/v1/auth/login', [
            'username' => 'staff-one',
            'password' => 'correct test password',
        ]);

        $response->assertOk()
            ->assertJsonPath('data.user.id', $userId)
            ->assertJsonPath('data.user.username', 'staff-one')
            ->assertJsonMissingPath('data.user.password_hash')
            ->assertJsonStructure(['data' => ['user', 'csrf_token'], 'meta' => ['request_id']]);

        $sessionCookie = $this->responseCookie($response, 'precision_slate_session');
        $csrfCookie = $this->responseCookie($response, 'XSRF-TOKEN');

        self::assertTrue($sessionCookie->isHttpOnly());
        self::assertSame('lax', $sessionCookie->getSameSite());
        self::assertFalse($csrfCookie->isHttpOnly());
        self::assertSame($response->json('data.csrf_token'), $csrfCookie->getValue());

        $session = DB::table('auth_sessions')->first();
        self::assertSame(hash('sha256', $sessionCookie->getValue(), true), $session->token_hash);
        self::assertSame(hash('sha256', $csrfCookie->getValue(), true), $session->csrf_token_hash);
        self::assertNotSame($sessionCookie->getValue(), $session->token_hash);
    }

    #[Test]
    public function route_list_shows_only_health_and_login_as_public_and_protects_all_other_routes(): void
    {
        Artisan::call('route:list', ['--path' => 'api/v1', '--json' => true]);
        $routeRows = json_decode(Artisan::output(), true, 512, JSON_THROW_ON_ERROR);
        $routes = array_values(array_filter(
            $routeRows,
            static fn (array $route): bool => str_starts_with($route['uri'], 'api/v1/'),
        ));
        self::assertNotEmpty($routes);
        $routesByName = [];

        foreach ($routes as $route) {
            $middleware = $route['middleware'];
            $routesByName[$route['name']] = $route;

            if (in_array($route['name'], ['health', 'auth.login-options', 'auth.login', 'mobile.auth.login'], true)) {
                self::assertNotContains('api.session', $middleware);
                self::assertNotContains('api.mobile', $middleware);
                self::assertFalse((bool) array_filter(
                    $middleware,
                    static fn (string $item): bool => str_starts_with($item, 'api.permission'),
                ));

                if (in_array($route['name'], ['auth.login', 'mobile.auth.login'], true)) {
                    self::assertContains('throttle:5,1', $middleware);
                }

                continue;
            }

            $usesBrowserSession = in_array('api.session', $middleware, true);
            $usesMobileToken = in_array('api.mobile', $middleware, true);
            if (in_array('api.customer_picker', $middleware, true)) {
                self::assertFalse($usesBrowserSession);
                self::assertFalse($usesMobileToken);
            } else {
                self::assertNotSame($usesBrowserSession, $usesMobileToken, 'Each protected route must use exactly one authentication scope.');
            }
            self::assertTrue((bool) array_filter(
                $middleware,
                static fn (string $item): bool => str_starts_with($item, 'api.permission:'),
            ));

            $methods = explode('|', $route['method']);
            if ($usesBrowserSession && array_diff($methods, ['GET', 'HEAD', 'OPTIONS']) !== []) {
                self::assertContains('api.csrf', $middleware, $route['uri'].' must require CSRF validation.');
            }
        }

        self::assertContains('api.customer_picker', $routesByName['customers.index']['middleware']);
        self::assertContains('api.permission:users.view_self', $routesByName['auth.me']['middleware']);
        self::assertContains('api.csrf', $routesByName['auth.logout']['middleware']);
        self::assertContains('api.permission:sessions.revoke_self', $routesByName['auth.logout']['middleware']);
        self::assertContains('api.permission:users.manage', $routesByName['users.password.reset']['middleware']);
        self::assertContains('api.csrf', $routesByName['users.password.reset']['middleware']);
    }

    #[Test]
    public function login_is_limited_to_five_attempts_per_minute(): void
    {
        $this->createUser();

        for ($attempt = 0; $attempt < 5; $attempt++) {
            $this->postJson('/api/v1/auth/login', [
                'username' => 'staff-one',
                'password' => 'incorrect test password',
            ])->assertUnauthorized();
        }

        $this->postJson('/api/v1/auth/login', [
            'username' => 'staff-one',
            'password' => 'incorrect test password',
        ])->assertStatus(429);
    }

    #[Test]
    public function production_auth_cookies_are_secure_even_if_the_cookie_override_is_false(): void
    {
        $this->app['env'] = 'production';
        config([
            'session.secure' => false,
            'session.same_site' => 'lax',
        ]);
        $this->createUser();

        $response = $this->postJson('/api/v1/auth/login', [
            'username' => 'staff-one',
            'password' => 'correct test password',
        ]);
        $response->assertOk();

        $sessionCookie = $this->responseCookie($response, 'precision_slate_session');
        $csrfCookie = $this->responseCookie($response, 'XSRF-TOKEN');
        self::assertTrue($sessionCookie->isSecure());
        self::assertTrue($sessionCookie->isHttpOnly());
        self::assertSame('lax', $sessionCookie->getSameSite());
        self::assertTrue($csrfCookie->isSecure());
        self::assertFalse($csrfCookie->isHttpOnly());
        self::assertSame('lax', $csrfCookie->getSameSite());
    }

    #[Test]
    public function owner_can_manually_reset_another_owners_password_and_revoke_their_sessions(): void
    {
        $ownerId = $this->createUser(['username' => 'owner-one'], 'owner');
        $targetId = $this->createUser(['username' => 'owner-two'], 'owner');
        $ownerSession = $this->createSession($ownerId, ['step_up_verified_at' => now()]);
        $targetSession = $this->createSession($targetId);
        $newPassword = bin2hex(random_bytes(24));

        $response = $this->withCredentials()
            ->withUnencryptedCookie('precision_slate_session', $ownerSession['token'])
            ->postJson(
                "/api/v1/users/{$targetId}/password",
                [
                    'new_password' => $newPassword,
                    'new_password_confirmation' => $newPassword,
                ],
                ['X-CSRF-Token' => $ownerSession['csrf']],
            );

        $response->assertOk()
            ->assertJsonPath('data.status', 'password_reset');
        self::assertStringNotContainsString($newPassword, (string) $response->getContent());

        $user = DB::table('users')->where('id', $targetId)->first();
        self::assertTrue(Hash::check($newPassword, $user->password_hash));
        self::assertNotNull($user->password_changed_at);
        self::assertNotNull(DB::table('auth_sessions')->where('id', $targetSession['id'])->value('revoked_at'));

        $targetLogin = $this->postJson('/api/v1/auth/login', [
            'username' => 'owner-two',
            'password' => $newPassword,
        ]);
        $targetLogin->assertOk();
        $targetSessionToken = $this->responseCookie($targetLogin, 'precision_slate_session')->getValue();
        $targetCsrfToken = $this->responseCookie($targetLogin, 'XSRF-TOKEN')->getValue();
        $this->withCredentials()
            ->withUnencryptedCookie('precision_slate_session', $targetSessionToken)
            ->postJson('/api/v1/auth/reauth', [
                'password' => $newPassword,
            ], ['X-CSRF-Token' => $targetCsrfToken])
            ->assertOk();
        $reverseResetPassword = bin2hex(random_bytes(24));

        $this->withCredentials()
            ->withUnencryptedCookie('precision_slate_session', $targetSessionToken)
            ->postJson(
                "/api/v1/users/{$ownerId}/password",
                [
                    'new_password' => $reverseResetPassword,
                    'new_password_confirmation' => $reverseResetPassword,
                ],
                ['X-CSRF-Token' => $targetCsrfToken],
            )
            ->assertOk()
            ->assertJsonPath('data.status', 'password_reset');

        self::assertTrue(Hash::check(
            $reverseResetPassword,
            DB::table('users')->where('id', $ownerId)->value('password_hash'),
        ));
        self::assertSame(2, DB::table('audit_logs')->where('action', 'user.password_reset')->count());
        self::assertSame(1, DB::table('audit_logs')->where('action', 'auth.step_up_completed')->count());

        foreach (DB::table('audit_logs')->where('action', 'user.password_reset')->get() as $audit) {
            self::assertSame('user.password_reset', $audit->action);
            self::assertSame('user', $audit->entity_type);
            self::assertContains((int) $audit->actor_user_id, [$ownerId, $targetId]);
            self::assertContains((int) $audit->entity_id, [$ownerId, $targetId]);
            self::assertStringNotContainsString($newPassword, (string) $audit->after_data);
            self::assertStringNotContainsString($reverseResetPassword, (string) $audit->after_data);
        }
    }

    #[Test]
    public function user_without_management_permission_cannot_reset_another_password(): void
    {
        $readerId = $this->createUser(['username' => 'password-reset-reader']);
        $targetId = $this->createUser(['username' => 'password-reset-target'], 'owner');
        $readerSession = $this->createSession($readerId);
        $newPassword = bin2hex(random_bytes(24));

        $this->withCredentials()
            ->withUnencryptedCookie('precision_slate_session', $readerSession['token'])
            ->postJson(
                "/api/v1/users/{$targetId}/password",
                [
                    'new_password' => $newPassword,
                    'new_password_confirmation' => $newPassword,
                ],
                ['X-CSRF-Token' => $readerSession['csrf']],
            )
            ->assertForbidden();

        self::assertSame(0, DB::table('audit_logs')->count());
    }

    #[Test]
    public function users_create_owner_prompts_for_a_hidden_password_and_assigns_the_owner_role(): void
    {
        $password = bin2hex(random_bytes(24));

        $this->artisan('users:create-owner')
            ->expectsQuestion('Username', 'throwaway-owner-step-b2')
            ->expectsQuestion('Display name', 'Throwaway owner Step B2')
            ->expectsQuestion('Password', $password)
            ->expectsQuestion('Confirm password', $password)
            ->expectsOutput('Owner account throwaway-owner-step-b2 created.')
            ->assertExitCode(0);

        $user = DB::table('users')->where('username', 'throwaway-owner-step-b2')->first();
        self::assertNotNull($user);
        self::assertTrue(Hash::check($password, $user->password_hash));
        self::assertSame(
            1,
            DB::table('user_roles')
                ->join('roles', 'roles.id', '=', 'user_roles.role_id')
                ->where('user_roles.user_id', $user->id)
                ->where('roles.code', 'owner')
                ->count(),
        );
    }

    #[Test]
    public function owner_password_creation_and_reset_reject_passwords_shorter_than_twelve_characters(): void
    {
        $ownerId = $this->createUser(['username' => 'password-policy-owner'], 'owner');
        $ownerSession = $this->createSession($ownerId, ['step_up_verified_at' => now()]);
        $shortPassword = 'short-pass';

        $this->withCredentials()
            ->withUnencryptedCookie('precision_slate_session', $ownerSession['token'])
            ->postJson(
                "/api/v1/users/{$ownerId}/password",
                [
                    'new_password' => $shortPassword,
                    'new_password_confirmation' => $shortPassword,
                ],
                ['X-CSRF-Token' => $ownerSession['csrf']],
            )
            ->assertUnprocessable()
            ->assertJsonPath('error.code', 'VALIDATION_FAILED');

        $username = 'short-password-owner-'.bin2hex(random_bytes(4));
        $this->artisan('users:create-owner')
            ->expectsQuestion('Username', $username)
            ->expectsQuestion('Display name', 'Short password owner')
            ->expectsQuestion('Password', $shortPassword)
            ->expectsQuestion('Confirm password', $shortPassword)
            ->assertExitCode(1);

        self::assertSame(0, DB::table('users')->where('username', $username)->count());
        self::assertTrue(Hash::check(
            'correct test password',
            DB::table('users')->where('id', $ownerId)->value('password_hash'),
        ));
    }

    #[Test]
    public function user_administration_is_owner_only_and_audited_without_finance_step_up(): void
    {
        $ownerId = $this->createUser(['username' => 'user-admin-owner'], 'owner');
        $session = $this->createSession($ownerId);

        $this->withCredentials()
            ->withUnencryptedCookie('precision_slate_session', $session['token'])
            ->getJson('/api/v1/users')
            ->assertOk();
        self::assertSame(0, DB::table('audit_logs')->count());

        $password = bin2hex(random_bytes(24));
        $created = $this->withCredentials()
            ->withUnencryptedCookie('precision_slate_session', $session['token'])
            ->postJson('/api/v1/users', [
                'username' => 'new-admin-driver',
                'display_name' => 'New admin driver',
                'password' => $password,
                'password_confirmation' => $password,
                'role_codes' => ['driver'],
            ], ['X-CSRF-Token' => $session['csrf']])
            ->assertCreated();
        self::assertStringNotContainsString($password, (string) $created->getContent());
        self::assertStringNotContainsString('password_hash', (string) $created->getContent());
        $targetId = (int) $created->json('data.id');

        $assigned = $this->withCredentials()
            ->withUnencryptedCookie('precision_slate_session', $session['token'])
            ->putJson("/api/v1/users/{$targetId}/roles", [
                'role_codes' => ['driver'],
            ], ['X-CSRF-Token' => $session['csrf']])
            ->assertOk()
            ->assertJsonPath('data.roles.0.code', 'driver')
            ->assertJsonFragment(['invoices.create']);
        self::assertStringNotContainsString('treasury.view', (string) $assigned->getContent());
        self::assertStringNotContainsString('company_price', (string) $assigned->getContent());
        self::assertStringNotContainsString('password_hash', (string) $assigned->getContent());

        $this->withCredentials()
            ->withUnencryptedCookie('precision_slate_session', $session['token'])
            ->putJson("/api/v1/users/{$targetId}", [
                'is_active' => false,
            ], ['X-CSRF-Token' => $session['csrf']])
            ->assertOk()
            ->assertJsonPath('data.is_active', false);

        self::assertSame(3, DB::table('audit_logs')->whereIn('action', ['user.created', 'user.updated', 'user.roles_assigned'])->count());
        self::assertNotNull(DB::table('auth_sessions')->where('id', $session['id'])->value('last_seen_at'));
    }

    #[Test]
    public function account_limit_can_be_managed_and_delete_deactivates_without_erasing_history(): void
    {
        $ownerId = $this->createUser(['username' => 'account-limit-owner'], 'owner');
        $session = $this->createSession($ownerId);
        DB::table('user_account_limits')->where('id', 1)->update(['max_active_users' => 10]);

        try {
            $this->withCredentials()
                ->withUnencryptedCookie('precision_slate_session', $session['token'])
                ->getJson('/api/v1/users')
                ->assertOk()
                ->assertJsonPath('meta.active_user_count', 1)
                ->assertJsonPath('meta.max_active_users', 10);

            $this->withCredentials()
                ->withUnencryptedCookie('precision_slate_session', $session['token'])
                ->putJson('/api/v1/settings/general', ['max_active_users' => 1], ['X-CSRF-Token' => $session['csrf']])
                ->assertOk()
                ->assertJsonPath('data.max_active_users', 1);

            $password = bin2hex(random_bytes(24));
            $this->withCredentials()
                ->withUnencryptedCookie('precision_slate_session', $session['token'])
                ->postJson('/api/v1/users', [
                    'username' => 'account-limit-blocked',
                    'display_name' => 'Blocked by account limit',
                    'password' => $password,
                    'password_confirmation' => $password,
                    'role_codes' => ['driver'],
                ], ['X-CSRF-Token' => $session['csrf']])
                ->assertUnprocessable()
                ->assertJsonStructure(['error' => ['details' => ['account_limit']]]);

            $this->withCredentials()
                ->withUnencryptedCookie('precision_slate_session', $session['token'])
                ->putJson('/api/v1/settings/general', ['max_active_users' => 2], ['X-CSRF-Token' => $session['csrf']])
                ->assertOk()
                ->assertJsonPath('data.max_active_users', 2);

            $created = $this->withCredentials()
                ->withUnencryptedCookie('precision_slate_session', $session['token'])
                ->postJson('/api/v1/users', [
                    'username' => 'account-limit-target',
                    'display_name' => 'Account limit target',
                    'password' => $password,
                    'password_confirmation' => $password,
                    'role_codes' => ['driver'],
                ], ['X-CSRF-Token' => $session['csrf']])
                ->assertCreated();
            $targetId = (int) $created->json('data.id');
            $targetSession = $this->createSession($targetId);

            $this->withCredentials()
                ->withUnencryptedCookie('precision_slate_session', $session['token'])
                ->putJson('/api/v1/settings/general', ['max_active_users' => 1], ['X-CSRF-Token' => $session['csrf']])
                ->assertUnprocessable()
                ->assertJsonStructure(['error' => ['details' => ['max_active_users']]]);

            $this->withCredentials()
                ->withUnencryptedCookie('precision_slate_session', $session['token'])
                ->deleteJson("/api/v1/users/{$targetId}", [], ['X-CSRF-Token' => $session['csrf']])
                ->assertOk()
                ->assertJsonPath('data.deleted', true)
                ->assertJsonPath('data.is_active', false);

            self::assertFalse((bool) DB::table('users')->where('id', $targetId)->value('is_active'));
            self::assertNotNull(DB::table('auth_sessions')->where('id', $targetSession['id'])->value('revoked_at'));
            self::assertSame(1, DB::table('users')->where('id', $targetId)->count());
            self::assertSame(1, DB::table('audit_logs')->where('action', 'user.deactivated')->where('entity_id', $targetId)->count());
        } finally {
            DB::table('user_account_limits')->where('id', 1)->update(['max_active_users' => 10]);
        }
    }

    #[Test]
    public function login_options_include_accounts_beyond_the_old_two_hundred_user_cutoff(): void
    {
        $suffix = bin2hex(random_bytes(4));
        for ($index = 0; $index < 200; $index++) {
            DB::table('users')->insert([
                'username' => "login-option-{$suffix}-{$index}",
                'display_name' => sprintf('A login option %03d', $index),
                'password_hash' => Hash::make('fixture password'),
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
        $lateUsername = "zz-login-option-{$suffix}";
        DB::table('users')->insert([
            'username' => $lateUsername,
            'display_name' => 'Z login option after two hundred users',
            'password_hash' => Hash::make('fixture password'),
            'is_active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->getJson('/api/v1/auth/login-options')
            ->assertOk()
            ->assertJsonFragment(['username' => $lateUsername, 'display_name' => 'Z login option after two hundred users']);
    }

    #[Test]
    public function bad_password_and_unknown_username_have_the_same_authentication_error(): void
    {
        $this->createUser();

        $badPassword = $this->postJson('/api/v1/auth/login', [
            'username' => 'staff-one',
            'password' => 'wrong test password',
        ]);
        $unknownUser = $this->postJson('/api/v1/auth/login', [
            'username' => 'unknown-user',
            'password' => 'wrong test password',
        ]);

        $badPassword->assertUnauthorized()
            ->assertJsonPath('error.code', 'AUTHENTICATION_FAILED')
            ->assertJsonPath('error.message', 'Invalid username or password.');
        self::assertSame($badPassword->json('error'), $unknownUser->json('error'));
        self::assertSame(0, DB::table('auth_sessions')->count());
    }

    #[Test]
    public function inactive_accounts_receive_the_same_authentication_error_as_invalid_credentials(): void
    {
        $this->createUser(['is_active' => false]);

        $this->postJson('/api/v1/auth/login', [
            'username' => 'staff-one',
            'password' => 'correct test password',
        ])
            ->assertUnauthorized()
            ->assertJsonPath('error.code', 'AUTHENTICATION_FAILED')
            ->assertJsonPath('error.message', 'Invalid username or password.');

        self::assertSame(0, DB::table('auth_sessions')->count());
    }

    #[Test]
    public function login_validation_uses_arabic_field_names_and_messages(): void
    {
        app()->setLocale('ar');

        $this->postJson('/api/v1/auth/login', [])
            ->assertUnprocessable()
            ->assertJsonPath('error.details.username.0', 'حقل اسم المستخدم مطلوب.')
            ->assertJsonPath('error.details.password.0', 'حقل كلمة المرور مطلوب.');
    }

    #[Test]
    public function current_user_requires_an_authenticated_session(): void
    {
        $this->getJson('/api/v1/auth/me')
            ->assertUnauthorized()
            ->assertJsonPath('error.code', 'UNAUTHENTICATED');
    }

    #[Test]
    public function authenticated_session_can_read_the_current_user(): void
    {
        $userId = $this->createUser();
        $session = $this->createSession($userId);

        $this->withCredentials()->withUnencryptedCookie('precision_slate_session', $session['token'])
            ->getJson('/api/v1/auth/me')
            ->assertOk()
            ->assertJsonPath('data.user.id', $userId)
            ->assertJsonPath('data.user.username', 'staff-one')
            ->assertJsonPath('data.user.role', 'read_only')
            ->assertJsonPath('data.user.roles.0', 'read_only')
            ->assertJsonMissingPath('data.user.password_hash');

        self::assertNotNull(DB::table('auth_sessions')->value('last_seen_at'));
    }

    #[Test]
    public function user_model_uses_the_approved_schema_and_hides_password_hashes(): void
    {
        $userId = $this->createUser();

        $user = User::query()->findOrFail($userId);

        self::assertSame('password_hash', $user->getAuthPasswordName());
        self::assertSame('staff-one', $user->username);
        self::assertArrayNotHasKey('password_hash', $user->toArray());
    }

    #[Test]
    public function logout_requires_csrf_and_revokes_the_session_on_success(): void
    {
        $userId = $this->createUser();
        $session = $this->createSession($userId);

        $this->withCredentials()->withUnencryptedCookie('precision_slate_session', $session['token'])
            ->postJson('/api/v1/auth/logout')
            ->assertStatus(419)
            ->assertJsonPath('error.code', 'CSRF_TOKEN_MISMATCH');
        self::assertNull(DB::table('auth_sessions')->value('revoked_at'));

        $this->withCredentials()
            ->withUnencryptedCookie('precision_slate_session', $session['token'])
            ->postJson('/api/v1/auth/logout', [], ['X-CSRF-Token' => str_repeat('a', 64)])
            ->assertStatus(419)
            ->assertJsonPath('error.code', 'CSRF_TOKEN_MISMATCH');
        self::assertNull(DB::table('auth_sessions')->value('revoked_at'));

        DB::table('auth_sessions')->update(['csrf_token_hash' => null]);
        $this->withCredentials()
            ->withUnencryptedCookie('precision_slate_session', $session['token'])
            ->postJson('/api/v1/auth/logout', [], ['X-CSRF-Token' => $session['csrf']])
            ->assertStatus(419)
            ->assertJsonPath('error.code', 'CSRF_TOKEN_MISMATCH');
        self::assertNull(DB::table('auth_sessions')->value('revoked_at'));

        DB::table('auth_sessions')->update([
            'csrf_token_hash' => hash('sha256', $session['csrf'], true),
        ]);
        $this->withCredentials()->withUnencryptedCookie('precision_slate_session', $session['token'])
            ->postJson('/api/v1/auth/logout', [], ['X-CSRF-Token' => $session['csrf']])
            ->assertOk()
            ->assertJsonPath('data.status', 'signed_out');
        self::assertNotNull(DB::table('auth_sessions')->value('revoked_at'));
    }

    #[Test]
    public function idle_expired_sessions_are_revoked_and_rejected(): void
    {
        $userId = $this->createUser();
        $session = $this->createSession($userId, [
            'last_seen_at' => now()->subMinutes(31),
        ]);

        $this->withCredentials()->withUnencryptedCookie('precision_slate_session', $session['token'])
            ->getJson('/api/v1/auth/me')
            ->assertUnauthorized()
            ->assertJsonPath('error.code', 'UNAUTHENTICATED');

        self::assertNotNull(DB::table('auth_sessions')->value('revoked_at'));
    }

    #[Test]
    public function sessions_created_before_a_password_change_are_revoked(): void
    {
        $userId = $this->createUser(['password_changed_at' => now()->subMinute()]);
        $session = $this->createSession($userId, ['created_at' => now()->subMinutes(2)]);

        $this->withCredentials()->withUnencryptedCookie('precision_slate_session', $session['token'])
            ->getJson('/api/v1/auth/me')
            ->assertUnauthorized();

        self::assertNotNull(DB::table('auth_sessions')->value('revoked_at'));
    }

    #[Test]
    public function login_rotates_an_existing_session_cookie(): void
    {
        $userId = $this->createUser();
        $existing = $this->createSession($userId);

        $response = $this->withCredentials()->withUnencryptedCookie('precision_slate_session', $existing['token'])
            ->postJson('/api/v1/auth/login', [
                'username' => 'staff-one',
                'password' => 'correct test password',
            ]);

        $response->assertOk();
        self::assertNotNull(DB::table('auth_sessions')->where('token_hash', $existing['hash'])->value('revoked_at'));

        $newCookie = $this->responseCookie($response, 'precision_slate_session');
        self::assertNotSame($existing['token'], $newCookie->getValue());
        self::assertSame(2, DB::table('auth_sessions')->count());
    }

    #[Test]
    public function scheduled_pruner_applies_idle_expiry_and_ninety_day_retention(): void
    {
        $userId = $this->createUser();
        $oldRevoked = $this->createSession($userId, [
            'revoked_at' => now()->subDays(91),
        ]);
        $recentRevoked = $this->createSession($userId, [
            'revoked_at' => now()->subDays(89),
        ]);
        $expired = $this->createSession($userId, [
            'created_at' => now()->subHours(13),
            'last_seen_at' => now()->subHours(13),
            'expires_at' => now()->subSecond(),
        ]);
        $idle = $this->createSession($userId, [
            'last_seen_at' => now()->subMinutes(31),
        ]);
        $active = $this->createSession($userId);

        $this->artisan('auth-sessions:prune')
            ->expectsOutput('Revoked 2 expired or idle sessions; deleted 1 records beyond retention.')
            ->assertExitCode(0);

        self::assertSame(0, DB::table('auth_sessions')->where('id', $oldRevoked['id'])->count());
        self::assertNotNull(DB::table('auth_sessions')->where('id', $recentRevoked['id'])->value('revoked_at'));
        self::assertNotNull(DB::table('auth_sessions')->where('id', $expired['id'])->value('revoked_at'));
        self::assertNotNull(DB::table('auth_sessions')->where('id', $idle['id'])->value('revoked_at'));
        self::assertNull(DB::table('auth_sessions')->where('id', $active['id'])->value('revoked_at'));
    }

    /**
     * @param  array<string, mixed>  $overrides
     */
    private function createUser(array $overrides = [], string $roleCode = 'read_only'): int
    {
        $userId = (int) DB::table('users')->insertGetId(array_replace([
            'username' => 'staff-one',
            'display_name' => 'Staff One',
            'password_hash' => Hash::make('correct test password'),
            'is_active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ], $overrides));
        $roleId = DB::table('roles')->where('code', $roleCode)->value('id');
        DB::table('user_roles')->insert(['user_id' => $userId, 'role_id' => $roleId]);

        return $userId;
    }

    private function createTemporaryAuthTables(): void
    {
        DB::statement(<<<'SQL'
            CREATE TEMPORARY TABLE users (
                id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(100) NULL UNIQUE,
                phone VARCHAR(32) NULL UNIQUE,
                email VARCHAR(254) NULL UNIQUE,
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
            CREATE TEMPORARY TABLE user_account_limits (
                id TINYINT UNSIGNED NOT NULL PRIMARY KEY,
                max_active_users SMALLINT UNSIGNED NOT NULL DEFAULT 10,
                updated_by_user_id BIGINT UNSIGNED NULL,
                created_at TIMESTAMP NULL,
                updated_at TIMESTAMP NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            SQL);
        DB::table('user_account_limits')->insert([
            'id' => 1,
            'max_active_users' => 10,
        ]);
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
        DB::statement(<<<'SQL'
            CREATE TEMPORARY TABLE audit_logs (
                id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
                actor_user_id BIGINT UNSIGNED NULL,
                actor_name_snapshot VARCHAR(160) NULL,
                action VARCHAR(100) NOT NULL,
                entity_type VARCHAR(100) NOT NULL,
                entity_id BIGINT UNSIGNED NULL,
                reason VARCHAR(1000) NULL,
                before_data LONGTEXT NULL,
                after_data LONGTEXT NULL,
                request_id VARCHAR(100) NULL,
                ip_address VARBINARY(16) NULL,
                user_agent VARCHAR(500) NULL,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            SQL);
    }

    /**
     * @param  array<string, mixed>  $overrides
     * @return array{id: int, token: string, csrf: string, hash: string}
     */
    private function createSession(int $userId, array $overrides = []): array
    {
        $token = bin2hex(random_bytes(32));
        $csrf = bin2hex(random_bytes(32));
        $hash = hash('sha256', $token, true);
        $id = (int) DB::table('auth_sessions')->insertGetId(array_replace([
            'user_id' => $userId,
            'token_hash' => $hash,
            'csrf_token_hash' => hash('sha256', $csrf, true),
            'expires_at' => now()->addHours(12),
            'last_seen_at' => now(),
            'revoked_at' => null,
            'created_at' => now(),
        ], $overrides));

        return ['id' => $id, 'token' => $token, 'csrf' => $csrf, 'hash' => $hash];
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
