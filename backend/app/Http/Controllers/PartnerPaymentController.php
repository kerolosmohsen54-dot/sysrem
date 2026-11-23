<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class PartnerPaymentController extends Controller
{
    /** Historical payment records remain readable for audit purposes. */
    public function index(): JsonResponse
    {
        $page = DB::table('partner_payments as payment')
            ->join('partners as partner', 'partner.id', '=', 'payment.partner_id')
            ->where('partner.is_company_partner', true)
            ->leftJoin('treasury_accounts as account', 'account.id', '=', 'payment.treasury_account_id')
            ->orderByDesc('payment.id')
            ->select(['payment.*', 'partner.name as partner_name', 'account.name as treasury_account_name'])
            ->paginate(50);

        return response()->json($page);
    }

    public function store(): JsonResponse
    {
        return $this->payoutsDisabled();
    }

    public function approve(int $id): JsonResponse
    {
        return $this->payoutsDisabled();
    }

    private function payoutsDisabled(): JsonResponse
    {
        return response()->json([
            'error' => [
                'code' => 'COMPANY_PARTNER_PAYOUTS_DISABLED',
                'message' => 'Company partner earnings are recorded for review; payout transactions are disabled.',
            ],
        ], 409);
    }
}
