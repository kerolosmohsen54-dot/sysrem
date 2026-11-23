<?php

namespace App\Support;

final class CustomerAttachmentMime
{
    public static function extensionFor(string $mimeType): ?string
    {
        return match ($mimeType) {
            'application/pdf' => 'pdf',
            'image/jpeg' => 'jpg',
            'image/png' => 'png',
            default => null,
        };
    }
}
