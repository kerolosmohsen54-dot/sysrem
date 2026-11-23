<?php
require 'D:/system karas/system end/backend/vendor/autoload.php';$app=require 'D:/system karas/system end/backend/bootstrap/app.php';$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();use Illuminate\Support\Facades\DB;
echo 'db=',DB::connection()->getDatabaseName(),PHP_EOL;
echo 'invoices=',json_encode(DB::table('sales_documents')->where('document_type','invoice')->where('id','>=',72)->orderBy('id')->get(['id','document_number','status','customer_id','total_amount','paid_amount_snapshot']),JSON_UNESCAPED_UNICODE),PHP_EOL;
echo 'new_product_stock=',json_encode(DB::table('inventory_balances')->where('product_id',31)->where('location_id',8)->value('quantity_on_hand')),PHP_EOL;
$docs=DB::table('sales_documents')->where('customer_id',10)->where('status','posted')->get(['document_type','total_amount','paid_amount_snapshot']);$v=0.0;foreach($docs as $d){$v+=($d->document_type==='invoice'?1:-1)*((float)$d->total_amount-(float)($d->paid_amount_snapshot??0));}echo 'customer10_balance=',number_format($v,2,'.',''),PHP_EOL;
echo 'negative_stock=',DB::table('inventory_balances')->whereRaw('quantity_on_hand-quantity_reserved < 0')->count(),PHP_EOL;
