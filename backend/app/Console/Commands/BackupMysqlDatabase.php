<?php

namespace App\Console\Commands;

use App\Support\MysqlBackupSupport;
use Illuminate\Console\Command;

class BackupMysqlDatabase extends Command
{
    protected $signature = 'backup:mysql';

    protected $description = 'Create a compressed local backup using the configured MySQL or MariaDB connection.';

    public function handle(MysqlBackupSupport $backup): int
    {
        $result = $backup->createCompressedDump($backup->connectionDetails());
        $this->info("Backup completed: {$result['path']} ({$result['bytes']} bytes; database {$result['database']}).");

        return self::SUCCESS;
    }
}
