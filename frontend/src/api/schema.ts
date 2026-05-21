/**
 * TypeScript contracts for the app_ef backend (qh-over-`ef.EfService`).
 *
 * **Generated, not hand-written.** The names below are thin aliases over
 * `openapi.d.ts`, which `openapi-typescript` generates from `openapi.json` —
 * the backend's OpenAPI document. `qh` derives that document's request /
 * response JSON Schema from `ef.service.EfService`'s Python type hints, so
 * these types track the backend automatically.
 *
 * To refresh after a backend API change:
 * ```sh
 * cd backend  && python export_openapi.py   # refresh src/api/openapi.json
 * cd frontend && pnpm gen:api               # regenerate src/api/openapi.d.ts
 * ```
 *
 * The backend exposes seven `POST /<method>` endpoints whose JSON body is a
 * flat object of the underlying Python function's parameters.
 */
import type { components, paths } from './openapi';

// ── Response shapes ────────────────────────────────────────────────────────

/** A JSON-friendly summary of one registered corpus (`ef.service.CorpusInfo`). */
export type CorpusInfo = components['schemas']['CorpusInfo'];

/** One indexed text segment (`ef.segments.Segment`). */
export type Segment = components['schemas']['Segment'];

/** One ranked search result — segment + score + source (`ef.source_manager.SearchHit`). */
export type SearchHit = components['schemas']['SearchHit'];

/** A projected & clustered corpus map (`ef.exploration.ExploreResult`). */
export type ExploreResult = components['schemas']['ExploreResult'];

// ── Request bodies ─────────────────────────────────────────────────────────

/** The `application/json` body of an endpoint's `POST` request. */
type JsonRequestBody<P extends keyof paths> = paths[P]['post'] extends {
  requestBody: { content: { 'application/json': infer B } };
}
  ? B
  : never;

/** Body of `POST /create_corpus`. */
export type CreateCorpusBody = JsonRequestBody<'/create_corpus'>;

/** Body of `POST /search` and `POST /retrieve` (identical shape). */
export type QueryBody = JsonRequestBody<'/search'>;

/** Body of `POST /explore_corpus`. */
export type ExploreBody = JsonRequestBody<'/explore_corpus'>;
