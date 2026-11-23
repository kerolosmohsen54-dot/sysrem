<?php
namespace Tests\Feature;
use Illuminate\Support\Facades\DB;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;
use Tests\Concerns\AuthenticatesApi;
final class PurchaseInvoiceTest extends TestCase {
 use AuthenticatesApi;
 private function req(array $a,string $method,string $uri,array $data=[],bool $csrf=true){$h=$csrf?['X-CSRF-Token'=>$a['csrf']]:[]; return $this->withCredentials()->withUnencryptedCookie($this->apiCookieName(),$a['token'])->json($method,$uri,$data,$h);}
 private function fixtures(): array { $s=DB::table('suppliers')->insertGetId(['name'=>'Fixture Supplier','created_at'=>now(),'updated_at'=>now()]); $w=DB::table('locations')->insertGetId(['code'=>'FIX'.bin2hex(random_bytes(8)),'name'=>'Fixture Warehouse','location_type'=>'main','is_active'=>1,'created_at'=>now(),'updated_at'=>now()]); $p=DB::table('products')->insertGetId(['sku'=>'FIX'.bin2hex(random_bytes(8)),'name'=>'Fixture Product','unit_code'=>'piece','is_active'=>1,'created_at'=>now(),'updated_at'=>now()]); return [$s,$w,$p]; }
 private function payload(array $f): array { return ['invoice_number'=>'PI'.bin2hex(random_bytes(8)),'supplier_id'=>$f[0],'warehouse_id'=>$f[1],'invoice_date'=>now()->format('Y-m-d'),'lines'=>[['product_id'=>$f[2],'quantity'=>1,'unit_cost_egp'=>'12.50']]]; }
 #[Test] public function test_post_without_csrf_returns_419(): void { $f=$this->fixtures(); $a=$this->actingAsApiUser('owner',true); $this->req($a,'POST','/api/v1/purchase-invoices',$this->payload($f),false)->assertStatus(419); }
 #[Test] public function test_post_without_step_up_returns_428(): void { $f=$this->fixtures(); $a=$this->actingAsApiUser('owner',false); $this->req($a,'POST','/api/v1/purchase-invoices',$this->payload($f))->assertStatus(428); }
 #[Test] public function test_missing_supplier_validation(): void { $f=$this->fixtures(); $a=$this->actingAsApiUser('owner',true); $p=$this->payload($f); unset($p['supplier_id']); $this->req($a,'POST','/api/v1/purchase-invoices',$p)->assertStatus(422)->assertJsonStructure(['error'=>['details'=>['supplier_id']]]); }
 #[Test] public function test_invalid_decimal_validation(): void { $f=$this->fixtures(); $a=$this->actingAsApiUser('owner',true); $p=$this->payload($f); $p['lines'][0]['unit_cost_egp']='bad'; $this->req($a,'POST','/api/v1/purchase-invoices',$p)->assertStatus(422)->assertJsonStructure(['error'=>['details'=>['lines.0.unit_cost_egp']]]); }
 #[Test] public function test_zero_quantity_validation(): void { $f=$this->fixtures(); $a=$this->actingAsApiUser('owner',true); $p=$this->payload($f); $p['lines'][0]['quantity']=0; $this->req($a,'POST','/api/v1/purchase-invoices',$p)->assertStatus(422)->assertJsonStructure(['error'=>['details'=>['lines.0.quantity']]]); }
 #[Test] public function test_valid_draft_has_decimal_totals(): void { $f=$this->fixtures(); $a=$this->actingAsApiUser('owner',true); $this->req($a,'POST','/api/v1/purchase-invoices',$this->payload($f))->assertCreated()->assertJsonPath('data.invoice.total_egp','12.5000'); }
 #[Test] public function test_purchase_seller_markup_is_snapshotted_and_credited_once_after_posting(): void {
  $f=$this->fixtures();
  DB::table('products')->where('id',$f[2])->update(['company_price'=>'100.0000']);
  $partnerId=(int)DB::table('partners')->insertGetId(['name'=>'Selling partner','status'=>'active','is_company_partner'=>true,'created_at'=>now(),'updated_at'=>now()]);
  $a=$this->actingAsApiUser('owner',true);
  $payload=$this->payload($f);
  $payload['seller_partner_id']=$partnerId;
  $payload['lines'][0]['quantity']=3;
  $payload['lines'][0]['unit_cost_egp']='200.0000';
  $payload['lines'][0]['company_price_egp']='100.0000';
  $response=$this->req($a,'POST','/api/v1/purchase-invoices',$payload)->assertCreated();
  $invoiceId=(int)$response->json('data.invoice.id');
  self::assertSame(0,DB::table('partner_profit_ledger')->where('purchase_invoice_id',$invoiceId)->count());
  self::assertSame('100.0000',(string)DB::table('purchase_invoice_lines')->where('purchase_invoice_id',$invoiceId)->value('company_price_egp'));
  self::assertSame(0,DB::table('inventory_balances')->where('product_id',$f[2])->where('location_id',$f[1])->value('quantity_on_hand') ?? 0);
  $this->req($a,'GET',"/api/v1/purchase-invoices/{$invoiceId}")->assertOk()->assertJsonPath('data.financial_summary.invoice_supplier_due_egp','0.00');

