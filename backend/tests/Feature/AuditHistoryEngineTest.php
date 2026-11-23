<?php

namespace Tests\Feature;

use Database\Seeders\RolePermissionMatrixSeeder;
use Illuminate\Support\Facades\DB;
use PHPUnit\Framework\Attributes\Test;
use RuntimeException;
use Tests\TestCase;

class AuditHistoryEngineTest extends TestCase
{
    private ?string $auditTestConnection = null;

    protected function setUp(): void
    {
        parent::setUp();

        $connection = getenv('AUTH_TEST_CONNECTION');
        if (! is_string($connection) || ! in_array($connection, ['mysql_test', 'mariadb_test'], true)) {
            $this->markTestSkipped('Set AUTH_TEST_CONNECTION to mysql_test or mariadb_test to run audit history engine coverage.');
        }

        $this->auditTestConnection = $connection;
        config(['database.default' => $connection]);
        DB::setDefaultConnection($connection);
        DB::purge($connection);
        if (config("database.connections.{$connection}.database") !== 'erp_acceptance_tests'
            || (DB::selectOne('SELECT DATABASE() AS database_name')->database_name ?? null) !== 'erp_acceptance_tests') {
            throw new RuntimeException('Audit history integration tests require the erp_acceptance_tests database.');
        }

        $this->createTemporaryTables();
        app(RolePermissionMatrixSeeder::class)->run();
    }

    protected function tearDown(): void
    {
        if ($this->auditTestConnection !== null) {
            foreach (['audit_logs', 'sales_documents', 'auth_sessions', 'role_permissions', 'user_roles', 'permissions', 'roles', 'users'] as $table) {
                DB::statement("DROP TEMPORARY TABLE IF EXISTS `{$table}`");
            }
            DB::purge($this->auditTestConnection);
        }

        parent::tearDown();
    }

    #[Test]
    public function audit_log_filters_and_pagination_use_inclusive_dates_and_stable_sorting(): void
    {
        $ownerId = $this->createUserWithRole('owner');
        $session = $this->createSession($ownerId, now());

        $firstMatchingId = $this->recordAudit([
            'entity_type' => 'sales_document',
            'entity_id' => 41,
            'actor_user_id' => 2,
            'created_at' => '2026-01-15 10:00:00',
        ]);
        $secondMatchingId = $this->recordAudit([
            'sales_document_id' => 41,
            'entity_type' => 'sales_document',
            'entity_id' => 41,
            'actor_user_id' => 2,
            'created_at' => '2026-01-15 10:00:00',
        ]);
        $latestMatchingId = $this->recordAudit([
            'sales_document_id' => 41,
            'entity_type' => 'sales_document',
            'entity_id' => 41,
            'actor_user_id' => 2,
            'created_at' => '2026-01-16 11:00:00',
        ]);
        $this->recordAudit([
            'sales_document_id' => 41,
            'entity_type' => 'sales_document',
            'entity_id' => 41,
            'actor_user_id' => 3,
            'created_at' => '2026-01-16 11:00:00',
        ]);
        $this->recordAudit([
            'sales_document_id' => 42,
            'entity_type' => 'sales_document',
            'entity_id' => 42,
            'actor_user_id' => 2,
            'created_at' => '2026-01-15 10:00:00',
        ]);
        $this->recordAudit([
            'sales_document_id' => 41,
            'entity_type' => 'sales_document',
            'entity_id' => 41,
            'actor_user_id' => 2,
            'created_at' => '2026-01-20 09:00:00',
        ]);

        $countBeforeReads = DB::table('audit_logs')->count();
        $firstPage = $this->asSession($session)
            ->getJson('/api/v1/audit-logs?document_id=41&user_id=2&from=2026-01-15&to=2026-01-16&per_page=1')
            ->assertOk()
            ->assertJsonPath('meta.total', 3)
            ->assertJsonPath('meta.current_page', 1)
            ->assertJsonPath('data.0.id', $latestMatchingId);

        $this->asSession($session)
            ->getJson('/api/v1/audit-logs?document_id=41&user_id=2&from=2026-01-15&to=2026-01-16&per_page=1&page=2')
            ->assertOk()
            ->assertJsonPath('meta.total', 3)
            ->assertJsonPath('data.0.id', $secondMatchingId);
        $this->asSession($session)
            ->getJson('/api/v1/audit-logs?document_id=41&user_id=2&from=2026-01-15&to=2026-01-16&per_page=1&page=3')
            ->assertOk()
            ->assertJsonPath('data.0.id', $firstMatchingId);

        $this->asSession($session)
            ->getJson('/api/v1/audit-logs?document_id=41')
            ->assertOk()
            ->assertJsonPath('meta.total', 5);
        $this->asSession($session)
            ->getJson('/api/v1/audit-logs?user_id=2')
            ->assertOk()
            ->assertJsonPath('meta.total', 5);
        $this->asSession($session)
            ->getJson('/api/v1/audit-logs?from=2026-01-16&to=2026-01-16')
            ->assertOk()
            ->assertJsonPath('meta.total', 2);
        $this->asSession($session)
            ->getJson('/api/v1/audit-logs?to=2026-01-15')
            ->assertOk()
            ->assertJsonPath('meta.total', 3);
        $this->asSession($session)
            ->getJson('/api/v1/audit-logs?from=2026-02-30')
            ->assertUnprocessable();
        $this->asSession($session)
            ->getJson('/api/v1/audit-logs?from=2026-01-16&to=2026-01-15')
            ->assertUnprocessable();
        $this->asSession($session)
            ->getJson('/api/v1/audit-logs?per_page=101')
            ->assertUnprocessable();

        self::assertSame($countBeforeReads, DB::table('audit_logs')->count());
        self::assertSame($latestMatchingId, $firstPage->json('data.0.id'));
    }

