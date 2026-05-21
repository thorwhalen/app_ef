/**
 * The app_ef backend client — a thin typed `fetch` wrapper.
 *
 * The backend is `qh.mk_app()` over `ef.service.EfService`: seven
 * `POST /<method>` endpoints whose JSON body is a flat object of the Python
 * function's parameters. This module is the app's single data-access layer;
 * the acture command handlers call through it. It deliberately holds no
 * state and no orchestration — all logic lives in `ef` (group policy).
 */
import type {
  CorpusInfo,
  CreateCorpusBody,
  ExploreBody,
  ExploreResult,
  QueryBody,
  SearchHit,
  Segment,
} from './schema';

/** Base URL of the backend. Override with `VITE_API_BASE_URL` (see `.env`). */
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000';

/**
 * An error raised when the backend returns a non-2xx response. `status` is
 * the HTTP status; `message` is the backend's `detail` when it sent one,
 * otherwise a generic description.
 */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** Extract a human-readable message from a failed response body. */
async function errorMessage(res: Response): Promise<string> {
  try {
    const body: unknown = await res.json();
    if (body && typeof body === 'object' && 'detail' in body) {
      const detail = (body as { detail: unknown }).detail;
      if (typeof detail === 'string') return detail;
      return JSON.stringify(detail);
    }
  } catch {
    /* body was not JSON — fall through to the status text */
  }
  return res.statusText || `HTTP ${res.status}`;
}

/** POST a JSON body to `path` and decode the JSON response as `T`. */
async function post<T>(path: string, body: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    throw new ApiError(
      `Cannot reach the backend at ${API_BASE_URL}. Is it running?`,
      0,
    );
  }
  if (!res.ok) {
    throw new ApiError(await errorMessage(res), res.status);
  }
  return res.json() as Promise<T>;
}

/**
 * The seven backend operations, typed. Corpus lifecycle (`createCorpus`,
 * `listCorpora`, `corpusInfo`, `deleteCorpus`) plus the query operations
 * (`search`, `retrieve`, `exploreCorpus`).
 */
export const api = {
  /** Index documents into a new corpus. */
  createCorpus: (body: CreateCorpusBody) =>
    post<CorpusInfo>('/create_corpus', body),

  /** List every registered corpus. */
  listCorpora: () => post<CorpusInfo[]>('/list_corpora', {}),

  /** Summary of one corpus. */
  corpusInfo: (corpus_id: string) =>
    post<CorpusInfo>('/corpus_info', { corpus_id }),

  /** Drop a corpus, releasing its index. */
  deleteCorpus: (corpus_id: string) =>
    post<null>('/delete_corpus', { corpus_id }),

  /** Ranked search hits (segment + score + source). */
  search: (body: QueryBody) => post<SearchHit[]>('/search', body),

  /** Ranked segments — the RAG-context shape (score dropped). */
  retrieve: (body: QueryBody) => post<Segment[]>('/retrieve', body),

  /** Project & cluster a corpus into a 2-D map. */
  exploreCorpus: (body: ExploreBody) =>
    post<ExploreResult>('/explore_corpus', body),
};
