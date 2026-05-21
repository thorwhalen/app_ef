/**
 * TypeScript contracts for the app_ef backend (qh-over-`ef.EfService`).
 *
 * These are **hand-written and verified against the live API**, not generated.
 * `qh`'s OpenAPI document (`/openapi.json`) currently exposes the routes and
 * docstrings but emits empty `{}` request/response schemas and no
 * `components.schemas` — so `openapi-typescript` would produce no useful
 * types. Each interface below was confirmed by probing the running backend
 * (see PR notes / issue #5). If `qh` later derives full JSON Schema from the
 * Python type hints, this file can be regenerated from the spec.
 *
 * The backend exposes seven `POST /<method>` endpoints whose JSON body is a
 * flat object of the underlying Python function's parameters.
 */

// ── Response shapes ────────────────────────────────────────────────────────

/** A JSON-friendly summary of one registered corpus (`ef.service.CorpusInfo`). */
export interface CorpusInfo {
  /** The registry handle — how every other endpoint addresses the corpus. */
  corpus_id: string;
  /** Number of source documents. */
  n_sources: number;
  /** Number of indexed segments (sources cut by the segmenter). */
  n_segments: number;
  /** The embedder's model id, e.g. `"hashing:v1@512"`. */
  embedder: string;
  /** Embedding dimensionality. */
  dim: number;
  /** Content hash of the segmenter+embedder pipeline. */
  config_id: string;
}

/** One indexed text segment (`ef.segments.Segment`). */
export interface Segment {
  /** The segment text. */
  text: string;
  /** Stable content-hash id of the segment. */
  id: string;
  /** Character offset of the segment's start within its source. */
  start: number;
  /** Character offset of the segment's end within its source. */
  end: number;
  /** The segment's position among its source's segments. */
  index: number;
  /** Approximate token count. */
  tokens: number;
  /** Free-form metadata (tokenizer, source id when retrieved, …). */
  metadata: Record<string, unknown>;
}

/** One ranked search result (`ef.source_manager.SearchHit`). */
export interface SearchHit {
  /** The matched segment. */
  segment: Segment;
  /** Similarity score — higher is closer. */
  score: number;
  /** Id of the source document the segment was cut from. */
  source_id: string;
}

/** A projected & clustered corpus map (`ef.exploration.ExploreResult`).
 *  All four arrays/maps are row-aligned by segment. */
export interface ExploreResult {
  /** Segment ids, one per point. */
  ids: string[];
  /** 2-D (or 3-D) coordinates, one `[x, y]` per point. */
  coords: number[][];
  /** Cluster index per point. */
  labels: number[];
  /** Optional `{clusterIndex: title}` — populated only when `label` is set. */
  cluster_titles: Record<string, string>;
}

// ── Request bodies ─────────────────────────────────────────────────────────

/** Body of `POST /create_corpus`. */
export interface CreateCorpusBody {
  /** The corpus — a list of text documents. */
  sources: string[];
  /** Embedder id; omit for the dependency-free hashing embedder. */
  embedder?: string;
  /** Segmenter id; omit for the recursive-character default. */
  segmenter?: string;
  /** Handle to register the corpus under; omit for a random id. */
  corpus_id?: string;
}

/** Body of `POST /search` and `POST /retrieve`. */
export interface QueryBody {
  /** The corpus to query. */
  corpus_id: string;
  /** The natural-language query. */
  query: string;
  /** Maximum number of results. */
  limit?: number;
}

/** Body of `POST /explore_corpus`. */
export interface ExploreBody {
  /** The corpus to explore. */
  corpus_id: string;
  /** Projection target dimensionality — 2 or 3. */
  dims?: number;
  /** `"auto"` | `"umap"` | `"pca"`. */
  projection_method?: string;
  /** `"kmeans"` | `"hdbscan"`. */
  cluster_method?: string;
  /** Number of k-means clusters. */
  n_clusters?: number;
  /** Name each cluster with an LLM (needs the `ef[imbed]` extra + a key). */
  label?: boolean;
}
