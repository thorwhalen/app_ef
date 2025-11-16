import { useState } from 'react'
import {
  useSources,
  useAddSource,
  useDeleteSource,
  useUploadSource,
} from '@/hooks/useSources'
import type { SourceCreate } from '@/types/project'

interface SourcesSectionProps {
  projectId: string
}

export default function SourcesSection({ projectId }: SourcesSectionProps) {
  const { data: sources, isLoading } = useSources(projectId)
  const addSource = useAddSource()
  const deleteSource = useDeleteSource()
  const uploadSource = useUploadSource()

  const [showAddModal, setShowAddModal] = useState(false)
  const [showUploadModal, setShowUploadModal] = useState(false)

  const handleAddSource = async (data: SourceCreate) => {
    try {
      await addSource.mutateAsync({ projectId, data })
      setShowAddModal(false)
    } catch (error) {
      console.error('Failed to add source:', error)
    }
  }

  const handleUploadFile = async (file: File) => {
    try {
      await uploadSource.mutateAsync({ projectId, file })
      setShowUploadModal(false)
    } catch (error) {
      console.error('Failed to upload file:', error)
    }
  }

  const handleDeleteSource = async (sourceKey: string) => {
    if (window.confirm(`Delete source "${sourceKey}"?`)) {
      try {
        await deleteSource.mutateAsync({ projectId, sourceKey })
      } catch (error) {
        console.error('Failed to delete source:', error)
      }
    }
  }

  if (isLoading) {
    return <div className="text-gray-500">Loading sources...</div>
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Sources</h3>
        <div className="flex space-x-2">
          <button
            onClick={() => setShowUploadModal(true)}
            className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-3 py-1 rounded text-sm transition-colors"
          >
            📁 Upload File
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1 rounded text-sm transition-colors"
          >
            + Add Source
          </button>
        </div>
      </div>

      {sources && sources.length === 0 && (
        <div className="text-center py-8 bg-gray-50 rounded-lg">
          <div className="text-4xl mb-2">📄</div>
          <p className="text-gray-500 mb-4">No sources yet</p>
          <button
            onClick={() => setShowAddModal(true)}
            className="text-indigo-600 hover:text-indigo-700 text-sm underline"
          >
            Add your first source
          </button>
        </div>
      )}

      {sources && sources.length > 0 && (
        <div className="space-y-2">
          {sources.map((sourceKey) => (
            <div
              key={sourceKey}
              className="bg-gray-50 px-4 py-3 rounded flex items-center justify-between hover:bg-gray-100 transition-colors"
            >
              <span className="font-medium text-gray-900">{sourceKey}</span>
              <button
                onClick={() => handleDeleteSource(sourceKey)}
                className="text-red-500 hover:text-red-700 text-sm"
              >
                🗑️ Delete
              </button>
            </div>
          ))}
        </div>
      )}

      {showAddModal && (
        <AddSourceModal
          onClose={() => setShowAddModal(false)}
          onAdd={handleAddSource}
          isLoading={addSource.isPending}
        />
      )}

      {showUploadModal && (
        <UploadFileModal
          onClose={() => setShowUploadModal(false)}
          onUpload={handleUploadFile}
          isLoading={uploadSource.isPending}
        />
      )}
    </div>
  )
}

function AddSourceModal({
  onClose,
  onAdd,
  isLoading,
}: {
  onClose: () => void
  onAdd: (data: SourceCreate) => void
  isLoading: boolean
}) {
  const [formData, setFormData] = useState<SourceCreate>({
    key: '',
    content: '',
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onAdd(formData)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Add Source</h2>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Source Key *
            </label>
            <input
              type="text"
              required
              value={formData.key}
              onChange={(e) => setFormData({ ...formData, key: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="e.g., doc_001"
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Content *
            </label>
            <textarea
              required
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              rows={10}
              placeholder="Paste or type your text content here..."
            />
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md font-medium transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Adding...' : 'Add Source'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function UploadFileModal({
  onClose,
  onUpload,
  isLoading,
}: {
  onClose: () => void
  onUpload: (file: File) => void
  isLoading: boolean
}) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [dragActive, setDragActive] = useState(false)

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0])
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0])
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (selectedFile) {
      onUpload(selectedFile)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Upload File</h2>

        <form onSubmit={handleSubmit}>
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center mb-4 ${
              dragActive ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            {selectedFile ? (
              <div>
                <div className="text-4xl mb-2">📄</div>
                <p className="text-sm font-medium text-gray-900">{selectedFile.name}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {(selectedFile.size / 1024).toFixed(2)} KB
                </p>
                <button
                  type="button"
                  onClick={() => setSelectedFile(null)}
                  className="text-indigo-600 hover:text-indigo-700 text-sm mt-2"
                >
                  Choose different file
                </button>
              </div>
            ) : (
              <div>
                <div className="text-4xl mb-2">📁</div>
                <p className="text-sm text-gray-600 mb-2">
                  Drag and drop a file here, or
                </p>
                <label className="cursor-pointer text-indigo-600 hover:text-indigo-700 text-sm font-medium">
                  Browse files
                  <input
                    type="file"
                    className="hidden"
                    onChange={handleFileChange}
                    accept=".txt,.md,.csv,.json"
                  />
                </label>
                <p className="text-xs text-gray-500 mt-2">
                  Supported: .txt, .md, .csv, .json
                </p>
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !selectedFile}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md font-medium transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Uploading...' : 'Upload'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
