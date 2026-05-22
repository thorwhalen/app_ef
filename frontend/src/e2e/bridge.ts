/**
 * The e2e page bridge — exposes the acture command registry on `window`
 * so end-to-end tests can dispatch commands into a live page.
 *
 * This is app_ef's *e2e testing* consumer surface (acture's fifth dispatch
 * surface here, after the registry, the ⌘K palette, the hotkeys, and the
 * AI assistant). An e2e test is "a macro with assertions": a sequence of
 * `{ commandId, params }` steps replayed through `registry.dispatch` — the
 * same path every other surface uses. The test framework binding lives in
 * `frontend/e2e/`; this module is the in-page half it talks to.
 *
 * **DEV-only.** `installE2EBridge` is called from `main.tsx` behind an
 * `import.meta.env.DEV` guard, so the bridge is never present in a
 * production bundle — exposing the registry on `window` is a test
 * affordance, not a shipped API surface.
 *
 * **Context injection.** The exposed object is registry-shaped, but its
 * `dispatch` injects the live app context (`appContext()`) whenever a
 * caller omits it. Every real dispatch site in app_ef — the palette, the
 * hotkeys, the surface forms — passes that context; the in-page bridge
 * (`acture-e2e-playwright`'s `dispatchInPage`) has no context channel.
 * Without the injection, the corpus-dependent query commands
 * (`app.search.run`, `app.corpus.explore`, `app.rag.retrieve`) would
 * always fail their `when` clause and the bridge could not drive the real
 * app at all. An explicitly-passed context still wins.
 */
import type { Context, DispatchOptions, Registry, Result } from 'acture';
import { registry } from '@/commands/registry';
import { appContext } from '@/state/store';

/** The `window` key the bridge installs on. Mirrors the default
 *  `registryKey` that `acture-e2e-playwright` reads (`playwright.config.ts`
 *  may override it). */
export const E2E_REGISTRY_KEY = '__actureRegistry';

declare global {
  interface Window {
    /** The e2e command bridge — present only in a DEV build. */
    __actureRegistry?: Registry;
  }
}

/**
 * Install the command bridge on `window.__actureRegistry`. Idempotent —
 * a re-install (e.g. a Vite HMR reload) simply replaces the reference.
 * Call only from a DEV build.
 */
export function installE2EBridge(): void {
  /** `registry.dispatch`, but defaulting `ctx` to the live `appContext()`. */
  const dispatchWithContext = (
    id: string,
    params?: unknown,
    ctx?: Context,
    options?: DispatchOptions,
  ): Promise<Result<unknown>> =>
    registry.dispatch(id, params, ctx ?? appContext(), options);

  window.__actureRegistry = {
    ...registry,
    dispatch: dispatchWithContext as Registry['dispatch'],
  };
}
