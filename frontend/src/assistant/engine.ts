/**
 * The assistant engine — the LLM agent loop that operates app_ef.
 *
 * This is the *AI tool-calling* consumer surface (acture's seventh dispatch
 * surface): app_ef's command registry is projected to Vercel AI SDK tool
 * definitions by `acture-ai-vercel`'s `toAITools`, the model calls those
 * tools, and each tool routes back through `registry.dispatch` — the same
 * path the command palette and keyboard shortcuts use. The model proposes;
 * the registry decides.
 *
 * The model call runs **in the browser** (group decision: browser-direct)
 * against an OpenAI key the user pastes into the UI and that lives only in
 * this browser's `localStorage`. No app_ef server ever holds the key — the
 * trade-off of the browser-direct choice, fine for a no-users dev tool.
 *
 * This module owns the engine; it streams its results straight into the
 * zustand store (the same pattern as `commands/op.ts`'s `runOp`), so the
 * `AssistantSurface` component is pure presentation.
 */
import { streamText } from 'ai';
import type { CoreMessage, Tool } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { toAITools } from 'acture-ai-vercel';
import { registry } from '@/commands/registry';
import { appContext, useAppStore, type TranscriptItem } from '@/state/store';
import { OPENAI_KEY_STORAGE } from '@/api/openaiKey';

/** The chat model. Override with `VITE_APP_EF_CHAT_MODEL`. */
const MODEL: string =
  import.meta.env.VITE_APP_EF_CHAT_MODEL ?? 'gpt-4o-mini';

/** Max model⇄tool round-trips per turn — enough for retrieve-then-answer. */
const MAX_STEPS = 8;

/** The assistant's behaviour contract. The host owns this prompt — the
 *  `acture-ai-vercel` adapter never authors one (it only projects tools). */
const SYSTEM_PROMPT = `You are the app_ef assistant — an AI operator embedded in app_ef, a \
semantic-search application built on the "ef" framework.

You help the user work with **corpora**: collections of text documents indexed \
for semantic (meaning-based) search. You operate the app through tools:
- create, select and delete a corpus
- search a corpus (ranked semantic matches)
- explore a corpus (a 2-D clustered map)
- retrieve ranked context segments from a corpus

Guidelines:
- To answer a question about the *content* of a corpus, first call retrieve \
(or search) to pull relevant segments, then answer **grounded in what those \
tools returned** — quote or cite the segment text, and do not assert facts the \
corpus did not provide. If retrieval finds nothing relevant, say so.
- The query tools act on the *currently selected* corpus. If none is selected, \
ask the user which corpus to use (or create one) before searching.
- If the user wants to search content that is not indexed yet, offer to create \
a corpus from it.
- Confirm with the user before destructive actions such as deleting a corpus.
- Every tool result is { ok: true, value } or { ok: false, error }. On an \
error, explain it plainly and suggest a fix; do not retry blindly.
- Be concise.`;

// ── API key (browser-direct; key lives only in this browser) ────────────────

let apiKey: string | null = localStorage.getItem(OPENAI_KEY_STORAGE);

/** Whether an API key is available for the model call. */
export function hasApiKey(): boolean {
  return apiKey != null && apiKey.length > 0;
}

/** Persist the user's OpenAI key to this browser's `localStorage`. */
export function saveApiKey(key: string): void {
  apiKey = key.trim();
  localStorage.setItem(OPENAI_KEY_STORAGE, apiKey);
}

/** Forget the stored key (removes it from `localStorage`). */
export function forgetApiKey(): void {
  apiKey = null;
  localStorage.removeItem(OPENAI_KEY_STORAGE);
}

// ── Conversation (the model's memory — not rendered) ─────────────────────────

/** The running message history fed to the model. Distinct from the rendered
 *  transcript in the store: this carries tool-call/tool-result messages the
 *  model needs for context but the UI shows as compact chips. */
let conversation: CoreMessage[] = [];

/** Clear both the model's memory and the rendered transcript. */
export function newConversation(): void {
  conversation = [];
  useAppStore.setState({ assistantTranscript: [] });
}

// ── Tool projection ──────────────────────────────────────────────────────────

/**
 * Project the registry to Vercel AI SDK tools, with OpenAI-safe names.
 *
 * `toAITools` keys each tool by the raw command id (`app.search.run`), but
 * OpenAI and Anthropic both reject `.` in a function name
 * (`^[a-zA-Z0-9_-]+$`). We swap `.`→`_` for the wire name and keep a map
 * back to the real id for display; each tool's `execute` already closes over
 * the real id, so dispatch is unaffected. `excludeFunctionWhen: false` keeps
 * the search/explore/retrieve commands (their `when` is a function) — the
 * model needs them, and their handlers self-guard the no-corpus case via
 * errors-as-data.
 */
