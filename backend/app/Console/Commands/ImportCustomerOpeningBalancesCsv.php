<?php

namespace App\Console\Commands;

class ImportCustomerOpeningBalancesCsv extends ImportCsvCommand
{
    protected $signature = 'imports:customer-opening-balances {file} {--apply} {--actor-id=}';

    protected $description = 'Validate or import dated customer opening balances from CSV; imports default to dry-run.';

    protected string $importType = 'customer-opening-balances';
}
