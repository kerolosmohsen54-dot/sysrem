<?php

namespace App\Http\Controllers;

use App\Services\ReportsService;
use App\Support\ExactMoney;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class CustomerLiquidationController extends Controller
{
    public function show(int $customerId, ReportsService $reports): JsonResponse
    {
        $customer = DB::table('customers')->find($customerId);
        abort_if($customer === null, 404);

        $invoices = DB::table('sales_documents')
            ->where('customer_id', $customerId)
            ->where('status', 'posted')
            ->where('document_type', 'invoice')
            ->orderBy('issue_date')
            ->orderBy('id')
            ->get();
        $payments = DB::table('sales_receipts')
            ->where('customer_id', $customerId)
            ->where('status', 'posted')
            ->where('receipt_type', 'collection')
            ->orderBy('receipt_date')
            ->orderBy('id')
            ->get();
        $returns = DB::table('sales_documents')
            ->where('customer_id', $customerId)
            ->where('status', 'posted')
            ->where('document_type', 'credit_note')
            ->orderBy('issue_date')
            ->orderBy('id')
            ->get();

        $invoiceTotal = $this->sumAmounts($invoices->pluck('total_amount')->all());
        $paymentTotal = $this->sumAmounts($payments->pluck('amount')->all());
        $returnTotal = $this->sumAmounts($returns->pluck('total_amount')->all());
        $balance = $reports->customerBalanceRows([$customerId])[$customerId]['balance'] ?? '0.00';

        return response()->json(['data' => [
            'customer' => $customer,
            'invoices' => $invoices,
            'payments' => $payments,
            'returns' => $returns,
            'invoice_total_egp' => $invoiceTotal,
            'collection_total_egp' => $paymentTotal,
            'return_total_egp' => $returnTotal,
            'balance_egp' => $balance,
        ]]);
    }

    /** @param list<mixed> $amounts */
    private function sumAmounts(array $amounts): string
    {
        $cents = '0';
        foreach ($amounts as $amount) {
            $cents = ExactMoney::add($cents, ExactMoney::toCents((string) $amount));
        }

        return ExactMoney::fromCents($cents);
    }
}
