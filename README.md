# app_ef

A web app for **semantic search over text corpora** — a UI over the
[`ef`](https://github.com/thorwhalen/ef) embedding-search facade.

Create a corpus, index it, and search it by meaning. `app_ef` is
**presentation only**: every embedding, indexing and search operation lives in
`ef`. `app_ef` is a thin FastAPI transport plus a React UI over it.

## What it does

- **Corpora** — create, list, select and delete corpora.
- **Search** — the headline surface: semantic search over the selected corpus,
  with ranked, scored results.
- **Explore** — a 2-D projected & clustered map of the corpus.
- **RAG plug-in** — retrieve ranked context segments, plus the recipe for
  calling the same endpoint from an external LLM / agent. `app_ef` does not
  synthesize answers — that is the consuming application's job.

## Architecture

```
React + TypeScript frontend  (frontend/)
        │  typed fetch; TS types generated from the OpenAPI spec
        ▼
FastAPI backend  (backend/)  — thin HTTP transport
        │  qh.mk_app() derives routes + schema from type hints
        ▼
ef.service.EfService  — all embedding / indexing / search logic
```

The backend is the *whole* of `backend/app/main.py`: one `EfService` per
process, its seven JSON-friendly methods handed to `qh.mk_app()`, which derives
the HTTP routes and OpenAPI schema from their type hints. No database and no
auth — corpora are in-memory and per-process, so a server restart drops them.

`ef` and `qh` are local editable installs (the *embeddings* package group);
they are never `pip install`ed.

## Run it

Two processes — backend, then frontend.

**Backend** (Python 3.10+, with `ef`, `qh`, `fastapi` and `uvicorn`
available):

```bash
cd backend
uvicorn app.main:app --reload      # http://localhost:8000  (/docs for the API)
```

For real semantic search, set `OPENAI_API_KEY` before starting — new corpora
then default to `openai:text-embedding-3-small`. Without a key the backend
still runs, but falls back to the dependency-free `hashing` embedder (which
matches word overlap, not meaning) and warns loudly. Set `APP_EF_EMBEDDER` to
choose any other embedder `ef` resolves.

**Frontend** (Node 18+ and pnpm):

```bash
cd frontend
pnpm install
pnpm dev                           # http://localhost:5173
```

See [`frontend/README.md`](frontend/README.md) for the frontend architecture
(`acture` command dispatch, `zodal` schema-driven UI, the local-linked `zodal`
packages).

## Configuration

Backend environment variables:

| Variable | Purpose | Default |
|---|---|---|
| `OPENAI_API_KEY` | enables `openai:text-embedding-3-small` as the default embedder for new corpora | — |
| `APP_EF_EMBEDDER` | explicit embedder override — any string `ef`'s DI seam resolves | auto-resolved |
| `APP_EF_CORS_ORIGINS` | comma-separated CORS origin allowlist | `localhost:5173`, `localhost:3000` |

## API contract

The frontend's API types are **generated**, not hand-written: `qh` derives a
complete OpenAPI document from `EfService`'s Python type hints, so that
document is the single source of truth. After any backend API change, refresh
the contract:

```bash
cd backend && python export_openapi.py     # writes frontend/src/api/openapi.json
cd frontend && pnpm gen:api                # regenerates the TypeScript types
```

## Tests

```bash
cd backend && PYTHONPATH=. pytest          # offline — tests pin the hashing embedder
```

## Status

`app_ef` has no users yet and is free to be reshaped — treat the current code
as a starting point, not a fixed contract. Container deployment is not set up;
the dev workflow is the two processes above. For design direction see
[`.claude/CLAUDE.md`](.claude/CLAUDE.md) and
[`misc/docs/app_ef_notes.md`](misc/docs/app_ef_notes.md).
