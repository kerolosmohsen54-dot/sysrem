<?php

namespace App\Services;

use App\Models\Governorate;
use App\Support\ListQuery;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class GovernorateService
{
    public function __construct(private readonly AuditLogService $auditLog, private readonly TrashService $trash) {}

    public function list(Request $request): array
    {
        $filters = ListQuery::validate($request, ['name' => 'name', 'sort_order' => 'sort_order', 'id' => 'id'], [
            'include_inactive' => ['sometimes', 'boolean'],
        ]);
        $query = Governorate::query()->select('governorates.*')
            ->selectSub(DB::table('customers')->selectRaw('COUNT(*)')->whereColumn('customers.governorate', 'governorates.name'), 'customers_count')
            ->when(! ($filters['include_inactive'] ?? false), fn ($q) => $q->where('is_active', true));
        $builder = $query->getQuery();
        ListQuery::search($builder, $filters, ['name']);
        ListQuery::sort($builder, $filters, ['name' => 'name', 'sort_order' => 'sort_order', 'id' => 'id'], 'sort_order');
        $page = $query->paginate($filters['per_page'] ?? 100);
        $page->getCollection()->transform(fn (Governorate $row): array => $this->resource($row));

        return ListQuery::page($page);
    }

    public function create(Request $request, array $values): array
    {
        $actor = $this->actorId($request);
        $governorate = DB::transaction(function () use ($request, $values, $actor): Governorate {
            $governorate = Governorate::query()->create([
                ...$values,
                'sort_order' => ((int) Governorate::query()->max('sort_order')) + 1,
                'is_active' => true,
                'created_by_user_id' => $actor,
                'updated_by_user_id' => $actor,
            ]);
            $this->auditLog->record($request, 'governorate.created', 'governorate', $governorate->id, null, null, $governorate->toArray());

            return $governorate;
        });

        return $this->resource($governorate);
    }

    public function update(Request $request, int $governorateId, array $values): array
    {
        $actor = $this->actorId($request);
        $governorate = DB::transaction(function () use ($request, $values, $actor, $governorateId): Governorate {
            $governorate = Governorate::query()->whereKey($governorateId)->lockForUpdate()->firstOrFail();
            $before = $governorate->toArray();
            if (isset($values['name']) && $values['name'] !== $governorate->name) {
                DB::table('customers')->where('governorate', $governorate->name)->update([
                    'governorate' => $values['name'], 'updated_by_user_id' => $actor, 'updated_at' => now(),
                ]);
            }
            $governorate->fill([...$values, 'updated_by_user_id' => $actor])->save();
            $this->auditLog->record($request, 'governorate.updated', 'governorate', $governorateId, null, $before, $governorate->fresh()->toArray());

            return $governorate->fresh();
        });

        return $this->resource($governorate);
    }

    public function archive(Request $request, int $governorateId): array
    {
        $actor = $this->actorId($request);
        $governorate = DB::transaction(function () use ($request, $actor, $governorateId): Governorate {
            $governorate = Governorate::query()->whereKey($governorateId)->lockForUpdate()->firstOrFail();
            $before = $governorate->toArray();
            $this->trash->record($request, 'governorate', $governorateId, $governorate->name, $before);
            $governorate->forceFill(['is_active' => false, 'updated_by_user_id' => $actor])->save();
            $this->auditLog->record($request, 'governorate.deleted', 'governorate', $governorateId, null, $before, $governorate->fresh()->toArray());

            return $governorate->fresh();
        });

        return $this->resource($governorate);
    }

    private function resource(Governorate $governorate): array
    {
        return [
            'id' => (int) $governorate->id,
            'name' => $governorate->name,
            'sort_order' => (int) $governorate->sort_order,
            'is_active' => (bool) $governorate->is_active,
            'customers_count' => (int) ($governorate->customers_count ?? DB::table('customers')->where('governorate', $governorate->name)->count()),
        ];
    }

    private function actorId(Request $request): int
    {
        $actor = $request->attributes->get('authenticated_user');
        abort_unless(is_object($actor) && isset($actor->id), 401);

        return (int) $actor->id;
    }
}
