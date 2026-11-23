<?php

namespace App\Console\Commands;

use App\Services\FinancialPlanningService;
use Illuminate\Console\Command;

class MaterializeRecurringExpenses extends Command
{
    protected $signature = 'finance:recurring-expenses:materialize {--through= : Materialize due cycles through this Y-m-d date}';
    protected $description = 'Create due recurring expense occurrences once per template and month.';

    public function handle(FinancialPlanningService $planning): int
    {
        $through = $this->option('through');
        $count = $planning->materializeRecurringExpenses(is_string($through) && $through !== '' ? $through : null);
        $this->info("Created {$count} recurring expense occurrence(s).");
        return self::SUCCESS;
    }
}