    #[Test]
    public function invoice_history_returns_decoded_field_change_values_and_actor_details(): void
    {
        $ownerId = $this->createUserWithRole('owner');
        $session = $this->createSession($ownerId, now());
        DB::table('sales_documents')->insert(['id' => 55, 'document_type' => 'invoice']);
        DB::table('sales_documents')->insert(['id' => 56, 'document_type' => 'invoice']);

        $this->recordAudit([
            'sales_document_id' => 55,
            'field_path' => 'customer_id',
            'old_value' => json_encode(12, JSON_THROW_ON_ERROR),
            'new_value' => json_encode(15, JSON_THROW_ON_ERROR),
            'action' => 'sales_document.field_change',
            'actor_user_id' => 7,
            'actor_name_snapshot' => 'Invoice Editor',
            'reason' => 'Corrected customer',
            'created_at' => '2026-01-15 10:00:00',
        ]);
        $latestChangeId = $this->recordAudit([
            'sales_document_id' => 55,
            'field_path' => 'lines.1.unit_price',
            'old_value' => json_encode('100.0000', JSON_THROW_ON_ERROR),
            'new_value' => json_encode('125.0000', JSON_THROW_ON_ERROR),
            'action' => 'sales_document.field_change',
            'actor_user_id' => 8,
            'actor_name_snapshot' => 'Second Editor',
            'reason' => 'Corrected line price',
            'created_at' => '2026-01-15 10:00:00',
        ]);
        $this->recordAudit([
            'sales_document_id' => 55,
            'action' => 'sales_document.invoice_revised',
            'created_at' => '2026-01-16 10:00:00',
        ]);
        $this->recordAudit([
            'sales_document_id' => 56,
            'field_path' => 'notes',
            'old_value' => json_encode(null, JSON_THROW_ON_ERROR),
            'new_value' => json_encode('Changed', JSON_THROW_ON_ERROR),
            'action' => 'sales_document.field_change',
            'created_at' => '2026-01-16 10:00:00',
        ]);

        $countBeforeReads = DB::table('audit_logs')->count();
        $this->asSession($session)
            ->getJson('/api/v1/invoices/55/history?per_page=1')
            ->assertOk()
            ->assertJsonPath('meta.total', 2)
            ->assertJsonPath('data.0.id', $latestChangeId)
            ->assertJsonPath('data.0.field_path', 'lines.1.unit_price')
            ->assertJsonPath('data.0.old_value', '100.0000')
            ->assertJsonPath('data.0.new_value', '125.0000')
            ->assertJsonPath('data.0.reason', 'Corrected line price')
            ->assertJsonPath('data.0.actor.name', 'Second Editor')
            ->assertJsonPath('data.0.created_at', '2026-01-15 10:00:00');

        $response = $this->asSession($session)
            ->getJson('/api/v1/invoices/55/history?page=2&per_page=1')
            ->assertOk()
            ->assertJsonPath('meta.total', 2)
            ->assertJsonPath('data.0.field_path', 'customer_id')
            ->assertJsonPath('data.0.old_value', 12)
            ->assertJsonPath('data.0.new_value', 15)
            ->assertJsonPath('data.0.reason', 'Corrected customer')
            ->assertJsonPath('data.0.actor.user_id', 7)
            ->assertJsonPath('data.0.actor.name', 'Invoice Editor')
            ->assertJsonPath('data.0.created_at', '2026-01-15 10:00:00');

        self::assertSame(404, $this->asSession($session)->getJson('/api/v1/invoices/999/history')->status());
        self::assertSame('customer_id', $response->json('data.0.field_path'));
        self::assertSame($countBeforeReads, DB::table('audit_logs')->count());
    }

