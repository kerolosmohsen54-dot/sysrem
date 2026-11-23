<?php
require_once 'D:/system karas/system end/backend/vendor/autoload.php';
$app=require 'D:/system karas/system end/backend/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
$db=Illuminate\Support\Facades\DB::class;
$name=$db::connection()->getDatabaseName(); if($name!=='erp_scratch'){fwrite(STDERR,"Refusing DB {$name}\n");exit(2);}
$rows=$db::table('audit_logs')->whereIn('sales_document_id',[141,151])->where('action','sales_document.field_change')->orderBy('id')->get(['id','sales_document_id','field_path','old_value','new_value','reason','actor_name_snapshot','created_at']);
echo json_encode(['database'=>$name,'rows'=>$rows],JSON_UNESCAPED_UNICODE|JSON_PRETTY_PRINT).PHP_EOL;
