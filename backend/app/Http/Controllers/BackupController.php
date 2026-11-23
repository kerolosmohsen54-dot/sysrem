<?php

namespace App\Http\Controllers;

use App\Jobs\CreateDatabaseBackup;
use App\Services\AuditLogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class BackupController extends Controller
{
    public function __construct(private readonly AuditLogService $auditLog) {}

    public function index(): JsonResponse
    {
        $jobs = DB::table('backup_jobs')->orderByDesc('created_at')->limit(30)->get()->map(static fn (object $job): array => [
            'id' => $job->id,
            'status' => $job->status,
            'file_name' => $job->file_name,
            'file_bytes' => $job->file_bytes === null ? null : (int) $job->file_bytes,
            'result_message' => $job->result_message,
            'requested_by_user_id' => $job->requested_by_user_id === null ? null : (int) $job->requested_by_user_id,
            'started_at' => $job->started_at,
            'finished_at' => $job->finished_at,
            'created_at' => $job->created_at,
        ])->values();

        $directory = (string) config('backup.directory');
        $files = glob(rtrim($directory, DIRECTORY_SEPARATOR).DIRECTORY_SEPARATOR.'erp-*.sql.gz') ?: [];
        usort($files, static fn (string $left, string $right): int => filemtime($right) <=> filemtime($left));
        $latestBackup = isset($files[0]) ? [
            'file_name' => basename($files[0]),
            'file_bytes' => filesize($files[0]) ?: 0,
            'status' => 'succeeded',
            'result_message' => 'نسخة قاعدة البيانات موجودة على التخزين المحلي.',
            'created_at' => date(DATE_ATOM, filemtime($files[0])),
        ] : null;

        return response()->json(['data' => [
            'jobs' => $jobs,
            'latest_job' => $jobs->first(),
            'latest_backup' => $latestBackup,
        ]]);
    }

    public function create(Request $request): JsonResponse
    {
        $actor = $request->attributes->get('authenticated_user');
        abort_unless(is_object($actor) && isset($actor->id), 401);
        $id = (string) Str::uuid();
        DB::table('backup_jobs')->insert([
            'id' => $id,
            'status' => 'queued',
            'requested_by_user_id' => $actor->id,
            'result_message' => 'Backup job queued.',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $this->auditLog->record($request, 'backup.job_queued', 'backup_job', null, null, null, ['job_id' => $id]);
        CreateDatabaseBackup::dispatch($id)->onConnection('background')->onQueue('backups');

        return response()->json(['data' => ['id' => $id, 'status' => 'queued']], 202);
    }
}
