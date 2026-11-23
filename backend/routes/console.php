<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Schedule::command('auth-sessions:prune')->dailyAt('02:00');
Schedule::command('finance:recurring-expenses:materialize')->dailyAt('01:00')->withoutOverlapping();
Schedule::command('backup:mysql')->hourly()->withoutOverlapping();
if (trim((string) config('backup.offsite_target', '')) !== '') {
    Schedule::command('backup:offsite')->dailyAt('03:00')->withoutOverlapping();
}
