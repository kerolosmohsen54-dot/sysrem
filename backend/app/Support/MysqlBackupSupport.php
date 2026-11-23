<?php

namespace App\Support;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use PDO;
use RuntimeException;
use Symfony\Component\Process\Process;

class MysqlBackupSupport
{
    /**
     * @return array{driver: string, host: string, port: string, username: string, password: string, database: string}
     */
    public function connectionDetails(bool $requireScratch = false): array
    {
        $connectionName = (string) config('database.default');
        $connection = config('database.connections.'.$connectionName);
        $driver = $connection['driver'] ?? null;
        if (! in_array($driver, ['mysql', 'mariadb'], true)) {
            throw new RuntimeException('Database backup operations require a configured MySQL or MariaDB connection.');
        }

        $database = (string) ($connection['database'] ?? '');
        if ($database === '' || $database === 'system_end') {
            throw new RuntimeException('Refusing backup operation for an empty or prohibited database target.');
        }
        if ($requireScratch && $database !== 'erp_scratch') {
            throw new RuntimeException('The restore-test command is restricted to erp_scratch.');
        }

        $selectedDatabase = DB::selectOne('SELECT DATABASE() AS database_name')->database_name ?? null;
        if ($selectedDatabase !== $database) {
            throw new RuntimeException('The connected database does not match the configured backup target.');
        }

        return [
            'driver' => $driver,
            'host' => (string) ($connection['host'] ?? '127.0.0.1'),
            'port' => (string) ($connection['port'] ?? '3306'),
            'username' => (string) ($connection['username'] ?? ''),
            'password' => (string) ($connection['password'] ?? ''),
            'database' => $database,
        ];
    }

    public function environment(array $details): array
    {
        return ['MYSQL_PWD' => $details['password']];
    }

    /**
     * @return array{path: string, database: string, bytes: int}
     */
    public function createCompressedDump(array $details): array
    {
        $directory = (string) config('backup.directory');
        if (! is_dir($directory) && ! mkdir($directory, 0700, true) && ! is_dir($directory)) {
            throw new RuntimeException('Could not create the configured backup directory.');
        }

        $timestamp = now()->format('Ymd-His');
        $path = rtrim($directory, DIRECTORY_SEPARATOR).DIRECTORY_SEPARATOR.'erp-'.$timestamp.'-'.Str::lower(Str::random(6)).'.sql.gz';
        $temporaryPath = $path.'.partial';
        $gzip = gzopen($temporaryPath, 'wb9');
        if ($gzip === false) {
            throw new RuntimeException('Could not open the temporary backup file.');
        }

        $exitCode = 0;
        try {
            if (function_exists('proc_open')) {
                $isMariaDb = $details['driver'] === 'mariadb';
                $binary = (string) config($isMariaDb ? 'backup.mariadb_dump_binary' : 'backup.mysqldump_binary');
                $arguments = [
                    $binary,
                    '--host='.$details['host'],
                    '--port='.$details['port'],
                    '--user='.$details['username'],
                    '--single-transaction',
                    '--quick',
                    '--routines',
                    '--triggers',
                    '--events',
                    '--hex-blob',
                    '--default-character-set=utf8mb4',
                ];
                if (! $isMariaDb) {
                    $arguments[] = '--set-gtid-purged=OFF';
                }
                $arguments[] = $details['database'];
                $process = new Process($arguments);
                $process->setEnv($this->environment($details));
                $process->setTimeout(3600);
                $process->run(function (string $type, string $buffer) use ($gzip, $process): void {
                    if ($type === Process::OUT && gzwrite($gzip, $buffer) !== strlen($buffer)) {
                        $process->stop();
                        throw new RuntimeException('Could not write the compressed backup stream.');
                    }
                });
                $exitCode = $process->getExitCode();
            } else {
                $this->writePortableDump($gzip);
            }
        } catch (\Throwable $exception) {
            gzclose($gzip);
            @unlink($temporaryPath);
            if ($exception instanceof RuntimeException && $exception->getMessage() === 'Could not write the compressed backup stream.') {
                throw $exception;
            }

            throw new RuntimeException('The MySQL dump process failed; details are intentionally not echoed.', previous: $exception);
        }

        if (! gzclose($gzip) || $exitCode !== 0) {
            @unlink($temporaryPath);
            throw new RuntimeException('The MySQL dump process failed; details are intentionally not echoed.');
        }

        if (! rename($temporaryPath, $path)) {
            @unlink($temporaryPath);
            throw new RuntimeException('Could not finalize the compressed backup file.');
        }
        @chmod($path, 0600);
        $this->pruneExpiredBackups($directory, $path);

        return [
            'path' => $path,
            'database' => $details['database'],
            'bytes' => (int) filesize($path),
        ];
    }

    public function restoreCompressedDump(array $details, string $path): void
    {
        if (! is_file($path) || ! is_readable($path)) {
            throw new RuntimeException('The requested compressed backup file is not readable.');
        }
        $gzip = gzopen($path, 'rb');
        if ($gzip === false) {
            throw new RuntimeException('The requested compressed backup file could not be opened.');
        }

        $isMariaDb = $details['driver'] === 'mariadb';
        $process = new Process([
            (string) config($isMariaDb ? 'backup.mariadb_binary' : 'backup.mysql_binary'),
            '--host='.$details['host'],
            '--port='.$details['port'],
            '--user='.$details['username'],
            '--default-character-set=utf8mb4',
            $details['database'],
        ]);
        $process->setEnv($this->environment($details));
        $process->setTimeout(3600);
        $input = tmpfile();
        if ($input === false) {
            gzclose($gzip);
            throw new RuntimeException('Could not create a temporary restore stream.');
        }
        while (! gzeof($gzip)) {
            $chunk = gzread($gzip, 1024 * 1024);
            if ($chunk === false || ($chunk !== '' && fwrite($input, $chunk) !== strlen($chunk))) {
                fclose($input);
                gzclose($gzip);
                throw new RuntimeException('The compressed backup file could not be streamed for restore.');
            }
        }
        gzclose($gzip);
        rewind($input);
        $process->setInput($input);
        try {
            $process->run();
        } catch (\Throwable $exception) {
            fclose($input);

            throw new RuntimeException('The MySQL restore process failed; details are intentionally not echoed.', previous: $exception);
        }
        fclose($input);

        if (! $process->isSuccessful()) {
            throw new RuntimeException('The MySQL restore process failed; details are intentionally not echoed.');
        }
    }

