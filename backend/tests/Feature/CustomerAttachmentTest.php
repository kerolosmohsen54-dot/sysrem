<?php

namespace Tests\Feature;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use PHPUnit\Framework\Attributes\Test;
use Tests\Concerns\AuthenticatesApi;
use Tests\TestCase;

final class CustomerAttachmentTest extends TestCase
{
    use AuthenticatesApi;

    private array $fixtureDirectories = [];

    protected function tearDown(): void
    {
        foreach ($this->fixtureDirectories as $directory) {
            Storage::disk('customer_private')->deleteDirectory($directory);
        }

        parent::tearDown();
    }

    private function customer(): int
    {
        $now = now();

        return (int) DB::table('customers')->insertGetId([
            'name' => 'Attachment fixture '.bin2hex(random_bytes(4)),
            'phone' => 'ATT'.bin2hex(random_bytes(5)),
            'is_active' => true,
            'created_at' => $now,
            'updated_at' => $now,
        ]);
    }

    private function upload(array $actor, int $customerId, UploadedFile $file)
    {
        return $this->withCredentials()
            ->withUnencryptedCookie($this->apiCookieName(), $actor['token'])
            ->post("/api/v1/customers/{$customerId}/attachments", ['file' => $file], [$this->apiCsrfHeader() => $actor['csrf']]);
    }

    #[Test]
    public function pdf_is_private_and_can_be_viewed_downloaded_and_soft_deleted(): void
    {
        $owner = $this->actingAsApiUser('owner');
        $customerId = $this->customer();
        $this->fixtureDirectories[] = 'customers/'.$customerId;
        $pdf = UploadedFile::fake()->createWithContent('account.pdf', "%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF");

        $uploaded = $this->upload($owner, $customerId, $pdf)->assertCreated()
            ->assertJsonPath('data.original_name', 'account.pdf')
            ->assertJsonPath('data.mime_type', 'application/pdf');
        $attachmentId = (int) $uploaded->json('data.id');
        $attachment = DB::table('customer_attachments')->where('id', $attachmentId)->first();
        self::assertNotNull($attachment);
        self::assertSame($customerId, (int) $attachment->customer_id);
        self::assertSame(64, strlen($attachment->sha256));
        self::assertTrue(Storage::disk('customer_private')->exists($attachment->stored_path));

        $contentUrl = "/api/v1/customers/{$customerId}/attachments/{$attachmentId}/content";
        $this->withCredentials()->withUnencryptedCookie($this->apiCookieName(), $owner['token'])
            ->get($contentUrl)->assertOk()->assertHeader('Content-Type', 'application/pdf');
        $this->withCredentials()->withUnencryptedCookie($this->apiCookieName(), $owner['token'])
            ->get($contentUrl.'?disposition=attachment')->assertOk()->assertHeader('Content-Disposition');

        $readOnly = $this->actingAsApiUser('read_only');
        $this->withCredentials()->withUnencryptedCookie($this->apiCookieName(), $readOnly['token'])
            ->get($contentUrl)->assertForbidden();
        $this->withCredentials()->withUnencryptedCookie($this->apiCookieName(), $readOnly['token'])
            ->get("/api/v1/customers/{$customerId}/attachments")->assertForbidden();

        $this->withCredentials()->withUnencryptedCookie($this->apiCookieName(), $owner['token'])
            ->withHeader($this->apiCsrfHeader(), $owner['csrf'])
            ->delete("/api/v1/customers/{$customerId}/attachments/{$attachmentId}")
            ->assertOk()->assertJsonPath('data.deleted', true);
        self::assertNotNull(DB::table('customer_attachments')->where('id', $attachmentId)->value('deleted_at'));
        self::assertTrue(Storage::disk('customer_private')->exists($attachment->stored_path));
        $this->withCredentials()->withUnencryptedCookie($this->apiCookieName(), $owner['token'])
            ->get($contentUrl)->assertNotFound();
        self::assertSame(2, DB::table('audit_logs')->where('entity_type', 'customer_attachment')->where('entity_id', $attachmentId)->count());
    }

    #[Test]
    public function executable_and_oversized_uploads_are_rejected_without_database_rows(): void
    {
        $owner = $this->actingAsApiUser('owner');
        $customerId = $this->customer();
        $this->fixtureDirectories[] = 'customers/'.$customerId;

        $this->upload($owner, $customerId, UploadedFile::fake()->createWithContent('program.exe', "MZ\x90\x00not a document"))->assertUnprocessable();
        $this->upload($owner, $customerId, UploadedFile::fake()->createWithContent('renamed.pdf', "MZ\x90\x00not a PDF"))->assertUnprocessable();
        $this->upload($owner, $customerId, UploadedFile::fake()->create('too-large.pdf', 10241, 'application/pdf'))->assertUnprocessable();
        self::assertSame(0, DB::table('customer_attachments')->where('customer_id', $customerId)->count());
    }
}
