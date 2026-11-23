<?php

namespace App\Http\Middleware;

use Carbon\Carbon;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;

class AuthenticateMobileToken
{
    public function handle(Request $request, Closure $next): Response
    {
        if (config('auth.mobile.guest_access_enabled')) {
            return $this->authenticateGuest($request, $next);
        }

        $token = $request->bearerToken();
        if (! is_string($token) || ! preg_match('/^[a-f0-9]{64}$/i', $token)) {
            return $this->unauthenticated($request);
        }

        $now = now();
        $device = DB::table('mobile_devices as device')
            ->join('users', 'users.id', '=', 'device.user_id')
            ->where('device.token_hash', hash('sha256', strtolower($token)))
            ->whereNull('device.revoked_at')
            ->where('device.token_expires_at', '>', $now)
            ->where('users.is_active', true)
            ->first([
                'device.id as device_id',
                'device.user_id',
                'device.name as device_name',
                'device.model as device_model',
                'device.password_confirmed_at',
                'device.issued_password_changed_at',
                'users.username',
                'users.display_name',
                'users.password_changed_at',
            ]);

        if ($device === null) {
            return $this->unauthenticated($request);
        }

        $passwordChangedAfterIssuance = $device->password_changed_at === null
            ? $device->issued_password_changed_at !== null
            : $device->issued_password_changed_at === null
                || ! Carbon::parse($device->password_changed_at)->equalTo(Carbon::parse($device->issued_password_changed_at));
        if ($passwordChangedAfterIssuance) {
            DB::table('mobile_devices')->where('id', $device->device_id)->update([
                'revoked_at' => $now,
                'token_hash' => null,
                'password_confirmed_at' => null,
            ]);

            return $this->unauthenticated($request);
        }

        DB::table('mobile_devices')->where('id', $device->device_id)->update(['last_seen_at' => $now]);
        $request->attributes->set('authenticated_user', (object) [
            'id' => $device->user_id,
            'username' => $device->username,
            'display_name' => $device->display_name,
        ]);
        $request->attributes->set('mobile_device', (object) [
            'id' => $device->device_id,
            'user_id' => $device->user_id,
            'name' => $device->device_name,
            'model' => $device->device_model,
            'password_confirmed_at' => $device->password_confirmed_at,
        ]);

        return $next($request);
    }

    private function authenticateGuest(Request $request, Closure $next): Response
    {
        $username = config('auth.mobile.guest_username');
        $deviceName = config('auth.mobile.guest_device_name', 'mobile-no-login');
        $user = DB::table('users')
            ->where('username', $username)
            ->where('is_active', true)
            ->first(['id', 'username', 'display_name', 'password_changed_at']);

        if ($user === null) {
            return response()->json([
                'error' => [
                    'code' => 'MOBILE_GUEST_UNAVAILABLE',
                    'message' => __('Mobile no-login access is not configured.'),
                ],
                'meta' => ['request_id' => $request->attributes->get('request_id')],
            ], 503);
        }

        $now = now();
        $deviceId = (int) DB::transaction(function () use ($user, $deviceName, $now): int {
            DB::table('users')->where('id', $user->id)->lockForUpdate()->first(['id']);
            $existingId = DB::table('mobile_devices')
                ->where('user_id', $user->id)
                ->where('name', $deviceName)
                ->whereNull('revoked_at')
                ->value('id');

            if ($existingId !== null) {
                DB::table('mobile_devices')->where('id', $existingId)->update([
                    'last_seen_at' => $now,
                    'updated_at' => $now,
                ]);
                return (int) $existingId;
            }

            return (int) DB::table('mobile_devices')->insertGetId([
                'user_id' => $user->id,
                'name' => $deviceName,
                'model' => null,
                'token_hash' => null,
                'token_expires_at' => null,
                'last_seen_at' => $now,
                'password_confirmed_at' => null,
                'issued_password_changed_at' => $user->password_changed_at,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }, 5);

        $device = DB::table('mobile_devices')->where('id', $deviceId)
            ->first(['id', 'user_id', 'name', 'model', 'password_confirmed_at']);

        $request->attributes->set('authenticated_user', (object) [
            'id' => $user->id,
            'username' => $user->username,
            'display_name' => $user->display_name,
        ]);
        $request->attributes->set('mobile_device', (object) [
            'id' => $device->id,
            'user_id' => $device->user_id,
            'name' => $device->name,
            'model' => $device->model,
            'password_confirmed_at' => $device->password_confirmed_at,
        ]);

        return $next($request);
    }

    private function unauthenticated(Request $request): Response
    {
        return response()->json([
            'error' => [
                'code' => 'UNAUTHENTICATED',
                'message' => __('Authentication is required.'),
            ],
            'meta' => ['request_id' => $request->attributes->get('request_id')],
        ], 401);
    }
}
