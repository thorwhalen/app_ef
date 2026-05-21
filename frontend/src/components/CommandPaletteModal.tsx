/**
 * CommandPaletteModal — the ⌘K command palette.
 *
 * Wraps acture's `<CommandPalette>` (which renders cmdk primitives) in the
 * app's `Modal`. A parameter-free command (Explore) dispatches straight
 * from the palette; a parameterized command routes the user to the surface
 * that collects its parameters.
 */
import { CommandPalette } from 'acture-palette-react';
import { Modal } from '@/components/ui/modal';
import { registry } from '@/commands/registry';
import { useAppStore, type Surface } from '@/state/store';

/** Which surface collects each command's parameters. */
const SURFACE_FOR_COMMAND: Record<string, Surface> = {
  'app.corpus.create': 'corpora',
  'app.corpus.select': 'corpora',
  'app.corpus.delete': 'corpora',
  'app.search.run': 'search',
  'app.corpus.explore': 'explore',
  'app.rag.retrieve': 'rag',
};

export function CommandPaletteModal() {
  const open = useAppStore((s) => s.paletteOpen);
  const selectedCorpusId = useAppStore((s) => s.selectedCorpusId);

  // Context drives the palette's when-clause filtering (Search / Explore /
  // RAG are hidden until a corpus is selected).
  const context = selectedCorpusId ? { corpusId: selectedCorpusId } : {};
  const close = () => useAppStore.setState({ paletteOpen: false });

  return (
    <Modal open={open} onClose={close} className="max-w-xl">
      <CommandPalette
        registry={registry}
        context={context}
        placeholder="Search commands…"
        onDispatched={close}
        onParameterizedSelect={(cmd) => {
          useAppStore.setState({
            activeSurface: SURFACE_FOR_COMMAND[cmd.id] ?? 'corpora',
            paletteOpen: false,
            createModalOpen:
              cmd.id === 'app.corpus.create'
                ? true
                : useAppStore.getState().createModalOpen,
          });
        }}
      />
    </Modal>
  );
}
