<?php
require_once 'D:/system karas/system end/backend/vendor/autoload.php';
$app=require 'D:/system karas/system end/backend/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
$db=Illuminate\Support\Facades\DB::class;
$name=$db::connection()->getDatabaseName();
if($name!=='erp_scratch'){fwrite(STDERR,"Refusing DB check for {$name}\n");exit(2);}
$source=$db::table('sales_documents')->where('document_number','INV-2026-050')->first(['id','document_number']);
$returns=$db::table('sales_documents as d')->join('sales_document_lines as l','l.sales_document_id','=','d.id')->where('d.original_document_id',$source->id)->orderBy('d.id')->get(['d.id','d.document_number','d.status','d.total_amount','d.return_reason','d.original_document_id','l.original_document_line_id','l.product_id','l.location_id','l.quantity','l.return_condition','l.container_number_snapshot']);
echo json_encode(['database'=>$name,'returns'=>$returns,'customer'=>app(App\Services\ReportsService::class)->customerBalanceRows([82])[82]??null,'stock_good'=>$db::table('inventory_balances')->where('product_id',84)->where('location_id',1)->value('quantity_on_hand'),'stock_damaged'=>$db::table('inventory_balances')->where('product_id',84)->where('location_id',6)->value('quantity_on_hand'),'cash'=>(float)app(App\Services\TreasuryService::class)->balance(1)['balance_egp'],'bank'=>(float)app(App\Services\TreasuryService::class)->balance(14)['balance_egp']],JSON_UNESCAPED_UNICODE|JSON_PRETTY_PRINT).PHP_EOL;
