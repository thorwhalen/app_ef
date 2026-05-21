/**
 * ScatterPlot — a dependency-free 2-D SVG scatter of an `ExploreResult`.
 *
 * Points are positioned by their projected coordinates and coloured by
 * cluster. A secondary surface (the corpus map) — a small hand-rolled SVG
 * is enough; no charting library is pulled in.
 */
import type { ExploreResult } from '@/api/schema';

/** Per-cluster colours, indexed by cluster label modulo the palette size. */
const CLUSTER_COLORS = [
  '#2563eb',
  '#dc2626',
  '#16a34a',
  '#d97706',
  '#7c3aed',
  '#0891b2',
  '#db2777',
  '#65a30d',
];

const WIDTH = 680;
const HEIGHT = 440;
const PAD = 28;

export function ScatterPlot({ result }: { result: ExploreResult }) {
  const { coords, labels, ids, cluster_titles } = result;

  if (coords.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        The corpus map is empty.
      </p>
    );
  }

  const xs = coords.map((c) => c[0]);
  const ys = coords.map((c) => c[1]);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const spanX = maxX - minX || 1;
  const spanY = maxY - minY || 1;

  const toX = (x: number) => PAD + ((x - minX) / spanX) * (WIDTH - 2 * PAD);
  const toY = (y: number) =>
    HEIGHT - PAD - ((y - minY) / spanY) * (HEIGHT - 2 * PAD);

  const presentClusters = Array.from(new Set(labels)).sort((a, b) => a - b);

  return (
    <div className="space-y-3">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full rounded-lg border border-border bg-card"
        role="img"
        aria-label="Corpus map"
      >
        {coords.map((c, i) => (
          <circle
            key={ids[i] ?? i}
            cx={toX(c[0])}
            cy={toY(c[1])}
            r={6}
            fill={CLUSTER_COLORS[labels[i] % CLUSTER_COLORS.length]}
            fillOpacity={0.78}
            stroke="white"
            strokeWidth={1}
          >
            <title>{`${(ids[i] ?? '').slice(0, 12)} · cluster ${labels[i]}`}</title>
          </circle>
        ))}
      </svg>
      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        {presentClusters.map((cluster) => (
          <span key={cluster} className="inline-flex items-center gap-1.5">
            <span
              className="inline-block h-3 w-3 rounded-full"
              style={{
                background: CLUSTER_COLORS[cluster % CLUSTER_COLORS.length],
              }}
            />
            {cluster_titles[String(cluster)] ?? `Cluster ${cluster}`}
          </span>
        ))}
      </div>
    </div>
  );
}
