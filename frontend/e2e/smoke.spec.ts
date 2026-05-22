/**
 * Smoke tests — the app boots, the e2e command bridge is installed, and
 * the ⌘K palette opens. If these fail, no other e2e test is meaningful.
 */
import { test, expect } from 'acture-e2e-playwright/fixture';
import { mockBackend } from './_support/backend';

test.beforeEach(async ({ page }) => {
  // The app fetches /list_corpora on mount — answer it (with no corpora)
  // so the run is not coloured by a backend-unreachable error notice.
  await mockBackend(page);
  await page.goto('/');
});

test('the app loads and shows the empty state', async ({ page }) => {
  await expect(page.getByText('semantic search')).toBeVisible();
  await expect(page.getByText('no corpus selected')).toBeVisible();
});

test('the e2e command registry bridge is installed', async ({ commands }) => {
  // Dispatching an unknown command must reach the registry and come back
  // `unknown_command` — *not* `bridge_not_installed`, which is what the
  // bridge returns when the app never exposed its registry on `window`.
  const result = await commands.dispatch('app.nonexistent.command');
  expect(result).toMatchObject({
    ok: false,
    error: { code: 'unknown_command' },
  });
});

test('⌘K opens the command palette', async ({ page }) => {
  await expect(page.getByPlaceholder('Search commands…')).toBeHidden();
  await page.keyboard.press('ControlOrMeta+k');
  await expect(page.getByPlaceholder('Search commands…')).toBeVisible();
});
