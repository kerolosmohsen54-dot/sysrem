<?php

namespace App\Services;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class TrashService
{
    public function record(Request $request, string $entityType, int $entityId, string $label, array $snapshot): void
    {
        $actor = $request->attributes->get('authenticated_user');
        if (! is_object($actor) || ! isset($actor->id)) {
            throw new RuntimeException('An authenticated actor is required to archive a record.');
        }

        $exists = DB::table('trash_items')->where('entity_type', $entityType)->where('entity_id', $entityId)->whereNull('restored_at')->exists();
        if ($exists) {
            return;
        }
        DB::table('trash_items')->insert([
            'entity_type' => $entityType,
            'entity_id' => $entityId,
            'label' => mb_substr($label, 0, 200),
            'snapshot' => json_encode($snapshot, JSON_THROW_ON_ERROR),
            'deleted_by_user_id' => $actor->id,
            'deleted_at' => now(),
        ]);
    }
}
