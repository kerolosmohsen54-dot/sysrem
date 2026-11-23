<?php

namespace App\Http\Controllers;

use App\Services\AuditLogService;
use App\Support\ListQuery;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CurrencyReferenceController extends Controller
{
    public function __construct(private readonly AuditLogService $auditLog) {}

    public function index(Request $request): JsonResponse
    {
        $filters = ListQuery::validate($request, ['code' => 'code', 'name' => 'name', 'id' => 'id'], [
            'include_inactive' => ['sometimes', 'boolean'],
        ]);
        $query = DB::table('currency_references')
            ->when(! ($filters['include_inactive'] ?? false), fn ($q) => $q->where('is_active', true));
        ListQuery::search($query, $filters, ['code', 'name']);
        ListQuery::sort($query, $filters, ['code' => 'code', 'name' => 'name', 'id' => 'id'], 'code');

        $page = $query->paginate($filters['per_page'] ?? 100);
        $page->getCollection()->transform(fn (object $row): array => $this->resource($row));

        return response()->json(ListQuery::page($page));
    }

    public function store(Request $request): JsonResponse
    {
        $values = $request->validate([
            'code' => ['required', 'string', 'size:3', 'regex:/^[A-Z]{3}$/', 'unique:currency_references,code'],
            'name' => ['required', 'string', 'max:100'],
            'symbol' => ['sometimes', 'nullable', 'string', 'max:8'],
            'decimal_places' => ['sometimes', 'integer', 'between:0,4'],
        ]);
        $currency = DB::transaction(function () use ($request, $values): object {
            $now = now();
            $id = DB::table('currency_references')->insertGetId([
                ...$values,
                'decimal_places' => $values['decimal_places'] ?? 2,
                'is_active' => true,
                'created_by_user_id' => $this->actorId($request),
                'updated_by_user_id' => $this->actorId($request),
                'created_at' => $now,
                'updated_at' => $now,
            ]);
            $currency = DB::table('currency_references')->where('id', $id)->first();
            $this->auditLog->record($request, 'currency_reference.created', 'currency_reference', $id, null, null, (array) $currency);

            return $currency;
        });

        return response()->json(['data' => $this->resource($currency)], 201);
    }

    public function update(Request $request, int $currencyId): JsonResponse
    {
        $values = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:100'],
            'symbol' => ['sometimes', 'nullable', 'string', 'max:8'],
            'decimal_places' => ['sometimes', 'integer', 'between:0,4'],
            'is_active' => ['sometimes', 'boolean'],
        ]);
        abort_if($values === [], 422);

        $currency = DB::transaction(function () use ($request, $currencyId, $values): object {
            $before = DB::table('currency_references')->where('id', $currencyId)->lockForUpdate()->first();
            abort_if($before === null, 404);
            DB::table('currency_references')->where('id', $currencyId)->update([
                ...$values,
                'updated_by_user_id' => $this->actorId($request),
                'updated_at' => now(),
            ]);
            $after = DB::table('currency_references')->where('id', $currencyId)->first();
            $this->auditLog->record($request, 'currency_reference.updated', 'currency_reference', $currencyId, null, (array) $before, (array) $after);

            return $after;
        });

        return response()->json(['data' => $this->resource($currency)]);
    }

    /** @return array<string, mixed> */
    private function resource(object $row): array
    {
        return [
            ...((array) $row),
            'id' => (int) $row->id,
            'decimal_places' => (int) $row->decimal_places,
            'is_active' => (bool) $row->is_active,
        ];
    }

    private function actorId(Request $request): ?int
    {
        $actor = $request->attributes->get('authenticated_user');

        return is_object($actor) ? (int) $actor->id : null;
    }
}
