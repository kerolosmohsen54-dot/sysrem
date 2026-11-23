<?php

namespace App\Http\Controllers;

use App\Services\AuditLogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class MobileAuthController extends Controller
{
    public function __construct(private readonly AuditLogService $auditLog) {}

    public function login(Request $request): JsonResponse
    {
        $values = $request->validate([
            'username' => ['required', 'string', 'max:100'],
            'password' => ['required', 'string', 'max:1024'],
            'device_name' => ['required', 'string', 'max:160'],
            'device_model' => ['sometimes', 'nullable', 'string', 'max:160'],
        ]);

        $user = DB::table('users')
            ->where('username', $values['username'])
            ->first(['id', 'username', 'display_name', 'password_hash', 'is_active', 'password_changed_at']);
        $passwordHash = $user?->password_hash ?? Hash::make(bin2hex(random_bytes(32)));

        if ($user === null || ! (bool) $user->is_active || ! Hash::check($values['password'], $passwordHash)) {
            return $this->error('AUTHENTICATION_FAILED', __('Invalid username or password.'), 401, $request);
        }

        if (! $this->userHasPermission((int) $user->id, 'mobile.use')) {
            return $this->error('FORBIDDEN', __('You do not have permission to use the mobile companion.'), 403, $request);
        }

        $token = bin2hex(random_bytes(32));
        $now = now();
        $expiresAt = $now->copy()->addHours(config('auth.mobile.token_ttl_hours', 720));
        $request->attributes->set('authenticated_user', (object) [
            'id' => $user->id,
            'username' => $user->username,
            'display_name' => $user->display_name,
        ]);

        $deviceId = DB::transaction(function () use ($request, $user, $values, $now, $expiresAt, $token): int {
            DB::table('users')->where('id', $user->id)->lockForUpdate()->first();
            $deviceId = (int) DB::table('mobile_devices')->insertGetId([
                'user_id' => $user->id,
                'name' => $values['device_name'],
                'model' => $values['device_model'] ?? null,
                'token_hash' => hash('sha256', $token),
                'token_expires_at' => $expiresAt,
                'issued_password_changed_at' => $user->password_changed_at,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
            DB::table('users')->where('id', $user->id)->update(['last_login_at' => $now]);
            $this->auditLog->record($request, 'mobile.auth.login', 'mobile_device', $deviceId, null, null, [
                'device_name' => $values['device_name'],
                'device_model' => $values['device_model'] ?? null,
                'token_expires_at' => $expiresAt->toDateTimeString(),
            ]);

            return $deviceId;
        }, 5);

        return response()->json([
            'data' => [
                'access_token' => $token,
                'token_type' => 'Bearer',
                'expires_at' => $expiresAt->toDateTimeString(),
                'device' => [
                    'id' => $deviceId,
                    'name' => $values['device_name'],
                    'model' => $values['device_model'] ?? null,
                ],
            ],
            'meta' => ['request_id' => $request->attributes->get('request_id')],
        ], 201);
    }

    public function me(Request $request): JsonResponse
    {
        $user = $request->attributes->get('authenticated_user');
        $device = $request->attributes->get('mobile_device');
        abort_unless(is_object($user) && is_object($device), 401);

        $permissions = DB::table('role_permissions as role_permission')
            ->join('permissions as permission', 'permission.id', '=', 'role_permission.permission_id')
            ->join('user_roles as user_role', 'user_role.role_id', '=', 'role_permission.role_id')
            ->join('roles as role', 'role.id', '=', 'user_role.role_id')
            ->where('user_role.user_id', $user->id)
            ->where('role.is_active', true)
            ->orderBy('permission.code')
            ->distinct()
            ->pluck('permission.code')
            ->all();

        return response()->json([
            'data' => [
                'user' => [
                    'id' => $user->id,
                    'username' => $user->username,
                    'display_name' => $user->display_name,
                    'permissions' => $permissions,
                ],
                'device' => [
                    'id' => $device->id,
                    'name' => $device->name,
                    'model' => $device->model,
                ],
            ],
            'meta' => ['request_id' => $request->attributes->get('request_id')],
        ]);
    }

    public function confirmPassword(Request $request): JsonResponse
    {
        $values = $request->validate(['password' => ['required', 'string', 'max:1024']]);
        $user = $request->attributes->get('authenticated_user');
        $device = $request->attributes->get('mobile_device');
        abort_unless(is_object($user) && is_object($device), 401);

        $passwordHash = DB::table('users')->where('id', $user->id)->value('password_hash');
        if (! is_string($passwordHash) || ! Hash::check($values['password'], $passwordHash)) {
            return $this->error('PASSWORD_CONFIRMATION_FAILED', __('The password could not be verified.'), 401, $request);
        }

        $confirmedAt = now();
        DB::transaction(function () use ($request, $device, $confirmedAt): void {
            DB::table('mobile_devices')->where('id', $device->id)->whereNull('revoked_at')
                ->update(['password_confirmed_at' => $confirmedAt]);
            $this->auditLog->record(
                $request,
                'mobile.auth.password_confirmed',
                'mobile_device',
                (int) $device->id,
                null,
                null,
                [
                    'confirmed_at' => $confirmedAt->toDateTimeString(),
                    'expires_at' => $confirmedAt->copy()
                        ->addMinutes(config('auth.mobile.password_confirmation_minutes', 10))
                        ->toDateTimeString(),
                ],
            );
        }, 5);

        return response()->json([
            'data' => [
                'confirmed_at' => $confirmedAt->toDateTimeString(),
                'expires_at' => $confirmedAt->copy()
                    ->addMinutes(config('auth.mobile.password_confirmation_minutes', 10))
                    ->toDateTimeString(),
            ],
            'meta' => ['request_id' => $request->attributes->get('request_id')],
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $device = $request->attributes->get('mobile_device');
        abort_unless(is_object($device), 401);

        DB::transaction(function () use ($request, $device): void {
            $before = DB::table('mobile_devices')
                ->where('id', $device->id)
                ->lockForUpdate()
                ->first(['id', 'user_id', 'name', 'model', 'token_expires_at', 'revoked_at']);
            DB::table('mobile_devices')->where('id', $device->id)->update([
                'token_hash' => null,
                'password_confirmed_at' => null,
                'revoked_at' => now(),
                'updated_at' => now(),
            ]);
            $this->auditLog->record(
                $request,
                'mobile.auth.logout',
                'mobile_device',
                (int) $device->id,
                null,
                (array) $before,
                ['revoked_at' => now()->toDateTimeString()],
            );
        }, 5);

        return response()->json([
            'data' => ['status' => 'signed_out'],
            'meta' => ['request_id' => $request->attributes->get('request_id')],
        ]);
    }

    private function userHasPermission(int $userId, string $permission): bool
    {
        return DB::table('role_permissions as role_permission')
            ->join('permissions', 'permissions.id', '=', 'role_permission.permission_id')
            ->join('user_roles', 'user_roles.role_id', '=', 'role_permission.role_id')
            ->join('roles', 'roles.id', '=', 'user_roles.role_id')
            ->where('user_roles.user_id', $userId)
            ->where('roles.is_active', true)
            ->where('permissions.code', $permission)
            ->exists();
    }

    private function error(string $code, string $message, int $status, Request $request): JsonResponse
    {
        return response()->json([
            'error' => ['code' => $code, 'message' => $message],
            'meta' => ['request_id' => $request->attributes->get('request_id')],
        ], $status);
    }
}
