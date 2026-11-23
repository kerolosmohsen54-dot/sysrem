<?php

namespace App\Console\Commands;

class ImportProductsCsv extends ImportCsvCommand
{
    protected $signature = 'imports:products {file} {--apply} {--actor-id=}';

    protected $description = 'Validate or import products from CSV; imports default to dry-run.';

    protected string $importType = 'products';
}
