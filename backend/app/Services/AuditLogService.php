<?php

namespace App\Services;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class AuditLogService
{
    public function record(
        Request $request,
        string $action,
        string $entityType,
        ?int $entityId,
        ?string $reason,
        ?array $before = null,
        ?array $after = null,
    ): void {
        $actor = $request->attributes->get('authenticated_user');

        if (! is_object($actor) || ! isset($actor->id, $actor->display_name)) {
            throw new RuntimeException('An authenticated actor is required for audit logging.');
        }

        $ipAddress = $request->ip();
        $binaryIpAddress = $ipAddress === null ? null : inet_pton($ipAddress);

        if ($ipAddress !== null && $binaryIpAddress === false) {
            throw new RuntimeException('The request IP address could not be encoded for the audit log.');
        }

        DB::table('audit_logs')->insert([
            'actor_user_id' => $actor->id,
            'actor_name_snapshot' => $actor->display_name,
            'action' => $action,
            'entity_type' => $entityType,
            'entity_id' => $entityId,
            'reason' => $reason,
            'before_data' => $before === null ? null : json_encode($before, JSON_THROW_ON_ERROR),
            'after_data' => $after === null ? null : json_encode($after, JSON_THROW_ON_ERROR),
            'request_id' => $request->attributes->get('request_id'),
            'ip_address' => $binaryIpAddress,
            'user_agent' => mb_substr((string) $request->userAgent(), 0, 500),
            'created_at' => now(),
        ]);
    }
}
