<?php

namespace App\Services;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class FinancialAccountMappingService
{
    public function __construct(private readonly AuditLogService $auditLog) {}

    public function index(): array
    {
        return [
            'data' => DB::table('financial_account_mappings as mapping')
                ->join('chart_of_accounts as account', 'account.id', '=', 'mapping.account_id')
                ->orderBy('mapping.mapping_key')
                ->get([
                    'mapping.mapping_key', 'mapping.label', 'mapping.account_type', 'mapping.normal_balance',
                    'account.id as account_id', 'account.code as account_code', 'account.name as account_name',
                ])->map(static fn (object $row): array => [
                    'mapping_key' => $row->mapping_key,
                    'label' => $row->label,
                    'account_type' => $row->account_type,
                    'normal_balance' => $row->normal_balance,
                    'account_id' => (int) $row->account_id,
                    'account_code' => $row->account_code,
                    'account_name' => $row->account_name,
                ])->all(),
            'accounts' => DB::table('chart_of_accounts')
                ->where('is_active', true)->where('is_control_account', false)
                ->whereNotExists(fn ($query) => $query->selectRaw('1')->from('chart_of_accounts as child')->whereColumn('child.parent_account_id', 'chart_of_accounts.id'))
                ->orderBy('code')->get(['id', 'code', 'name', 'account_type', 'normal_balance'])
                ->map(static fn (object $account): array => [
                    'id' => (int) $account->id, 'code' => $account->code, 'name' => $account->name,
                    'account_type' => $account->account_type, 'normal_balance' => $account->normal_balance,
                ])->all(),
        ];
    }

    public function update(Request $request, string $key, int $accountId): array
    {
        return DB::transaction(function () use ($request, $key, $accountId): array {
            $mapping = DB::table('financial_account_mappings')->where('mapping_key', $key)->lockForUpdate()->first();
            abort_if($mapping === null, 404);
            $account = DB::table('chart_of_accounts')->where('id', $accountId)->lockForUpdate()->first();
            if ($account === null || ! $account->is_active || $account->is_control_account
                || $account->account_type !== $mapping->account_type
                || $account->normal_balance !== $mapping->normal_balance
                || DB::table('chart_of_accounts')->where('parent_account_id', $accountId)->exists()) {
                throw ValidationException::withMessages(['account_id' => ['اختر حساباً نشطاً ومرحّلاً من النوع والطبيعة المطابقين لهذا الربط.']]);
            }
            if (DB::table('financial_account_mappings')->where('account_id', $accountId)->where('mapping_key', '!=', $key)->exists()) {
                throw ValidationException::withMessages(['account_id' => ['لا يمكن ربط حساب واحد بأكثر من بند ترحيل تلقائي.']]);
            }
            $before = DB::table('financial_account_mappings as mapping')
                ->join('chart_of_accounts as account', 'account.id', '=', 'mapping.account_id')
                ->where('mapping.mapping_key', $key)->first(['mapping.account_id', 'account.code', 'account.name']);
            DB::table('financial_account_mappings')->where('mapping_key', $key)->update(['account_id' => $accountId, 'updated_at' => now()]);
            $after = ['account_id' => $accountId, 'account_code' => $account->code, 'account_name' => $account->name];
            $this->auditLog->record($request, 'financial_account_mapping.updated', 'financial_account_mapping', null, $key,
                ['account_id' => (int) $before->account_id, 'account_code' => $before->code, 'account_name' => $before->name], $after);
            return ['mapping_key' => $key, 'label' => $mapping->label, ...$after];
        });
    }
}
