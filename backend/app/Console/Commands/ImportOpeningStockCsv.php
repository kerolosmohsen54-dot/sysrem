<?php

namespace App\Console\Commands;

class ImportOpeningStockCsv extends ImportCsvCommand
{
    protected $signature = 'imports:opening-stock {file} {--apply} {--actor-id=}';

    protected $description = 'Validate or import dated opening stock from CSV; imports default to dry-run.';

    protected string $importType = 'opening-stock';
}
