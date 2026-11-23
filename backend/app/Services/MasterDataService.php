<?php

namespace App\Services;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class MasterDataService
{
    public function __construct(
        private readonly AuditLogService $auditLog,
        private readonly MobileSyncEventService $mobileSyncEvents,
    ) {}

    /**
     * @param  array<string, mixed>  $values
     */
    public function createProduct(Request $request, array $values): int
    {
        $actor = $this->actor($request);
        $now = now();
        $values = [
            ...$values,
            'is_active' => $values['is_active'] ?? true,
            'created_by_user_id' => $actor->id,
            'updated_by_user_id' => $actor->id,
            'created_at' => $now,
            'updated_at' => $now,
        ];

        return DB::transaction(function () use ($request, $values): int {
            $productId = (int) DB::table('products')->insertGetId($values);
            $this->auditLog->record($request, 'catalog.product_created', 'product', $productId, null, null, $values);

            return $productId;
        });
    }

    /**
     * @param  array<string, mixed>  $values
     */
    public function createCustomer(Request $request, array $values): int
    {
        $actor = $this->actor($request);
        $now = now();
        $insertValues = [
            ...$values,
            'created_by_user_id' => $actor->id,
            'updated_by_user_id' => $actor->id,
            'created_at' => $now,
            'updated_at' => $now,
        ];

        return DB::transaction(function () use ($request, $insertValues, $values): int {
            $customerId = (int) DB::table('customers')->insertGetId($insertValues);
            $this->auditLog->record($request, 'customer.created', 'customer', $customerId, null, null, $values);
            $this->mobileSyncEvents->record($request, 'customer', $customerId, 'created');

            return $customerId;
        });
    }

    private function actor(Request $request): object
    {
        $actor = $request->attributes->get('authenticated_user');

        if (! is_object($actor) || ! isset($actor->id, $actor->display_name)) {
            throw new RuntimeException('An authenticated actor is required for master-data changes.');
        }

        return $actor;
    }
}
