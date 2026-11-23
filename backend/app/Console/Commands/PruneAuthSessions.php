<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Database\Query\Builder;
use Illuminate\Support\Facades\DB;

class PruneAuthSessions extends Command
{
    protected $signature = 'auth-sessions:prune';

    protected $description = 'Revoke expired or idle sessions and remove records past retention.';

    public function handle(): int
    {
        $now = now();
        $idleTimeout = (int) config('auth.api_session.idle_timeout_minutes');
        $retentionDays = (int) config('auth.api_session.revoked_retention_days');
        $idleCutoff = $now->copy()->subMinutes($idleTimeout);
        $revokedCount = 0;

        DB::table('auth_sessions')
            ->whereNull('revoked_at')
            ->where(function (Builder $query) use ($now, $idleCutoff): void {
                $query->where('expires_at', '<=', $now)
                    ->orWhere('last_seen_at', '<=', $idleCutoff)
                    ->orWhere(function (Builder $query) use ($idleCutoff): void {
                        $query->whereNull('last_seen_at')
                            ->where('created_at', '<=', $idleCutoff);
                    });
            })
            ->orderBy('id')
            ->chunkById(500, function ($sessions) use ($now, &$revokedCount): void {
                foreach ($sessions as $session) {
                    $revokedCount += DB::table('auth_sessions')
                        ->where('id', $session->id)
                        ->whereNull('revoked_at')
                        ->update(['revoked_at' => $now]);
                }
            });

        $deletedCount = DB::table('auth_sessions')
            ->whereNotNull('revoked_at')
            ->where('revoked_at', '<=', $now->copy()->subDays($retentionDays))
            ->delete();

        $this->info("Revoked {$revokedCount} expired or idle sessions; deleted {$deletedCount} records beyond retention.");

        return self::SUCCESS;
    }
}
