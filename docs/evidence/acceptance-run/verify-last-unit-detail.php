<?php
require 'D:/system karas/system end/backend/vendor/autoload.php';
$app=require 'D:/system karas/system end/backend/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
use Illuminate\Support\Facades\DB;
echo 'db=',DB::connection()->getDatabaseName(),PHP_EOL;
foreach(DB::select("SHOW COLUMNS FROM sales_documents") as $c) echo $c->Field,' ';
echo PHP_EOL;
echo json_encode(DB::table('sales_documents')->whereIn('id',[75,76])->get(),JSON_UNESCAPED_UNICODE|JSON_PRETTY_PRINT),PHP_EOL;
echo 'product30stock=',DB::table('inventory_balances')->where('product_id',30)->where('location_id',8)->value('quantity_on_hand'),PHP_EOL;
echo 'negativeBalances=',DB::table('inventory_balances')->whereRaw('quantity_on_hand < quantity_reserved')->count(),PHP_EOL;
