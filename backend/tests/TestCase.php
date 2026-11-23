<?php

namespace Tests;

use Database\Seeders\AppSettingsSeeder;
use Database\Seeders\RolePermissionMatrixSeeder;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Illuminate\Support\Facades\DB;

abstract class TestCase extends BaseTestCase
{
    private static bool $referenceDataSeeded = false;

    protected function setUp(): void
    {
        parent::setUp();

        if (! self::$referenceDataSeeded || DB::table('roles')->count() === 0) {
            app(RolePermissionMatrixSeeder::class)->run();
            app(AppSettingsSeeder::class)->run();
            self::$referenceDataSeeded = true;
        }
    }

    /**
     * Workflow engine tests shadow operational tables with temporary fixtures.
     * Shadow the journal tables too so those fixtures exercise automatic
     * postings without colliding with the permanent tables' foreign keys.
     */
    protected function createTemporaryFinancialPostingTables(): void
    {
        DB::statement('DROP TEMPORARY TABLE IF EXISTS journal_lines');
        DB::statement('DROP TEMPORARY TABLE IF EXISTS journal_entries');
        DB::statement("CREATE TEMPORARY TABLE journal_entries (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
            entry_number VARCHAR(80) NOT NULL UNIQUE,
            status VARCHAR(20) NOT NULL DEFAULT 'draft',
            entry_date DATE NOT NULL,
            description VARCHAR(500) NOT NULL,
            source_type VARCHAR(80) NULL,
            source_id BIGINT UNSIGNED NULL,
            reversal_of_entry_id BIGINT UNSIGNED NULL,
            created_by_user_id BIGINT UNSIGNED NULL,
            posted_by_user_id BIGINT UNSIGNED NULL,
            posted_at DATETIME NULL,
            created_at TIMESTAMP NULL,
            updated_at TIMESTAMP NULL,
            UNIQUE KEY uq_temporary_journal_source (source_type, source_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
        DB::statement("CREATE TEMPORARY TABLE journal_lines (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
            journal_entry_id BIGINT UNSIGNED NOT NULL,
            line_number INT UNSIGNED NOT NULL,
            account_id BIGINT UNSIGNED NOT NULL,
            debit_amount DECIMAL(19,4) NOT NULL DEFAULT 0,
            credit_amount DECIMAL(19,4) NOT NULL DEFAULT 0,
            description VARCHAR(500) NULL,
            customer_id BIGINT UNSIGNED NULL,
            supplier_id BIGINT UNSIGNED NULL,
            partner_id BIGINT UNSIGNED NULL,
            treasury_account_id BIGINT UNSIGNED NULL,
            created_at TIMESTAMP NULL,
            UNIQUE KEY uq_temporary_journal_line_number (journal_entry_id, line_number)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
    }
}
