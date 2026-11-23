<?php
namespace Tests\Feature;
use Illuminate\Support\Facades\DB;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;
use Tests\Concerns\AuthenticatesApi;
final class SupplierTest extends TestCase {
 use AuthenticatesApi;
 private function req(array $a,string $method,string $uri,array $data=[],bool $csrf=true){$h=$csrf?['X-CSRF-Token'=>$a['csrf']]:[]; return $this->withCredentials()->withUnencryptedCookie($this->apiCookieName(),$a['token'])->json($method,$uri,$data,$h);}
 #[Test] public function test_owner_lists_suppliers(): void { $a=$this->actingAsApiUser('owner',true); $this->req($a,'GET','/api/v1/suppliers')->assertOk()->assertJsonStructure(['data']); }
 #[Test] public function test_read_only_cannot_list_suppliers(): void { $a=$this->actingAsApiUser('read_only',true); $this->req($a,'GET','/api/v1/suppliers')->assertStatus(403); }
 #[Test] public function test_read_only_cannot_list_purchase_invoices(): void { $a=$this->actingAsApiUser('read_only',true); $this->req($a,'GET','/api/v1/purchase-invoices')->assertStatus(403); }
 #[Test] public function test_supplier_fixture_is_created_inside_test(): void { $id=DB::table('suppliers')->insertGetId(['name'=>'Fixture Supplier','created_at'=>now(),'updated_at'=>now()]); self::assertGreaterThan(0,$id); }
}