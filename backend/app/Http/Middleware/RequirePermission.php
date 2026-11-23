<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;

class RequirePermission
{
    public function handle(Request $request, Closure $next, string ...$permissions): Response
    {
        $user = $request->attributes->get('authenticated_user');

        if (! is_object($user) || ! isset($user->id)) {
            return response()->json([
                'error' => [
                    'code' => 'UNAUTHENTICATED',
                    'message' => __('Authentication is required.'),
                ],
                'meta' => ['request_id' => $request->attributes->get('request_id')],
            ], 401);
        }

        $requiredPermissions = array_values(array_filter(array_map('trim', $permissions)));

        if ($requiredPermissions === []) {
            return response()->json([
                'error' => [
                    'code' => 'FORBIDDEN',
                    'message' => __('You do not have permission to access this resource.'),
                ],
                'meta' => ['request_id' => $request->attributes->get('request_id')],
            ], 403);
        }

        // The mobile API has legacy write routes gated only by mobile.use.
        // Keep read-only devices able to authenticate and view, but never mutate.
        if ($request->is('api/v1/mobile/*') && ! $request->isMethodSafe()
            && ! $request->is('api/v1/mobile/auth/logout', 'api/v1/mobile/auth/confirm-password')) {
            $isReadOnly = DB::table('user_roles as ur')
                ->join('roles as r', 'r.id', '=', 'ur.role_id')
                ->where('ur.user_id', $user->id)
                ->where('r.code', 'read_only')
                ->where('r.is_active', true)
                ->exists();
            if ($isReadOnly) {
                return response()->json([
                    'error' => [
                        'code' => 'FORBIDDEN',
                        'message' => __('You do not have permission to access this resource.'),
                    ],
                    'meta' => ['request_id' => $request->attributes->get('request_id')],
                ], 403);
            }
        }

        $hasPermission = DB::table('role_permissions as rp')
            ->join('permissions as p', 'p.id', '=', 'rp.permission_id')
            ->join('user_roles as ur', 'ur.role_id', '=', 'rp.role_id')
            ->join('roles as r', 'r.id', '=', 'ur.role_id')
            ->where('ur.user_id', $user->id)
            ->where('r.is_active', true)
            ->whereIn('p.code', $requiredPermissions)
            ->exists();

        if (! $hasPermission) {
            return response()->json([
                'error' => [
                    'code' => 'FORBIDDEN',
                    'message' => __('You do not have permission to access this resource.'),
                ],
                'meta' => ['request_id' => $request->attributes->get('request_id')],
            ], 403);
        }

        return $next($request);
    }
}
