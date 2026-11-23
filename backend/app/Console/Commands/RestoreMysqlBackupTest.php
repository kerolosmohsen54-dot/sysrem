<?php

namespace App\Console\Commands;

use App\Support\MysqlBackupSupport;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class RestoreMysqlBackupTest extends Command
{
    protected $signature = 'backup:restore-test {backup? : Compressed backup path; defaults to the newest local backup}';

    protected $description = 'Restore a compressed MySQL/MariaDB backup into erp_scratch after explicit confirmation.';

    public function handle(MysqlBackupSupport $backup): int
    {
        if (config('backup.restore_test_confirmation') !== 'YES_RESTORE_ERP_SCRATCH') {
            $this->error('Set BACKUP_RESTORE_TEST_CONFIRM=YES_RESTORE_ERP_SCRATCH explicitly before restoring into erp_scratch.');

            return self::FAILURE;
        }

        $details = $backup->connectionDetails(requireScratch: true);
        $path = $this->argument('backup');
        if (! is_string($path) || $path === '') {
            $files = glob(rtrim((string) config('backup.directory'), DIRECTORY_SEPARATOR).DIRECTORY_SEPARATOR.'erp-*.sql.gz') ?: [];
            if ($files === []) {
                $this->error('No local compressed MySQL backup is available to restore.');

                return self::FAILURE;
            }
            usort($files, static fn (string $left, string $right): int => filemtime($right) <=> filemtime($left));
            $path = $files[0];
        }
        $path = realpath($path) ?: '';
        $backupDirectory = realpath((string) config('backup.directory')) ?: '';
        if ($path === '' || $backupDirectory === '' || ! str_starts_with($path, $backupDirectory.DIRECTORY_SEPARATOR)) {
            throw new RuntimeException('Restore tests may use only backup files under the configured local backup directory.');
        }

        $before = $this->tableRowCounts();
        $backup->restoreCompressedDump($details, $path);
        $after = $this->tableRowCounts();
        if ($before !== $after) {
            throw new RuntimeException('Restore completed but table names or exact row counts changed in erp_scratch.');
        }

        $this->info('Restore test passed on erp_scratch: '.count($after).' tables; exact row counts match the pre-restore state.');

        return self::SUCCESS;
    }

    /**
     * @return array<string, int>
     */
    private function tableRowCounts(): array
    {
        $tables = DB::select(
            'SELECT TABLE_NAME AS table_name FROM information_schema.TABLES '
            .'WHERE TABLE_SCHEMA = DATABASE() AND TABLE_TYPE = ? ORDER BY TABLE_NAME',
            ['BASE TABLE'],
        );
        $counts = [];
        foreach ($tables as $table) {
            $name = (string) $table->table_name;
            $counts[$name] = DB::table($name)->count();
        }

        return $counts;
    }
}
