# CLAUDE.md — `app_ef`

> Design notes for `app_ef`. Distilled 2026-05-20 from the semantic-search deep
> research. Full notes: [`misc/docs/app_ef_notes.md`](../misc/docs/app_ef_notes.md).
> When developed as part of the embeddings package group, see also that group's
> `semantic_search_design_notes.md` for cross-package architecture.

---

## 1. What `app_ef` is

`app_ef` is **only a UI over `ef`**. The hard rule (group policy): *all logic
lives in `ef`; `app_ef` is presentation only.* `ef` is the backend; the two
evolve together. If a UI needs a capability, build that capability in `ef`
(cleanly, interface-first) and let `app_ef` consume it — never inline logic in
`app_ef`.

`app_ef` is **free to change / can be completely redone** — no users yet.

## 2. Current state vs. target

**Current `app_ef`** is a FastAPI + React/TypeScript app built over the *old*
`ef` — the embedding **visualization pipeline**. Its surfaces (`projects`,
`sources`, `pipelines`, `components`, `results`, scatter-plot viz) mirror old
`ef`'s `segment → embed → planarize → cluster` structure.

**`ef` is being refactored** into a semantic-search / RAG / corpus-indexing
facade (see `ef`'s `.claude/CLAUDE.md`). `app_ef` **must follow that refactor.**
The visualization surface becomes *one secondary view* ("explore the corpus"),
not the centre of the app. The new centre is: define a corpus → index it →
search it → (optionally) plug into RAG → keep it fresh.

Treat the current `app_ef` code as a starting point to be reshaped, not a fixed
contract.

## 3. Target UI surfaces (mirror `ef`'s journeys)

| Surface | Backs onto `ef` |
|---|---|
| **Corpus management** | define a corpus from a source `Mapping` (filesystem upload, URLs, paste) |
| **Index / pipeline config** | pick segmenter + embedder + index params; register configs |
| **Search** | the headline surface — query box, filters, ranked results |
| **Refresh / freshness** | show the four staleness conditions; trigger explicit refresh |
| **Explore** (secondary) | the planarize/cluster/label scatter-plot view (old `app_ef`'s core, demoted) |
| **RAG plug-in** | expose a corpus's `retrieve()` as a tool/endpoint for an external LLM/agent |

## 4. How `app_ef` should talk to `ef`

Per group policy:

- **`qh`** — facade over FastAPI. Use `qh` to turn `ef` Python functions into
  HTTP services. Do **not** hand-roll FastAPI routes that re-implement `ef`
  logic; the current `backend/app/api/v1/*` should migrate toward `qh`-generated
  endpoints with `backend/app/core/ef_wrapper.py` thinned to near-nothing.
- **`ju`** — JSON / JSON-Schema / OpenAPI utilities. Use `ju` to parse the
  OpenAPI spec that `qh` produces, so the frontend's API client and types are
  *derived* from the spec, not hand-written.

## 5. Frontend — use the group's TS packages

- **`acture`** — the command-dispatch layer. Every user-triggerable operation
  (`search`, `index-corpus`, `refresh`, `add-source`, `switch-backend`,
  `export`, `re-embed`) is defined **once** as a schema-described command; the
  command palette, keyboard shortcuts, AI tool calls, MCP tools, macros, e2e
  test actions, and telemetry all fall out of that one definition. Do not
  scatter ad-hoc `onClick` handlers.
- **`zodal`** — schema-driven (Zod v4) storage & UI. Declare the document /
  segment / metadata / search-result shapes once as Zod schemas; derive the
  search form, metadata filters, the results table, and the API interface from
  them. Use `zodal` anywhere the frontend touches storage, calls APIs, or builds
  forms/collections/tables.

## 6. Client-side-first option (future track)

Research (report 08) establishes that browser-side semantic search is the same
pipeline on a different substrate. The recommended end state:

- A TypeScript sibling of `vd`, **`vd-js`** (`@vd/core`), mirrors `vd`'s
  `Document`/`Client`/`Collection`/`SearchResult` contracts, with browser
  adapters (transformers.js embedder in a Web Worker; EdgeVec / hnswlib-wasm /
  voy / Orama indexes).
- `app_ef` **defaults to client-side embedding + search** (privacy, zero server
  cost, instant) with a **remote fallback** to `ef`-over-HTTP. The toggle is
  "which embedder / collection adapter", not a code fork — mirror the
  Vercel-AI-SDK swappable-provider pattern.
- For corpora over a few thousand docs, use the **binary-quantization + FP32
  rescore** pipeline; surface model-download progress and a storage-quota
  warning in the UI.

This is a future track — recorded so the architecture stays compatible. It is
not part of the immediate work; the immediate work is following `ef`'s refactor.

## 7. Conventions

- `app_ef` contains **no embedding / search / indexing logic** — only UI and the
  thin `qh`/`ju` wiring to `ef`.
- Backend Python: follow the user's global CLAUDE.md.
- Frontend: declarative / schema-based (the user prefers Zod / zustand / immer /
  shadcn); the user is a frontend novice — explain JS/TS decisions clearly.
- The root-level planning docs that described the *old* visualization-pipeline
  design were removed (2026-05-22) — they documented an app that was never
  built. The current, accurate docs are: this file and
  `misc/docs/app_ef_notes.md` (design direction), plus `README.md` and
  `frontend/README.md` (the app as actually built).
