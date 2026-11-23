<?php

namespace Tests\Unit;

use App\Support\CustomerAttachmentMime;
use App\Rules\MaxCustomerAttachmentBytes;
use Illuminate\Http\UploadedFile;
use PHPUnit\Framework\Attributes\Test;
use PHPUnit\Framework\TestCase;

final class CustomerAttachmentMimeTest extends TestCase
{
    #[Test]
    public function only_the_content_mime_types_allowed_by_the_customer_attachment_decision_map_to_extensions(): void
    {
        self::assertSame('pdf', CustomerAttachmentMime::extensionFor('application/pdf'));
        self::assertSame('jpg', CustomerAttachmentMime::extensionFor('image/jpeg'));
        self::assertSame('png', CustomerAttachmentMime::extensionFor('image/png'));
        self::assertNull(CustomerAttachmentMime::extensionFor('application/x-dosexec'));
        self::assertNull(CustomerAttachmentMime::extensionFor('text/plain'));
    }

    #[Test]
    public function attachment_size_limit_uses_exact_bytes_at_the_ten_mib_boundary(): void
    {
        $rule = new MaxCustomerAttachmentBytes();
        $errors = [];
        $rule->validate('file', UploadedFile::fake()->create('exact.pdf', 10240), static function (string $message) use (&$errors): void { $errors[] = $message; });
        self::assertSame([], $errors);

        $rule->validate('file', UploadedFile::fake()->create('one_kib_over.pdf', 10241), static function (string $message) use (&$errors): void { $errors[] = $message; });
        self::assertNotEmpty($errors);
    }
}
