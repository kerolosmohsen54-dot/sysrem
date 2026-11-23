<?php

use App\Console\Commands\BackupMysqlDatabase;
use App\Console\Commands\ArchiveMobileCapturedMessages;
use App\Console\Commands\CopyMysqlBackupOffsite;
use App\Console\Commands\CreateOwnerUser;
use App\Console\Commands\ImportCustomerOpeningBalancesCsv;
use App\Console\Commands\ImportCustomersCsv;
use App\Console\Commands\ImportOpeningStockCsv;
use App\Console\Commands\ImportProductsCsv;
use App\Console\Commands\PruneAuthSessions;
use App\Console\Commands\RestoreMysqlBackupTest;
use App\Http\Middleware\AuthenticateApiSession;
use App\Http\Middleware\AuthenticateCustomerPicker;
use App\Http\Middleware\AuthenticateMobileToken;
use App\Http\Middleware\RequestIdMiddleware;
use App\Http\Middleware\RequireMobilePasswordConfirmation;
use App\Http\Middleware\RequirePermission;
use App\Http\Middleware\RequireRecentStepUp;
use App\Http\Middleware\VerifyApiCsrfToken;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        api: __DIR__.'/../routes/api_v1.php',
        commands: __DIR__.'/../routes/console.php',
    )
    ->withCommands([
        BackupMysqlDatabase::class,
        ArchiveMobileCapturedMessages::class,
        CopyMysqlBackupOffsite::class,
        CreateOwnerUser::class,
        ImportCustomerOpeningBalancesCsv::class,
        ImportCustomersCsv::class,
        ImportOpeningStockCsv::class,
        ImportProductsCsv::class,
        PruneAuthSessions::class,
        RestoreMysqlBackupTest::class,
    ])
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->append(RequestIdMiddleware::class);
        $middleware->alias([
            'api.session' => AuthenticateApiSession::class,
            'api.mobile' => AuthenticateMobileToken::class,
            'api.customer_picker' => AuthenticateCustomerPicker::class,
            'api.csrf' => VerifyApiCsrfToken::class,
            'api.permission' => RequirePermission::class,
            'api.step_up' => RequireRecentStepUp::class,
            'api.mobile_step_up' => RequireMobilePasswordConfirmation::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
        );
        $exceptions->render(function (ValidationException $exception, Request $request) {
            if (! $request->is('api/*')) {
                return null;
            }

            $details = array_map(
                static fn (array $messages): array => array_map(
                    static function (string $message): string {
                        $translated = __($message);

                        return $translated !== $message || ! preg_match('/[A-Za-z]/', $message)
                            ? $translated
                            : 'القيمة المدخلة غير صالحة. راجع الحقل وأعد المحاولة.';
                    },
                    $messages,
                ),
                $exception->errors(),
            );

            return response()->json([
                'error' => [
                    'code' => 'VALIDATION_FAILED',
                    'message' => __('The submitted data is invalid.'),
                    'details' => $details,
                ],
                'meta' => ['request_id' => $request->attributes->get('request_id')],
            ], 422);
        });
        $exceptions->render(function (HttpExceptionInterface $exception, Request $request) {
            if (! $request->is('api/*')) {
                return null;
            }

            return response()->json([
                'error' => [
                    'code' => 'HTTP_ERROR',
                    'message' => 'تعذر إكمال الطلب. راجع البيانات وحاول مرة أخرى.',
                ],
                'meta' => ['request_id' => $request->attributes->get('request_id')],
            ], $exception->getStatusCode(), $exception->getHeaders());
        });
        $exceptions->render(function (Throwable $exception, Request $request) {
            if (! $request->is('api/*')) {
                return null;
            }

            return response()->json([
                'error' => [
                    'code' => 'INTERNAL_SERVER_ERROR',
                    'message' => 'حدث خطأ غير متوقع. حاول مرة أخرى.',
                ],
                'meta' => ['request_id' => $request->attributes->get('request_id')],
            ], 500);
        });
    })->create();
