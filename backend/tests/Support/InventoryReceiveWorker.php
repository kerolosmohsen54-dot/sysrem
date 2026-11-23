<?php

use App\Services\InventoryService;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

require dirname(__DIR__, 2).'/vendor/autoload.php';

$app = require dirname(__DIR__, 2).'/bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();

$connection = getenv('AUTH_TEST_CONNECTION');
if (! is_string($connection) || ! in_array($connection, ['mysql_test', 'mariadb_test'], true)) {
    fwrite(STDERR, "A valid engine test connection is required.\n");
    exit(2);
}

config(['database.default' => $connection]);
DB::setDefaultConnection($connection);
DB::purge($connection);

if (config("database.connections.{$connection}.database") !== 'erp_acceptance_tests'
    || (DB::selectOne('SELECT DATABASE() AS database_name')->database_name ?? null) !== 'erp_acceptance_tests') {
    fwrite(STDERR, "The worker refuses to use a database other than erp_acceptance_tests.\n");
    exit(2);
}

$productId = filter_var($argv[1] ?? null, FILTER_VALIDATE_INT);
$warehouseId = filter_var($argv[2] ?? null, FILTER_VALIDATE_INT);
$actorId = filter_var($argv[3] ?? null, FILTER_VALIDATE_INT);
$quantity = filter_var($argv[4] ?? null, FILTER_VALIDATE_INT);
$unitCost = $argv[5] ?? null;
$markerPath = $argv[6] ?? null;

if (! is_int($productId) || ! is_int($warehouseId) || ! is_int($actorId) || ! is_int($quantity)
    || ! is_string($unitCost) || ! is_string($markerPath)) {
    fwrite(STDERR, "The inventory worker received invalid test arguments.\n");
    exit(2);
}

$actor = DB::table('users')->where('id', $actorId)->first(['id', 'display_name']);
if ($actor === null) {
    fwrite(STDERR, "The inventory worker actor was not found.\n");
    exit(2);
}

$request = Request::create('/api/v1/inventory/concurrency-test', 'POST');
$request->attributes->set('authenticated_user', $actor);
$request->attributes->set('request_id', 'inventory-concurrency-test');

if (file_put_contents($markerPath, 'ready') === false) {
    fwrite(STDERR, "The inventory worker could not create its ready marker.\n");
    exit(2);
}

usleep(300000);

try {
    app(InventoryService::class)->receive(
        $productId,
        $warehouseId,
        $quantity,
        $unitCost,
        ['movement_type' => 'receipt'],
        $request,
    );
    fwrite(STDOUT, "OK\n");
} catch (Throwable $exception) {
    fwrite(STDERR, $exception::class.': '.$exception->getMessage()."\n");
    exit(1);
}
