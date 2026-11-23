<?php

namespace App\Services;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use RuntimeException;

/**
 * Stores successful API responses alongside the financial operation so a client
 * can safely retry after a timeout without posting the operation twice.
 */
class IdempotencyService
{
    /** @param callable(): JsonResponse $operation */
    public function execute(Request $request, string $resourceType, callable $operation): JsonResponse
    {
        $key = trim((string) $request->header('Idempotency-Key', ''));
        if ($key === '') {
            return $operation();
        }
        if (strlen($key) > 200) {
            throw ValidationException::withMessages(['Idempotency-Key' => ['The idempotency key cannot exceed 200 characters.']]);
        }

        $actor = $request->attributes->get('authenticated_user');
        if (! is_object($actor) || ! isset($actor->id)) {
            abort(401);
        }
        $actorId = (int) $actor->id;
        $requestHash = hash('sha256', json_encode(
            ['method' => $request->method(), 'path' => $request->path(), 'input' => $request->all()],
            JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE | JSON_PRESERVE_ZERO_FRACTION,
        ), true);

        return DB::transaction(function () use ($request, $operation, $resourceType, $key, $requestHash, $actorId): JsonResponse {
            // Serialize concurrent uses of the same key for one signed-in user.
            DB::table('users')->where('id', $actorId)->lockForUpdate()->first(['id']);
            $existing = DB::table('idempotency_records')
                ->where('user_id', $actorId)
                ->where('idempotency_key', $key)
                ->lockForUpdate()
                ->first();

            if ($existing !== null) {
                if (! hash_equals((string) $existing->request_hash, $requestHash)) {
                    abort(409, 'The idempotency key was already used with a different request.');
                }
                if ($existing->state !== 'completed' || $existing->response_body === null) {
                    abort(409, 'The previous idempotent request is not complete.');
                }
                $payload = json_decode((string) $existing->response_body, true, 512, JSON_THROW_ON_ERROR);
                if (! is_array($payload)) {
                    throw new RuntimeException('The stored idempotency response is invalid.');
                }

                return response()->json($payload, (int) $existing->http_status);
            }

            $recordId = (int) DB::table('idempotency_records')->insertGetId([
                'user_id' => $actorId,
                'idempotency_key' => $key,
                'request_hash' => $requestHash,
                'resource_type' => $resourceType,
                'state' => 'processing',
                'created_at' => now(),
            ]);
            $response = $operation();
            $payload = $response->getData(true);
            if (! is_array($payload)) {
                throw new RuntimeException('The financial API returned an invalid JSON response.');
            }
            $data = $payload['data'] ?? [];
            $resourceId = is_array($data)
                ? ($data['id'] ?? $data['entry_id'] ?? $data['invoice']['id'] ?? null)
                : null;

            DB::table('idempotency_records')->where('id', $recordId)->update([
                'http_status' => $response->getStatusCode(),
                'response_body' => json_encode($payload, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE),
                'resource_id' => is_numeric($resourceId) ? (int) $resourceId : null,
                'state' => 'completed',
                'completed_at' => now(),
            ]);

            return $response;
        }, 5);
    }
}
