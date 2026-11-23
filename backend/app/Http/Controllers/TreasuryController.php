<?php

namespace App\Http\Controllers;

use App\Services\AuditLogService;
use App\Services\IdempotencyService;
use App\Services\TreasuryService;
use App\Support\ListQuery;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class TreasuryController extends Controller
{
    public function __construct(
        private readonly TreasuryService $treasury,
        private readonly AuditLogService $auditLog,
        private readonly IdempotencyService $idempotency,
    ) {}

    public function accounts(Request $request): JsonResponse
    {
        $sortable = ['name' => 'name', 'code' => 'code', 'account_type' => 'account_type', 'id' => 'id'];
        $filters = ListQuery::validate($request, $sortable);
        $query = ListQuery::search(DB::table('treasury_accounts'), $filters, ['name', 'code']);
        ListQuery::sort($query, $filters, $sortable, 'name');

        return response()->json(ListQuery::page($query->paginate($filters['per_page'] ?? 100)));
    }

    public function createAccount(Request $request): JsonResponse
    {
        return $this->idempotency->execute($request, 'treasury_account', function () use ($request): JsonResponse {
            $values = $request->validate([
                'code' => ['required', 'string', 'max:80', 'unique:treasury_accounts,code'],
                'name' => ['required', 'string', 'max:160'],
                'account_type' => ['required', 'in:cash,bank,other'],
                'notes' => ['sometimes', 'nullable', 'string', 'max:500'],
            ]);
            $id = $this->treasury->createAccount($request, $values);

            return response()->json(['data' => DB::table('treasury_accounts')->where('id', $id)->first()], 201);
        });
    }

    public function updateAccount(Request $request, int $accountId): JsonResponse
    {
        $values = $request->validate([
            'code' => ['sometimes', 'required', 'string', 'max:80', 'unique:treasury_accounts,code,'.$accountId],
            'name' => ['sometimes', 'required', 'string', 'max:160'],
            'account_type' => ['sometimes', 'required', 'in:cash,bank,other'],
            'notes' => ['sometimes', 'nullable', 'string', 'max:500'],
            'is_active' => ['sometimes', 'boolean'],
        ]);
        abort_if($values === [], 422);
        $this->treasury->updateAccount($request, $accountId, $values);

        return response()->json(['data' => DB::table('treasury_accounts')->where('id', $accountId)->first()]);
    }

    public function balance(int $accountId): JsonResponse
    {
        return response()->json(['data' => $this->treasury->balance($accountId)]);
    }

    public function entries(Request $request): JsonResponse
    {
        $sortable = [
            'entry_date' => 'entry.entry_date',
            'entry_number' => 'entry.entry_number',
            'direction' => 'entry.direction',
            'amount' => 'entry.amount',
            'account' => 'account.name',
            'id' => 'entry.id',
        ];
        $filters = ListQuery::validate($request, $sortable, [
            'direction' => ['sometimes', 'in:in,out'],
            'treasury_account_id' => ['sometimes', 'integer', 'min:1'],
            'date_from' => ['sometimes', 'date_format:Y-m-d'],
            'date_to' => ['sometimes', 'date_format:Y-m-d'],
        ]);
        $query = DB::table('treasury_entries as entry')
            ->join('treasury_accounts as account', 'account.id', '=', 'entry.treasury_account_id')
            ->select(['entry.*', 'account.name as treasury_account_name']);
        ListQuery::search($query, $filters, ['entry.entry_number', 'entry.description', 'account.name']);
        foreach (['direction', 'treasury_account_id'] as $field) {
            if (isset($filters[$field])) {
                $query->where('entry.'.$field, $filters[$field]);
            }
        }
        if (isset($filters['date_from'])) {
            $query->where('entry.entry_date', '>=', $filters['date_from']);
        }
        if (isset($filters['date_to'])) {
            $query->where('entry.entry_date', '<=', $filters['date_to']);
        }
        ListQuery::sort($query, $filters, $sortable, 'entry_date', 'entry.id', 'desc');

        return response()->json(ListQuery::page($query->paginate($filters['per_page'] ?? 50)));
    }

    public function postEntry(Request $request): JsonResponse
    {
        return $this->idempotency->execute($request, 'treasury_entry', function () use ($request): JsonResponse {
            $values = $request->validate([
                'treasury_account_id' => ['required', 'integer', 'min:1'],
                'direction' => ['required', 'in:in,out'],
                'entry_date' => ['required', 'date_format:Y-m-d'],
                'amount_egp' => ['required', 'string', 'regex:/\A(?:0|[1-9][0-9]{0,14})(?:\.[0-9]{1,4})?\z/'],
                'description' => ['required', 'string', 'max:500'],
            ]);
            $posted = $this->treasury->postCashEntry($request, $values);

            return response()->json(['data' => $posted], 201);
        });
    }

    public function transfers(Request $request): JsonResponse
    {
        $sortable = [
            'transfer_date' => 'transfer.transfer_date',
            'transfer_number' => 'transfer.transfer_number',
            'amount' => 'transfer.amount',
            'from_account' => 'source.name',
            'to_account' => 'destination.name',
            'id' => 'transfer.id',
        ];
        $filters = ListQuery::validate($request, $sortable, [
            'date_from' => ['sometimes', 'date_format:Y-m-d'],
            'date_to' => ['sometimes', 'date_format:Y-m-d'],
        ]);
        $query = DB::table('treasury_transfers as transfer')
            ->join('treasury_accounts as source', 'source.id', '=', 'transfer.from_treasury_account_id')
            ->join('treasury_accounts as destination', 'destination.id', '=', 'transfer.to_treasury_account_id')
            ->select([
                'transfer.*',
                'source.name as from_account_name',
                'destination.name as to_account_name',
            ]);
        ListQuery::search($query, $filters, ['transfer.transfer_number', 'transfer.notes', 'source.name', 'destination.name']);
        if (isset($filters['date_from'])) {
            $query->where('transfer.transfer_date', '>=', $filters['date_from']);
        }
        if (isset($filters['date_to'])) {
            $query->where('transfer.transfer_date', '<=', $filters['date_to']);
        }
        ListQuery::sort($query, $filters, $sortable, 'transfer_date', 'transfer.id', 'desc');

        return response()->json(ListQuery::page($query->paginate($filters['per_page'] ?? 50)));
    }

    public function postTransfer(Request $request): JsonResponse
    {
        return $this->idempotency->execute($request, 'treasury_transfer', function () use ($request): JsonResponse {
            $values = $request->validate([
                'transfer_date' => ['required', 'date_format:Y-m-d'],
                'from_treasury_account_id' => ['required', 'integer', 'min:1'],
                'to_treasury_account_id' => ['required', 'integer', 'min:1', 'different:from_treasury_account_id'],
                'amount_egp' => ['required', 'string', 'regex:/\A(?:0|[1-9][0-9]{0,14})(?:\.[0-9]{1,4})?\z/'],
                'notes' => ['sometimes', 'nullable', 'string', 'max:1000'],
            ]);
            $id = $this->treasury->postTransfer($request, $values);

            return response()->json(['data' => DB::table('treasury_transfers')->where('id', $id)->first()], 201);
        });
    }

    public function expenseCategories(Request $request): JsonResponse
    {
        $sortable = ['name' => 'name', 'is_active' => 'is_active', 'id' => 'id'];
        $filters = ListQuery::validate($request, $sortable, [
            'is_active' => ['sometimes', 'boolean'],
        ]);
        $query = DB::table('expense_categories')
            ->when(isset($filters['is_active']), fn ($q) => $q->where('is_active', $filters['is_active']));
        ListQuery::search($query, $filters, ['name']);
        ListQuery::sort($query, $filters, $sortable, 'name');

        return response()->json(ListQuery::page($query->paginate($filters['per_page'] ?? 100)));
    }

    public function createExpenseCategory(Request $request): JsonResponse
    {
        return $this->idempotency->execute($request, 'expense_category', function () use ($request): JsonResponse {
            $values = $request->validate([
                'name' => ['required', 'string', 'max:160', 'unique:expense_categories,name'],
            ]);
            $id = DB::transaction(function () use ($request, $values): int {
                $now = now();
                $id = (int) DB::table('expense_categories')->insertGetId([
                    ...$values,
                    'is_active' => true,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
                $this->auditLog->record($request, 'expense_category.created', 'expense_category', $id, null, null, $values);

                return $id;
            }, 5);

            return response()->json(['data' => DB::table('expense_categories')->where('id', $id)->first()], 201);
        });
    }

    public function updateExpenseCategory(Request $request, int $categoryId): JsonResponse
    {
        $values = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:160', 'unique:expense_categories,name,'.$categoryId],
            'is_active' => ['sometimes', 'boolean'],
        ]);
        abort_if($values === [], 422);
        DB::transaction(function () use ($request, $categoryId, $values): void {
            $before = DB::table('expense_categories')->where('id', $categoryId)->lockForUpdate()->first();
            abort_if($before === null, 404);
            DB::table('expense_categories')->where('id', $categoryId)->update([...$values, 'updated_at' => now()]);
            $this->auditLog->record($request, 'expense_category.updated', 'expense_category', $categoryId, null, (array) $before, $values);
        }, 5);

        return response()->json(['data' => DB::table('expense_categories')->where('id', $categoryId)->first()]);
    }

    public function expenses(Request $request): JsonResponse
    {
        $sortable = [
            'expense_date' => 'expense.expense_date',
            'expense_number' => 'expense.expense_number',
            'amount' => 'expense.amount',
            'account' => 'account.name',
            'category' => 'category.name',
            'id' => 'expense.id',
        ];
        $filters = ListQuery::validate($request, $sortable, [
            'treasury_account_id' => ['sometimes', 'integer', 'min:1'],
            'expense_category_id' => ['sometimes', 'integer', 'min:1'],
            'date_from' => ['sometimes', 'date_format:Y-m-d'],
            'date_to' => ['sometimes', 'date_format:Y-m-d'],
        ]);
        $query = DB::table('expenses as expense')
            ->join('treasury_accounts as account', 'account.id', '=', 'expense.treasury_account_id')
            ->leftJoin('expense_categories as category', 'category.id', '=', 'expense.expense_category_id')
            ->select([
                'expense.*',
                'account.name as treasury_account_name',
                'category.name as category_name',
            ]);
        ListQuery::search($query, $filters, ['expense.expense_number', 'expense.description', 'expense.reference', 'category.name', 'account.name']);
        foreach (['treasury_account_id', 'expense_category_id'] as $field) {
            if (isset($filters[$field])) {
                $query->where('expense.'.$field, $filters[$field]);
            }
        }
        if (isset($filters['date_from'])) {
            $query->where('expense.expense_date', '>=', $filters['date_from']);
        }
        if (isset($filters['date_to'])) {
            $query->where('expense.expense_date', '<=', $filters['date_to']);
        }
        ListQuery::sort($query, $filters, $sortable, 'expense_date', 'expense.id', 'desc');

        return response()->json(ListQuery::page($query->paginate($filters['per_page'] ?? 50)));
    }

    public function postExpense(Request $request): JsonResponse
    {
        return $this->idempotency->execute($request, 'expense', function () use ($request): JsonResponse {
            $values = $request->validate([
                'expense_date' => ['required', 'date_format:Y-m-d'],
                'treasury_account_id' => ['required', 'integer', 'min:1'],
                'expense_category_id' => ['required', 'integer', 'min:1'],
                'amount_egp' => ['required', 'string', 'regex:/\A(?:0|[1-9][0-9]{0,14})(?:\.[0-9]{1,4})?\z/'],
                'description' => ['required', 'string', 'max:500'],
                'reference' => ['sometimes', 'nullable', 'string', 'max:160'],
                'original_amount' => ['sometimes', 'nullable', 'string', 'regex:/\A(?:0|[1-9][0-9]{0,14})(?:\.[0-9]{1,4})?\z/'],
                'exchange_rate' => ['sometimes', 'nullable', 'string', 'regex:/\A(?:0|[1-9][0-9]{0,13})(?:\.[0-9]{1,10})?\z/'],
            ]);
            $id = $this->treasury->postExpense($request, $values);

            return response()->json(['data' => DB::table('expenses')->where('id', $id)->first()], 201);
        });
    }
}
