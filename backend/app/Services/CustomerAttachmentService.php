<?php

namespace App\Services;

use App\Models\CustomerAttachment;
use App\Rules\MaxCustomerAttachmentBytes;
use App\Support\CustomerAttachmentMime;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use RuntimeException;

class CustomerAttachmentService
{
    public function __construct(private readonly AuditLogService $auditLog) {}

    public function list(int $customerId): array
    {
        return CustomerAttachment::query()->where('customer_id', $customerId)->latest('created_at')->get()->map(
            fn (CustomerAttachment $attachment): array => $this->resource($attachment),
        )->all();
    }

    public function store($request, int $customerId, UploadedFile $file): CustomerAttachment
    {
        abort_if($file->getSize() > MaxCustomerAttachmentBytes::MAX_BYTES, 422);
        $disk = Storage::disk('customer_private');
        $contentMime = (new \finfo(FILEINFO_MIME_TYPE))->file($file->getRealPath());
        $extension = CustomerAttachmentMime::extensionFor((string) $contentMime);
        abort_if($extension === null, 422);
        $path = 'customers/'.$customerId.'/'.Str::uuid().'.'.$extension;
        if (! $disk->putFileAs('customers/'.$customerId, $file, basename($path))) {
            throw new RuntimeException('The attachment could not be stored.');
        }

        try {
            return DB::transaction(function () use ($request, $customerId, $file, $contentMime, $path): CustomerAttachment {
                $actor = $request->attributes->get('authenticated_user');
                $attachment = CustomerAttachment::query()->create([
                    'customer_id' => $customerId,
                    'original_name' => mb_substr(preg_replace('/[\x00-\x1F\x7F]/u', '', basename($file->getClientOriginalName())) ?? 'attachment', 0, 255),
                    'stored_path' => $path,
                    'mime_type' => $contentMime,
                    'size_bytes' => $file->getSize(),
                    'sha256' => hash_file('sha256', $file->getRealPath()),
                    'uploaded_by_user_id' => is_object($actor) ? (int) $actor->id : null,
                ]);
                $this->auditLog->record($request, 'customer_attachment.created', 'customer_attachment', $attachment->id, null, null, $this->resource($attachment));

                return $attachment;
            });
        } catch (\Throwable $exception) {
            $disk->delete($path);
            throw $exception;
        }
    }

    public function softDelete($request, CustomerAttachment $attachment): void
    {
        DB::transaction(function () use ($request, $attachment): void {
            $before = $this->resource($attachment);
            $attachment->delete();
            $this->auditLog->record($request, 'customer_attachment.deleted', 'customer_attachment', $attachment->id, null, $before, ['deleted_at' => $attachment->deleted_at?->toISOString()]);
        });
    }

    public function resource(CustomerAttachment $attachment): array
    {
        return [
            'id' => (int) $attachment->id,
            'customer_id' => (int) $attachment->customer_id,
            'original_name' => $attachment->original_name,
            'mime_type' => $attachment->mime_type,
            'size_bytes' => (int) $attachment->size_bytes,
            'created_at' => $attachment->created_at?->toISOString(),
            'content_url' => '/api/v1/customers/'.$attachment->customer_id.'/attachments/'.$attachment->id.'/content',
        ];
    }
}
