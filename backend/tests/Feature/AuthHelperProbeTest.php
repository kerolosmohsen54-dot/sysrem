<?php
namespace Tests\Feature;
use Tests\TestCase;
use Tests\Concerns\AuthenticatesApi;
use PHPUnit\Framework\Attributes\Test;
final class AuthHelperProbeTest extends TestCase {
 use AuthenticatesApi;
 #[Test] public function authenticated_and_unauthenticated_auth_me_statuses(): void { $a=$this->actingAsApiUser(); $this->withCredentials()->withUnencryptedCookie($this->apiCookieName(),$a['token'])->getJson('/api/v1/auth/me')->assertStatus(200); $this->withUnencryptedCookie($this->apiCookieName(), '')->getJson('/api/v1/auth/me')->assertStatus(401); }
}