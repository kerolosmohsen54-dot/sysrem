<?php

namespace Tests\Unit;

use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class ApprovedSchemaArtifactTest extends TestCase
{
    #[Test]
    public function bundled_migration_sql_matches_the_approved_proposal(): void
    {
        $proposalPath = base_path('../docs/database/schema-proposals/proposed-mysql-review-v4.1/precision_slate_proposed_mysql_v4_1.sql');
        $bundledPath = database_path('schema/precision_slate_v4_1.sql');

        self::assertFileExists($proposalPath);
        self::assertFileExists($bundledPath);
        $proposal = file_get_contents($proposalPath);
        $bundled = file_get_contents($bundledPath);

        self::assertIsString($proposal);
        self::assertIsString($bundled);

        $normalizeLineEndings = static fn (string $contents): string => str_replace(["\r\n", "\r"], "\n", $contents);

        self::assertSame(
            hash('sha256', $normalizeLineEndings($proposal)),
            hash('sha256', $normalizeLineEndings($bundled)),
        );
    }

    #[Test]
    public function bundled_migration_sql_contains_the_expected_schema_statements(): void
    {
        $sql = file_get_contents(database_path('schema/precision_slate_v4_1.sql'));

        self::assertIsString($sql);
        self::assertSame(47, preg_match_all('/^\s*CREATE\s+TABLE\b/im', $sql));
        self::assertSame(3, preg_match_all('/^\s*ALTER\s+TABLE\b/im', $sql));
    }

    #[Test]
    public function approved_v4_2_proposal_and_forward_migration_contain_the_email_verification_delta(): void
    {
        $proposalPath = base_path('../docs/database/schema-proposals/proposed-mysql-review-v4.2/precision_slate_proposed_mysql_v4_2.sql');
        $migrationPath = database_path('migrations/2026_10_10_000001_add_v4_2_email_verification_to_users.php');
        $proposal = file_get_contents($proposalPath);
        $migration = file_get_contents($migrationPath);

        self::assertIsString($proposal);
        self::assertIsString($migration);
        self::assertStringContainsString('email_verified_at DATETIME NULL', $proposal);
        self::assertStringContainsString('chk_users_email_verification_requires_email CHECK (email_verified_at IS NULL OR email IS NOT NULL)', $proposal);
        self::assertStringContainsString('ADD COLUMN email_verified_at DATETIME NULL', $migration);
        self::assertStringContainsString('ADD CONSTRAINT chk_users_email_verification_requires_email CHECK (email_verified_at IS NULL OR email IS NOT NULL)', $migration);
    }
}
