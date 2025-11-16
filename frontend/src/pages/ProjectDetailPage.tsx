import { Link, useParams } from 'react-router-dom'
import { useProject, useProjectSummary } from '@/hooks/useProjects'

export default function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const { data: project, isLoading: projectLoading } = useProject(projectId!)
  const { data: summary, isLoading: summaryLoading } = useProjectSummary(projectId!)

  const isLoading = projectLoading || summaryLoading

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-500">Loading project...</p>
        </div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">❌</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Project Not Found</h2>
          <p className="text-gray-500 mb-4">The project you're looking for doesn't exist.</p>
          <Link
            to="/projects"
            className="text-indigo-600 hover:text-indigo-700 underline"
          >
            Back to Projects
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Link to="/projects" className="text-indigo-600 hover:text-indigo-700 text-sm mb-2 block">
            ← Back to Projects
          </Link>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{project.name}</h1>
              {project.description && (
                <p className="mt-2 text-gray-600">{project.description}</p>
              )}
              <div className="mt-2 flex items-center space-x-4 text-sm text-gray-500">
                <span className="bg-gray-100 px-2 py-1 rounded">{project.backend}</span>
                <span>Created {new Date(project.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Statistics */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <StatCard label="Sources" value={summary.num_sources} icon="📄" />
            <StatCard label="Segments" value={summary.num_segments} icon="📝" />
            <StatCard label="Embeddings" value={summary.num_embeddings} icon="🔢" />
            <StatCard label="Pipelines" value={summary.num_pipelines} icon="⚙️" />
          </div>
        )}

        {/* Sections */}
        <div className="grid gap-6">
          <Section title="Sources" icon="📄">
            <p className="text-gray-500">
              Upload and manage source documents for embedding
            </p>
            <button className="mt-4 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-4 py-2 rounded-md font-medium transition-colors">
              Add Sources (Coming Soon)
            </button>
          </Section>

          <Section title="Pipelines" icon="⚙️">
            <p className="text-gray-500">
              Create and manage embedding pipelines
            </p>
            {summary && summary.pipelines.length > 0 && (
              <div className="mt-4 space-y-2">
                {summary.pipelines.map((pipeline) => (
                  <div
                    key={pipeline}
                    className="bg-gray-50 px-4 py-2 rounded flex items-center justify-between"
                  >
                    <span className="font-medium text-gray-900">{pipeline}</span>
                    <button className="text-indigo-600 hover:text-indigo-700 text-sm">
                      View →
                    </button>
                  </div>
                ))}
              </div>
            )}
            <button className="mt-4 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-4 py-2 rounded-md font-medium transition-colors">
              Create Pipeline (Coming Soon)
            </button>
          </Section>

          <Section title="Results" icon="📊">
            <p className="text-gray-500">
              View and visualize embedding results
            </p>
            <button className="mt-4 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-4 py-2 rounded-md font-medium transition-colors">
              View Results (Coming Soon)
            </button>
          </Section>
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, icon }: { label: string; value: number; icon: string }) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
        </div>
        <div className="text-4xl">{icon}</div>
      </div>
    </div>
  )
}

function Section({
  title,
  icon,
  children,
}: {
  title: string
  icon: string
  children: React.ReactNode
}) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center mb-4">
        <span className="text-2xl mr-2">{icon}</span>
        <h2 className="text-xl font-bold text-gray-900">{title}</h2>
      </div>
      <div>{children}</div>
    </div>
  )
}
