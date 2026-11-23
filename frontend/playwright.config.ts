import path from 'node:path';
import { defineConfig, devices } from '@playwright/test';

const backendDirectory = path.resolve(process.cwd(), '../backend');
const phpBinary = process.env.PHP83_BIN || 'php';

export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/global-setup.cjs',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:5174',
    trace: 'retain-on-failure',
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
      : {},
    ...devices['Desktop Chrome'],
  },
  webServer: [
    {
      command: `"${phpBinary}" artisan serve --no-reload --host=127.0.0.1 --port=8016`,
      cwd: backendDirectory,
      env: {
        ...process.env,
        APP_ENV: 'testing',
        CACHE_STORE: 'array',
        SESSION_DRIVER: 'array',
        QUEUE_CONNECTION: 'sync',
        DB_CONNECTION: 'mysql_test',
        DB_TEST_DATABASE: 'erp_acceptance_tests',
        DB_DATABASE: 'erp_acceptance_tests',
      },
      url: 'http://127.0.0.1:8016/api/v1/health',
      reuseExistingServer: false,
      timeout: 90_000,
    },
    {
      command: 'npm run dev -- --host 127.0.0.1 --port 5174',
      cwd: process.cwd(),
      env: { ...process.env, VITE_API_TARGET: 'http://127.0.0.1:8016' },
      url: 'http://127.0.0.1:5174',
      reuseExistingServer: false,
      timeout: 30_000,
    },
  ],
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
