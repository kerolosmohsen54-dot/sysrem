<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class AuthenticateCustomerPicker
{
    public function __construct(
        private readonly AuthenticateApiSession $sessions,
        private readonly AuthenticateMobileToken $mobileTokens,
        private readonly RequirePermission $permissions,
        private readonly RequireRecentStepUp $stepUp,
    ) {}

    public function handle(Request $request, Closure $next): Response
    {
        if ($request->bearerToken() !== null || config('auth.mobile.guest_access_enabled')) {
            return $this->mobileTokens->handle(
                $request,
                fn (Request $authenticatedRequest): Response => $this->permissions->handle(
                    $authenticatedRequest,
                    $next,
                    'mobile.use',
                ),
            );
        }

        return $this->sessions->handle(
            $request,
            fn (Request $authenticatedRequest): Response => $this->stepUp->handle(
                $authenticatedRequest,
                fn (Request $steppedUpRequest): Response => $this->permissions->handle(
                    $steppedUpRequest,
                    $next,
                    'customers.view',
                ),
            ),
        );
    }
}
