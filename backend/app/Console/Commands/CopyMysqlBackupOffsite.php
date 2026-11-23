<?php

namespace App\Console\Commands;

use App\Support\MysqlBackupSupport;
use Illuminate\Console\Command;
use Symfony\Component\Process\Process;

class CopyMysqlBackupOffsite extends Command
{
    protected $signature = 'backup:offsite';

    protected $description = 'Copy the newest local compressed MySQL backup to a configured SSH destination.';

    public function handle(MysqlBackupSupport $backup): int
    {
        $backup->connectionDetails();
        $target = trim((string) config('backup.offsite_target'));
        if ($target === '') {
            $this->error('BACKUP_OFFSITE_TARGET is not configured; no remote copy was attempted.');

            return self::FAILURE;
        }

        $directory = (string) config('backup.directory');
        $files = glob(rtrim($directory, DIRECTORY_SEPARATOR).DIRECTORY_SEPARATOR.'erp-*.sql.gz') ?: [];
        if ($files === []) {
            $this->error('No local compressed MySQL backup is available to copy.');

            return self::FAILURE;
        }
        usort($files, static fn (string $left, string $right): int => filemtime($right) <=> filemtime($left));
        $binary = (string) config('backup.scp_binary', 'scp');
        $arguments = [$binary, '-o', 'BatchMode=yes', '-o', 'StrictHostKeyChecking=yes'];
        $key = trim((string) config('backup.ssh_key'));
        if ($key !== '') {
            $arguments[] = '-i';
            $arguments[] = $key;
        }
        $port = (string) config('backup.ssh_port', '22');
        if ($port !== '22') {
            $arguments[] = '-P';
            $arguments[] = $port;
        }
        $arguments[] = $files[0];
        $arguments[] = $target;

        $process = new Process($arguments);
        $process->setTimeout(3600);
        $process->run();
        if (! $process->isSuccessful()) {
            $this->error('The off-host transfer failed; process output is suppressed to avoid disclosing operational data.');

            return self::FAILURE;
        }

        $this->info('The newest compressed backup was copied to the configured off-host destination.');

        return self::SUCCESS;
    }
}
