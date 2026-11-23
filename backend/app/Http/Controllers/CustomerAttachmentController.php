<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreCustomerAttachmentRequest;
use App\Models\Customer;
use App\Models\CustomerAttachment;
use App\Services\CustomerAttachmentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;

class CustomerAttachmentController extends Controller
{
    public function __construct(private readonly CustomerAttachmentService $attachments) {}

    public function index(Request $request, int $customerId): JsonResponse
    {
        $this->customer($customerId);
        Gate::forUser($this->actor($request))->authorize('viewAny', CustomerAttachment::class);
        $data = $this->attachments->list($customerId);

        return response()->json(['data' => $data, 'meta' => ['total' => count($data)]]);
    }

    public function store(StoreCustomerAttachmentRequest $request, int $customerId): JsonResponse
    {
        $this->customer($customerId);
        Gate::forUser($this->actor($request))->authorize('create', CustomerAttachment::class);
        $attachment = $this->attachments->store($request, $customerId, $request->file('file'));

        return response()->json(['data' => $this->attachments->resource($attachment)], 201);
    }

    public function content(Request $request, int $customerId, int $attachmentId)
    {
        $this->customer($customerId);
        Gate::forUser($this->actor($request))->authorize('download', CustomerAttachment::class);
        $attachment = CustomerAttachment::query()->where('customer_id', $customerId)->findOrFail($attachmentId);
        $disk = Storage::disk('customer_private');
        abort_unless($disk->exists($attachment->stored_path), 404);
        $disposition = $request->query('disposition') === 'attachment' ? 'attachment' : 'inline';
        $headers = [
            'Content-Type' => $attachment->mime_type,
            'Content-Disposition' => $disposition.'; filename="'.addcslashes($attachment->original_name, '"\\').'"; filename*=UTF-8\'\''.rawurlencode($attachment->original_name),
            'X-Content-Type-Options' => 'nosniff',
            'Cache-Control' => 'private, no-store, max-age=0',
        ];

        return response()->file($disk->path($attachment->stored_path), $headers);
    }

    public function destroy(Request $request, int $customerId, int $attachmentId): JsonResponse
    {
        $this->customer($customerId);
        Gate::forUser($this->actor($request))->authorize('delete', CustomerAttachment::class);
        $attachment = CustomerAttachment::query()->where('customer_id', $customerId)->findOrFail($attachmentId);
        $this->attachments->softDelete($request, $attachment);

        return response()->json(['data' => ['id' => $attachmentId, 'deleted' => true]]);
    }

    private function customer(int $customerId): Customer
    {
        return Customer::query()->findOrFail($customerId);
    }

    private function actor(Request $request): object
    {
        $actor = $request->attributes->get('authenticated_user');
        abort_unless(is_object($actor) && isset($actor->id), 401);

        return $actor;
    }
}
