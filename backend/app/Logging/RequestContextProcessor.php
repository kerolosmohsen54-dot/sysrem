<?php

namespace App\Logging;

use Monolog\LogRecord;

class RequestContextProcessor
{
    public function __invoke(LogRecord $record): LogRecord
    {
        $context = $this->redactSensitiveValues($record->context);

        if (app()->bound('request')) {
            $requestId = app('request')->attributes->get('request_id');

            if (is_string($requestId)) {
                $context['request_id'] ??= $requestId;
            }
        }

        return $record->with(context: $context);
    }

    /**
     * @param array<string|int, mixed> $context
     * @return array<string|int, mixed>
     */
    private function redactSensitiveValues(array $context): array
    {
        foreach ($context as $key => $value) {
            if (is_string($key) && preg_match('/password|passwd|token|secret|authorization|cookie|api[_-]?key/i', $key)) {
                $context[$key] = '[REDACTED]';
            } elseif (is_array($value)) {
                $context[$key] = $this->redactSensitiveValues($value);
            }
        }

        return $context;
    }
}
