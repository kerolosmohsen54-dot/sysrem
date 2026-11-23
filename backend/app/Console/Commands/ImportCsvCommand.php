<?php

namespace App\Console\Commands;

use App\Services\CsvImportService;
use Illuminate\Console\Command;
use InvalidArgumentException;

abstract class ImportCsvCommand extends Command
{
    protected string $importType;

    public function handle(CsvImportService $imports): int
    {
        try {
            $result = $imports->run(
                $this->importType,
                (string) $this->argument('file'),
                (bool) $this->option('apply'),
                $this->option('actor-id') === null ? null : (int) $this->option('actor-id'),
            );
        } catch (InvalidArgumentException $exception) {
            $this->error($exception->getMessage());

            return self::FAILURE;
        }

        foreach ($result['errors'] as $error) {
            $this->error($error);
        }
        if ($result['errors'] !== []) {
            $this->line('No records were written.');

            return self::FAILURE;
        }
        if ((bool) $this->option('apply')) {
            $this->info("Imported {$result['imported']} of {$result['row_count']} rows.");
        } else {
            $this->info("DRY RUN: {$result['row_count']} rows valid; no records were written.");
        }

        return self::SUCCESS;
    }
}
