import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import apiClient from '@/services/api'

export default function HomePage() {
  const [apiStatus, setApiStatus] = useState<'checking' | 'connected' | 'error'>('checking')
  const [apiMessage, setApiMessage] = useState('')

  useEffect(() => {
    apiClient
      .get('/health')
      .then((response) => {
        setApiStatus('connected')
        setApiMessage(`API is healthy (v${response.data.version})`)
      })
      .catch((error) => {
        setApiStatus('error')
        setApiMessage(`Cannot connect to API: ${error.message}`)
      })
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            app_ef
          </h1>
          <p className="text-xl text-gray-600 mb-2">
            A modern interface for the ef (Embedding Flow) framework
          </p>
          <p className="text-sm text-gray-500">
            Build, manage, and visualize embedding pipelines with ease
          </p>
        </div>

        {/* API Status */}
        <div className="max-w-md mx-auto mb-12">
          <div
            className={`p-4 rounded-lg border-2 ${
              apiStatus === 'connected'
                ? 'bg-green-50 border-green-200'
                : apiStatus === 'error'
                ? 'bg-red-50 border-red-200'
                : 'bg-yellow-50 border-yellow-200'
            }`}
          >
            <div className="flex items-center">
              <div
                className={`w-3 h-3 rounded-full mr-3 ${
                  apiStatus === 'connected'
                    ? 'bg-green-500'
                    : apiStatus === 'error'
                    ? 'bg-red-500'
                    : 'bg-yellow-500 animate-pulse'
                }`}
              />
              <p
                className={`text-sm font-medium ${
                  apiStatus === 'connected'
                    ? 'text-green-900'
                    : apiStatus === 'error'
                    ? 'text-red-900'
                    : 'text-yellow-900'
                }`}
              >
                {apiMessage || 'Checking API connection...'}
              </p>
            </div>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          <FeatureCard
            title="Project Management"
            description="Create and organize embedding projects with ease"
            icon="📁"
          />
          <FeatureCard
            title="Pipeline Builder"
            description="Visual interface for composing embedding workflows"
            icon="🔧"
          />
          <FeatureCard
            title="Real-time Execution"
            description="Run pipelines with live progress updates"
            icon="⚡"
          />
          <FeatureCard
            title="Interactive Viz"
            description="Explore embeddings and clusters in 2D/3D"
            icon="📊"
          />
          <FeatureCard
            title="Document Processing"
            description="Upload and manage source documents"
            icon="📄"
          />
          <FeatureCard
            title="Export Results"
            description="Download embeddings, clusters, and visualizations"
            icon="💾"
          />
        </div>

        {/* CTA */}
        <div className="text-center">
          <Link
            to="/projects"
            className="inline-block bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-8 py-4 rounded-lg transition-colors shadow-lg hover:shadow-xl"
          >
            Get Started with Projects →
          </Link>
        </div>

        {/* Footer */}
        <div className="mt-16 text-center text-gray-500 text-sm">
          <p>Built on top of the ef framework by Thor Whalen</p>
          <p className="mt-2">
            <a
              href="https://github.com/thorwhalen/ef"
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-600 hover:text-indigo-700 underline"
            >
              View ef on GitHub
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}

function FeatureCard({
  title,
  description,
  icon,
}: {
  title: string
  description: string
  icon: string
}) {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
      <div className="text-4xl mb-4">{icon}</div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 text-sm">{description}</p>
    </div>
  )
}
