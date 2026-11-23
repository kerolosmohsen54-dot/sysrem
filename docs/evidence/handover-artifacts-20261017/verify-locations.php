<?php
require_once 'D:/system karas/system end/backend/vendor/autoload.php';
$app=require 'D:/system karas/system end/backend/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
$db=Illuminate\Support\Facades\DB::class;
$name=$db::connection()->getDatabaseName();
if($name!=='erp_scratch'){fwrite(STDERR,"Refusing DB {$name}\n");exit(2);}
echo json_encode(['database'=>$name,'locations'=>$db::table('locations')->get(['id','name','location_type','is_active'])],JSON_UNESCAPED_UNICODE|JSON_PRETTY_PRINT).PHP_EOL;
