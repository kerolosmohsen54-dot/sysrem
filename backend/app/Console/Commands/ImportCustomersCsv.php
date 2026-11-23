<?php

namespace App\Console\Commands;

class ImportCustomersCsv extends ImportCsvCommand
{
    protected $signature = 'imports:customers {file} {--apply} {--actor-id=}';

    protected $description = 'Validate or import customers from CSV; imports default to dry-run.';

    protected string $importType = 'customers';
}
