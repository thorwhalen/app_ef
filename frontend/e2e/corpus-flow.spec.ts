/**
 * The corpus-flow e2e tests — the headline journey: index a corpus, then
 * search it. One test drives it as a command sequence with assertions ("an
 * e2e test is a macro with assertions"); the other drives the same outcome
 * through the real UI. Both run against a mocked backend.
 */
import { test, expect } from 'acture-e2e-playwright/fixture';
import { mockBackend, type MockCorpus } from './_support/backend';

/** The corpus the mocked `create_corpus` / `list_corpora` serve. */
const DEMO_CORPUS: MockCorpus = {
  corpus_id: 'demo',
  n_sources: 2,
  n_segments: 2,
  embedder: 'openai:text-embedding-3-small',
  dim: 1536,
  config_id: 'cfg-demo',
};

/** The hits the mocked `search` serves — one segment whose text the
 *  assertions look for on the rendered Search surface. */
const DEMO_HITS = [
  {
    segment: { id: 'seg-1', text: 'the cat sat on the mat' },
    score: 0.91,
    source_id: 'src-1',
  },
];

test('create then search — a command sequence with assertions', async ({
  page,
  commands,
}) => {
  await mockBackend(page, { createCorpus: DEMO_CORPUS, search: DEMO_HITS });
  await page.goto('/');

  // A macro with assertions: each command step dispatches through the
  // page's registry; each assert step inspects the rendered page.
  await commands.replayTest([
    {
      commandId: 'app.corpus.create',
      params: { sources: ['the cat sat on the mat', 'the dog ran'] },
    },
    {
      assert: async (page) => {
        // create auto-selects the new corpus → CorpusDetail renders.
        await expect(page.getByText(/Corpus.*is ready/)).toBeVisible();
      },
    },
    {
      // The corpus is now selected, so the query command's `when` passes.
      commandId: 'app.search.run',
      params: { query: 'cat' },
    },
    {
      assert: async (page) => {
        await expect(
          page.getByText('the cat sat on the mat'),
        ).toBeVisible();
      },
    },
  ]);
});

test('search through the UI — fill the box, click the Search button', async ({
  page,
  commands,
}) => {
  await mockBackend(page, { corpora: [DEMO_CORPUS], search: DEMO_HITS });
  await page.goto('/');

  // Select the pre-seeded corpus, then move to the Search surface.
  const selected = await commands.dispatch('app.corpus.select', {
    corpusId: 'demo',
  });
  expect(selected.ok).toBe(true);
  await page.locator('nav').getByRole('button', { name: 'Search' }).click();

  // Drive the real search form: type a query, click the command button
  // (wired with `data-command="app.search.run"`).
  await page.getByPlaceholder('Search the corpus…').fill('cat');
  await commands.click('app.search.run');

  await expect(page.getByText('the cat sat on the mat')).toBeVisible();
});
