<?php

namespace App\Http\Controllers;

use App\Services\AuditLogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class GeneralSettingsController extends Controller
{
    private const FIELDS = [
        'company_name',
        'company_address',
        'company_phone',
        'company_email',
        'company_tax_number',
        'invoice_number_prefix',
        'order_number_prefix',
        'container_number_prefix',
        'daily_summary_reminder_enabled',
        'daily_summary_reminder_time',
        'daily_summary_whatsapp_phone',
    ];

    public function __construct(private readonly AuditLogService $auditLog) {}

    public function show(): JsonResponse
    {
        return response()->json(['data' => $this->settings()]);
    }

    public function update(Request $request): JsonResponse
    {
        $values = $request->validate([
            'company_name' => ['sometimes', 'nullable', 'string', 'max:200'],
            'company_address' => ['sometimes', 'nullable', 'string', 'max:500'],
            'company_phone' => ['sometimes', 'nullable', 'string', 'max:32'],
            'company_email' => ['sometimes', 'nullable', 'email', 'max:254'],
            'company_tax_number' => ['sometimes', 'nullable', 'string', 'max:100'],
            'invoice_number_prefix' => ['sometimes', 'nullable', 'string', 'max:32'],
            'order_number_prefix' => ['sometimes', 'nullable', 'string', 'max:32'],
            'container_number_prefix' => ['sometimes', 'nullable', 'string', 'max:32'],
            'daily_summary_reminder_enabled' => ['sometimes', 'boolean'],
            'daily_summary_reminder_time' => ['sometimes', 'nullable', 'date_format:H:i'],
            'daily_summary_whatsapp_phone' => ['sometimes', 'nullable', 'string', 'max:32'],
            'max_active_users' => ['sometimes', 'integer', 'min:1', 'max:500'],
        ]);
        if ($values === []) {
            throw ValidationException::withMessages(['request' => ['At least one setting must be provided.']]);
        }
        $current = $this->settings();
        if (($values['daily_summary_reminder_enabled'] ?? $current['daily_summary_reminder_enabled'])
            && ! ($values['daily_summary_reminder_time'] ?? $current['daily_summary_reminder_time'])) {
            throw ValidationException::withMessages(['daily_summary_reminder_time' => ['An enabled reminder requires a time.']]);
        }

        $updated = DB::transaction(function () use ($request, $values): array {
            $before = $this->settings();
            $maxActiveUsers = $values['max_active_users'] ?? null;
            unset($values['max_active_users']);
            $after = [...$before, ...$values];
            if ($maxActiveUsers !== null) {
                $limit = DB::table('user_account_limits')->where('id', 1)->lockForUpdate()->first();
                if ($limit === null) {
                    throw new \RuntimeException('The user account limit configuration is missing.');
                }
                $activeUsers = DB::table('users')->where('is_active', true)->count();
                if ((int) $maxActiveUsers < $activeUsers) {
                    throw ValidationException::withMessages([
                        'max_active_users' => ["The limit cannot be lower than the current active account count ({$activeUsers})."],
                    ]);
                }
                DB::table('user_account_limits')->where('id', 1)->update([
                    'max_active_users' => $maxActiveUsers,
                    'updated_by_user_id' => $this->actorId($request),
                    'updated_at' => now(),
                ]);
                $after['max_active_users'] = (int) $maxActiveUsers;
            }
            if ($values !== []) {
                $storedAfter = $after;
                unset($storedAfter['max_active_users'], $storedAfter['active_user_count']);
                DB::table('app_settings')->updateOrInsert(
                    ['setting_key' => 'general'],
                    [
                        'setting_value' => json_encode($storedAfter, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE),
                        'description' => 'Company identity and document number prefixes.',
                        'updated_by_user_id' => $this->actorId($request),
                        'updated_at' => now(),
                    ],
                );
            }
            $this->auditLog->record($request, 'settings.general_updated', 'app_setting', null, null, $before, $after);

            return $after;
        });

        return response()->json(['data' => $updated]);
    }

    private function settings(): array
    {
        $json = DB::table('app_settings')->where('setting_key', 'general')->value('setting_value');
        $stored = is_string($json) ? json_decode($json, true, 512, JSON_THROW_ON_ERROR) : [];
        if (! is_array($stored)) {
            throw new \RuntimeException('The general application settings are malformed.');
        }

        $userLimit = DB::table('user_account_limits')->where('id', 1)->first(['max_active_users']);

        return array_intersect_key($stored, array_flip(self::FIELDS))
            + [
                'company_name' => null,
                'company_address' => null,
                'company_phone' => null,
                'company_email' => null,
                'company_tax_number' => null,
                'invoice_number_prefix' => null,
                'order_number_prefix' => null,
                'container_number_prefix' => null,
                'daily_summary_reminder_enabled' => false,
                'daily_summary_reminder_time' => '21:00',
                'daily_summary_whatsapp_phone' => null,
                'max_active_users' => (int) ($userLimit->max_active_users ?? 10),
                'active_user_count' => DB::table('users')->where('is_active', true)->count(),
            ];
    }

    private function actorId(Request $request): int
    {
        $actor = $request->attributes->get('authenticated_user');
        abort_unless(is_object($actor) && isset($actor->id), 401);

        return (int) $actor->id;
    }
}
