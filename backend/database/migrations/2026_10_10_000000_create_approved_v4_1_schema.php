<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        foreach (self::splitStatements(self::schemaSql()) as $statement) {
            DB::unprepared($statement);
        }
    }

    public function down(): void
    {
        $sql = self::schemaSql();
        preg_match_all(
            '/^\s*CREATE\s+TABLE\s+`?([A-Za-z0-9_]+)`?\s*\(/mi',
            $sql,
            $matches,
        );

        if ($matches[1] === []) {
            throw new \RuntimeException('The approved v4.1 SQL contains no CREATE TABLE statements.');
        }

        foreach (array_reverse($matches[1]) as $table) {
            DB::statement('DROP TABLE IF EXISTS `'.$table.'`');
        }
    }

    private static function schemaSql(): string
    {
        $sql = file_get_contents(database_path('schema/precision_slate_v4_1.sql'));

        if ($sql === false) {
            throw new \RuntimeException('The approved v4.1 SQL migration source could not be read.');
        }

        return $sql;
    }

    /**
     * Split SQL statements without treating semicolons in quoted text as delimiters.
     *
     * @return list<string>
     */
    private static function splitStatements(string $sql): array
    {
        $statements = [];
        $statement = '';
        $quote = null;
        $lineComment = false;
        $blockComment = false;
        $length = strlen($sql);

        for ($index = 0; $index < $length; $index++) {
            $character = $sql[$index];
            $next = $sql[$index + 1] ?? '';

            if ($lineComment) {
                if ($character === "\n") {
                    $lineComment = false;
                    $statement .= "\n";
                }

                continue;
            }

            if ($blockComment) {
                if ($character === '*' && $next === '/') {
                    $blockComment = false;
                    $index++;
                }

                continue;
            }

            if ($quote !== null) {
                $statement .= $character;

                if ($character === '\\' && $quote !== '`' && $next !== '') {
                    $statement .= $next;
                    $index++;

                    continue;
                }

                if ($character === $quote) {
                    if ($next === $quote) {
                        $statement .= $next;
                        $index++;
                    } else {
                        $quote = null;
                    }
                }

                continue;
            }

            if ($character === '-' && $next === '-' && isset($sql[$index + 2]) && ctype_space($sql[$index + 2])) {
                $lineComment = true;
                $index++;

                continue;
            }

            if ($character === '#') {
                $lineComment = true;

                continue;
            }

            if ($character === '/' && $next === '*') {
                $blockComment = true;
                $index++;

                continue;
            }

            if ($character === "'" || $character === '"' || $character === '`') {
                $quote = $character;
                $statement .= $character;

                continue;
            }

            if ($character === ';') {
                $trimmed = trim($statement);

                if ($trimmed !== '') {
                    $statements[] = $trimmed;
                }

                $statement = '';

                continue;
            }

            $statement .= $character;
        }

        if ($quote !== null || $blockComment) {
            throw new \RuntimeException('The approved v4.1 SQL contains an unterminated string or block comment.');
        }

        $trimmed = trim($statement);

        if ($trimmed !== '') {
            $statements[] = $trimmed;
        }

        return $statements;
    }
};
