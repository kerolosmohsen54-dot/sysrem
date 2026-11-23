<?php

namespace Tests\Unit;

use App\Logging\RequestContextProcessor;
use DateTimeImmutable;
use Illuminate\Http\Request;
use Monolog\Level;
use Monolog\LogRecord;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class RequestContextProcessorTest extends TestCase
{
    #[Test]
    public function it_adds_the_request_id_and_redacts_sensitive_context_recursively(): void
    {
        $requestId = 'c1d08f3a-bd0e-4a3d-90a5-4c1c8890f8f5';
        $request = Request::create('/api/v1/health');
        $request->attributes->set('request_id', $requestId);
        $this->app->instance('request', $request);

        $record = new LogRecord(
            new DateTimeImmutable(),
            'test',
            Level::Info,
            'A request was processed.',
            [
                'password' => 'test-password',
                'nested' => ['authorization' => 'Bearer test-token'],
                'entity_id' => 42,
            ],
        );

        $processed = (new RequestContextProcessor())($record);

        self::assertSame($requestId, $processed->context['request_id']);
        self::assertSame('[REDACTED]', $processed->context['password']);
        self::assertSame('[REDACTED]', $processed->context['nested']['authorization']);
        self::assertSame(42, $processed->context['entity_id']);
    }
}
