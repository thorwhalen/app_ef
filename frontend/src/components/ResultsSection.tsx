import { useState } from 'react'
import { useVisualizationData, useSegments, useClusters } from '@/hooks/useResults'

interface ResultsSectionProps {
  projectId: string
}

export default function ResultsSection({ projectId }: ResultsSectionProps) {
  const { data: vizData, isLoading: vizLoading } = useVisualizationData(projectId)
  const { data: segments } = useSegments(projectId)
  const { data: clusters } = useClusters(projectId)

  const [activeTab, setActiveTab] = useState<'visualization' | 'segments' | 'clusters'>(
    'visualization'
  )

  if (vizLoading) {
    return <div className="text-gray-500">Loading results...</div>
  }

  const hasResults = vizData && vizData.embeddings.length > 0

  if (!hasResults) {
    return (
      <div className="text-center py-8 bg-gray-50 rounded-lg">
        <div className="text-4xl mb-2">📊</div>
        <p className="text-gray-500 mb-2">No results yet</p>
        <p className="text-sm text-gray-400">
          Run a pipeline to generate embeddings and visualizations
        </p>
      </div>
    )
  }

  return (
    <div>
      {/* Tabs */}
      <div className="border-b border-gray-200 mb-4">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('visualization')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'visualization'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Visualization
          </button>
          <button
            onClick={() => setActiveTab('segments')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'segments'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Segments ({segments ? Object.keys(segments).length : 0})
          </button>
          <button
            onClick={() => setActiveTab('clusters')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'clusters'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Clusters
          </button>
        </nav>
      </div>

      {/* Content */}
      {activeTab === 'visualization' && vizData && (
        <VisualizationView data={vizData} />
      )}

      {activeTab === 'segments' && segments && (
        <SegmentsView segments={segments} />
      )}

      {activeTab === 'clusters' && clusters && (
        <ClustersView clusters={clusters} />
      )}
    </div>
  )
}

function VisualizationView({ data }: { data: any }) {
  // Simple scatter plot visualization (placeholder for Plotly)
  const dimensions = data.embeddings[0]?.length || 0
  const numClusters = data.metadata?.num_clusters || 0

  return (
    <div>
      <div className="bg-gray-50 rounded-lg p-6 mb-4">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-gray-900">{data.embeddings.length}</div>
            <div className="text-sm text-gray-600">Points</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900">{dimensions}D</div>
            <div className="text-sm text-gray-600">Dimensions</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900">{numClusters}</div>
            <div className="text-sm text-gray-600">Clusters</div>
          </div>
        </div>
      </div>

      <div className="bg-white border-2 border-gray-200 rounded-lg p-8 text-center">
        <div className="text-4xl mb-4">📊</div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Interactive Visualization
        </h3>
        <p className="text-gray-600 mb-4">
          {dimensions === 2 ? '2D' : '3D'} scatter plot of embeddings with cluster coloring
        </p>
        <p className="text-sm text-gray-500">
          Interactive visualization with Plotly will be added in the next update
        </p>
        <div className="mt-6 flex justify-center space-x-3">
          <button className="bg-indigo-50 text-indigo-700 px-4 py-2 rounded font-medium">
            Export as PNG
          </button>
          <button className="bg-indigo-50 text-indigo-700 px-4 py-2 rounded font-medium">
            Export Data
          </button>
        </div>
      </div>
    </div>
  )
}

function SegmentsView({ segments }: { segments: Record<string, string> }) {
  const segmentList = Object.entries(segments)

  return (
    <div className="space-y-3">
      {segmentList.map(([key, content]) => (
        <div key={key} className="bg-gray-50 rounded-lg p-4">
          <div className="font-medium text-gray-900 mb-2">{key}</div>
          <div className="text-sm text-gray-700 whitespace-pre-wrap">
            {content.length > 200 ? content.slice(0, 200) + '...' : content}
          </div>
        </div>
      ))}
    </div>
  )
}

function ClustersView({ clusters }: { clusters: Record<string, number> }) {
  const clusterList = Object.entries(clusters)

  // Group by cluster
  const clusterGroups: Record<number, string[]> = {}
  clusterList.forEach(([key, clusterId]) => {
    if (!clusterGroups[clusterId]) {
      clusterGroups[clusterId] = []
    }
    clusterGroups[clusterId].push(key)
  })

  return (
    <div className="space-y-4">
      {Object.entries(clusterGroups).map(([clusterId, keys]) => (
        <div key={clusterId} className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-semibold text-gray-900 mb-3">
            Cluster {clusterId} ({keys.length} items)
          </h4>
          <div className="flex flex-wrap gap-2">
            {keys.map((key) => (
              <span
                key={key}
                className="bg-white px-3 py-1 rounded-full text-sm text-gray-700 border border-gray-200"
              >
                {key}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
