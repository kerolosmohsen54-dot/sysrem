<?php

namespace App\Services;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class MobileSyncEventService
{
    public function record(
        Request $request,
        string $entityType,
        int $entityId,
        string $eventType,
    ): void {
        $user = $request->attributes->get('authenticated_user');
        if (! is_object($user) || ! isset($user->id)) {
            throw new RuntimeException('An authenticated actor is required to write a mobile sync event.');
        }
        $device = $request->attributes->get('mobile_device');

        DB::table('mobile_sync_events')->insert([
            'actor_user_id' => $user->id,
            'device_id' => is_object($device) && isset($device->id) ? $device->id : null,
            'entity_type' => $entityType,
            'entity_id' => $entityId,
            'event_type' => $eventType,
            'created_at' => now(),
        ]);
    }

    public function recordChannelBalances(Request $request, array $treasuryAccountIds): void
    {
        $channelIds = DB::table('mobile_channels')
            ->whereIn('treasury_account_id', array_values(array_unique($treasuryAccountIds)))
            ->pluck('id');

        foreach ($channelIds as $channelId) {
            $this->record($request, 'channel', (int) $channelId, 'updated');
        }
    }
}
