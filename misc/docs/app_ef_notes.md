# `app_ef` — Design Notes (research distillation)

> Notes for reshaping `app_ef` to follow `ef`'s refactor into a semantic-search
> / RAG / corpus-indexing facade. Distilled 2026-05-20 from the deep research in
> `embeddings/docs/research/semantic_search/` (esp. doc 08, Client-Side AI
> Vector Search). Companion: [`../../.claude/CLAUDE.md`](../../.claude/CLAUDE.md).

---

## 1. The premise

`app_ef` is **only a UI over `ef`**. It has no users yet and may be completely
redone. `ef` is being refactored from an embedding-*visualization* pipeline into
a semantic-**search / RAG / corpus-indexing** facade — `app_ef` must follow.
Logic lives in `ef`; `app_ef` is presentation + thin wiring only.

## 2. The UI surfaces the new `ef` implies

The new `ef` journey is: **define a corpus → index it → search it → keep it
fresh → (optionally) plug into RAG → explore it**. The UI should be organized
around exactly that:

1. **Corpus** — create a corpus from a source `Mapping`: filesystem upload,
   pasted text, URLs, a connected store. List sources, see counts.
2. **Index config** — pick segmenter (recursive / markdown / semantic / …),
   embedder (provider model or local), index/backend params. Register named
   configs; config branching is cheap in `ef`, so support multiple configs per
   corpus.
3. **Search** — the headline surface. Query box; metadata filters; ranked
   results with score, text, source, metadata; result actions ("more like
   this", open source).
4. **Freshness** — show the four staleness conditions (orphan / missing / stale
   / misconfigured); a one-click explicit refresh; optionally a live indicator
   when auto-refresh detects changes.
5. **Explore** (secondary) — the planarize/cluster/label scatter-plot view. This
   was the *centre* of the old `app_ef`; in the new design it is one tab, fed by
   `ef`'s L5 "explore the corpus" surface.
6. **RAG plug-in** — surface a corpus's `retrieve()` as something an external
   LLM/agent can call (an endpoint, an MCP tool).
7. **Assistant** — an in-app AI chat that operates `app_ef` through the command
   registry (acture's AI tool-calling surface) and answers questions grounded
   in retrieved context. See §6 on answer synthesis.

## 3. Backend wiring — `qh` + `ju`

The current `backend/app/` hand-rolls FastAPI routes and an `ef_wrapper.py`.
Target:

- Use **`qh`** (FastAPI facade) to turn `ef` functions directly into HTTP
  services — the route layer should be generated, not hand-written.
- Use **`ju`** to parse the OpenAPI spec `qh` produces, and derive the
  frontend's API client + TypeScript types from it (single source of truth).
- `ef_wrapper.py` should shrink toward nothing — any logic in it is a signal
  that the capability belongs in `ef`.

## 4. Frontend wiring — `acture` + `zodal`

- **`acture`** — define every user-triggerable operation once as a
  schema-described **command**: `search`, `index-corpus`, `add-source`,
  `refresh`, `switch-backend`, `re-embed`, `export-index`, `clear-index`. The
  command palette, keyboard shortcuts, AI tool calls, MCP tools, macros, e2e
  test actions and telemetry then all derive from that one definition. No
  scattered `onClick` handlers duplicating logic.
- **`zodal`** — declare the document / segment / metadata / search-result shapes
  once as Zod v4 schemas; derive the search form, metadata-filter controls, the
  results table, and the API interface from them. Use `zodal` anywhere the
  frontend touches storage, calls APIs, or builds forms/collections/tables.

## 5. Client-side search — the future track

Browser-side semantic search is **the same pipeline on a different substrate**,
not a new abstraction. The recommended end state for `app_ef`:

- A TypeScript sibling of `vd`, **`vd-js`** (`@vd/core`), mirrors `vd`'s
  `Document` / `Client` / `Collection` / `SearchResult` contracts, with browser
  adapters.
- `app_ef` **defaults to client-side embedding + search** — privacy (query text
  never leaves the device), zero server cost, instant latency — with a **remote
  fallback** to `ef`-over-HTTP. The toggle is "which embedder / collection
  adapter", not a code fork (the Vercel-AI-SDK swappable-provider pattern).

### Client-side embedding
- **transformers.js v3+** (`@huggingface/transformers`) → ONNX Runtime Web.
  `device: 'webgpu'` (fast, upfront compile latency) with **WASM-SIMD fallback**
  (instant start, CPU-bound). `dtype: 'fp16'` for WebGPU, `'q8'` for WASM.
- **Run inference in a Web Worker** — main-thread inference freezes the UI.
- Cache model weights in the Cache Storage API (enables offline); index data in
  IndexedDB. Check `navigator.storage.estimate()` before downloading.
- L2-normalize vectors so cosine = dot product.

### Browser vector stores

| Library | Index | 100K latency | Dynamic? | Quantization | Filter | Bundle |
|---|---|---|---|---|---|---|
| **Orama** | flat + inverted | ~15–30 ms | yes | none | rich nested | <2 KB |
| **hnswlib-wasm** | HNSW | ~1.5–3 ms | yes | none | no | ~150 KB |
| **EdgeVec** | HNSW + flat | ~329 µs | yes + soft-delete | SQ8 + BQ | SQL-like | ~227 KB |
| **Voy** | k-d tree | ~8–12 ms | **no (immutable)** | none | no | ~75 KB |

Pick by corpus size: **Orama** (<~5K, hybrid text+vector, tiny bundle) →
**hnswlib-wasm / EdgeVec** (10K–100K, EdgeVec if you need quantization +
filtering). For corpora over a few thousand docs use **binary quantization +
FP32 rescore**: Hamming search over the 1-bit index → oversampled candidate pool
→ exact cosine rerank from IndexedDB → recall back above ~95%, 32× smaller index.

### UI obligations for client-side
- Explicit lifecycle state (`loading` / `downloading` / `ready` / `error`) +
  model-download progress bar.
- Storage-quota check + warning before downloading a model.
- Graceful WebGPU → WASM degradation (same code path, slower).

## 6. What `app_ef` must NOT do

- No embedding / segmentation / search / indexing logic — all of that is `ef`'s.
- Answer synthesis is allowed **only** in the Assistant surface, and only
  grounded in what `ef`'s `retrieve` / `search` tools returned. Every other
  surface shows retrieved results without synthesizing. *(This deliberately
  relaxes the original "no answer synthesis" rule — 2026-05-22 decision: the
  Assistant is an in-app RAG agent, not just a results viewer.)*
- No hand-rolled API route logic that duplicates `ef` — route layer is
  `qh`-generated.
- No scattered per-component operation handlers — operations are `acture`
  commands.

## 7. Status

This is a **forward-looking** note. The immediate dependency is `ef`'s refactor;
`app_ef` work should track it. The client-side / `vd-js` track is explicitly
future — recorded here so `app_ef`'s architecture is kept compatible with it.
