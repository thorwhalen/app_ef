# app_ef frontend

A semantic-search corpus UI for `ef`, built on the embeddings group's
TypeScript packages:

- **acture** — the command-dispatch layer. Every user operation is one
  `defineCommand`; the ⌘K command palette, keyboard shortcuts, and the
  Assistant's AI tool calling are all projections of that single registry.
- **zodal** — schema-driven UI. The corpus table's columns and cell
  renderers are inferred from one Zod schema.

It talks to the `app_ef` backend (`qh` over `ef.service.EfService`) — see
[`../backend`](../backend).

## Surfaces

- **Corpora** — create, list, select and delete corpora.
- **Search** — the headline surface: semantic search over the selected corpus.
- **Explore** — a 2-D projected & clustered corpus map.
- **RAG plug-in** — retrieve ranked context segments, plus how to call the
  same endpoint from an external LLM / agent.
- **Assistant** — an AI chat that operates the app through the command
  registry and answers questions grounded in retrieved context.

## Run it

1. Start the backend (from the repo root) — its documented default port is
   `8000`:

   ```bash
   cd backend && uvicorn app.main:app --reload
   ```

2. Start the frontend:

   ```bash
   cd frontend
   pnpm install
   pnpm dev          # serves on http://localhost:5173
   ```

3. Open <http://localhost:5173>.

If the backend runs on a non-default port, copy `.env.example` to
`.env.local` and set `VITE_API_BASE_URL`.

## Architecture

| Layer | Where | Role |
|---|---|---|
| API client | `src/api/` | typed `fetch` wrapper over the 7 backend endpoints |
| State | `src/state/store.ts` | one zustand store — the app's render state |
| Commands | `src/commands/` | acture `defineCommand`s — every operation, once |
| Assistant | `src/assistant/` | the LLM agent loop — projects the registry as AI tools via `acture-ai-vercel` |
| Schema | `src/schemas/corpus.ts` | the zodal collection for the corpus table |
| UI | `src/surfaces/`, `src/components/` | React 19 + Tailwind + shadcn-style components |

Every user operation is dispatched through the acture registry
(`registry.dispatch(id, params, ctx)`). The surface forms, the ⌘K palette, the
keyboard shortcuts, and the Assistant's AI tool calls are all just *dispatch
surfaces* over that one registry — no scattered `onClick` logic.

The **Assistant** runs the LLM call **directly in the browser** (the Vercel AI
SDK with an OpenAI key the user pastes into the UI and that is kept only in
`localStorage`). `acture-ai-vercel`'s `toAITools` projects the registry as the
model's tools; each tool call routes back through `registry.dispatch`.

## zodal is local-linked

acture is installed from npm. **zodal is consumed from local source** via
`link:` dependencies in `package.json` (`@zodal/core`, `@zodal/ui`,
`@zodal/store`, `@zodal/ui-shadcn`) — zodal is at `0.1.x` and co-evolves with
this app, so its fixes are picked up without a publish cycle. The `link:`
paths are relative to the standard ecosystem layout (`i/_zodals/…` under the
projects folder). To use published zodal instead, swap the `link:` specifiers
for version ranges.

`vite.config.ts` sets `resolve.dedupe` so the linked packages share this
app's single copy of React and zod.

## Tech

React 19 · Vite 6 · TypeScript · Tailwind CSS 3 · zustand 5 · Vercel AI SDK 4 · pnpm.
