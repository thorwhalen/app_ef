/**
 * Type definitions for projects and related entities.
 */

export interface Project {
  id: string
  name: string
  backend: string
  description?: string
  created_at: string
  updated_at: string
  source_count: number
  pipeline_count: number
}

export interface ProjectCreate {
  name: string
  backend: 'memory' | 'filesystem' | 'cloud'
  description?: string
}

export interface ProjectUpdate {
  name?: string
  description?: string
}

export interface ProjectSummary {
  id: string
  name: string
  backend: string
  num_sources: number
  num_segments: number
  num_embeddings: number
  num_pipelines: number
  pipelines: string[]
}

export interface Source {
  key: string
  content: string
  metadata?: Record<string, any>
  created_at?: string
}

export interface SourceCreate {
  key: string
  content: string
  metadata?: Record<string, any>
}

export interface Pipeline {
  name: string
  embedder: string
  planarizer?: string
  clusterer?: string
  num_clusters?: number
  segmenter: string
  parameters?: Record<string, any>
  created_at?: string
}

export interface PipelineCreate {
  name: string
  embedder: string
  planarizer?: string
  clusterer?: string
  num_clusters?: number
  segmenter: string
  parameters?: Record<string, any>
}

export interface ComponentList {
  embedders: string[]
  planarizers: string[]
  clusterers: string[]
  segmenters: string[]
}

export interface VisualizationData {
  embeddings: number[][]
  clusters?: number[]
  labels?: string[]
  metadata?: Record<string, any>
}