    /**
     * Create a consistent schema-and-data dump when shared hosting disables proc_open.
     *
     * @param resource $gzip
     */
    private function writePortableDump($gzip): void
    {
        $pdo = DB::connection()->getPdo();
        $pdo->exec('SET SESSION TRANSACTION ISOLATION LEVEL REPEATABLE READ');
        $pdo->exec('START TRANSACTION WITH CONSISTENT SNAPSHOT');

        $write = static function (string $chunk) use ($gzip): void {
            if (gzwrite($gzip, $chunk) !== strlen($chunk)) {
                throw new RuntimeException('Could not write the compressed backup stream.');
            }
        };
        $quoteIdentifier = static fn (string $identifier): string => '`'.str_replace('`', '``', $identifier).'`';

        try {
            $write("-- Portable MySQL/MariaDB backup generated by the application.\n");
            $write("SET NAMES utf8mb4;\nSET FOREIGN_KEY_CHECKS=0;\n");
            $tables = $pdo->query("SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_TYPE = 'BASE TABLE' ORDER BY TABLE_NAME")->fetchAll(PDO::FETCH_COLUMN);
            $columnQuery = $pdo->prepare('SELECT COLUMN_NAME, DATA_TYPE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? ORDER BY ORDINAL_POSITION');

            foreach ($tables as $tableName) {
                $table = (string) $tableName;
                $quotedTable = $quoteIdentifier($table);
                $create = $pdo->query('SHOW CREATE TABLE '.$quotedTable)->fetch(PDO::FETCH_NUM);
                if (! isset($create[1]) || ! is_string($create[1])) {
                    throw new RuntimeException('Could not read a table definition for backup.');
                }

                $write('DROP TABLE IF EXISTS '.$quotedTable.";\n".$create[1].";\n");
                $columnQuery->execute([$table]);
                $columnTypes = [];
                foreach ($columnQuery->fetchAll(PDO::FETCH_ASSOC) as $column) {
                    $columnTypes[(string) $column['COLUMN_NAME']] = strtolower((string) $column['DATA_TYPE']);
                }

                $statement = $pdo->query('SELECT * FROM '.$quotedTable);
                $columns = [];
                for ($index = 0; $index < $statement->columnCount(); $index++) {
                    $metadata = $statement->getColumnMeta($index);
                    $columns[] = (string) ($metadata['name'] ?? '');
                }
                if (in_array('', $columns, true)) {
                    throw new RuntimeException('Could not read table column names for backup.');
                }
                $quotedColumns = implode(', ', array_map($quoteIdentifier, $columns));
                $insertPrefix = 'INSERT INTO '.$quotedTable.' ('.$quotedColumns.') VALUES ';
                $rows = [];
                $batchBytes = 0;

                while (($values = $statement->fetch(PDO::FETCH_NUM)) !== false) {
                    $encoded = [];
                    foreach ($columns as $index => $column) {
                        $value = $values[$index] ?? null;
                        if ($value === null) {
                            $encoded[] = 'NULL';
                            continue;
                        }
                        if (is_resource($value)) {
                            $value = stream_get_contents($value);
                        }
                        $value = (string) $value;
                        $type = $columnTypes[$column] ?? '';
                        if (in_array($type, ['binary', 'varbinary', 'tinyblob', 'blob', 'mediumblob', 'longblob', 'bit', 'geometry', 'point', 'linestring', 'polygon', 'multipoint', 'multilinestring', 'multipolygon', 'geometrycollection'], true)) {
                            $encoded[] = '0x'.bin2hex($value);
                            continue;
                        }
                        $quotedValue = $pdo->quote($value, PDO::PARAM_STR);
                        if ($quotedValue === false) {
                            throw new RuntimeException('Could not encode a database value for backup.');
                        }
                        $encoded[] = $quotedValue;
                    }
                    $row = '('.implode(', ', $encoded).')';
                    $rows[] = $row;
                    $batchBytes += strlen($row);

                    if (count($rows) >= 100 || $batchBytes >= 524288) {
                        $write($insertPrefix.implode(",\n", $rows).";\n");
                        $rows = [];
                        $batchBytes = 0;
                    }
                }

                if ($rows !== []) {
                    $write($insertPrefix.implode(",\n", $rows).";\n");
                }
            }

            $write("SET FOREIGN_KEY_CHECKS=1;\n");
            $pdo->commit();
        } catch (\Throwable $exception) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            throw $exception;
        }
    }

    private function pruneExpiredBackups(string $directory, string $newestPath): void
    {
        $retentionDays = max(1, (int) config('backup.retention_days', 14));
        $cutoff = now()->subDays($retentionDays)->getTimestamp();
        $pattern = rtrim($directory, DIRECTORY_SEPARATOR).DIRECTORY_SEPARATOR.'erp-*.sql.gz';

        foreach (glob($pattern) ?: [] as $path) {
            if ($path !== $newestPath && is_file($path) && filemtime($path) < $cutoff) {
                @unlink($path);
            }
        }
    }
}
