<?php

namespace App\Http\Controllers;

use App\Services\AuditLogService;
use App\Services\GovernorateService;
use App\Services\TrashService;
use App\Support\ListQuery;
use App\Models\Governorate;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

class ReferenceCatalogController extends Controller
{
    public function __construct(
        private readonly AuditLogService $auditLog,
        private readonly TrashService $trash,
        private readonly GovernorateService $governorateService,
    ) {}

    public function governorates(Request $request): JsonResponse
    {
        $actor = $request->attributes->get('authenticated_user');
        abort_unless(is_object($actor), 401);
        Gate::forUser($actor)->authorize('viewAny', Governorate::class);

        return response()->json($this->governorateService->list($request));
    }

    public function createGovernorate(Request $request): JsonResponse
    {
        $values = $request->validate(['name' => ['required', 'string', 'max:120', 'unique:governorates,name']]);
        $actor = $request->attributes->get('authenticated_user');
        abort_unless(is_object($actor), 401);
        Gate::forUser($actor)->authorize('create', Governorate::class);

        return response()->json(['data' => $this->governorateService->create($request, $values)], 201);
    }

    public function updateGovernorate(Request $request, int $governorateId): JsonResponse
    {
        $values = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:120', Rule::unique('governorates', 'name')->ignore($governorateId)],
            'is_active' => ['sometimes', 'boolean'],
        ]);
        abort_if($values === [], 422);
        $actor = $request->attributes->get('authenticated_user');
        abort_unless(is_object($actor), 401);
        Gate::forUser($actor)->authorize('update', Governorate::class);

        return response()->json(['data' => $this->governorateService->update($request, $governorateId, $values)]);
    }

    public function deleteGovernorate(Request $request, int $governorateId): JsonResponse
    {
        $actor = $request->attributes->get('authenticated_user');
        abort_unless(is_object($actor), 401);
        Gate::forUser($actor)->authorize('delete', Governorate::class);

        return response()->json(['data' => $this->governorateService->archive($request, $governorateId)]);
    }

    public function drivers(Request $request): JsonResponse
    {
        $filters = ListQuery::validate($request, ['name' => 'name', 'shipping_company' => 'shipping_company', 'id' => 'id'], [
            'include_inactive' => ['sometimes', 'boolean'],
        ]);
        $query = DB::table('shipping_drivers')
            ->select('shipping_drivers.*')
            ->selectSub(fn ($containers) => $containers->from('containers')->selectRaw('COUNT(*)')
                ->whereColumn('containers.shipping_driver_id', 'shipping_drivers.id'), 'containers_count')
            ->selectSub(fn ($trips) => $trips->from('deliveries')->selectRaw('COUNT(*)')
                ->whereColumn('deliveries.shipping_driver_id', 'shipping_drivers.id'), 'trips_count')
            ->when(! ($filters['include_inactive'] ?? false), fn ($q) => $q->where('is_active', true));
        ListQuery::search($query, $filters, ['name', 'shipping_company']);
        ListQuery::sort($query, $filters, ['name' => 'name', 'shipping_company' => 'shipping_company', 'id' => 'id'], 'name');

        $page = $query->paginate($filters['per_page'] ?? 50);
        $page->getCollection()->transform(fn (object $row): object => $this->driverResource($row));

        return response()->json(ListQuery::page($page));
    }

    public function createDriver(Request $request): JsonResponse
    {
        $values = $request->validate([
            'name' => ['required', 'string', 'max:160', 'unique:shipping_drivers,name'],
            'shipping_company' => ['sometimes', 'nullable', 'string', 'max:160'],
        ]);
        $actor = $this->actorId($request);
        $id = DB::transaction(function () use ($request, $values, $actor): int {
            $id = (int) DB::table('shipping_drivers')->insertGetId([
                ...$values, 'is_active' => true, 'created_by_user_id' => $actor, 'updated_by_user_id' => $actor,
                'created_at' => now(), 'updated_at' => now(),
            ]);
            $after = DB::table('shipping_drivers')->where('id', $id)->first();
            $this->auditLog->record($request, 'shipping_driver.created', 'shipping_driver', $id, null, null, (array) $after);

            return $id;
        });

        return response()->json(['data' => $this->driverResource(DB::table('shipping_drivers')->where('id', $id)->first())], 201);
    }

    public function updateDriver(Request $request, int $driverId): JsonResponse
    {
        $values = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:160', Rule::unique('shipping_drivers', 'name')->ignore($driverId)],
            'shipping_company' => ['sometimes', 'nullable', 'string', 'max:160'],
            'is_active' => ['sometimes', 'boolean'],
        ]);
        abort_if($values === [], 422);
        $actor = $this->actorId($request);
        $driver = DB::transaction(function () use ($request, $values, $actor, $driverId): object {
            $before = DB::table('shipping_drivers')->where('id', $driverId)->lockForUpdate()->first();
            abort_if($before === null, 404);
            if (($values['is_active'] ?? true) === false && (bool) $before->is_active) {
                $this->trash->record($request, 'shipping_driver', $driverId, (string) $before->name, (array) $before);
            }
            DB::table('shipping_drivers')->where('id', $driverId)->update([...$values, 'updated_by_user_id' => $actor, 'updated_at' => now()]);
            $after = DB::table('shipping_drivers')->where('id', $driverId)->first();
            $this->auditLog->record($request, 'shipping_driver.updated', 'shipping_driver', $driverId, null, (array) $before, (array) $after);

            return $after;
        });

        return response()->json(['data' => $this->driverResource($driver)]);
    }

    private function governorateResource(object $governorate): object
    {
        $governorate->is_active = (bool) $governorate->is_active;
        $governorate->sort_order = (int) $governorate->sort_order;
        $governorate->customers_count = (int) ($governorate->customers_count ?? DB::table('customers')->where('governorate', $governorate->name)->count());

        return $governorate;
    }

    private function driverResource(object $driver): object
    {
        $driver->is_active = (bool) $driver->is_active;
        $driver->containers_count = (int) ($driver->containers_count ?? 0);
        $driver->trips_count = (int) ($driver->trips_count ?? 0);

        return $driver;
    }

    private function actorId(Request $request): int
    {
        $actor = $request->attributes->get('authenticated_user');
        abort_if(! is_object($actor) || ! isset($actor->id), 401);

        return (int) $actor->id;
    }
}
