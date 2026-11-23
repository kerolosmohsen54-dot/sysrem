<?php

namespace App\Http\Controllers;

use App\Services\MobileIdempotencyService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MobileCustomerController extends Controller
{
    public function __construct(
        private readonly MobileIdempotencyService $idempotency,
        private readonly SalesController $sales,
    ) {}

    public function store(Request $request): JsonResponse
    {
        return $this->idempotency->execute(
            $request,
            'mobile_customer',
            function () use ($request): JsonResponse {
                $response = $this->sales->createCustomer($request);
                $body = $response->getData(true);
                if (isset($body['data']['is_active'])) {
                    $body['data']['is_active'] = (bool) $body['data']['is_active'];
                }

                return response()->json($body, $response->getStatusCode());
            },
        );
    }
}
