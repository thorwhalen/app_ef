/**
 * CorpusTable — the corpus list, rendered from the zodal collection.
 *
 * The columns and per-cell renderers are derived from `corpusCollection`
 * (a single Zod schema) via `@zodal/ui`'s `toColumnDefs` and the
 * `@zodal/ui-shadcn` renderer set — no hand-written column list.
 */
import { toColumnDefs } from '@zodal/ui';
import { createShadcnRegistry } from '@zodal/ui-shadcn';
import { corpusCollection } from '@/schemas/corpus';
import type { CorpusInfo } from '@/api/schema';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/** Data columns inferred from the schema (the select column has no key). */
const columns = toColumnDefs(corpusCollection).filter(
  (c) => c.accessorKey != null,
);

/** Renderer registry resolving a cell component per field. */
const renderers = createShadcnRegistry();

export interface CorpusTableProps {
  rows: CorpusInfo[];
  selectedId: string | null;
  onSelect: (corpusId: string) => void;
  onDelete: (corpusId: string) => void;
}

export function CorpusTable({
  rows,
  selectedId,
  onSelect,
  onDelete,
}: CorpusTableProps) {
  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
        No corpora yet. Create one to start searching.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-left">
          <tr>
            {columns.map((col) => (
              <th
                key={col.id}
                className="px-3 py-2 font-medium text-muted-foreground"
              >
                {col.header}
              </th>
            ))}
            <th className="px-3 py-2" />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const isSelected = row.corpus_id === selectedId;
            const record = row as unknown as Record<string, unknown>;
            return (
              <tr
                key={row.corpus_id}
                onClick={() => onSelect(row.corpus_id)}
                className={cn(
                  'cursor-pointer border-t border-border transition-colors hover:bg-accent/50',
                  isSelected && 'bg-accent',
                )}
              >
                {columns.map((col) => {
                  const field = corpusCollection.fieldAffordances[col.id];
                  const Cell = field
                    ? renderers.resolve(field, { mode: 'cell' })
                    : null;
                  const value = record[col.accessorKey as string];
                  return (
                    <td key={col.id} className="px-3 py-2">
                      {Cell ? (
                        <Cell value={value} config={col} row={record} />
                      ) : (
                        String(value ?? '')
                      )}
                    </td>
                  );
                })}
                <td className="px-3 py-2 text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(row.corpus_id);
                    }}
                  >
                    Delete
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
