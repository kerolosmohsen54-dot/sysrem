<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\DB;
use PHPUnit\Framework\Attributes\Test;
use Tests\Concerns\AuthenticatesApi;
use Tests\TestCase;

final class CustomerLiquidationTest extends TestCase
{
    use AuthenticatesApi;

    #[Test]
    public function liquidation_returns_decimal_totals_and_does_not_write_rows(): void
    {
        $owner = $this->actingAsApiUser('owner', true);
        $now = now();
        $customerId = (int) DB::table('customers')->insertGetId([
            'name' => 'Liquidation fixture '.bin2hex(random_bytes(4)),
            'phone' => 'LQ'.bin2hex(random_bytes(5)),
            'is_active' => true,
            'created_at' => $now,
            'updated_at' => $now,
        ]);
        $invoiceId = (int) DB::table('sales_documents')->insertGetId([
            'document_number' => 'LQ-INV-'.strtoupper(bin2hex(random_bytes(4))),
            'document_type' => 'invoice',
            'status' => 'posted',
            'customer_id' => $customerId,
            'issue_date' => '2026-10-13',
            'issuer_name_snapshot' => 'Liquidation fixture',
            'subtotal' => '100.0000',
            'discount_amount' => '0.0000',
            'tax_amount' => '0.0000',
            'total_amount' => '100.0000',
            'posted_at' => $now,
            'created_at' => $now,
            'updated_at' => $now,
        ]);
        DB::table('sales_documents')->insert([
            'document_number' => 'LQ-RET-'.strtoupper(bin2hex(random_bytes(4))),
            'document_type' => 'credit_note',
            'status' => 'posted',
            'customer_id' => $customerId,
            'issue_date' => '2026-10-13',
            'original_document_id' => $invoiceId,
            'subtotal' => '20.0000',
            'discount_amount' => '0.0000',
            'tax_amount' => '0.0000',
            'total_amount' => '20.0000',
            'posted_at' => $now,
            'created_at' => $now,
            'updated_at' => $now,
        ]);
        $treasuryId = (int) DB::table('treasury_accounts')->insertGetId([
            'code' => 'LQ-'.strtoupper(bin2hex(random_bytes(4))),
            'name' => 'Liquidation fixture cash',
            'account_type' => 'cash',
            'is_active' => true,
            'created_at' => $now,
            'updated_at' => $now,
        ]);
        $receiptId = (int) DB::table('sales_receipts')->insertGetId([
            'receipt_number' => 'LQ-PAY-'.strtoupper(bin2hex(random_bytes(4))),
            'receipt_type' => 'collection',
            'status' => 'posted',
            'customer_id' => $customerId,
            'treasury_account_id' => $treasuryId,
            'receipt_date' => '2026-10-13',
            'amount' => '30.0000',
            'unapplied_amount' => '0.0000',
            'posted_by_user_id' => $owner['user_id'],
            'posted_at' => $now,
            'created_at' => $now,
            'updated_at' => $now,
        ]);
        DB::table('sales_receipt_allocations')->insert([
            'sales_receipt_id' => $receiptId,
            'sales_document_id' => $invoiceId,
            'allocation_amount' => '30.0000',
            'created_at' => $now,
        ]);

        $tables = ['customers', 'sales_documents', 'sales_receipts', 'sales_receipt_allocations', 'sales_receipt_allocation_reversals'];
        $countsBefore = [];
        foreach ($tables as $table) {
            $countsBefore[$table] = DB::table($table)->count();
        }

        $reader = $this->actingAsApiUser('read_only', true);
        $this->withCredentials()->withUnencryptedCookie($this->apiCookieName(), $reader['token'])
            ->getJson("/api/v1/customers/{$customerId}")
            ->assertOk()
            ->assertJsonMissingPath('data.balance');
        $this->withCredentials()->withUnencryptedCookie($this->apiCookieName(), $reader['token'])
            ->getJson("/api/v1/customers/{$customerId}/liquidation")
            ->assertForbidden();

        $response = $this->withCredentials()
            ->withUnencryptedCookie($this->apiCookieName(), $owner['token'])
            ->getJson("/api/v1/customers/{$customerId}/liquidation");

        $response->assertStatus(200)
            ->assertJsonPath('data.customer.id', $customerId)
            ->assertJsonPath('data.invoice_total_egp', '100.00')
            ->assertJsonPath('data.collection_total_egp', '30.00')
            ->assertJsonPath('data.return_total_egp', '20.00')
            ->assertJsonPath('data.balance_egp', '50.00');
        foreach ($tables as $table) {
            $this->assertSame($countsBefore[$table], DB::table($table)->count(), "Unexpected write to {$table}.");
        }
    }
}
