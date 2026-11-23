<?php

namespace App\Services;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use RuntimeException;

class MobileIdempotencyService
{
    public function execute(Request $request, string $resourceType, callable $operation): JsonResponse
    {
        $key = $request->header('Idempotency-Key');
        if (! is_string($key) || trim($key) === '' || mb_strlen($key) > 200) {
            throw ValidationException::withMessages([
                'Idempotency-Key' => ['A unique Idempotency-Key of 1 to 200 characters is required.'],
            ]);
        }

        $device = $request->attributes->get('mobile_device');
        abort_unless(is_object($device) && isset($device->id), 401);
        $requestHash = hash('sha256', json_encode([
            'method' => $request->method(),
            'path' => $request->path(),
            'input' => $request->all(),
        ], JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE | JSON_PRESERVE_ZERO_FRACTION));

        return DB::transaction(function () use ($resourceType, $operation, $key, $device, $requestHash): JsonResponse {
            DB::table('mobile_devices')->where('id', $device->id)->lockForUpdate()->first(['id']);
            $record = DB::table('mobile_idempotency_records')
                ->where('device_id', $device->id)
                ->where('idempotency_key', $key)
                ->lockForUpdate()
                ->first();

            if ($record !== null) {
                if (! hash_equals((string) $record->request_hash, $requestHash)) {
                    abort(409, 'The idempotency key was already used with a different request.');
                }
                if ($record->state !== 'completed' || $record->response_body === null) {
                    abort(409, 'The previous idempotent request is not complete.');
                }
                $body = json_decode((string) $record->response_body, true, 512, JSON_THROW_ON_ERROR);
                if (! is_array($body)) {
                    throw new RuntimeException('The stored mobile idempotency response is invalid.');
                }

                return response()->json($body, (int) $record->http_status);
            }

            $recordId = (int) DB::table('mobile_idempotency_records')->insertGetId([
                'device_id' => $device->id,
                'idempotency_key' => $key,
                'request_hash' => $requestHash,
                'resource_type' => $resourceType,
                'state' => 'started',
                'created_at' => now(),
            ]);
            $response = $operation();
            $body = $response->getData(true);
            $resourceId = $body['data']['id'] ?? null;
            DB::table('mobile_idempotency_records')->where('id', $recordId)->update([
                'http_status' => $response->getStatusCode(),
                'response_body' => json_encode($body, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE),
                'resource_id' => is_numeric($resourceId) ? (int) $resourceId : null,
                'state' => 'completed',
                'completed_at' => now(),
            ]);

            return $response;
        }, 5);
    }
}
