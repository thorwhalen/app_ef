/**
 * Navigation-policy e2e tests — a command dispatch's *origin* governs
 * whether it changes the active surface.
 *
 * A user-driven dispatch (palette, hotkey, surface form) navigates to the
 * surface that shows its result. An assistant-driven dispatch must not:
 * the AI assistant operates the app while the user watches the chat, so
 * navigating away mid-turn would unmount the streaming Assistant surface.
 * Both cases share one command (`app.search.run`) and one registry — only
 * the dispatch context's `origin` differs.
 */
import { test, expect } from 'acture-e2e-playwright/fixture';
import type { Page } from '@playwright/test';
import { mockBackend, type MockCorpus } from './_support/backend';

/** The corpus the mocked `list_corpora` / `search` serve. */
const DEMO_CORPUS: MockCorpus = {
  corpus_id: 'demo',
  n_sources: 2,
  n_segments: 2,
  embedder: 'openai:text-embedding-3-small',
  dim: 1536,
  config_id: 'cfg-demo',
};

/** A single mocked search hit — enough to make `app.search.run` succeed. */
const DEMO_HITS = [
  {
    segment: { id: 'seg-1', text: 'the cat sat on the mat' },
    score: 0.91,
    source_id: 'src-1',
  },
];

/**
 * Dispatch a command through the page bridge with an *explicit* context.
 * The fixture's `commands.dispatch` exposes no context channel (the bridge
 * injects the live `appContext()`, which is always `origin: 'user'`); a
 * test that needs to set `origin` itself must reach the bridge directly.
 */
function dispatchWithContext(
  page: Page,
  commandId: string,
  params: unknown,
  ctx: Record<string, unknown>,
): Promise<{ ok: boolean }> {
  return page.evaluate(
    ({ commandId: id, params: p, ctx: c }) => {
      const reg = (
        window as Window & {
          __actureRegistry?: {
            dispatch: (
              id: string,
              params?: unknown,
              ctx?: unknown,
            ) => Promise<{ ok: boolean }>;
          };
        }
      ).__actureRegistry;
      if (!reg) throw new Error('e2e bridge not installed');
      return reg.dispatch(id, p, c);
    },
    { commandId, params, ctx },
  );
}

test('command dispatch origin governs surface navigation', async ({
  page,
  commands,
}) => {
  await mockBackend(page, { corpora: [DEMO_CORPUS], search: DEMO_HITS });
  await page.goto('/');

  // Select the corpus, then move to the Assistant surface — the situation
  // an assistant turn runs in: the user is watching the chat.
  const selected = await commands.dispatch('app.corpus.select', {
    corpusId: 'demo',
  });
  expect(selected.ok).toBe(true);
  await page.locator('nav').getByRole('button', { name: 'Assistant' }).click();
  await expect(page.getByRole('heading', { name: 'Assistant' })).toBeVisible();

  // An assistant-originated search must NOT navigate to the Search surface
  // — that would unmount the live chat mid-turn.
  const assistantRun = await dispatchWithContext(
    page,
    'app.search.run',
    { query: 'cat' },
    { corpusId: 'demo', origin: 'assistant' },
  );
  expect(assistantRun.ok).toBe(true);
  await expect(page.getByRole('heading', { name: 'Assistant' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Search' })).toBeHidden();

  // The same command, user-originated, DOES navigate — the palette,
  // hotkeys and surface forms expect to land on the result.
  const userRun = await commands.dispatch('app.search.run', { query: 'cat' });
  expect(userRun.ok).toBe(true);
  await expect(page.getByRole('heading', { name: 'Search' })).toBeVisible();
});
