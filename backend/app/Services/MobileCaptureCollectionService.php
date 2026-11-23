<?php

namespace App\Services;

use Illuminate\Http\Request;

class MobileCaptureCollectionService
{
    public function __construct(private readonly SalesService $sales) {}

    /** @param array<string, mixed> $values
     *  @return array<string, mixed>
     */
    public function record(Request $request, string $clientKey, array $values): array
    {
        $originalKey = $request->header('Idempotency-Key');
        $request->headers->set('Idempotency-Key', hash('sha256', 'capture-collection:'.$clientKey));
        try {
            return $this->sales->recordCollection($request, $values);
        } finally {
            $request->headers->set('Idempotency-Key', $originalKey);
        }
    }
}