function buildTools(): {
  tools: Record<string, Tool>;
  realId: (wireName: string) => string;
} {
  const raw = toAITools(registry, {
    excludeFunctionWhen: false,
    context: appContext(),
  });
  const tools: Record<string, Tool> = {};
  const idByWireName = new Map<string, string>();
  for (const [id, def] of Object.entries(raw)) {
    const wireName = id.replace(/[^a-zA-Z0-9_-]/g, '_');
    tools[wireName] = def;
    idByWireName.set(wireName, id);
  }
  return { tools, realId: (name) => idByWireName.get(name) ?? name };
}

// ── Transcript mutation (streams into the store) ─────────────────────────────

/** Append a transcript item; return its index for later in-place updates. */
function pushItem(item: TranscriptItem): number {
  const next = [...useAppStore.getState().assistantTranscript, item];
  useAppStore.setState({ assistantTranscript: next });
  return next.length - 1;
}

/** Append streamed text to the assistant item at `index`. */
function appendAssistantText(index: number, delta: string): void {
  const transcript = [...useAppStore.getState().assistantTranscript];
  const item = transcript[index];
  if (item?.kind === 'assistant') {
    transcript[index] = { ...item, text: item.text + delta };
    useAppStore.setState({ assistantTranscript: transcript });
  }
}

/** Resolve a tool item's status once its dispatch result arrives. */
function finishTool(callId: string, rawResult: unknown): void {
  const result = rawResult as {
    ok?: boolean;
    value?: unknown;
    error?: { message?: string };
  };
  const ok = result?.ok === true;
  useAppStore.setState((state) => ({
    assistantTranscript: state.assistantTranscript.map((item) =>
      item.kind === 'tool' && item.callId === callId
        ? { ...item, status: ok ? 'ok' : 'error', summary: summarize(result) }
        : item,
    ),
  }));
}

/** A short, human-readable summary of a dispatch result for the tool chip. */
function summarize(result: {
  ok?: boolean;
  value?: unknown;
  error?: { message?: string };
}): string {
  if (result?.ok !== true) return result?.error?.message ?? 'failed';
  const value = result.value;
  if (Array.isArray(value)) {
    return `${value.length} result${value.length === 1 ? '' : 's'}`;
  }
  if (typeof value === 'string') return value;
  return 'done';
}

/** Extract a readable message from a `fullStream` error part. */
function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'The assistant request failed.';
}

// ── The turn ─────────────────────────────────────────────────────────────────

/**
 * Run one assistant turn: send `userText` to the model, stream its reply and
 * tool calls into the store transcript, and fold the turn into the model's
 * memory so the next turn has context.
 *
 * Resolves when the turn (all model⇄tool steps) is complete. Never throws —
 * failures land in the transcript as an `error` item.
 */
export async function sendMessage(userText: string): Promise<void> {
  const text = userText.trim();
  if (!text || useAppStore.getState().assistantStreaming) return;
  if (!hasApiKey() || apiKey == null) {
    pushItem({ kind: 'error', text: 'Set an OpenAI API key first.' });
    return;
  }

  pushItem({ kind: 'user', text });
  useAppStore.setState({ assistantStreaming: true });
  conversation.push({ role: 'user', content: text });

  try {
    const openai = createOpenAI({ apiKey });
    const { tools, realId } = buildTools();
    const result = streamText({
      model: openai(MODEL),
      system: SYSTEM_PROMPT,
      messages: conversation,
      tools,
      maxSteps: MAX_STEPS,
    });

    // The index of the assistant text item currently being streamed, or -1
    // when none is open (a tool call closes the current text block).
    let assistantIndex = -1;
    for await (const part of result.fullStream) {
      if (part.type === 'text-delta') {
        if (assistantIndex < 0) {
          assistantIndex = pushItem({ kind: 'assistant', text: '' });
        }
        appendAssistantText(assistantIndex, part.textDelta);
      } else if (part.type === 'tool-call') {
        assistantIndex = -1;
        pushItem({
          kind: 'tool',
          callId: part.toolCallId,
          commandId: realId(part.toolName),
          args: part.args,
          status: 'running',
          summary: 'running…',
        });
      } else if (part.type === 'error') {
        pushItem({ kind: 'error', text: errorMessage(part.error) });
      } else if ((part.type as string) === 'tool-result') {
        // `tool-result` parts are emitted at runtime, but collapse to `never`
        // in `TextStreamPart` when `tools` is the open `Record<string, Tool>`
        // type — so cast to the known runtime shape.
        const resultPart = part as unknown as {
          toolCallId: string;
          result: unknown;
        };
        finishTool(resultPart.toolCallId, resultPart.result);
      }
    }

    // Fold the assistant + tool messages this turn into the model's memory.
    const response = await result.response;
    conversation.push(...response.messages);
  } catch (error) {
    pushItem({ kind: 'error', text: errorMessage(error) });
  } finally {
    useAppStore.setState({ assistantStreaming: false });
  }
}
