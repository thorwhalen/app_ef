/**
 * CorporaSurface — create, list, select and delete corpora.
 */
import { registry } from '@/commands/registry';
import { appContext, selectedCorpus, useAppStore } from '@/state/store';
import { CorpusTable } from '@/components/CorpusTable';
import { CorpusDetail } from '@/components/CorpusDetail';
import { Button } from '@/components/ui/button';

export function CorporaSurface() {
  const corpora = useAppStore((s) => s.corpora);
  const selectedId = useAppStore((s) => s.selectedCorpusId);
  const selected = useAppStore(selectedCorpus);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Corpora</h2>
          <p className="text-sm text-muted-foreground">
            A corpus is a set of documents — segmented, embedded, and indexed
            for search. Create one, then select it to search.
          </p>
        </div>
        <Button onClick={() => useAppStore.setState({ createModalOpen: true })}>
          Create corpus
        </Button>
      </div>
      {selected && <CorpusDetail corpus={selected} />}
      <CorpusTable
        rows={corpora}
        selectedId={selectedId}
        onSelect={(id) => {
          void registry.dispatch(
            'app.corpus.select',
            { corpusId: id },
            appContext(),
          );
        }}
        onDelete={(id) => {
          if (
            window.confirm(`Delete corpus "${id}"? This cannot be undone.`)
          ) {
            void registry.dispatch(
              'app.corpus.delete',
              { corpusId: id },
              appContext(),
            );
          }
        }}
      />
    </div>
  );
}
