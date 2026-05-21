/**
 * Query commands: search, explore, retrieve.
 *
 * All three act on the *selected* corpus — they read `corpusId` from the
 * dispatch context (`appContext()`) rather than taking it as a parameter,
 * and their `when` clause hides them until a corpus is selected.
 */
import { z } from 'zod';
import { defineCommand, err } from 'acture';
import { api } from '@/api/client';
import { useAppStore } from '@/state/store';
import { runOp } from './op';

/** True when a corpus is selected — the availability gate for query commands. */
const corpusSelected = (ctx: Record<string, unknown>): boolean =>
  Boolean(ctx.corpusId);

/** Run a semantic search against the selected corpus. */
export const searchCommand = defineCommand({
  id: 'app.search.run',
  title: 'Search corpus',
  description: 'Run a semantic search against the selected corpus.',
  category: 'Search',
  icon: '🔍',
  defaultScore: 90,
  when: corpusSelected,
  params: z.object({
    query: z.string().describe('The natural-language search query.'),
    limit: z
      .number()
      .int()
      .min(1)
      .max(50)
      .optional()
      .describe('Maximum number of results (default 10).'),
  }),
  execute: (params, ctx) => {
    const corpusId = ctx.corpusId as string | undefined;
    if (!corpusId) return Promise.resolve(err('no_corpus', 'No corpus selected.'));
    return runOp(
      'Searching…',
      () =>
        api.search({
          corpus_id: corpusId,
          query: params.query,
          limit: params.limit,
        }),
      (searchResults) => ({
        searchResults,
        lastQuery: params.query,
        activeSurface: 'search',
      }),
    );
  },
});

/** Project & cluster the selected corpus into a 2-D map. */
export const exploreCommand = defineCommand({
  id: 'app.corpus.explore',
  title: 'Explore corpus map',
  description: 'Project and cluster the selected corpus into a 2-D map.',
  category: 'Explore',
  icon: '🗺️',
  defaultScore: 80,
  keybinding: '$mod+e',
  when: corpusSelected,
  execute: (_params, ctx) => {
    const corpusId = ctx.corpusId as string | undefined;
    if (!corpusId) return Promise.resolve(err('no_corpus', 'No corpus selected.'));
    // k-means needs n_clusters ≤ n_segments; clamp to the corpus size.
    const corpus = useAppStore
      .getState()
      .corpora.find((c) => c.corpus_id === corpusId);
    const nClusters = Math.max(2, Math.min(8, corpus?.n_segments ?? 8));
    return runOp(
      'Building corpus map…',
      () => api.exploreCorpus({ corpus_id: corpusId, dims: 2, n_clusters: nClusters }),
      (exploreResult) => ({ exploreResult, activeSurface: 'explore' }),
    );
  },
});

/** Retrieve ranked segments — the context shape for an external RAG/agent. */
export const retrieveCommand = defineCommand({
  id: 'app.rag.retrieve',
  title: 'Retrieve context (RAG)',
  description:
    'Retrieve ranked segments from the selected corpus — the shape to hand to an external RAG or agent.',
  category: 'RAG',
  icon: '📎',
  defaultScore: 70,
  when: corpusSelected,
  params: z.object({
    query: z.string().describe('The query to retrieve context for.'),
    limit: z
      .number()
      .int()
      .min(1)
      .max(50)
      .optional()
      .describe('Maximum number of segments (default 10).'),
  }),
  execute: (params, ctx) => {
    const corpusId = ctx.corpusId as string | undefined;
    if (!corpusId) return Promise.resolve(err('no_corpus', 'No corpus selected.'));
    return runOp(
      'Retrieving…',
      () =>
        api.retrieve({
          corpus_id: corpusId,
          query: params.query,
          limit: params.limit,
        }),
      (retrieveResults) => ({
        retrieveResults,
        lastQuery: params.query,
        activeSurface: 'rag',
      }),
    );
  },
});
