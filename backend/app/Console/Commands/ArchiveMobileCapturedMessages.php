<?php

namespace App\Console\Commands;

use App\Services\MobileCapturedMessageArchiveService;
use Illuminate\Console\Command;

class ArchiveMobileCapturedMessages extends Command
{
    protected $signature = 'mobile:archive-captured-messages';

    protected $description = 'Reversibly hide all captured mobile messages from the inbox.';

    public function handle(MobileCapturedMessageArchiveService $archive): int
    {
        $this->info('Messages archived: '.$archive->archiveAll());

        return self::SUCCESS;
    }
}
