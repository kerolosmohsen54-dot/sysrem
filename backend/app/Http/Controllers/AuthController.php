<?php

namespace App\Http\Controllers;

use App\Services\AuditLogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    public function __construct(private readonly AuditLogService $auditLog) {}

    public function loginOptions(): JsonResponse
    {
        $users = DB::table('users')
            ->where('is_active', true)
            ->orderBy('display_name')
            ->orderBy('username')
            ->limit(500)
            ->get(['username', 'display_name'])
            ->map(static fn (object $user): array => [
                'username' => $user->username,
                'display_name' => $user->display_name,
            ])
            ->values();

        return response()->json(['data' => $users])->header('Cache-Control', 'no-store');
    }

    public function login(Request $request): JsonResponse
    {
        $credentials = $request->validate([
            'username' => ['required', 'string', 'max:100'],
            'password' => ['required', 'string', 'max:1024'],
        ]);

        $user = DB::table('users')
            ->where('username', $credentials['username'])
            ->first(['id', 'username', 'display_name', 'password_hash', 'is_active']);
        $passwordHash = $user?->password_hash ?? Hash::make(bin2hex(random_bytes(32)));
        $passwordMatches = Hash::check($credentials['password'], $passwordHash);

        if ($user === null || ! (bool) $user->is_active || ! $passwordMatches) {
            return response()->json([
                'error' => [
                    'code' => 'AUTHENTICATION_FAILED',
                    'message' => __('Invalid username or password.'),
                ],
                'meta' => ['request_id' => $request->attributes->get('request_id')],
            ], 401);
        }

        $now = now();
        $expiresAt = $now->copy()->addHours(config('auth.api_session.absolute_timeout_hours'));
        $sessionToken = bin2hex(random_bytes(32));
        $csrfToken = bin2hex(random_bytes(32));
        $existingToken = $request->cookie(config('auth.api_session.cookie'));

        DB::transaction(function () use ($user, $now, $expiresAt, $sessionToken, $csrfToken, $existingToken): void {
            if (is_string($existingToken) && preg_match('/^[a-f0-9]{64}$/i', $existingToken)) {
                DB::table('auth_sessions')
                    ->where('token_hash', hash('sha256', $existingToken, true))
                    ->whereNull('revoked_at')
                    ->update(['revoked_at' => $now]);
            }

            DB::table('auth_sessions')->insert([
                'user_id' => $user->id,
                'token_hash' => hash('sha256', $sessionToken, true),
                'csrf_token_hash' => hash('sha256', $csrfToken, true),
                'expires_at' => $expiresAt,
                'last_seen_at' => $now,
                'created_at' => $now,
            ]);

            DB::table('users')
                ->where('id', $user->id)
                ->update(['last_login_at' => $now]);
        });

        $response = response()->json([
            'data' => [
                'user' => [
                    'id' => $user->id,
                    'username' => $user->username,
                    'display_name' => $user->display_name,
                ],
                'csrf_token' => $csrfToken,
            ],
            'meta' => ['request_id' => $request->attributes->get('request_id')],
        ]);

        return $this->withSessionCookies($response, $sessionToken, $csrfToken);
    }

    public function me(Request $request): JsonResponse
    {
        $user = $request->attributes->get('authenticated_user');

        if (! is_object($user)) {
            return response()->json([
                'error' => [
                    'code' => 'UNAUTHENTICATED',
                    'message' => __('Authentication is required.'),
                ],
                'meta' => ['request_id' => $request->attributes->get('request_id')],
            ], 401);
        }

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
        $roles = DB::table('roles')
            ->join('user_roles', 'user_roles.role_id', '=', 'roles.id')
            ->where('user_roles.user_id', $user->id)
            ->where('roles.is_active', true)
            ->orderBy('roles.code')
            ->pluck('roles.code')
            ->all();

        return response()->json([
            'data' => [
                'user' => [
                    'id' => $user->id,
                    'username' => $user->username,
                    'display_name' => $user->display_name,
                    'role' => $roles[0] ?? 'unknown',
                    'roles' => $roles,
                    'permissions' => $permissions,
                ],
            ],
            'meta' => ['request_id' => $request->attributes->get('request_id')],
        ]);
    }

    public function reauthenticate(Request $request): JsonResponse
    {
        $values = $request->validate([
            'password' => ['required', 'string', 'max:1024'],
        ]);
        $user = $request->attributes->get('authenticated_user');
        $session = $request->attributes->get('auth_session');
        if (! is_object($user) || ! isset($user->id) || ! is_object($session) || ! isset($session->id)) {
            return response()->json([
                'error' => [
                    'code' => 'UNAUTHENTICATED',
                    'message' => __('Authentication is required.'),
                ],
                'meta' => ['request_id' => $request->attributes->get('request_id')],
            ], 401);
        }
        $userRecord = DB::table('users')->where('id', $user->id)->first(['password_hash']);

        if ($userRecord === null || ! Hash::check($values['password'], $userRecord->password_hash)) {
            return response()->json([
                'error' => [
                    'code' => 'REAUTHENTICATION_FAILED',
                    'message' => __('The password could not be verified.'),
                ],
                'meta' => ['request_id' => $request->attributes->get('request_id')],
            ], 401);
        }

        $verifiedAt = now();
        DB::transaction(function () use ($request, $session, $verifiedAt): void {
            DB::table('auth_sessions')
                ->where('id', $session->id)
                ->whereNull('revoked_at')
                ->update(['step_up_verified_at' => $verifiedAt]);
            $this->auditLog->record(
                $request,
                'auth.step_up_completed',
                'auth_session',
                (int) $session->id,
                null,
                null,
                ['step_up_verified_at' => $verifiedAt->toDateTimeString()],
            );
        });

        return response()->json([
            'data' => [
                'verified_at' => $verifiedAt->toDateTimeString(),
                'expires_at' => $verifiedAt->copy()->addMinutes(config('auth.api_session.step_up_window_minutes'))->toDateTimeString(),
            ],
            'meta' => ['request_id' => $request->attributes->get('request_id')],
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $session = $request->attributes->get('auth_session');

        if (is_object($session)) {
            DB::table('auth_sessions')
                ->where('id', $session->id)
                ->whereNull('revoked_at')
                ->update(['revoked_at' => now()]);
        }

        $response = response()->json([
            'data' => ['status' => 'signed_out'],
            'meta' => ['request_id' => $request->attributes->get('request_id')],
        ]);

        return $response
            ->withoutCookie(config('auth.api_session.cookie'), config('session.path'), config('session.domain'))
            ->withoutCookie(config('auth.api_session.csrf_cookie'), config('session.path'), config('session.domain'));
    }

    private function withSessionCookies(JsonResponse $response, string $sessionToken, string $csrfToken): JsonResponse
    {
        $minutes = config('auth.api_session.absolute_timeout_hours') * 60;
        $path = config('session.path', '/');
        $domain = config('session.domain');
        $secure = app()->environment('production')
            || (config('session.secure') ?? request()->isSecure());
        $sameSite = config('session.same_site', 'lax');

        return $response
            ->cookie(config('auth.api_session.cookie'), $sessionToken, $minutes, $path, $domain, $secure, true, false, $sameSite)
            ->cookie(config('auth.api_session.csrf_cookie'), $csrfToken, $minutes, $path, $domain, $secure, false, false, $sameSite);
    }
}
