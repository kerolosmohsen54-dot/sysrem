<?php

namespace App\Jobs;

use App\Support\MysqlBackupSupport;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;
use Throwable;

class CreateDatabaseBackup implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 1;

    public function __construct(public readonly string $jobId) {}

    public function handle(MysqlBackupSupport $backup): void
    {
        DB::table('backup_jobs')->where('id', $this->jobId)->update([
            'status' => 'running', 'started_at' => now(), 'result_message' => 'Backup is running.', 'updated_at' => now(),
        ]);
        try {
            $result = $backup->createCompressedDump($backup->connectionDetails());
            DB::table('backup_jobs')->where('id', $this->jobId)->update([
                'status' => 'succeeded',
                'file_name' => basename($result['path']),
                'file_bytes' => $result['bytes'],
                'result_message' => 'Backup completed successfully.',
                'finished_at' => now(),
                'updated_at' => now(),
            ]);
        } catch (Throwable $error) {
            DB::table('backup_jobs')->where('id', $this->jobId)->update([
                'status' => 'failed',
                'result_message' => mb_substr($error->getMessage(), 0, 2000),
                'finished_at' => now(),
                'updated_at' => now(),
            ]);
            report($error);
        }
    }

    public function failed(Throwable $error): void
    {
        DB::table('backup_jobs')->where('id', $this->jobId)->whereNotIn('status', ['succeeded', 'failed'])->update([
            'status' => 'failed',
            'result_message' => mb_substr($error->getMessage(), 0, 2000),
            'finished_at' => now(),
            'updated_at' => now(),
        ]);
    }
}
