import { useState } from 'react'
import {
  usePipelines,
  usePipeline,
  useCreatePipeline,
  useDeletePipeline,
  useExecutePipeline,
  useExecutionStatus,
} from '@/hooks/usePipelines'
import { useComponents } from '@/hooks/useComponents'
import type { PipelineCreate } from '@/types/project'

interface PipelinesSectionProps {
  projectId: string
}

export default function PipelinesSection({ projectId }: PipelinesSectionProps) {
  const { data: pipelines, isLoading } = usePipelines(projectId)
  const deletePipeline = useDeletePipeline()

  const [showCreateModal, setShowCreateModal] = useState(false)

  const handleDeletePipeline = async (pipelineName: string) => {
    if (window.confirm(`Delete pipeline "${pipelineName}"?`)) {
      try {
        await deletePipeline.mutateAsync({ projectId, pipelineName })
      } catch (error) {
        console.error('Failed to delete pipeline:', error)
      }
    }
  }

  if (isLoading) {
    return <div className="text-gray-500">Loading pipelines...</div>
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Pipelines</h3>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1 rounded text-sm transition-colors"
        >
          + Create Pipeline
        </button>
      </div>

      {pipelines && pipelines.length === 0 && (
        <div className="text-center py-8 bg-gray-50 rounded-lg">
          <div className="text-4xl mb-2">⚙️</div>
          <p className="text-gray-500 mb-4">No pipelines yet</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="text-indigo-600 hover:text-indigo-700 text-sm underline"
          >
            Create your first pipeline
          </button>
        </div>
      )}

      {pipelines && pipelines.length > 0 && (
        <div className="space-y-3">
          {pipelines.map((pipelineName) => (
            <PipelineCard
              key={pipelineName}
              projectId={projectId}
              pipelineName={pipelineName}
              onDelete={handleDeletePipeline}
            />
          ))}
        </div>
      )}

      {showCreateModal && (
        <CreatePipelineModal
          projectId={projectId}
          onClose={() => setShowCreateModal(false)}
        />
      )}
    </div>
  )
}

function PipelineCard({
  projectId,
  pipelineName,
  onDelete,
}: {
  projectId: string
  pipelineName: string
  onDelete: (name: string) => void
}) {
  const { data: pipeline } = usePipeline(projectId, pipelineName)
  const executePipeline = useExecutePipeline()
  const [executionId, setExecutionId] = useState<string | null>(null)
  const { data: executionStatus } = useExecutionStatus(
    projectId,
    pipelineName,
    executionId || '',
    2000
  )

  const handleExecute = async () => {
    try {
      const result = await executePipeline.mutateAsync({ projectId, pipelineName })
      setExecutionId(result.execution_id)
    } catch (error) {
      console.error('Failed to execute pipeline:', error)
    }
  }

  const isRunning = executionStatus?.status === 'running'

  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h4 className="font-semibold text-gray-900">{pipelineName}</h4>
          {pipeline && (
            <div className="text-xs text-gray-600 mt-1 space-y-1">
              <div>Embedder: <span className="font-medium">{pipeline.embedder}</span></div>
              {pipeline.planarizer && (
                <div>Planarizer: <span className="font-medium">{pipeline.planarizer}</span></div>
              )}
              {pipeline.clusterer && (
                <div>Clusterer: <span className="font-medium">{pipeline.clusterer}</span> ({pipeline.num_clusters} clusters)</div>
              )}
              <div>Segmenter: <span className="font-medium">{pipeline.segmenter}</span></div>
            </div>
          )}
        </div>
        <div className="flex space-x-2">
          <button
            onClick={handleExecute}
            disabled={isRunning}
            className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-3 py-1 rounded text-sm transition-colors"
          >
            {isRunning ? '⏳ Running...' : '▶️ Run'}
          </button>
          <button
            onClick={() => onDelete(pipelineName)}
            className="text-red-500 hover:text-red-700 text-sm"
          >
            🗑️
          </button>
        </div>
      </div>

      {executionStatus && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-700">
              Status: <span className={
                executionStatus.status === 'completed' ? 'text-green-600' :
                executionStatus.status === 'failed' ? 'text-red-600' :
                'text-blue-600'
              }>
                {executionStatus.status}
              </span>
            </span>
            <span className="text-xs text-gray-600">
              {Math.round(executionStatus.progress * 100)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${
                executionStatus.status === 'completed' ? 'bg-green-600' :
                executionStatus.status === 'failed' ? 'bg-red-600' :
                'bg-blue-600'
              }`}
              style={{ width: `${executionStatus.progress * 100}%` }}
            />
          </div>
          {executionStatus.message && (
            <p className="text-xs text-gray-600 mt-2">{executionStatus.message}</p>
          )}
          {executionStatus.error && (
            <p className="text-xs text-red-600 mt-2">Error: {executionStatus.error}</p>
          )}
        </div>
      )}
    </div>
  )
}

function CreatePipelineModal({
  projectId,
  onClose,
}: {
  projectId: string
  onClose: () => void
}) {
  const { data: components } = useComponents(projectId)
  const createPipeline = useCreatePipeline()

  const [formData, setFormData] = useState<PipelineCreate>({
    name: '',
    embedder: '',
    planarizer: '',
    clusterer: '',
    num_clusters: 3,
    segmenter: 'identity',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await createPipeline.mutateAsync({ projectId, data: formData })
      onClose()
    } catch (error) {
      console.error('Failed to create pipeline:', error)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Create Pipeline</h2>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Pipeline Name *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="e.g., full_analysis"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Embedder *
            </label>
            <select
              required
              value={formData.embedder}
              onChange={(e) => setFormData({ ...formData, embedder: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Select embedder...</option>
              {components?.embedders.map((embedder) => (
                <option key={embedder} value={embedder}>
                  {embedder}
                </option>
              ))}
            </select>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Planarizer (optional)
            </label>
            <select
              value={formData.planarizer}
              onChange={(e) => setFormData({ ...formData, planarizer: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">None</option>
              {components?.planarizers.map((planarizer) => (
                <option key={planarizer} value={planarizer}>
                  {planarizer}
                </option>
              ))}
            </select>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Clusterer (optional)
            </label>
            <select
              value={formData.clusterer}
              onChange={(e) => setFormData({ ...formData, clusterer: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">None</option>
              {components?.clusterers.map((clusterer) => (
                <option key={clusterer} value={clusterer}>
                  {clusterer}
                </option>
              ))}
            </select>
          </div>

          {formData.clusterer && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Number of Clusters
              </label>
              <input
                type="number"
                min="2"
                max="100"
                value={formData.num_clusters}
                onChange={(e) =>
                  setFormData({ ...formData, num_clusters: parseInt(e.target.value) })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          )}

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Segmenter
            </label>
            <select
              value={formData.segmenter}
              onChange={(e) => setFormData({ ...formData, segmenter: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {components?.segmenters.map((segmenter) => (
                <option key={segmenter} value={segmenter}>
                  {segmenter}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={createPipeline.isPending}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createPipeline.isPending}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md font-medium transition-colors disabled:opacity-50"
            >
              {createPipeline.isPending ? 'Creating...' : 'Create Pipeline'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
