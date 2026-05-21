/**
 * ExploreSurface — the secondary corpus-map view (projection + clustering).
 */
import { registry } from '@/commands/registry';
import { appContext, useAppStore } from '@/state/store';
import { NoCorpus } from '@/components/NoCorpus';
import { ScatterPlot } from '@/components/ScatterPlot';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';

export function ExploreSurface() {
  const corpusId = useAppStore((s) => s.selectedCorpusId);
  const result = useAppStore((s) => s.exploreResult);
  const busy = useAppStore((s) => s.busy);

  if (!corpusId) return <NoCorpus action="explore it" />;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Explore</h2>
          <p className="text-sm text-muted-foreground">
            Project and cluster{' '}
            <code className="rounded bg-muted px-1">{corpusId}</code> into a
            2-D map.
          </p>
        </div>
        <Button
          onClick={() => {
            void registry.dispatch(
              'app.corpus.explore',
              undefined,
              appContext(),
            );
          }}
          disabled={busy != null}
        >
          {busy != null ? <Spinner /> : 'Build map'}
        </Button>
      </div>

      {result != null ? (
        <ScatterPlot result={result} />
      ) : (
        <div className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          Build the map to see the corpus clustered in 2-D.
        </div>
      )}
    </div>
  );
}
