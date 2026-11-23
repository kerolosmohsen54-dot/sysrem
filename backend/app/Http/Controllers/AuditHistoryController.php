<?php

namespace App\Http\Controllers;

use App\Support\ListQuery;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use JsonException;

class AuditHistoryController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $sortable = [
            'created_at' => 'created_at',
            'action' => 'action',
            'entity_type' => 'entity_type',
            'actor' => 'actor_name_snapshot',
            'id' => 'id',
        ];
        $filters = ListQuery::validate($request, $sortable, [
            'document_id' => ['sometimes', 'integer', 'min:1'],
            'user_id' => ['sometimes', 'integer', 'min:1'],
            'action' => ['sometimes', 'string', 'max:100'],
            'entity_type' => ['sometimes', 'string', 'max:80'],
            'from' => ['sometimes', 'date_format:Y-m-d'],
            'to' => ['sometimes', 'date_format:Y-m-d'],
        ]);

        if (isset($filters['from'], $filters['to']) && $filters['to'] < $filters['from']) {
            throw ValidationException::withMessages([
                'to' => ['The to date must be on or after the from date.'],
            ]);
        }

        $query = DB::table('audit_logs')
            ->select([
                'id',
                'actor_user_id',
                'actor_name_snapshot',
                'sales_document_id',
                'field_path',
                'old_value',
                'new_value',
                'action',
                'entity_type',
                'entity_id',
                'reason',
                'before_data',
                'after_data',
                'created_at',
            ]);
        ListQuery::search($query, $filters, ['action', 'entity_type', 'actor_name_snapshot', 'reason']);
        if (isset($filters['action'])) {
            $query->where('action', 'like', '%'.$filters['action'].'%');
        }
        if (isset($filters['entity_type'])) {
            $query->where('entity_type', $filters['entity_type']);
        }

        if (isset($filters['document_id'])) {
            $documentId = (int) $filters['document_id'];
            $query->where(function ($documentQuery) use ($documentId): void {
                $documentQuery->where('sales_document_id', $documentId)
                    ->orWhere(function ($entityQuery) use ($documentId): void {
                        $entityQuery->where('entity_type', 'sales_document')
                            ->where('entity_id', $documentId);
                    });
            });
        }

        if (isset($filters['user_id'])) {
            $query->where('actor_user_id', (int) $filters['user_id']);
        }

        if (isset($filters['from'])) {
            $query->whereDate('created_at', '>=', $filters['from']);
        }

        if (isset($filters['to'])) {
            $query->whereDate('created_at', '<=', $filters['to']);
        }

        ListQuery::sort($query, $filters, $sortable, 'created_at', 'id', 'desc');
        $entries = $query
            ->paginate((int) ($filters['per_page'] ?? 50))
            ->through(fn (object $entry): array => $this->auditEntry($entry));

        return response()->json(ListQuery::page($entries));
    }

    public function invoiceHistory(Request $request, int $documentId): JsonResponse
    {
        abort_unless(
            DB::table('sales_documents')
                ->where('id', $documentId)
                ->where('document_type', 'invoice')
                ->exists(),
            404,
        );

        $sortable = [
            'created_at' => 'created_at',
            'field_path' => 'field_path',
            'actor' => 'actor_name_snapshot',
            'id' => 'id',
        ];
        $filters = ListQuery::validate($request, $sortable);

        $query = DB::table('audit_logs')
            ->where('action', 'sales_document.field_change')
            ->where('sales_document_id', $documentId)
            ->select([
                'id',
                'actor_user_id',
                'actor_name_snapshot',
                'sales_document_id',
                'field_path',
                'old_value',
                'new_value',
                'reason',
                'created_at',
            ]);
        ListQuery::search($query, $filters, ['field_path', 'actor_name_snapshot', 'reason']);
        ListQuery::sort($query, $filters, $sortable, 'created_at', 'id', 'desc');
        $entries = $query->paginate((int) ($filters['per_page'] ?? 50))
            ->through(fn (object $entry): array => [
                'id' => (int) $entry->id,
                'invoice_id' => (int) $entry->sales_document_id,
                'field_path' => $entry->field_path,
                'old_value' => $this->decodeAuditValue($entry->old_value),
                'new_value' => $this->decodeAuditValue($entry->new_value),
                'reason' => $entry->reason,
                'actor' => [
                    'user_id' => $entry->actor_user_id === null ? null : (int) $entry->actor_user_id,
                    'name' => $entry->actor_name_snapshot,
                ],
                'created_at' => $entry->created_at,
            ]);

        return response()->json(ListQuery::page($entries));
    }

    private function auditEntry(object $entry): array
    {
        return [
            'id' => (int) $entry->id,
            'actor' => [
                'user_id' => $entry->actor_user_id === null ? null : (int) $entry->actor_user_id,
                'name' => $entry->actor_name_snapshot,
            ],
            'sales_document_id' => $entry->sales_document_id === null ? null : (int) $entry->sales_document_id,
            'field_path' => $entry->field_path,
            'old_value' => $this->decodeAuditValue($entry->old_value),
            'new_value' => $this->decodeAuditValue($entry->new_value),
            'action' => $entry->action,
            'entity_type' => $entry->entity_type,
            'entity_id' => $entry->entity_id === null ? null : (int) $entry->entity_id,
            'reason' => $entry->reason,
            'before_data' => $this->decodeAuditValue($entry->before_data),
            'after_data' => $this->decodeAuditValue($entry->after_data),
            'created_at' => $entry->created_at,
        ];
    }

    private function decodeAuditValue(?string $value): mixed
    {
        if ($value === null) {
            return null;
        }

        try {
            return json_decode($value, true, 512, JSON_THROW_ON_ERROR);
        } catch (JsonException) {
            return $value;
        }
    }
}
