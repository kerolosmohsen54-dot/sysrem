<?php
require 'D:/system karas/system end/backend/vendor/autoload.php';$app=require 'D:/system karas/system end/backend/bootstrap/app.php';$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();use Illuminate\Support\Facades\DB;use Illuminate\Support\Facades\Schema;
echo 'receipt_lines=',implode(',',Schema::getColumnListing('container_receipt_lines')),PHP_EOL;
$container=DB::table('containers')->where('container_number','E2E-FINAL-MOTORS-20261017-01')->first();
$rows=DB::table('container_lines as cl')->join('products as p','p.id','=','cl.product_id')->leftJoin('inventory_balances as b',function($j)use($container){$j->on('b.product_id','=','p.id')->where('b.location_id','=',$container->received_location_id); })->where('cl.container_id',$container->id)->orderBy('cl.line_number')->get(['p.name','p.sku','cl.expected_quantity','cl.received_quantity','p.purchase_cost_egp','b.quantity_on_hand','b.average_unit_cost_egp','b.inventory_value_egp']);
foreach($rows as $r)echo json_encode($r,JSON_UNESCAPED_UNICODE),PHP_EOL;
echo 'cost_sum=',DB::table('container_costs')->where('container_id',$container->id)->sum('amount_egp'),PHP_EOL;
echo 'movement_lines=',DB::table('inventory_movement_lines')->where('inventory_movement_id',7)->count(),PHP_EOL;
