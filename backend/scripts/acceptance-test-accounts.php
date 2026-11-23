<?php

declare(strict_types=1);

// One-time, explicitly targeted local acceptance account setup. No Laravel bootstrap or .env loading.
require dirname(__DIR__).'/vendor/autoload.php';

use Illuminate\Hashing\BcryptHasher;

$mode = $argv[1] ?? '';
$options = [];
foreach (array_slice($argv, 2) as $argument) {
    if (!preg_match('/^--([a-z-]+)=(.*)$/D', $argument, $matches)) {
        fwrite(STDERR, "Invalid argument.\n");
        exit(2);
    }
    $options[$matches[1]] = $matches[2];
}
$database = $options['database'] ?? '';
if (!in_array($mode, ['inspect', 'create', 'verify'], true) || $database !== 'erp_scratch') {
    fwrite(STDERR, "Usage: php acceptance-test-accounts.php inspect|create|verify --host=127.0.0.1 --port=3306 --database=erp_scratch --user=root --credential-file=<TEMP path>\n");
    exit(2);
}

$host = (string) ($options['host'] ?? '');
$port = (string) ($options['port'] ?? '');
$user = (string) ($options['user'] ?? '');
$credentialFile = (string) ($options['credential-file'] ?? '');
$temp = realpath(sys_get_temp_dir());
if ($host !== '127.0.0.1' || $port !== '3306' || $user !== 'root' || $temp === false || dirname($credentialFile) !== $temp || basename($credentialFile) !== 'test-accounts.local.txt') {
    fwrite(STDERR, "Target or credential path is outside the approved local acceptance scope.\n");
    exit(2);
}

$pdo = new PDO("mysql:host={$host};port={$port};dbname={$database};charset=utf8mb4", $user, '', [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES => false,
]);
if ($pdo->query('SELECT DATABASE()')->fetchColumn() !== 'erp_scratch') {
    throw new RuntimeException('Database target mismatch.');
}

$roles = $pdo->query("SELECT id, code, is_active FROM roles WHERE code IN ('owner', 'read_only') ORDER BY code")->fetchAll();
foreach ($roles as $role) {
    echo $role['code'].' active='.((int) $role['is_active']).PHP_EOL;
}
if (count($roles) !== 2 || array_sum(array_map(fn ($r) => (int) $r['is_active'], $roles)) !== 2) {
    throw new RuntimeException('Both required active roles must exist.');
}
$roleIds = array_column($roles, 'id', 'code');

$existing = $pdo->query("SELECT username, is_active FROM users WHERE username IN ('manual_owner', 'manual_readonly') ORDER BY username")->fetchAll();
if ($mode === 'inspect') {
    foreach ($existing as $row) {
        echo $row['username'].' active='.((int) $row['is_active']).PHP_EOL;
    }
    echo 'existing_count='.count($existing).PHP_EOL;
    exit(0);
}

if ($mode === 'create') {
    if ($existing !== [] || is_file($credentialFile)) {
        throw new RuntimeException('Existing account or credential file found; refusing to overwrite.');
    }
    $passwords = [
        'manual_owner' => bin2hex(random_bytes(24)),
        'manual_readonly' => bin2hex(random_bytes(24)),
    ];
    $hasher = new BcryptHasher(['rounds' => 12]);
    $pdo->beginTransaction();
    try {
        $insertUser = $pdo->prepare('INSERT INTO users (username, display_name, password_hash, is_active, password_changed_at, created_at, updated_at) VALUES (?, ?, ?, 1, NOW(), NOW(), NOW())');
        $insertRole = $pdo->prepare('INSERT INTO user_roles (user_id, role_id, granted_by_user_id, granted_at) VALUES (?, ?, NULL, NOW())');
        foreach (['manual_owner' => 'owner', 'manual_readonly' => 'read_only'] as $username => $roleCode) {
            $insertUser->execute([$username, $username, $hasher->make($passwords[$username])]);
            $insertRole->execute([(int) $pdo->lastInsertId(), (int) $roleIds[$roleCode]]);
        }
        $encoded = json_encode($passwords, JSON_THROW_ON_ERROR);
        if (file_put_contents($credentialFile, $encoded, LOCK_EX) === false) {
            throw new RuntimeException('Could not write credential file.');
        }
        $pdo->commit();
    } catch (Throwable $error) {
        $pdo->rollBack();
        if (is_file($credentialFile)) {
            unlink($credentialFile);
        }
        throw $error;
    }
    echo 'created_count=2'.PHP_EOL;
    echo 'credential_file_exists='.(is_file($credentialFile) ? 'true' : 'false').PHP_EOL;
}

$verify = $pdo->query("SELECT u.username, u.is_active, r.code FROM users u JOIN user_roles ur ON ur.user_id = u.id JOIN roles r ON r.id = ur.role_id WHERE u.username IN ('manual_owner', 'manual_readonly') ORDER BY u.username, r.code")->fetchAll();
foreach ($verify as $row) {
    echo $row['username'].' '.$row['code'].' active='.((int) $row['is_active']).PHP_EOL;
}
if (count($verify) !== 2 || $verify[0]['username'] !== 'manual_owner' || $verify[0]['code'] !== 'owner' || (int) $verify[0]['is_active'] !== 1 || $verify[1]['username'] !== 'manual_readonly' || $verify[1]['code'] !== 'read_only' || (int) $verify[1]['is_active'] !== 1) {
    throw new RuntimeException('Acceptance account role verification failed.');
}
