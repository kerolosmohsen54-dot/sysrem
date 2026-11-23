<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use RuntimeException;

class UserPasswordController extends Controller
{
    public function reset(Request $request, int $userId): JsonResponse
    {
        $validated = $request->validate([
            'new_password' => ['required', 'string', 'min:12', 'max:1024', 'confirmed'],
        ]);
        $actor = $request->attributes->get('authenticated_user');

        if (! is_object($actor) || ! isset($actor->id, $actor->display_name)) {
            return response()->json([
                'error' => [
                    'code' => 'UNAUTHENTICATED',
                    'message' => __('Authentication is required.'),
                ],
                'meta' => ['request_id' => $request->attributes->get('request_id')],
            ], 401);
        }

        $now = now();

        DB::transaction(function () use ($actor, $now, $request, $userId, $validated): void {
            $target = DB::table('users')->where('id', $userId)->lockForUpdate()->first(['id']);

            if ($target === null) {
                abort(404);
            }

            DB::table('users')->where('id', $userId)->update([
                'password_hash' => Hash::make($validated['new_password']),
                'password_changed_at' => $now,
                'updated_at' => $now,
            ]);

            DB::table('auth_sessions')
                ->where('user_id', $userId)
                ->whereNull('revoked_at')
                ->update(['revoked_at' => $now]);

            $ipAddress = $request->ip();
            $binaryIpAddress = $ipAddress === null ? null : inet_pton($ipAddress);

            if ($ipAddress !== null && $binaryIpAddress === false) {
                throw new RuntimeException('The request IP address could not be encoded for the audit log.');
            }

            DB::table('audit_logs')->insert([
                'actor_user_id' => $actor->id,
                'actor_name_snapshot' => $actor->display_name,
                'action' => 'user.password_reset',
                'entity_type' => 'user',
                'entity_id' => $userId,
                'reason' => 'Owner-initiated manual password reset.',
                'after_data' => json_encode(['password_changed_at' => $now->toISOString()], JSON_THROW_ON_ERROR),
                'request_id' => $request->attributes->get('request_id'),
                'ip_address' => $binaryIpAddress,
                'user_agent' => mb_substr((string) $request->userAgent(), 0, 500),
                'created_at' => $now,
            ]);
        });

        return response()->json([
            'data' => ['status' => 'password_reset'],
            'meta' => ['request_id' => $request->attributes->get('request_id')],
        ]);
    }
}
