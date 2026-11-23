<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class VerifyApiCsrfToken
{
    public function handle(Request $request, Closure $next): Response
    {
        $session = $request->attributes->get('auth_session');
        $token = $request->header('X-CSRF-Token');

        if (
            ! is_object($session)
            || ! is_string($session->csrf_token_hash)
            || ! is_string($token)
            || ! preg_match('/^[a-f0-9]{64}$/i', $token)
            || ! hash_equals($session->csrf_token_hash, hash('sha256', $token, true))
        ) {
            return response()->json([
                'error' => [
                    'code' => 'CSRF_TOKEN_MISMATCH',
                    'message' => __('The security token is invalid or expired.'),
                ],
                'meta' => ['request_id' => $request->attributes->get('request_id')],
            ], 419);
        }

        return $next($request);
    }
}
