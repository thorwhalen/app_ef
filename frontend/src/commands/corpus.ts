/**
 * Corpus-lifecycle commands: create, select, delete.
 *
 * Each user-facing operation is one `defineCommand`. The command palette,
 * keyboard shortcuts, and (later) AI tool calling all project from these
 * definitions — see the acture architecture primer.
 */
import { z } from 'zod';
import { defineCommand, ok } from 'acture';
import { api } from '@/api/client';
import { useAppStore } from '@/state/store';
import { runOp } from './op';

/** Index a set of documents into a new corpus. */
export const createCorpusCommand = defineCommand({
  id: 'app.corpus.create',
  title: 'Create corpus',
  description: 'Index a set of text documents into a new searchable corpus.',
  category: 'Corpus',
  icon: '➕',
  defaultScore: 100,
  params: z.object({
    sources: z
      .array(z.string())
      .describe('The documents to index — one string per document.'),
    corpusId: z
      .string()
      .optional()
      .describe('Optional handle for the corpus; a random id is used if omitted.'),
    embedder: z
      .string()
      .optional()
      .describe(
        "Optional embedder id (e.g. 'openai:text-embedding-3-small'); the server's default is used when omitted.",
      ),
  }),
  execute: (params) =>
    runOp(
      'Creating corpus…',
      async () => {
        const created = await api.createCorpus({
          sources: params.sources,
          corpus_id: params.corpusId,
          embedder: params.embedder,
        });
        const corpora = await api.listCorpora();
        return { created, corpora };
      },
      ({ created, corpora }) => ({
        corpora,
        selectedCorpusId: created.corpus_id,
        activeSurface: 'corpora',
        notice: {
          kind: 'success',
          message: `Corpus "${created.corpus_id}" indexed — ${created.n_segments} segments.`,
        },
      }),
    ),
});

/** Choose the corpus the query surfaces act on. */
export const selectCorpusCommand = defineCommand({
  id: 'app.corpus.select',
  title: 'Select corpus',
  description: 'Choose the corpus that Search, Explore and RAG act on.',
  category: 'Corpus',
  icon: '◎',
  params: z.object({
    corpusId: z.string().describe('The corpus to select.'),
  }),
  execute: (params) => {
    useAppStore.setState({ selectedCorpusId: params.corpusId });
    return ok(params.corpusId);
  },
});

/** Drop a corpus and release its index. */
export const deleteCorpusCommand = defineCommand({
  id: 'app.corpus.delete',
  title: 'Delete corpus',
  description: 'Drop a corpus and release its index.',
  category: 'Corpus',
  icon: '🗑️',
  params: z.object({
    corpusId: z.string().describe('The corpus to delete.'),
  }),
  execute: (params) =>
    runOp(
      'Deleting corpus…',
      async () => {
        await api.deleteCorpus(params.corpusId);
        return api.listCorpora();
      },
      (corpora) => {
        const stillSelected =
          useAppStore.getState().selectedCorpusId === params.corpusId
            ? null
            : useAppStore.getState().selectedCorpusId;
        return {
          corpora,
          selectedCorpusId: stillSelected,
          notice: {
            kind: 'success',
            message: `Corpus "${params.corpusId}" deleted.`,
          },
        };
      },
    ),
});
