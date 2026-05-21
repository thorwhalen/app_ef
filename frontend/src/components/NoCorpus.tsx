/**
 * NoCorpus — the empty state shown by the query surfaces when no corpus is
 * selected.
 */
import { useAppStore } from '@/state/store';
import { Button } from '@/components/ui/button';

export function NoCorpus({ action }: { action: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border p-10 text-center">
      <p className="text-sm text-muted-foreground">
        Select a corpus to {action}.
      </p>
      <Button
        variant="outline"
        size="sm"
        className="mt-3"
        onClick={() => useAppStore.setState({ activeSurface: 'corpora' })}
      >
        Go to Corpora
      </Button>
    </div>
  );
}
