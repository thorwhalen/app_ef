/**
 * `runOp` — uniform busy / error handling for command handlers.
 *
 * Shared by the corpus and query commands. Kept in its own module so the
 * command files and the registry never form an import cycle.
 */
import { ok, err } from 'acture';
import type { Result } from 'acture';
import { ApiError } from '@/api/client';
import { useAppStore } from '@/state/store';
import type { AppState } from '@/state/store';

/**
 * Run a backend operation with uniform lifecycle handling: set `busy` for
 * the duration, apply `onSuccess` state on success, and convert any failure
 * into an acture `err` result plus a user-facing error `notice`.
 */
export async function runOp<R>(
  busyLabel: string,
  operation: () => Promise<R>,
  onSuccess: (result: R) => Partial<AppState>,
): Promise<Result<R>> {
  useAppStore.setState({ busy: busyLabel, notice: null });
  try {
    const result = await operation();
    useAppStore.setState({ ...onSuccess(result), busy: null });
    return ok(result);
  } catch (e) {
    const message =
      e instanceof ApiError || e instanceof Error ? e.message : String(e);
    useAppStore.setState({ busy: null, notice: { kind: 'error', message } });
    return err('api_error', message);
  }
}
