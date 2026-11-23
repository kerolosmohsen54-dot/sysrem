<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Http\UploadedFile;

final class MaxCustomerAttachmentBytes implements ValidationRule
{
    public const MAX_BYTES = 10 * 1024 * 1024;

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (! $value instanceof UploadedFile || $value->getSize() > self::MAX_BYTES) {
            $fail('The file may not be greater than 10 MB.');
        }
    }
}
