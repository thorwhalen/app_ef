/**
 * CreateCorpusModal — the form for `app.corpus.create`.
 *
 * The form collects the params; submitting dispatches the acture command
 * (`registry.dispatch('app.corpus.create', …)`). The command owns the
 * logic — this component is pure presentation.
 */
import { useState } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input, Label, Textarea } from '@/components/ui/field';
import { Spinner } from '@/components/ui/spinner';
import { registry } from '@/commands/registry';
import { appContext, useAppStore } from '@/state/store';

export function CreateCorpusModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const busy = useAppStore((s) => s.busy);
  const [docs, setDocs] = useState('');
  const [corpusId, setCorpusId] = useState('');
  const [embedder, setEmbedder] = useState('');

  // One document per non-empty line.
  const sources = docs
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  async function submit() {
    const result = await registry.dispatch(
      'app.corpus.create',
      {
        sources,
        corpusId: corpusId.trim() || undefined,
        embedder: embedder.trim() || undefined,
      },
      appContext(),
    );
    if (result.ok) {
      setDocs('');
      setCorpusId('');
      setEmbedder('');
      onClose();
    }
  }

  return (
    <Modal open={open} onClose={onClose}>
      <div className="space-y-4 p-5">
        <div>
          <h2 className="text-lg font-semibold">Create corpus</h2>
          <p className="text-sm text-muted-foreground">
            Index documents into a new searchable corpus.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="cc-docs">
            Documents{' '}
            <span className="font-normal text-muted-foreground">
              — one per line
            </span>
          </Label>
          <Textarea
            id="cc-docs"
            rows={8}
            value={docs}
            onChange={(e) => setDocs(e.target.value)}
            placeholder="Paste documents here, one per line…"
          />
          <p className="text-xs text-muted-foreground">
            {sources.length} document{sources.length === 1 ? '' : 's'}
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="cc-id">
            Corpus id{' '}
            <span className="font-normal text-muted-foreground">
              — optional
            </span>
          </Label>
          <Input
            id="cc-id"
            value={corpusId}
            onChange={(e) => setCorpusId(e.target.value)}
            placeholder="auto-generated if blank"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="cc-emb">
            Embedder{' '}
            <span className="font-normal text-muted-foreground">
              — optional
            </span>
          </Label>
          <Input
            id="cc-emb"
            value={embedder}
            onChange={(e) => setEmbedder(e.target.value)}
            placeholder="hashing (dependency-free default)"
          />
          <p className="text-xs text-muted-foreground">
            The default <code>hashing</code> embedder matches word overlap, not
            meaning. For semantic search, use a model such as{' '}
            <code>openai:text-embedding-3-small</code>.
          </p>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={submit}
            disabled={sources.length === 0 || busy != null}
          >
            {busy != null ? <Spinner /> : null}
            Create corpus
          </Button>
        </div>
      </div>
    </Modal>
  );
}
