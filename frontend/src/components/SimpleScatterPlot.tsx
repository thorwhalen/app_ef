import { useMemo } from 'react'

interface ScatterPlotProps {
  data: {
    embeddings: number[][]
    clusters?: number[]
    labels?: string[]
  }
  width?: number
  height?: number
}

export default function SimpleScatterPlot({ data, width = 600, height = 400 }: ScatterPlotProps) {
  const { points, xScale, yScale, colors } = useMemo(() => {
    if (!data.embeddings || data.embeddings.length === 0) {
      return { points: [], xScale: { min: 0, max: 1 }, yScale: { min: 0, max: 1 }, colors: [] }
    }

    // Get 2D coordinates (use first 2 dimensions)
    const coords = data.embeddings.map(e => ({ x: e[0] || 0, y: e[1] || 0 }))

    // Calculate scales
    const xValues = coords.map(c => c.x)
    const yValues = coords.map(c => c.y)
    const xMin = Math.min(...xValues)
    const xMax = Math.max(...xValues)
    const yMin = Math.min(...yValues)
    const yMax = Math.max(...yValues)

    // Add padding
    const xPadding = (xMax - xMin) * 0.1 || 1
    const yPadding = (yMax - yMin) * 0.1 || 1

    const xScale = { min: xMin - xPadding, max: xMax + xPadding }
    const yScale = { min: yMin - yPadding, max: yMax + yPadding }

    // Generate colors for clusters
    const clusterColors = [
      '#3b82f6', // blue
      '#ef4444', // red
      '#10b981', // green
      '#f59e0b', // amber
      '#8b5cf6', // purple
      '#ec4899', // pink
      '#14b8a6', // teal
      '#f97316', // orange
    ]

    const colors = data.clusters
      ? data.clusters.map(c => clusterColors[c % clusterColors.length])
      : coords.map(() => '#3b82f6')

    return { points: coords, xScale, yScale, colors }
  }, [data])

  const scaleX = (x: number) => {
    const range = xScale.max - xScale.min
    return ((x - xScale.min) / range) * (width - 60) + 30
  }

  const scaleY = (y: number) => {
    const range = yScale.max - yScale.min
    return height - 30 - ((y - yScale.min) / range) * (height - 60)
  }

  if (points.length === 0) {
    return (
      <div className="flex items-center justify-center h-96 bg-gray-50 rounded">
        <p className="text-gray-500">No data to visualize</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <svg width={width} height={height} className="mx-auto">
        {/* Grid lines */}
        <g stroke="#e5e7eb" strokeWidth="1">
          {[0, 0.25, 0.5, 0.75, 1].map(ratio => {
            const y = 30 + ratio * (height - 60)
            return (
              <line key={`h-${ratio}`} x1={30} y1={y} x2={width - 30} y2={y} />
            )
          })}
          {[0, 0.25, 0.5, 0.75, 1].map(ratio => {
            const x = 30 + ratio * (width - 60)
            return (
              <line key={`v-${ratio}`} x1={x} y1={30} x2={x} y2={height - 30} />
            )
          })}
        </g>

        {/* Axes */}
        <g stroke="#6b7280" strokeWidth="2">
          <line x1={30} y1={height - 30} x2={width - 30} y2={height - 30} />
          <line x1={30} y1={30} x2={30} y2={height - 30} />
        </g>

        {/* Data points */}
        <g>
          {points.map((point, idx) => (
            <g key={idx}>
              <circle
                cx={scaleX(point.x)}
                cy={scaleY(point.y)}
                r={6}
                fill={colors[idx]}
                opacity={0.7}
                stroke="white"
                strokeWidth="2"
              >
                <title>
                  {data.labels?.[idx] || `Point ${idx}`}
                  {data.clusters && `\nCluster: ${data.clusters[idx]}`}
                  {`\n(${point.x.toFixed(3)}, ${point.y.toFixed(3)})`}
                </title>
              </circle>
            </g>
          ))}
        </g>

        {/* Axis labels */}
        <text x={width / 2} y={height - 5} textAnchor="middle" className="text-xs fill-gray-600">
          Dimension 1
        </text>
        <text
          x={10}
          y={height / 2}
          textAnchor="middle"
          transform={`rotate(-90, 10, ${height / 2})`}
          className="text-xs fill-gray-600"
        >
          Dimension 2
        </text>
      </svg>

      {/* Legend */}
      {data.clusters && (
        <div className="mt-4 flex flex-wrap gap-3 justify-center">
          {Array.from(new Set(data.clusters)).sort().map(cluster => (
            <div key={cluster} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{
                  backgroundColor: colors[data.clusters!.indexOf(cluster)],
                }}
              />
              <span className="text-xs text-gray-600">Cluster {cluster}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