  $posted=$this->req($a,'POST',"/api/v1/purchase-invoices/{$invoiceId}/post")->assertOk()->assertJsonPath('data.invoice.status','posted');
  self::assertCount(1,$posted->json('data.inventory_movement_ids'));
  self::assertSame(3,(int)DB::table('inventory_balances')->where('product_id',$f[2])->where('location_id',$f[1])->value('quantity_on_hand'));
  self::assertSame('purchase_invoice',(string)DB::table('inventory_movements')->where('id',$posted->json('data.inventory_movement_ids.0'))->value('source_type'));
  self::assertSame('300.0000',(string)DB::table('partner_profit_ledger')->where('purchase_invoice_id',$invoiceId)->value('amount_egp'));
  $this->req($a,'GET','/api/v1/partners/'.$partnerId)->assertOk()->assertJsonPath('data.profit_summary.profit_egp','300.00')->assertJsonMissingPath('data.profit_summary.due_egp');
  $journal=DB::table('journal_entries')->where('source_type','auto_purchase_invoice')->where('source_id',$invoiceId)->first();
  self::assertNotNull($journal);
  self::assertSame('posted',$journal->status);
  self::assertSame('300.0000',(string)DB::table('journal_lines')->where('journal_entry_id',$journal->id)->where('partner_id',$partnerId)->where('credit_amount','>','0')->value('credit_amount'));
  self::assertSame(DB::table('journal_lines')->where('journal_entry_id',$journal->id)->sum('debit_amount'),DB::table('journal_lines')->where('journal_entry_id',$journal->id)->sum('credit_amount'));
  self::assertNotNull(DB::table('financial_outbox_events')->where('source_type','purchase_invoice')->where('source_id',$invoiceId)->whereNotNull('processed_at')->first());

