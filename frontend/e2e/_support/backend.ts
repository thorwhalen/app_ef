/**
 * Mock the app_ef backend for e2e tests.
 *
 * The real backend is a Python `qh`-over-`ef` service on a separate port;
 * the e2e suite does not run it. Instead every backend endpoint the app
 * calls is intercepted with Playwright's `page.route` and answered from
 * in-memory test data. This keeps the suite hermetic and deterministic —
 * an e2e test asserts the *frontend*'s behaviour, not the embedding
 * backend's. (A future suite that exercises the real `ef` pipeline would
 * stand the Python service up instead; that is deliberately out of scope
 * here — see `e2e/README.md`.)
 *
 * The mock is lightly stateful: `createCorpus` appends to the served
 * corpus list and `deleteCorpus` removes from it, so a create-then-list
 * or delete-then-list flow behaves like the real backend.
 */
import type { Page } from '@playwright/test';

/**
 * A stand-in for the backend's `CorpusInfo` (`src/api/schema.ts`). Every
 * field the UI reads is required; the shape is kept local so the e2e
 * suite stays decoupled from the app's generated API types.
 */
export interface MockCorpus {
  corpus_id: string;
  n_sources: number;
  n_segments: number;
  embedder: string;
  dim: number;
  config_id: string;
}

export interface MockBackendOptions {
  /** Corpora the backend serves before any `createCorpus` call. */
  corpora?: MockCorpus[];
  /** The `CorpusInfo` `POST /create_corpus` returns — and appends to the
   *  served list. Omit to make `create_corpus` fail with a 503. */
  createCorpus?: MockCorpus;
  /** Hits `POST /search` returns. Default: `[]`. */
  search?: unknown[];
  /** Segments `POST /retrieve` returns. Default: `[]`. */
  retrieve?: unknown[];
  /** The map `POST /explore_corpus` returns. Omit to make it fail. */
  exploreCorpus?: unknown;
}

/** A live handle to the mocked backend's state, for assertions. */
export interface MockBackend {
  /** The corpus list the backend currently serves (grows on create,
   *  shrinks on delete). */
  readonly corpora: readonly MockCorpus[];
}

/** A 503 the app's client turns into an `ApiError` — the clean "not
 *  configured for this test" failure. */
function notMocked(endpoint: string): { status: number; json: unknown } {
  return { status: 503, json: { detail: `${endpoint} not mocked for this test` } };
}

/**
 * Install `page.route` handlers for every app_ef backend endpoint. Must
 * be called before `page.goto` — the app fetches `/list_corpora` on
 * mount. Returns a handle whose `corpora` reflects the live mock state.
 */
export async function mockBackend(
  page: Page,
  options: MockBackendOptions = {},
): Promise<MockBackend> {
  const state: { corpora: MockCorpus[] } = {
    corpora: [...(options.corpora ?? [])],
  };

  // POST /list_corpora — the current corpus list (read at request time).
  await page.route('**/list_corpora', (route) =>
    route.fulfill({ json: state.corpora }),
  );

  // POST /create_corpus — append the configured corpus and return it.
  await page.route('**/create_corpus', (route) => {
    const created = options.createCorpus;
    if (!created) return route.fulfill(notMocked('create_corpus'));
    state.corpora = [...state.corpora, created];
    return route.fulfill({ json: created });
  });

  // POST /delete_corpus — drop the corpus by id, return null.
  await page.route('**/delete_corpus', (route) => {
    const body = (route.request().postDataJSON() ?? {}) as {
      corpus_id?: string;
    };
    state.corpora = state.corpora.filter(
      (c) => c.corpus_id !== body.corpus_id,
    );
    return route.fulfill({ json: null });
  });

  // POST /search and /retrieve — ranked results (default: empty).
  await page.route('**/search', (route) =>
    route.fulfill({ json: options.search ?? [] }),
  );
  await page.route('**/retrieve', (route) =>
    route.fulfill({ json: options.retrieve ?? [] }),
  );

  // POST /explore_corpus — the 2-D map.
  await page.route('**/explore_corpus', (route) =>
    options.exploreCorpus === undefined
      ? route.fulfill(notMocked('explore_corpus'))
      : route.fulfill({ json: options.exploreCorpus }),
  );

  return state;
}
