<?php

namespace App\Http\Controllers;

use App\Services\AuditLogService;
use App\Services\CsvImportService;
use App\Support\ExactMoney;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Illuminate\Support\Str;

class DataToolsController extends Controller
{
    public function __construct(
        private readonly CsvImportService $imports,
        private readonly AuditLogService $auditLog,
    ) {}

    public function preview(Request $request): JsonResponse
    {
        $values = $request->validate([
            'type' => ['required', 'in:products,customers,opening-stock,customer-opening-balances'],
            'file' => ['required', 'file', 'max:10240', 'mimes:csv,txt'],
        ]);
        $actor = $this->actor($request);
        $expired = DB::table('csv_import_staging')->where('expires_at', '<', now())->get(['id', 'file_path']);
        foreach ($expired as $oldStage) {
            Storage::disk('local')->delete((string) $oldStage->file_path);
        }
        if ($expired->isNotEmpty()) {
            DB::table('csv_import_staging')->whereIn('id', $expired->pluck('id'))->delete();
        }
        $upload = $request->file('file');
        $checksum = hash_file('sha256', $upload->getRealPath());
        $id = (string) Str::uuid();
        $path = 'import-staging/'.$id.'.csv';
        Storage::disk('local')->put($path, file_get_contents($upload->getRealPath()));
        $result = $this->imports->run($values['type'], Storage::disk('local')->path($path), false, (int) $actor->id);
        $previewRows = $this->previewRows(Storage::disk('local')->path($path));
        $rowErrors = [];
        foreach ($result['errors'] as $error) {
            if (preg_match('/^Row (\d+):/', $error, $match)) {
                $rowErrors[(int) $match[1]][] = $error;
            } else {
                $rowErrors[0][] = $error;
            }
        }
        $status = $result['errors'] === [] ? 'previewed' : 'invalid';
        DB::table('csv_import_staging')->insert([
            'id' => $id,
            'import_type' => $values['type'],
            'checksum' => $checksum,
            'file_path' => $path,
            'row_count' => $result['row_count'],
            'errors' => json_encode($rowErrors, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE),
            'status' => $status,
            'created_by_user_id' => $actor->id,
            'expires_at' => now()->addHours(2),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->json(['data' => [
            'stage_id' => $id,
            'type' => $values['type'],
            'checksum' => $checksum,
            'row_count' => $result['row_count'],
            'valid' => $result['errors'] === [] && $result['row_count'] > 0,
            'errors' => $rowErrors,
            'rows' => array_slice($previewRows, 0, 8),
            'duplicate' => DB::table('csv_import_batches')->where('import_type', $values['type'])->where('checksum', $checksum)->exists(),
        ]]);
    }

    public function apply(Request $request): JsonResponse
    {
        $values = $request->validate([
            'stage_id' => ['required', 'uuid'],
            'confirmed' => ['required', 'accepted'],
        ]);
        $actor = $this->actor($request);
        $result = DB::transaction(function () use ($request, $values, $actor): array {
            $stage = DB::table('csv_import_staging')->where('id', $values['stage_id'])->lockForUpdate()->first();
            abort_if($stage === null || $stage->created_by_user_id !== $actor->id, 404);
            abort_if($stage->expires_at < now(), 410, 'The import preview has expired. Upload the file again.');
            abort_if($stage->status === 'invalid', 422, 'Correct every row error before applying this import.');
            $existing = DB::table('csv_import_batches')->where('import_type', $stage->import_type)->where('checksum', $stage->checksum)->first();
            if ($existing !== null) {
                DB::table('csv_import_staging')->where('id', $stage->id)->update(['status' => 'duplicate', 'updated_at' => now()]);
                return ['duplicate' => true, 'row_count' => (int) $existing->row_count, 'imported' => 0, 'applied_at' => $existing->applied_at];
            }

            $import = $this->imports->run(
                (string) $stage->import_type,
                Storage::disk('local')->path((string) $stage->file_path),
                true,
                (int) $actor->id,
            );
            if ($import['errors'] !== []) {
                throw ValidationException::withMessages(['file' => $import['errors']]);
            }
            DB::table('csv_import_batches')->insert([
                'import_type' => $stage->import_type,
                'checksum' => $stage->checksum,
                'row_count' => $import['row_count'],
                'imported_count' => $import['imported'],
                'applied_by_user_id' => $actor->id,
                'applied_at' => now(),
            ]);
            DB::table('csv_import_staging')->where('id', $stage->id)->update([
                'status' => 'applied', 'applied_at' => now(), 'updated_at' => now(),
            ]);
            $this->auditLog->record($request, 'data.csv_import.applied', 'csv_import_batch', null, null, null, [
                'type' => $stage->import_type,
                'checksum' => $stage->checksum,
                'row_count' => $import['row_count'],
                'imported' => $import['imported'],
            ]);

            return ['duplicate' => false, 'row_count' => $import['row_count'], 'imported' => $import['imported'], 'applied_at' => now()->toIso8601String()];
        }, 5);
        $stage = DB::table('csv_import_staging')->where('id', $values['stage_id'])->first(['file_path']);
        if ($stage !== null) {
            Storage::disk('local')->delete((string) $stage->file_path);
            DB::table('csv_import_staging')->where('id', $values['stage_id'])->delete();
        }

        return response()->json(['data' => $result]);
    }

    public function dailySummary(Request $request): JsonResponse
    {
        $this->actor($request);
        $date = now()->toDateString();
        $invoiceRows = DB::table('sales_documents')
            ->where('document_type', 'invoice')->where('status', 'posted')->whereDate('issue_date', $date)
            ->get(['id', 'total_amount', 'tax_amount']);
        $sales = '0';
        $salesProfitPositive = '0';
        $salesProfitNegative = '0';
        $profitComplete = true;
        foreach ($invoiceRows as $invoice) {
            $sales = ExactMoney::add($sales, ExactMoney::toCents((string) $invoice->total_amount));
            $revenue = ExactMoney::subtract(ExactMoney::toCents((string) $invoice->total_amount), ExactMoney::toCents((string) $invoice->tax_amount));
            $lines = DB::table('sales_document_lines')->where('sales_document_id', $invoice->id)->get(['quantity', 'unit_cost_egp_snapshot']);
            $cost = '0';
            foreach ($lines as $line) {
                if ($line->unit_cost_egp_snapshot === null) {
                    $profitComplete = false;
                    continue;
                }
                $cost = ExactMoney::add($cost, ExactMoney::multiply(ExactMoney::toCents((string) $line->unit_cost_egp_snapshot), (int) $line->quantity));
            }
            if ($profitComplete || ! $lines->contains(static fn (object $line): bool => $line->unit_cost_egp_snapshot === null)) {
                if (ExactMoney::compare($revenue, $cost) >= 0) {
                    $salesProfitPositive = ExactMoney::add($salesProfitPositive, ExactMoney::subtract($revenue, $cost));
                } else {
                    $salesProfitNegative = ExactMoney::add($salesProfitNegative, ExactMoney::subtract($cost, $revenue));
                }
            }
        }
        $collections = DB::table('sales_receipts')->where('status', 'posted')->where('receipt_type', 'collection')->whereDate('receipt_date', $date)->sum('amount');
        $expenses = DB::table('expenses')->where('status', 'posted')->whereDate('expense_date', $date)->sum('amount');
        $journalTotals = DB::table('journal_entries as entry')
            ->join('journal_lines as line', 'line.journal_entry_id', '=', 'entry.id')
            ->join('chart_of_accounts as account', 'account.id', '=', 'line.account_id')
            ->where('entry.status', 'posted')->whereDate('entry.entry_date', $date)
            ->whereIn('account.account_type', ['revenue', 'expense'])
            ->groupBy('account.account_type')
            ->get(['account.account_type', DB::raw('SUM(line.debit_amount) AS debit_total'), DB::raw('SUM(line.credit_amount) AS credit_total')]);
        $netPositive = '0';
        $netNegative = '0';
        foreach ($journalTotals as $total) {
            $debit = ExactMoney::toCents((string) $total->debit_total);
            $credit = ExactMoney::toCents((string) $total->credit_total);
            $isPositive = $total->account_type === 'revenue' ? ExactMoney::compare($credit, $debit) >= 0 : ExactMoney::compare($debit, $credit) >= 0;
            $amount = ExactMoney::compare($credit, $debit) >= 0 ? ExactMoney::subtract($credit, $debit) : ExactMoney::subtract($debit, $credit);
            if ($total->account_type === 'expense') $isPositive = ! $isPositive;
            if ($isPositive) $netPositive = ExactMoney::add($netPositive, $amount); else $netNegative = ExactMoney::add($netNegative, $amount);
        }
        $settingsJson = DB::table('app_settings')->where('setting_key', 'general')->value('setting_value');
        $settings = is_string($settingsJson) ? json_decode($settingsJson, true) : [];

        return response()->json(['data' => [
            'date' => $date,
            'invoice_count' => $invoiceRows->count(),
            'sales_egp' => ExactMoney::fromCents($sales),
            'collections_egp' => ExactMoney::fromCents(ExactMoney::toCents((string) $collections)),
            'expenses_egp' => ExactMoney::fromCents(ExactMoney::toCents((string) $expenses)),
            'sales_profit_egp' => $profitComplete ? $this->signedAmount($salesProfitPositive, $salesProfitNegative) : null,
            'sales_profit_complete' => $profitComplete,
            'net_profit_egp' => $this->signedAmount($netPositive, $netNegative),
            'whatsapp_phone' => $this->dailySummaryPhone(),
            'reminder_enabled' => is_array($settings) && (bool) ($settings['daily_summary_reminder_enabled'] ?? false),
            'reminder_time' => is_array($settings) ? ($settings['daily_summary_reminder_time'] ?? '21:00') : '21:00',
            'updated_at' => now()->toIso8601String(),
        ]]);
    }

    private function previewRows(string $path): array
    {
        $handle = fopen($path, 'rb');
        if ($handle === false) return [];
        try {
            $headers = fgetcsv($handle, null, ',', '"', '\\');
            if (! is_array($headers)) return [];
            $headers[0] = preg_replace('/^\xEF\xBB\xBF/', '', (string) $headers[0]) ?? (string) $headers[0];
            $rows = [];
            $line = 1;
            while (($fields = fgetcsv($handle, null, ',', '"', '\\')) !== false) {
                $line++;
                if ($fields === [null] || count($fields) !== count($headers)) continue;
                $rows[] = ['line' => $line, 'values' => array_combine($headers, $fields) ?: []];
            }
            return $rows;
        } finally {
            fclose($handle);
        }
    }

    private function signedAmount(string $positive, string $negative): string
    {
        return ExactMoney::compare($positive, $negative) >= 0
            ? ExactMoney::fromCents(ExactMoney::subtract($positive, $negative))
            : '-'.ExactMoney::fromCents(ExactMoney::subtract($negative, $positive));
    }

    private function dailySummaryPhone(): ?string
    {
        $json = DB::table('app_settings')->where('setting_key', 'general')->value('setting_value');
        if (! is_string($json)) return null;
        $settings = json_decode($json, true);
        return is_array($settings) && is_string($settings['daily_summary_whatsapp_phone'] ?? null)
            ? $settings['daily_summary_whatsapp_phone'] : null;
    }

    private function actor(Request $request): object
    {
        $actor = $request->attributes->get('authenticated_user');
        abort_unless(is_object($actor) && isset($actor->id), 401);
        return $actor;
    }
}
