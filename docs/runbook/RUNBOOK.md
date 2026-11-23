# Local ERP runbook

This runbook uses only the disposable `erp_scratch` database. Never point these commands at another database. It does not require reading `backend/.env`.

## Backend

From a PowerShell window in `backend/`, set process-only database values and run Laravel with an intentionally nonexistent env-file name:

```powershell
$env:APP_ENV = 'local'
$env:APP_KEY = 'base64:' + [Convert]::ToBase64String([Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
$env:DB_CONNECTION = 'mysql'
$env:DB_HOST = '127.0.0.1'
$env:DB_PORT = '3306'
$env:DB_DATABASE = 'erp_scratch'
$env:DB_USERNAME = 'root'
$env:DB_PASSWORD = ''
Write-Output 'TARGET DB = erp_scratch'
& 'C:\laragon\bin\php\php-8.3.33-Win32-vs16-x64\php.exe' artisan serve --host=127.0.0.1 --port=8000 --env=codex-no-env
```

Check `http://127.0.0.1:8000/api/v1/health`. Keep this server window open. Use the equivalent `mariadb` connection only if that server is configured for the scratch database. Apply migrations/seeders only after verifying the target printed is `erp_scratch`.

The generated process-only app key is intentionally ephemeral; restarting the backend invalidates browser sessions. For a persistent local installation, configure a private process environment through the normal deployment secret manager.

Create an owner interactively with `php artisan users:create-owner --env=codex-no-env`; the command prompts for a username, display name, and hidden password. Create additional test roles through owner user administration. Generate unique passwords at the time of use and keep them in a password manager or process memory; never put them in source, shell history, logs, or this runbook. Role defaults are documented in `docs/integration/ROLE_MATRIX.md`.

## Web frontend

From a second PowerShell window in `frontend/`:

```powershell
$env:VITE_MOCK_API = 'false'
$env:VITE_API_TARGET = 'http://127.0.0.1:8000'
npm run dev -- --host 127.0.0.1
```

Open the URL Vite prints (normally `http://127.0.0.1:5173`). This development proxy targets the backend; do not put credentials in Vite environment variables. The Playwright axe test command is `npm run a11y`; it runs the test-mode UI against its test API and is not a live CRUD test.

## Android companion

The verified debug APK is `mobile-app/android/app/build/outputs/apk/debug/app-debug.apk`. Install and launch it with the Android SDK `adb` executable:

```powershell
adb install -r mobile-app/android/app/build/outputs/apk/debug/app-debug.apk
adb shell am start -n com.erp.companion/.MainActivity
```

The APK bundles JavaScript and the login screen launched on the connected `emulator-5554` without Metro. Mobile authenticated E2E, emulator SMS/notification injection, offline replay, and mobile-to-web linkage are not verified. iOS simulator execution is not applicable in this Windows environment; manual-entry configuration/tests are not a simulator verification.

## Verification references

- Current phase status and test counts: `docs/integration/FINISH_PROGRESS.md`.
- Backend/security defaults: `docs/integration/ROLE_MATRIX.md` and `docs/integration/DECISIONS.md`.
- Browser accessibility and live browser limitations: `docs/integration/WEB_E2E_REPORT.md`.
- Android build and launch evidence: `docs/mobile/ANDROID_BUILD_EVIDENCE.md`.
