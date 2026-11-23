<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;

class FinancialOutboxService
{
    public function __construct(private readonly FinancialAutoPostingService $autoPosting) {}

    /**
     * @param  array<string, scalar|null|array>  $payload
     */
    public function recordPostedDocument(string $sourceType, int $sourceId, array $payload): void
    {
        DB::transaction(function () use ($sourceType, $sourceId, $payload): void {
            $eventId = (int) DB::table('financial_outbox_events')->insertGetId([
                'event_type' => 'financial_document.posted',
                'source_type' => $sourceType,
                'source_id' => $sourceId,
                'payload' => json_encode($payload, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE),
                'occurred_at' => now(),
                'created_at' => now(),
            ]);

            // Keep the operational document and GL journal in the same database
            // transaction so reports cannot observe only half of a posting.
            $this->autoPosting->processEvent($eventId);
        }, 5);
    }
}
