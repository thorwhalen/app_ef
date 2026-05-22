/**
 * The application state model — a single zustand store.
 *
 * This store is the app's one source of truth for render state. acture
 * command handlers mutate it through `useAppStore.setState`; React components
 * read it through the `useAppStore` hook. (A formal acture `StateAdapter`
 * over this store is intentionally not wired yet — it is the prerequisite
 * for the deferred undo/redo surface, not for command dispatch itself.)
 */
import { create } from 'zustand';
import type { Context } from 'acture';
import type { CorpusInfo, ExploreResult, SearchHit, Segment } from '@/api/schema';

/** The five UI surfaces. */
export type Surface = 'corpora' | 'search' | 'explore' | 'rag' | 'assistant';

/** A transient user-facing message. */
export interface Notice {
  kind: 'error' | 'success';
  message: string;
}

/**
 * One rendered entry in the assistant transcript. The model's full memory
 * (including raw tool-call / tool-result messages) lives in the engine; this
 * is the compact, display-oriented projection of it.
 */
export type TranscriptItem =
  /** A message the user sent. */
  | { kind: 'user'; text: string }
  /** Streamed model prose. `text` grows as deltas arrive. */
  | { kind: 'assistant'; text: string }
  /** A tool call the model made — a dispatch through the command registry. */
  | {
      kind: 'tool';
      /** The AI SDK tool-call id — matches a call to its result. */
      callId: string;
      /** The dispatched command's id (e.g. `app.search.run`). */
      commandId: string;
      /** The validated arguments the model supplied. */
      args: unknown;
      /** Lifecycle: in flight, succeeded, or failed. */
      status: 'running' | 'ok' | 'error';
      /** A short human-readable result summary for the chip. */
      summary: string;
    }
  /** A turn-level failure (model call or stream error). */
  | { kind: 'error'; text: string };

export interface AppState {
  /** Every registered corpus (mirror of the backend's `list_corpora`). */
  corpora: CorpusInfo[];
  /** The corpus the query surfaces act on, or `null`. */
  selectedCorpusId: string | null;
  /** Last search results, or `null` if Search has not run. */
  searchResults: SearchHit[] | null;
  /** Last RAG retrieve results, or `null`. */
  retrieveResults: Segment[] | null;
  /** Last corpus map, or `null`. */
  exploreResult: ExploreResult | null;
  /** The query text that produced the last search / retrieve results. */
  lastQuery: string;
  /** Which surface is showing. */
  activeSurface: Surface;
  /** Whether the command palette modal is open. */
  paletteOpen: boolean;
  /** Whether the create-corpus modal is open. */
  createModalOpen: boolean;
  /** Label of the in-flight operation, or `null` when idle. */
  busy: string | null;
  /** Last error / success notice, or `null`. */
  notice: Notice | null;
  /** The Assistant surface's rendered conversation. */
  assistantTranscript: TranscriptItem[];
  /** Whether an assistant turn is currently streaming. */
  assistantStreaming: boolean;
}

const initialState: AppState = {
  corpora: [],
  selectedCorpusId: null,
  searchResults: null,
  retrieveResults: null,
  exploreResult: null,
  lastQuery: '',
  activeSurface: 'corpora',
  paletteOpen: false,
  createModalOpen: false,
  busy: null,
  notice: null,
  assistantTranscript: [],
  assistantStreaming: false,
};

/** The zustand store. State-only — mutate via `useAppStore.setState`. */
export const useAppStore = create<AppState>()(() => ({ ...initialState }));

/** The currently selected corpus, or `undefined`. */
export function selectedCorpus(state: AppState): CorpusInfo | undefined {
  return state.corpora.find((c) => c.corpus_id === state.selectedCorpusId);
}

/**
 * Build the dispatch / when-clause context from current state. Every
 * dispatch site (palette, hotkeys, surface forms) passes this so that
 * corpus-dependent commands resolve their availability and their target
 * consistently.
 */
export function appContext(): Context {
  const { selectedCorpusId } = useAppStore.getState();
  return selectedCorpusId ? { corpusId: selectedCorpusId } : {};
}
