/**
 * RagSurface — retrieve ranked context segments and show how to plug the
 * same `retrieve` endpoint into an external LLM / agent.
 */
import { useState, type FormEvent } from 'react';
import { registry } from '@/commands/registry';
import { appContext, useAppStore } from '@/state/store';
import { NoCorpus } from '@/components/NoCorpus';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/field';
import { Spinner } from '@/components/ui/spinner';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000';

export function RagSurface() {
  const corpusId = useAppStore((s) => s.selectedCorpusId);
  const results = useAppStore((s) => s.retrieveResults);
  const busy = useAppStore((s) => s.busy);
  const [query, setQuery] = useState('');

  function run(e: FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    void registry.dispatch(
      'app.rag.retrieve',
      { query: query.trim() },
      appContext(),
    );
  }

  if (!corpusId) return <NoCorpus action="retrieve from it" />;

  const snippet = `curl -X POST ${API_BASE_URL}/retrieve \\
  -H 'Content-Type: application/json' \\
  -d '{"corpus_id": "${corpusId}", "query": "your question", "limit": 10}'`;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">RAG plug-in</h2>
        <p className="text-sm text-muted-foreground">
          Retrieve ranked context segments from{' '}
          <code className="rounded bg-muted px-1">{corpusId}</code> — the
          shape to hand to an external LLM or agent.
        </p>
      </div>

      <form onSubmit={run} className="flex gap-2">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Retrieve context for…"
          autoFocus
        />
        <Button type="submit" disabled={busy != null || !query.trim()}>
          {busy != null ? <Spinner /> : 'Retrieve'}
        </Button>
      </form>

      {results != null &&
        (results.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No segments retrieved.
          </p>
        ) : (
          <ol className="space-y-2">
            {results.map((seg, i) => (
              <li key={seg.id}>
                <Card>
                  <CardContent className="flex gap-3 p-3">
                    <span className="text-xs font-medium text-muted-foreground">
                      {i + 1}
                    </span>
                    <p className="text-sm">{seg.text}</p>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ol>
        ))}

      <Card>
        <CardHeader>
          <CardTitle>Plug into an agent</CardTitle>
          <CardDescription>
            Call the same <code>retrieve</code> endpoint directly from your
            RAG pipeline or agent framework.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="overflow-x-auto rounded-md bg-muted p-3 text-xs">
            {snippet}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
