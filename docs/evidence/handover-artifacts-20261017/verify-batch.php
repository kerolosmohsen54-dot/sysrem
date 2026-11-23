<?php
require_once 'D:/system karas/system end/backend/vendor/autoload.php';
$app = require 'D:/system karas/system end/backend/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
$db = Illuminate\Support\Facades\DB::class;
$name = $db::connection()->getDatabaseName();
if ($name !== 'erp_scratch') { fwrite(STDERR, "Refusing DB check for {$name}\n"); exit(2); }
[, $first, $last] = array_pad($argv, 3, null);
$first = (int)$first; $last = (int)$last;
$from = sprintf('INV-2026-%03d', $first); $to = sprintf('INV-2026-%03d', $last);
$rows = $db::table('sales_documents')->whereBetween('document_number', [$from,$to])->where('status','posted')->get();
$sum = fn($field) => round((float)$rows->sum($field), 2);
$stock = $db::table('inventory_balances')->whereBetween('product_id',[35,84])->get();
$customers = app(App\Services\ReportsService::class)->customerBalanceRows(range(73,82));
$cash = (float)app(App\Services\TreasuryService::class)->balance(1)['balance_egp'];
$bank = (float)app(App\Services\TreasuryService::class)->balance(14)['balance_egp'];
echo json_encode([
  'database'=>$name,
  'range'=>[$from,$to],
  'batch'=>['posted_count'=>$rows->count(),'revenue'=>$sum('total_amount'),'paid'=>$sum('paid_amount_snapshot'),'cogs'=>$sum('cogs_egp_snapshot'),'company_profit'=>$sum('company_profit_egp_snapshot'),'partner_profit'=>$sum('partner_profit_egp_snapshot'),'customer_due_all_ten'=>round(array_sum(array_map(fn($x)=>(float)($x['balance']??0), $customers)),2)],
  'stock'=>['all_locations'=>(int)$stock->sum('quantity_on_hand'),'location_1'=>(int)$stock->where('location_id',1)->sum('quantity_on_hand'),'location_5'=>(int)$stock->where('location_id',5)->sum('quantity_on_hand')],
  'cash'=>$cash,'bank'=>$bank
], JSON_UNESCAPED_UNICODE).PHP_EOL;
