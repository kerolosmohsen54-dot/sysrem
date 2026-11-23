<?php

namespace App\Http\Middleware;

use Carbon\Carbon;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RequireMobilePasswordConfirmation
{
    public function handle(Request $request, Closure $next): Response
    {
        $device = $request->attributes->get('mobile_device');
        $confirmedAt = is_object($device) ? ($device->password_confirmed_at ?? null) : null;
        $isRecent = is_string($confirmedAt)
            && Carbon::parse($confirmedAt)->greaterThan(
                now()->subMinutes(config('auth.mobile.password_confirmation_minutes', 10)),
            );

        if (! $isRecent) {
            return response()->json([
                'error' => [
                    'code' => 'PASSWORD_CONFIRMATION_REQUIRED',
                    'message' => __('Confirm your password to continue.'),
                ],
                'meta' => ['request_id' => $request->attributes->get('request_id')],
            ], 428);
        }

        return $next($request);
    }
}
