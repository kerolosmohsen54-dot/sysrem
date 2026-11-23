<?php

namespace App\Http\Controllers;

use App\Services\AuditLogService;
use App\Support\ListQuery;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class SupplierController extends Controller
{
    public function __construct(private readonly AuditLogService $auditLog) {}

    public function index(Request $request): JsonResponse
    {
        $filters = ListQuery::validate($request, ['name' => 'name', 'id' => 'id'], [
            'is_active' => ['sometimes', 'boolean'],
        ]);
        $query = DB::table('suppliers')->when(isset($filters['is_active']), fn ($q) => $q->where('is_active', $filters['is_active']));
        ListQuery::search($query, $filters, ['name', 'supplier_number', 'phone']);
        ListQuery::sort($query, $filters, ['name' => 'name', 'id' => 'id'], 'name', 'name', 'asc');
        return response()->json(ListQuery::page($query->paginate($filters['per_page'] ?? 50)));
    }

    public function store(Request $request): JsonResponse
    {
        $request->merge(['name' => trim((string) $request->input('name', ''))]);
        $values = $request->validate([
            'name' => ['required', 'string', 'max:200', Rule::unique('suppliers', 'name')],
            'phone' => ['sometimes', 'nullable', 'string', 'max:32'],
        ]);
        $id = DB::transaction(function () use ($request, $values): int {
            $now = now();
            $id = (int) DB::table('suppliers')->insertGetId([
                'name' => $values['name'],
                'phone' => $values['phone'] ?? null,
                'is_active' => true,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
            $supplier = DB::table('suppliers')->where('id', $id)->first();
            $this->auditLog->record($request, 'supplier.created', 'supplier', $id, null, null, (array) $supplier);

            return $id;
        });

        return response()->json(['data' => DB::table('suppliers')->where('id', $id)->first(['id', 'name', 'phone'])], 201);
    }
}
