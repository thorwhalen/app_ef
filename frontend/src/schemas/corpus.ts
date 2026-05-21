/**
 * The zodal collection for corpora.
 *
 * `CorpusInfo` is declared once as a Zod schema; `defineCollection` infers
 * the table affordances (columns, titles, searchable fields) from it. The
 * corpus table UI (`CorpusTable`) is generated from this single declaration
 * via `@zodal/ui`'s `toColumnDefs` + the `@zodal/ui-shadcn` renderer set.
 */
import { z } from 'zod';
import { defineCollection } from '@zodal/core';

/** The shape of a corpus row — mirrors `ef.service.CorpusInfo`. */
export const CorpusSchema = z.object({
  corpus_id: z.string(),
  n_sources: z.number().int(),
  n_segments: z.number().int(),
  embedder: z.string(),
  dim: z.number().int(),
  config_id: z.string(),
});

/**
 * The zodal collection definition. Field titles and the long-hash
 * truncation are the only overrides; everything else is inferred.
 */
export const corpusCollection = defineCollection(CorpusSchema, {
  fields: {
    corpus_id: { title: 'Corpus', searchable: true },
    n_sources: { title: 'Sources' },
    n_segments: { title: 'Segments' },
    embedder: { title: 'Embedder', searchable: true },
    dim: { title: 'Dim' },
    config_id: { title: 'Config', truncate: 10, tooltip: true },
  },
});
