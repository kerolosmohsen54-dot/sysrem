<?php

use Illuminate\Contracts\Console\Kernel;

require dirname(__DIR__).'/vendor/autoload.php';

$app = require dirname(__DIR__).'/bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();

$connectionName = $argv[1] ?? '';
if (! in_array($connectionName, ['mysql_test', 'mariadb_test'], true)) {
    throw new InvalidArgumentException('Choose only mysql_test or mariadb_test.');
}

$config = config('database.connections.'.$connectionName);
if (($config['database'] ?? null) !== 'erp_test') {
    throw new RuntimeException('Refusing to run constraints against any database other than erp_test.');
}

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);
$database = new mysqli(
    $config['host'],
    $config['username'],
    $config['password'],
    $config['database'],
    (int) $config['port'],
);
$database->set_charset($config['charset'] ?? 'utf8mb4');

$identity = $database->query('SELECT DATABASE() AS database_name, VERSION() AS server_version')->fetch_assoc();
if ($identity['database_name'] !== 'erp_test') {
    throw new RuntimeException('Connected database identity did not match erp_test.');
}

echo strtoupper($connectionName), ' ', $identity['server_version'], ' DATABASE ', $identity['database_name'], PHP_EOL;

$sqlFile = dirname(__DIR__, 2).'/data/schema/proposals/proposed-mysql-review-v4.2/PHASE1_CONSTRAINT_TESTS.sql';
$lines = file($sqlFile, FILE_IGNORE_NEW_LINES);
if ($lines === false) {
    throw new RuntimeException('Could not read the Phase 1 constraint suite.');
}

$delimiter = ';';
$buffer = '';
$resultRows = [];

foreach ($lines as $line) {
    if (preg_match('/^\s*DELIMITER\s+(\S+)/i', $line, $matches)) {
        $delimiter = $matches[1];

        continue;
    }

    $buffer .= $line.PHP_EOL;
    if (! str_ends_with(rtrim($buffer), $delimiter)) {
        continue;
    }

    $statement = trim(substr(rtrim($buffer), 0, -strlen($delimiter)));
    $buffer = '';
    if ($statement === '') {
        continue;
    }

    $result = $database->query($statement);
    if ($result instanceof mysqli_result) {
        $rows = $result->fetch_all(MYSQLI_ASSOC);
        $result->free();
        if (isset($rows[0]['test_name'])) {
            $resultRows = $rows;
        } elseif (isset($rows[0]['failed_tests'])) {
            echo 'failed_tests=', $rows[0]['failed_tests'], PHP_EOL;
        }
    }
}

if (trim($buffer) !== '') {
    throw new RuntimeException('The Phase 1 SQL ended with an incomplete statement.');
}

$passed = 0;
foreach ($resultRows as $row) {
    echo $row['test_name'], ': ', $row['result'];
    if ($row['observed_error'] !== null) {
        echo ' (', $row['observed_error'], ')';
    }
    echo PHP_EOL;
    $passed += $row['result'] === 'PASS' ? 1 : 0;
}

echo 'constraint_tests=', count($resultRows), ' passed=', $passed, ' failed=', count($resultRows) - $passed, PHP_EOL;

$database->close();

if (count($resultRows) !== 21 || $passed !== 21) {
    exit(1);
}
