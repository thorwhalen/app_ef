/**
 * Playwright configuration for app_ef's end-to-end tests.
 *
 * The e2e suite (`e2e/`) drives the app through acture's command registry
 * — see `e2e/README.md` and `src/e2e/bridge.ts`. The in-page registry
 * bridge is DEV-only, so the tests run against `vite dev`, which is
 * started automatically via `webServer` below. The Python backend is
 * *not* started: every backend call is mocked (`e2e/_support/backend.ts`).
 */
import { defineConfig, devices } from '@playwright/test';

/** The dev-server origin — must match `server.port` in `vite.config.ts`. */
const BASE_URL = 'http://localhost:5173';

export default defineConfig({
  testDir: './e2e',
  // `_support/` holds helpers, not specs.
  testMatch: '**/*.spec.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'list',
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'pnpm dev',
    url: BASE_URL,
    // Reuse a dev server already running locally; always start a fresh
    // one in CI. `pnpm dev`'s `predev` hook rebuilds the linked zodal
    // packages first, so the timeout is generous.
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
