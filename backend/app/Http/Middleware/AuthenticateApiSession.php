<?php

namespace App\Http\Middleware;

use Carbon\Carbon;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;

class AuthenticateApiSession
{
    public function handle(Request $request, Closure $next): Response
    {
        $token = $request->cookie(config('auth.api_session.cookie'));

        if (! is_string($token) || ! preg_match('/^[a-f0-9]{64}$/i', $token)) {
            return $this->unauthenticated($request);
        }

        $session = DB::table('auth_sessions')
            ->where('token_hash', hash('sha256', $token, true))
            ->whereNull('revoked_at')
            ->first();

        if ($session === null) {
            return $this->unauthenticated($request);
        }

        $now = now();
        $expiresAt = Carbon::parse($session->expires_at);
        $lastSeenAt = Carbon::parse($session->last_seen_at ?? $session->created_at);
        $idleExpiresAt = $lastSeenAt->copy()->addMinutes(config('auth.api_session.idle_timeout_minutes'));

        if ($expiresAt->lessThanOrEqualTo($now) || $idleExpiresAt->lessThanOrEqualTo($now)) {
            DB::table('auth_sessions')->where('id', $session->id)->update(['revoked_at' => $now]);

            return $this->unauthenticated($request);
        }

        $user = DB::table('users')
            ->where('id', $session->user_id)
            ->first(['id', 'username', 'display_name', 'is_active', 'password_changed_at']);

        if ($user === null || ! (bool) $user->is_active) {
            DB::table('auth_sessions')->where('id', $session->id)->update(['revoked_at' => $now]);

            return $this->unauthenticated($request);
        }

        if ($user->password_changed_at !== null && Carbon::parse($user->password_changed_at)->greaterThan(Carbon::parse($session->created_at))) {
            DB::table('auth_sessions')->where('id', $session->id)->update(['revoked_at' => $now]);

            return $this->unauthenticated($request);
        }

        DB::table('auth_sessions')->where('id', $session->id)->update(['last_seen_at' => $now]);
        $request->attributes->set('auth_session', $session);
        $request->attributes->set('authenticated_user', $user);

        return $next($request);
    }

    private function unauthenticated(Request $request): Response
    {
        $response = response()->json([
            'error' => [
                'code' => 'UNAUTHENTICATED',
                'message' => __('Authentication is required.'),
            ],
            'meta' => ['request_id' => $request->attributes->get('request_id')],
        ], 401);

        return $response
            ->withoutCookie(config('auth.api_session.cookie'), config('session.path'), config('session.domain'))
            ->withoutCookie(config('auth.api_session.csrf_cookie'), config('session.path'), config('session.domain'));
    }
}
