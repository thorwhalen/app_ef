/**
 * CorpusDetail — the "you just did this, here's what's next" panel.
 *
 * Shown on the Corpora surface for the selected corpus. It explains, in plain
 * words, what the indexing pipeline did (segment → embed → index), flags the
 * non-semantic `hashing` default, and surfaces the next steps as buttons.
 */
import type { CorpusInfo } from '@/api/schema';
import { useAppStore } from '@/state/store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

/** The dependency-free default embedder is a hashing embedder, not a model. */
const isHashingEmbedder = (embedder: string) => embedder.startsWith('hashing');

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

export function CorpusDetail({ corpus }: { corpus: CorpusInfo }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Corpus <code className="rounded bg-muted px-1">{corpus.corpus_id}</code>{' '}
          is ready
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Your {plural(corpus.n_sources, 'document')} were segmented into{' '}
          <strong className="text-foreground">
            {plural(corpus.n_segments, 'segment')}
          </strong>
          , each embedded with{' '}
          <code className="rounded bg-muted px-1">{corpus.embedder}</code> (
          {corpus.dim}-dim) and indexed in an in-memory vector store.
        </p>

        {isHashingEmbedder(corpus.embedder) && (
          <p className="rounded-md border border-border bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
            <strong className="text-foreground">Note:</strong> the{' '}
            <code>hashing</code> embedder matches on word overlap, not meaning.
            For true semantic search, create a corpus with a model embedder
            such as <code>openai:text-embedding-3-small</code>.
          </p>
        )}

        <div className="flex flex-wrap gap-2 pt-1">
          <Button
            size="sm"
            onClick={() => useAppStore.setState({ activeSurface: 'search' })}
          >
            Search this corpus →
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => useAppStore.setState({ activeSurface: 'explore' })}
          >
            Explore map →
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => useAppStore.setState({ activeSurface: 'rag' })}
          >
            RAG plug-in →
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
