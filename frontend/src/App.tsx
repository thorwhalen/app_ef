/**
 * App — the shell: top bar, surface navigation, the active surface, and the
 * cross-cutting overlays (command palette, create-corpus modal, notices).
 */
import { useEffect } from 'react';
import { bindHotkeys } from 'acture-hotkeys';
import { api } from '@/api/client';
import { registry } from '@/commands/registry';
import { appContext, useAppStore, type Surface } from '@/state/store';
import { CorporaSurface } from '@/surfaces/CorporaSurface';
import { SearchSurface } from '@/surfaces/SearchSurface';
import { ExploreSurface } from '@/surfaces/ExploreSurface';
import { RagSurface } from '@/surfaces/RagSurface';
import { CommandPaletteModal } from '@/components/CommandPaletteModal';
import { CreateCorpusModal } from '@/components/CreateCorpusModal';
import { NoticeBar } from '@/components/NoticeBar';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';

interface SurfaceTab {
  id: Surface;
  label: string;
  icon: string;
  needsCorpus: boolean;
}

const SURFACES: SurfaceTab[] = [
  { id: 'corpora', label: 'Corpora', icon: '📚', needsCorpus: false },
  { id: 'search', label: 'Search', icon: '🔍', needsCorpus: true },
  { id: 'explore', label: 'Explore', icon: '🗺️', needsCorpus: true },
  { id: 'rag', label: 'RAG plug-in', icon: '📎', needsCorpus: true },
];

function renderSurface(surface: Surface) {
  switch (surface) {
    case 'corpora':
      return <CorporaSurface />;
    case 'search':
      return <SearchSurface />;
    case 'explore':
      return <ExploreSurface />;
    case 'rag':
      return <RagSurface />;
  }
}

export default function App() {
  const activeSurface = useAppStore((s) => s.activeSurface);
  const selectedCorpusId = useAppStore((s) => s.selectedCorpusId);
  const createModalOpen = useAppStore((s) => s.createModalOpen);
  const busy = useAppStore((s) => s.busy);

  // Initial corpora load.
  useEffect(() => {
    api
      .listCorpora()
      .then((corpora) => useAppStore.setState({ corpora }))
      .catch((e: unknown) =>
        useAppStore.setState({
          notice: {
            kind: 'error',
            message: e instanceof Error ? e.message : String(e),
          },
        }),
      );
  }, []);

  // ⌘K / Ctrl+K toggles the command palette.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        useAppStore.setState((s) => ({ paletteOpen: !s.paletteOpen }));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // acture keyboard shortcuts — every command's `keybinding` field.
  useEffect(() => {
    const stop = bindHotkeys(registry, { contextProvider: appContext });
    return stop;
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-semibold">ef</span>
            <span className="text-sm text-muted-foreground">
              semantic search
            </span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-muted-foreground">
              {selectedCorpusId ? (
                <>
                  corpus{' '}
                  <code className="rounded bg-muted px-1">
                    {selectedCorpusId}
                  </code>
                </>
              ) : (
                'no corpus selected'
              )}
            </span>
            <button
              onClick={() => useAppStore.setState({ paletteOpen: true })}
              className="rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:bg-accent"
            >
              ⌘K
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-6xl gap-6 px-6 py-6">
        <nav className="w-44 shrink-0 space-y-1">
          {SURFACES.map((tab) => {
            const disabled = tab.needsCorpus && !selectedCorpusId;
            return (
              <button
                key={tab.id}
                disabled={disabled}
                onClick={() =>
                  useAppStore.setState({ activeSurface: tab.id })
                }
                className={cn(
                  'flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors',
                  activeSurface === tab.id
                    ? 'bg-accent font-medium'
                    : 'text-muted-foreground hover:bg-accent/50',
                  disabled &&
                    'cursor-not-allowed opacity-40 hover:bg-transparent',
                )}
              >
                <span aria-hidden>{tab.icon}</span>
                {tab.label}
              </button>
            );
          })}
        </nav>
        <main className="min-w-0 flex-1">{renderSurface(activeSurface)}</main>
      </div>

      <CommandPaletteModal />
      <CreateCorpusModal
        open={createModalOpen}
        onClose={() => useAppStore.setState({ createModalOpen: false })}
      />
      <NoticeBar />

      {busy != null && (
        <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm shadow-lg">
          <Spinner />
          {busy}
        </div>
      )}
    </div>
  );
}