    #[Test]
    public function sensitive_audit_and_invoice_history_routes_are_owner_only_without_finance_step_up(): void
    {
        DB::table('sales_documents')->insert(['id' => 77, 'document_type' => 'invoice']);
        $auditId = $this->recordAudit(['entity_type' => 'test', 'entity_id' => 1]);
        $ownerId = $this->createUserWithRole('owner');
        $driverId = $this->createUserWithRole('driver');
        $readOnlyId = $this->createUserWithRole('read_only');

        foreach (['owner' => true, 'driver' => false, 'read_only' => false] as $role => $isGranted) {
            $roleId = DB::table('roles')->where('code', $role)->value('id');
            $permissionId = DB::table('permissions')->where('code', 'audit_logs.view')->value('id');
            self::assertSame(
                $isGranted,
                DB::table('role_permissions')->where('role_id', $roleId)->where('permission_id', $permissionId)->exists(),
                "Unexpected audit log permission grant for {$role}.",
            );
        }

        $ownerWithoutStepUp = $this->createSession($ownerId);
        $this->asSession($ownerWithoutStepUp)
            ->getJson('/api/v1/audit-logs')
            ->assertOk();
        $this->asSession($ownerWithoutStepUp)
            ->getJson('/api/v1/invoices/77/history')
            ->assertOk();

        foreach ([$driverId, $readOnlyId] as $unauthorizedUserId) {
            $session = $this->createSession($unauthorizedUserId, now());
            $this->asSession($session)
                ->getJson('/api/v1/audit-logs')
                ->assertForbidden();
            $this->asSession($session)
                ->getJson('/api/v1/invoices/77/history')
                ->assertForbidden();
        }

        $ownerWithStepUp = $this->createSession($ownerId, now());
        $this->asSession($ownerWithStepUp)
            ->getJson('/api/v1/audit-logs')
            ->assertOk()
            ->assertJsonPath('data.0.id', $auditId);
        $this->asSession($ownerWithStepUp)
            ->getJson('/api/v1/invoices/77/history')
            ->assertOk();
    }

    private function createTemporaryTables(): void
    {
        DB::statement(<<<'SQL'
            CREATE TEMPORARY TABLE users (
                id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(100) NULL UNIQUE,
                display_name VARCHAR(160) NOT NULL,
                is_active TINYINT(1) NOT NULL DEFAULT 1,
                password_changed_at DATETIME NULL
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
            CREATE TEMPORARY TABLE sales_documents (
                id BIGINT UNSIGNED NOT NULL PRIMARY KEY,
                document_type VARCHAR(30) NOT NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            SQL);
        DB::statement(<<<'SQL'
            CREATE TEMPORARY TABLE audit_logs (
                id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
                actor_user_id BIGINT UNSIGNED NULL,
                actor_name_snapshot VARCHAR(160) NULL,
                sales_document_id BIGINT UNSIGNED NULL,
                field_path VARCHAR(500) NULL,
                old_value LONGTEXT NULL,
                new_value LONGTEXT NULL,
                action VARCHAR(100) NOT NULL,
                entity_type VARCHAR(100) NOT NULL,
                entity_id BIGINT UNSIGNED NULL,
                reason VARCHAR(1000) NULL,
                before_data LONGTEXT NULL,
                after_data LONGTEXT NULL,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            SQL);
    }

    private function createUserWithRole(string $role): int
    {
        $userId = (int) DB::table('users')->insertGetId([
            'username' => 'audit-'.$role.'-'.bin2hex(random_bytes(4)),
            'display_name' => ucfirst($role).' Audit User',
            'is_active' => true,
        ]);
        $roleId = DB::table('roles')->where('code', $role)->value('id');
        DB::table('user_roles')->insert(['user_id' => $userId, 'role_id' => $roleId]);

        return $userId;
    }

    /**
     * @return array{token: string}
     */
    private function createSession(int $userId, mixed $stepUpVerifiedAt = null): array
    {
        $token = bin2hex(random_bytes(32));
        DB::table('auth_sessions')->insert([
            'user_id' => $userId,
            'token_hash' => hash('sha256', $token, true),
            'expires_at' => now()->addHours(12),
            'last_seen_at' => now(),
            'step_up_verified_at' => $stepUpVerifiedAt,
            'created_at' => now(),
        ]);

        return ['token' => $token];
    }

    private function asSession(array $session): self
    {
        return $this->withCredentials()
            ->withUnencryptedCookie('precision_slate_session', $session['token']);
    }

    private function recordAudit(array $values): int
    {
        return (int) DB::table('audit_logs')->insertGetId(array_replace([
            'actor_user_id' => null,
            'actor_name_snapshot' => null,
            'sales_document_id' => null,
            'field_path' => null,
            'old_value' => null,
            'new_value' => null,
            'action' => 'audit.test',
            'entity_type' => 'test',
            'entity_id' => null,
            'reason' => null,
            'before_data' => json_encode(['status' => 'old'], JSON_THROW_ON_ERROR),
            'after_data' => json_encode(['status' => 'new'], JSON_THROW_ON_ERROR),
            'created_at' => now(),
        ], $values));
    }
}
