/**
 * AssistantSurface — the AI assistant: a chat that operates app_ef.
 *
 * This is the AI tool-calling consumer surface. The transcript and streaming
 * flag come from the store; the LLM loop, tool projection and the browser-
 * direct OpenAI key all live in `@/assistant/engine`. The surface is pure
 * presentation over them.
 *
 * Until the user provides an OpenAI key it shows the key form; the key is
 * kept only in this browser (see the engine) — hence the explicit warning.
 */
import { useEffect, useRef, useState, type FormEvent } from 'react';
import {
  forgetApiKey,
  hasApiKey,
  newConversation,
  saveApiKey,
  sendMessage,
} from '@/assistant/engine';
import { allCommands } from '@/commands/registry';
import { useAppStore, type TranscriptItem } from '@/state/store';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/field';
import { Spinner } from '@/components/ui/spinner';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

/** Command metadata by id — for a tool chip's icon and title. */
const COMMAND_BY_ID = new Map(allCommands.map((cmd) => [cmd.id, cmd]));

/** Example prompts shown on the empty transcript; click to prefill. */
const EXAMPLE_PROMPTS = [
  'What corpora do I have?',
  'Create a corpus from a few sentences about cats and dogs, then search it for "pet".',
  'Retrieve context for a question and answer it from the corpus.',
];

export function AssistantSurface() {
  const transcript = useAppStore((s) => s.assistantTranscript);
  const streaming = useAppStore((s) => s.assistantStreaming);
  const [keyReady, setKeyReady] = useState(hasApiKey);

  if (!keyReady) {
    return <KeyForm onSaved={() => setKeyReady(true)} />;
  }
  return (
    <Chat
      transcript={transcript}
      streaming={streaming}
      onForgetKey={() => {
        forgetApiKey();
        setKeyReady(false);
      }}
    />
  );
}

/** The OpenAI-key entry form, shown until a key is stored. */
function KeyForm({ onSaved }: { onSaved: () => void }) {
  const [value, setValue] = useState('');

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!value.trim()) return;
    saveApiKey(value);
    onSaved();
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">Assistant</h2>
        <p className="text-sm text-muted-foreground">
          A chat that operates app_ef — it can create corpora, search, explore
          and answer from retrieved context.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Connect a model</CardTitle>
          <CardDescription>
            The assistant calls OpenAI <strong>directly from your browser</strong>.
            Paste an API key — it is stored only in this browser&apos;s
            <code className="mx-1 rounded bg-muted px-1">localStorage</code>
            and is never sent to any app_ef server. Avoid this on a shared
            machine.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="openai-key">OpenAI API key</Label>
              <Input
                id="openai-key"
                type="password"
                autoComplete="off"
                placeholder="sk-…"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                autoFocus
              />
            </div>
            <Button type="submit" disabled={!value.trim()}>
              Save key
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

/** The chat itself: header, scrolling transcript, and the message form. */
function Chat({
  transcript,
  streaming,
  onForgetKey,
}: {
  transcript: TranscriptItem[];
  streaming: boolean;
  onForgetKey: () => void;
}) {
  const [draft, setDraft] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  // Keep the latest message in view as the transcript grows / streams.
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [transcript]);

  function submit(e: FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text || streaming) return;
    setDraft('');
    void sendMessage(text);
  }

  return (
    <div className="flex h-[calc(100vh-10rem)] flex-col">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-semibold">Assistant</h2>
          <p className="text-sm text-muted-foreground">
            Chat that operates app_ef via the command registry.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={newConversation}
            disabled={streaming || transcript.length === 0}
          >
            New chat
          </Button>
          <Button variant="ghost" size="sm" onClick={onForgetKey}>
            Forget key
          </Button>
        </div>
      </div>

      <div className="mt-4 flex-1 space-y-3 overflow-y-auto pr-1">
        {transcript.length === 0 ? (
          <EmptyState onPick={setDraft} />
        ) : (
          transcript.map((item, i) => (
            <TranscriptRow key={i} item={item} streaming={streaming} />
          ))
        )}
        <div ref={endRef} />
      </div>

      <form onSubmit={submit} className="mt-3 flex gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Ask the assistant to do something…"
          disabled={streaming}
          autoFocus
        />
        <Button type="submit" disabled={streaming || !draft.trim()}>
          {streaming ? <Spinner /> : 'Send'}
        </Button>
      </form>
    </div>
  );
}

/** The empty-transcript hint with clickable example prompts. */
function EmptyState({ onPick }: { onPick: (prompt: string) => void }) {
  return (
    <div className="space-y-2 pt-4">
      <p className="text-sm text-muted-foreground">Try asking:</p>
      {EXAMPLE_PROMPTS.map((prompt) => (
        <button
          key={prompt}
          onClick={() => onPick(prompt)}
          className="block w-full rounded-md border border-border px-3 py-2 text-left text-sm text-muted-foreground hover:bg-accent"
        >
          {prompt}
        </button>
      ))}
    </div>
  );
}

/** One transcript entry, dispatched on its `kind`. */
function TranscriptRow({
  item,
  streaming,
}: {
  item: TranscriptItem;
  streaming: boolean;
}) {
  if (item.kind === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] whitespace-pre-wrap rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground">
          {item.text}
        </div>
      </div>
    );
  }

  if (item.kind === 'assistant') {
    return (
      <div className="flex justify-start">
        <div className="max-w-[80%] whitespace-pre-wrap rounded-lg bg-muted px-3 py-2 text-sm">
          {item.text || (streaming ? <Spinner /> : null)}
        </div>
      </div>
    );
  }

  if (item.kind === 'error') {
    return <div className="text-sm text-destructive">⚠ {item.text}</div>;
  }

  // kind === 'tool'
  const cmd = COMMAND_BY_ID.get(item.commandId);
  const mark =
    item.status === 'running' ? '·' : item.status === 'ok' ? '✓' : '✕';
  return (
    <div
      className="flex items-center gap-2 text-xs text-muted-foreground"
      title={JSON.stringify(item.args)}
    >
      <span aria-hidden>{cmd?.icon ?? '🔧'}</span>
      <span className="font-medium text-foreground">
        {cmd?.title ?? item.commandId}
      </span>
      {item.status === 'running' ? (
        <Spinner className="h-3 w-3" />
      ) : (
        <span
          className={
            item.status === 'error' ? 'text-destructive' : 'text-foreground'
          }
        >
          {mark}
        </span>
      )}
      <span>{item.summary}</span>
    </div>
  );
}
