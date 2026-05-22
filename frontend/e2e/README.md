# app_ef end-to-end tests

End-to-end tests for the app_ef frontend, built on
[`acture-e2e-playwright`](https://npm.im/acture-e2e-playwright) and
[Playwright](https://playwright.dev).

This is app_ef's **e2e testing** consumer surface — the fifth dispatch surface
over acture's command registry, after the registry itself, the ⌘K palette, the
keyboard shortcuts, and the AI assistant. The principle (acture journal §3.7):
**an e2e test is a macro with assertions** — a sequence of
`{ commandId, params }` steps replayed through `registry.dispatch`, the same
path every other surface uses, with `assert` steps interleaved.

## How it works

- **The page bridge** (`src/e2e/bridge.ts`) exposes the command registry on
  `window.__actureRegistry` in a **DEV build only**. `acture-e2e-playwright`'s
  `dispatchInPage` talks to it. The bridge injects the live app context
  (`appContext()`) so corpus-dependent commands resolve correctly — see the
  module docstring.
- **The backend is mocked** (`_support/backend.ts`). The Python `qh`-over-`ef`
  service is *not* started; every backend call is intercepted with
  `page.route`. The suite is hermetic and asserts the *frontend*'s behaviour.
- **The dev server** is started automatically by Playwright (`webServer` in
  `playwright.config.ts`), because the bridge is DEV-only.

## Running

```sh
pnpm exec playwright install chromium   # one-time: fetch the browser
pnpm test:e2e                           # run the suite
pnpm test:e2e:ui                        # the Playwright UI runner
pnpm typecheck:e2e                      # type-check the e2e sources
```

## Layout

| File | What it covers |
|------|----------------|
| `smoke.spec.ts` | app boots, the bridge is installed, ⌘K opens the palette |
| `commands.spec.ts` | every command is registered; `when`-gating; a clean dispatch |
| `corpus-flow.spec.ts` | create → search, as a command macro *and* through the UI |
| `_support/backend.ts` | the `page.route` backend mock |

## Out of scope (for now)

This suite mocks the backend. A suite that exercises the **real `ef`
pipeline** end-to-end would stand the Python service up instead — deferred
until there is a concrete need. Per the `acture-e2e` skill: no DAG/branching
sequences, no parallel steps — a linear `{ commandId, params }` sequence
covers the overwhelming majority of e2e tests.
