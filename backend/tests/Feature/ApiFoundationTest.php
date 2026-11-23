<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;
use Illuminate\Validation\ValidationException;
use PDOException;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class ApiFoundationTest extends TestCase
{
    #[Test]
    public function health_endpoint_reports_service_status_and_propagates_a_valid_request_id(): void
    {
        DB::shouldReceive('select')
            ->once()
            ->with('SELECT 1')
            ->andReturn([]);

        $requestId = 'c1d08f3a-bd0e-4a3d-90a5-4c1c8890f8f5';

        $response = $this->getJson('/api/v1/health', ['X-Request-Id' => $requestId]);

        $response->assertOk()
            ->assertJsonPath('data.status', 'ok')
            ->assertJsonPath('meta.request_id', $requestId)
            ->assertHeader('X-Request-Id', $requestId);
    }

    #[Test]
    public function health_endpoint_replaces_an_invalid_request_id(): void
    {
        DB::shouldReceive('select')->once()->with('SELECT 1')->andReturn([]);

        $response = $this->getJson('/api/v1/health', ['X-Request-Id' => 'not-a-uuid']);

        $response->assertOk();
        self::assertSame(
            $response->json('meta.request_id'),
            $response->headers->get('X-Request-Id'),
        );
        self::assertTrue((bool) preg_match(
            '/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i',
            (string) $response->headers->get('X-Request-Id'),
        ));
    }

    #[Test]
    public function api_http_errors_use_a_safe_json_envelope(): void
    {
        $this->getJson('/api/v1/missing')
            ->assertNotFound()
            ->assertJsonPath('error.code', 'HTTP_ERROR')
            ->assertJsonPath('error.message', 'تعذر إكمال الطلب. راجع البيانات وحاول مرة أخرى.')
            ->assertJsonStructure(['error' => ['code', 'message'], 'meta' => ['request_id']]);
    }

    #[Test]
    public function api_validation_errors_use_a_json_envelope_with_field_details(): void
    {
        app()->setLocale('ar');
        Route::get('/api/v1/_test-validation', function (): never {
            throw ValidationException::withMessages(['name' => ['اسم الحقل مطلوب.']]);
        });

        $this->getJson('/api/v1/_test-validation')
            ->assertUnprocessable()
            ->assertJsonPath('error.code', 'VALIDATION_FAILED')
            ->assertJsonPath('error.message', 'البيانات المدخلة غير صالحة.')
            ->assertJsonPath('error.details.name.0', 'اسم الحقل مطلوب.')
            ->assertJsonStructure(['error' => ['code', 'message', 'details'], 'meta' => ['request_id']]);
    }

    #[Test]
    public function api_unexpected_errors_hide_internal_exception_details(): void
    {
        Route::get('/api/v1/_test-error', function (): never {
            throw new PDOException('private database connection details');
        });

        $this->getJson('/api/v1/_test-error')
            ->assertInternalServerError()
            ->assertJsonPath('error.code', 'INTERNAL_SERVER_ERROR')
            ->assertJsonMissing(['message' => 'private database connection details'])
            ->assertJsonStructure(['error' => ['code', 'message'], 'meta' => ['request_id']]);
    }
}