  $retry=$this->req($a,'POST',"/api/v1/purchase-invoices/{$invoiceId}/post")->assertOk();
  self::assertSame($posted->json('data.inventory_movement_ids'),$retry->json('data.inventory_movement_ids'));
  self::assertSame(1,DB::table('inventory_movements')->where('source_type','purchase_invoice')->where('source_id',$invoiceId)->count());
  self::assertSame(1,DB::table('partner_profit_ledger')->where('purchase_invoice_id',$invoiceId)->count());
  self::assertSame(1,DB::table('journal_entries')->where('source_type','auto_purchase_invoice')->where('source_id',$invoiceId)->count());
  $this->req($a,'PUT','/api/v1/purchase-invoices/'.$invoiceId,$payload)->assertStatus(409);
 }
 #[Test] public function test_supplier_payment_posts_to_treasury_and_reduces_real_invoice_due(): void {
  $f=$this->fixtures();
  $a=$this->actingAsApiUser('owner',true);
  $invoiceId=(int)$this->req($a,'POST','/api/v1/purchase-invoices',$this->payload($f))->assertCreated()->json('data.invoice.id');
  $actorId=(int)$a['user_id'];
  $accountId=(int)DB::table('treasury_accounts')->insertGetId(['code'=>'SUP-'.strtoupper(bin2hex(random_bytes(5))),'name'=>'Supplier settlement test','account_type'=>'cash','is_active'=>true,'created_at'=>now(),'updated_at'=>now()]);
  DB::table('treasury_entries')->insert(['treasury_account_id'=>$accountId,'entry_number'=>'TE-'.strtoupper(bin2hex(random_bytes(8))),'entry_type'=>'opening','direction'=>'in','entry_date'=>now()->format('Y-m-d'),'amount'=>'100.00','source_type'=>'test_fixture','source_id'=>$accountId,'description'=>'Acceptance fixture opening cash','created_by_user_id'=>$actorId,'posted_at'=>now(),'created_at'=>now()]);
  $body=['purchase_invoice_id'=>$invoiceId,'treasury_account_id'=>$accountId,'amount_egp'=>'5.00','payment_date'=>now()->format('Y-m-d'),'idempotency_key'=>'supplier-pay-'.bin2hex(random_bytes(10))];
  $this->req($a,'POST','/api/v1/supplier-payments',$body)->assertStatus(422);
  self::assertSame(0,DB::table('supplier_payments')->where('purchase_invoice_id',$invoiceId)->count());
  $this->req($a,'POST',"/api/v1/purchase-invoices/{$invoiceId}/post")->assertOk();
  $paymentResponse=$this->req($a,'POST','/api/v1/supplier-payments',$body)->assertCreated();
  $paymentId=(int)$paymentResponse->json('data.id');
  $this->req($a,'POST','/api/v1/supplier-payments',$body)->assertOk()->assertJsonPath('data.id',$paymentId);
  self::assertSame(1,DB::table('supplier_payments')->where('idempotency_key',$body['idempotency_key'])->count());
  $mismatchedRetry=$body; $mismatchedRetry['amount_egp']='6.00';
  $this->req($a,'POST','/api/v1/supplier-payments',$mismatchedRetry)->assertStatus(409);
  $this->req($a,'GET',"/api/v1/purchase-invoices/{$invoiceId}")->assertOk()->assertJsonPath('data.financial_summary.invoice_supplier_paid_egp','0.00')->assertJsonPath('data.financial_summary.invoice_supplier_due_egp','12.50');
  $this->req($a,'POST',"/api/v1/supplier-payments/{$paymentId}/approve")->assertOk()->assertJsonPath('data.status','approved');
  $this->req($a,'POST',"/api/v1/supplier-payments/{$paymentId}/approve")->assertOk()->assertJsonPath('data.status','approved');
  self::assertSame('supplier_payment',(string)DB::table('treasury_entries')->where('id',DB::table('supplier_payments')->where('id',$paymentId)->value('treasury_entry_id'))->value('source_type'));
  self::assertSame(1,DB::table('treasury_entries')->where('source_type','supplier_payment')->where('source_id',$paymentId)->count());
  $this->req($a,'GET',"/api/v1/purchase-invoices/{$invoiceId}")->assertOk()->assertJsonPath('data.financial_summary.invoice_supplier_paid_egp','5.00')->assertJsonPath('data.financial_summary.invoice_supplier_due_egp','7.50')->assertJsonPath('data.financial_summary.supplier_total_due_egp','7.50');
  $body['amount_egp']='8.00';
  $body['idempotency_key']='supplier-pay-over-'.bin2hex(random_bytes(10));
  $this->req($a,'POST','/api/v1/supplier-payments',$body)->assertStatus(422)->assertJsonStructure(['error'=>['details'=>['amount_egp']]]);
  self::assertSame(1,DB::table('financial_outbox_events')->where('source_type','supplier_payment')->where('source_id',$paymentId)->count());
 }
 #[Test] public function test_admin_without_payment_approval_permission_cannot_post_supplier_payment(): void {
  $admin=$this->actingAsApiUser('admin',true);
  $this->req($admin,'POST','/api/v1/supplier-payments/999/approve')->assertForbidden();
 }
 #[Test] public function test_unknown_invoice_returns_404(): void { $a=$this->actingAsApiUser('owner',true); $this->req($a,'GET','/api/v1/purchase-invoices/999999')->assertStatus(404); }
}
