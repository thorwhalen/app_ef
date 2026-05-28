/**
 * Registry-level e2e tests — drive commands through the page bridge, no
 * UI. These are the unit/API level of the test pyramid run inside a real
 * browser: the same `{ commandId, params }` dispatch every other surface
 * (palette, hotkeys, assistant) uses.
 */
import { test, expect } from 'acture-e2e-playwright/fixture';
import { mockBackend } from './_support/backend';

/** Every command app_ef registers — see `src/commands/registry.ts`. */
const EXPECTED_COMMAND_IDS = [
  'app.corpus.create',
  'app.corpus.select',
  'app.corpus.delete',
  'app.search.run',
  'app.corpus.explore',
  'app.rag.retrieve',
];

/** The corpus-dependent query commands — hidden by a `when` clause until
 *  a corpus is selected. */
const QUERY_COMMAND_IDS = [
  'app.search.run',
  'app.corpus.explore',
  'app.rag.retrieve',
];

test.beforeEach(async ({ page }) => {
  await mockBackend(page);
  await page.goto('/');
});

test('every app command is registered', async ({ page }) => {
  const ids = await page.evaluate(() => {
    const reg = (
      window as Window & {
        __actureRegistry?: { list(): ReadonlyArray<{ id: string }> };
      }
    ).__actureRegistry;
    return reg ? reg.list().map((c) => c.id) : null;
  });
  expect(ids).not.toBeNull();
  expect(new Set(ids)).toEqual(new Set(EXPECTED_COMMAND_IDS));
});

test('query commands are gated when no corpus is selected', async ({
  commands,
}) => {
  // `dispatch` enforces `when` clauses. With no corpus selected the
  // injected context carries no `corpusId`, so the query commands' `when`
  // fails — errors-as-data, never a thrown exception.
  for (const id of QUERY_COMMAND_IDS) {
    const result = await commands.dispatch(id, { query: 'anything' });
    expect(result, `${id} should be gated`).toMatchObject({
      ok: false,
      error: { code: 'when_clause_failed' },
    });
  }
});

test('selecting a corpus is a clean dispatch and updates the UI', async ({
  page,
  commands,
}) => {
  const result = await commands.dispatch('app.corpus.select', {
    corpusId: 'demo',
  });
  expect(result.ok).toBe(true);
  // The dispatch mutated the store; React reflects it in the header.
  await expect(page.locator('header').getByText('demo')).toBeVisible();
});
