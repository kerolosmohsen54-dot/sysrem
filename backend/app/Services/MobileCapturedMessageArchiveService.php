<?php

namespace App\Services;

use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class MobileCapturedMessageArchiveService
{
    public function __construct(private readonly AuditLogService $audit) {}

    public function archiveAll(?Request $request = null): int
    {
        return DB::transaction(function () use ($request): int {
            $ids = DB::table('mobile_captured_messages')
                ->whereNull('archived_at')
                ->orderBy('id')
                ->lockForUpdate()
                ->pluck('id')
                ->map(static fn (mixed $id): int => (int) $id)
                ->all();

            if ($ids === []) {
                return 0;
            }

            $now = now();
            DB::table('mobile_captured_messages')->whereIn('id', $ids)->update(['archived_at' => $now]);
            $actorId = $this->actorId($request);
            $this->recordSyncEvents($ids, $actorId, 'archived', $now);
            $this->recordAudit($request, 'mobile.messages.archived', null, count($ids), $now);

            return count($ids);
        }, 5);
    }

    public function archiveOne(Request $request, int $messageId): bool
    {
        return DB::transaction(function () use ($request, $messageId): bool {
            $message = DB::table('mobile_captured_messages')->where('id', $messageId)->lockForUpdate()->first();
            abort_if($message === null, 404);
            if ($message->archived_at !== null) {
                return false;
            }

            $now = now();
            DB::table('mobile_captured_messages')->where('id', $messageId)->update(['archived_at' => $now]);
            $this->recordSyncEvents([$messageId], $this->actorId($request), 'archived', $now);
            $this->recordAudit($request, 'mobile.message.archived', $messageId, 1, $now, ['status' => $message->status]);

            return true;
        }, 5);
    }

    public function restoreOne(Request $request, int $messageId): bool
    {
        return DB::transaction(function () use ($request, $messageId): bool {
            $message = DB::table('mobile_captured_messages')->where('id', $messageId)->lockForUpdate()->first();
            abort_if($message === null, 404);
            if ($message->archived_at === null) {
                return false;
            }

            $now = now();
            DB::table('mobile_captured_messages')->where('id', $messageId)->update(['archived_at' => null]);
            $this->recordSyncEvents([$messageId], $this->actorId($request), 'updated', $now);
            $this->recordAudit($request, 'mobile.message.restored', $messageId, 1, $now, ['archived_at' => $message->archived_at]);

            return true;
        }, 5);
    }

    private function actorId(?Request $request): ?int
    {
        $actor = $request?->attributes->get('authenticated_user');

        return is_object($actor) && isset($actor->id) ? (int) $actor->id : null;
    }

    private function recordSyncEvents(array $ids, ?int $actorId, string $eventType, Carbon $at): void
    {
        foreach (array_chunk($ids, 500) as $chunk) {
            DB::table('mobile_sync_events')->insert(array_map(static fn (int $id): array => [
                'actor_user_id' => $actorId,
                'device_id' => null,
                'entity_type' => 'mobile_captured_message',
                'entity_id' => $id,
                'event_type' => $eventType,
                'created_at' => $at,
            ], $chunk));
        }
    }

    private function recordAudit(?Request $request, string $action, ?int $messageId, int $count, Carbon $at, ?array $before = null): void
    {
        if ($request === null) {
            return;
        }

        $this->audit->record(
            $request,
            $action,
            'mobile_captured_message',
            $messageId,
            'The message was hidden from the inbox while its financial and deduplication history was preserved.',
            $before ?? ['active_count' => $count],
            ['archived' => true, 'count' => $count, 'archived_at' => $at->toDateTimeString()],
        );
    }
}
