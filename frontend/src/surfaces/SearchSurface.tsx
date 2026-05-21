/**
 * SearchSurface — the headline surface: query the selected corpus.
 */
import { useState, type FormEvent } from 'react';
import { registry } from '@/commands/registry';
import { appContext, useAppStore } from '@/state/store';
import { NoCorpus } from '@/components/NoCorpus';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/field';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { Card, CardContent } from '@/components/ui/card';

export function SearchSurface() {
  const corpusId = useAppStore((s) => s.selectedCorpusId);
  const results = useAppStore((s) => s.searchResults);
  const busy = useAppStore((s) => s.busy);
  const [query, setQuery] = useState('');

  function run(e: FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    void registry.dispatch(
      'app.search.run',
      { query: query.trim() },
      appContext(),
    );
  }

  if (!corpusId) return <NoCorpus action="search it" />;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">Search</h2>
        <p className="text-sm text-muted-foreground">
          Semantic search over{' '}
          <code className="rounded bg-muted px-1">{corpusId}</code>.
        </p>
      </div>

      <form onSubmit={run} className="flex gap-2">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search the corpus…"
          autoFocus
        />
        <Button type="submit" disabled={busy != null || !query.trim()}>
          {busy != null ? <Spinner /> : 'Search'}
        </Button>
      </form>

      {results != null &&
        (results.length === 0 ? (
          <p className="text-sm text-muted-foreground">No matches.</p>
        ) : (
          <ul className="space-y-2">
            {results.map((hit) => (
              <li key={hit.segment.id}>
                <Card>
                  <CardContent className="flex gap-3 p-3">
                    <Badge variant="secondary" className="h-fit">
                      {hit.score.toFixed(3)}
                    </Badge>
                    <div className="min-w-0">
                      <p className="text-sm">{hit.segment.text}</p>
                      {hit.source_id != null && (
                        <p className="mt-1 truncate text-xs text-muted-foreground">
                          source {hit.source_id.slice(0, 12)}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        ))}
    </div>
  );
}
