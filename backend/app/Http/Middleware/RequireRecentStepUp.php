<?php

namespace App\Http\Middleware;

use Carbon\Carbon;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;

class RequireRecentStepUp
{
    public function handle(Request $request, Closure $next, string ...$conditionalPermissions): Response
    {
        // Password confirmation is reserved for finance screens. Other API
        // routes keep their normal session, CSRF, and permission checks.
        if (! $this->isFinanceRoute($request)) {
            return $next($request);
        }

        $user = $request->attributes->get('authenticated_user');

        if ($conditionalPermissions !== [] && is_object($user) && isset($user->id)) {
            $hasSensitivePermission = DB::table('role_permissions as rp')
                ->join('permissions as p', 'p.id', '=', 'rp.permission_id')
                ->join('user_roles as ur', 'ur.role_id', '=', 'rp.role_id')
                ->join('roles as r', 'r.id', '=', 'ur.role_id')
                ->where('ur.user_id', $user->id)
                ->where('r.is_active', true)
                ->whereIn('p.code', $conditionalPermissions)
                ->exists();

            if (! $hasSensitivePermission) {
                return $next($request);
            }
        }

        $session = $request->attributes->get('auth_session');
        $verifiedAt = is_object($session) ? ($session->step_up_verified_at ?? null) : null;
        $isRecent = is_string($verifiedAt)
            && Carbon::parse($verifiedAt)->greaterThan(now()->subMinutes(config('auth.api_session.step_up_window_minutes')));

        if (! $isRecent) {
            return response()->json([
                'error' => [
                    'code' => 'STEP_UP_REQUIRED',
                    'message' => __('Re-authenticate to continue.'),
                ],
                'meta' => ['request_id' => $request->attributes->get('request_id')],
            ], 428);
        }

        return $next($request);
    }

    private function isFinanceRoute(Request $request): bool
    {
        if (str_starts_with(ltrim($request->path(), '/'), 'api/v1/accounting/')) {
            return true;
        }

        $routeName = $request->route()?->getName();
        if (! is_string($routeName)) {
            return false;
        }

        foreach ([
            'treasury.accounts.',
            'treasury.entries.',
            'treasury.transfers.',
            'expense-categories.',
            'expenses.',
            'partners.',
            'partner-payments.',
        ] as $prefix) {
            if (str_starts_with($routeName, $prefix)) {
                return true;
            }
        }

        return in_array($routeName, [
            'currencies.store',
            'currencies.update',
            'purchase-invoices.store',
        ], true);
    }
}
