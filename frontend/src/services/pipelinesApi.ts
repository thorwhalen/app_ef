/**
 * API service for pipelines.
 */
import apiClient from './api'
import type { Pipeline, PipelineCreate } from '@/types/project'

export interface PipelineExecution {
  execution_id: string
  pipeline_name: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  progress: number
  message?: string
  started_at: string
  completed_at?: string
  error?: string
}

export const pipelinesApi = {
  /**
   * List all pipelines for a project.
   */
  listPipelines: async (projectId: string): Promise<string[]> => {
    const response = await apiClient.get(`/api/v1/${projectId}/pipelines`)
    return response.data
  },

  /**
   * Get a specific pipeline configuration.
   */
  getPipeline: async (projectId: string, pipelineName: string): Promise<Pipeline> => {
    const response = await apiClient.get(`/api/v1/${projectId}/pipelines/${pipelineName}`)
    return response.data
  },

  /**
   * Create a new pipeline.
   */
  createPipeline: async (projectId: string, data: PipelineCreate): Promise<Pipeline> => {
    const response = await apiClient.post(`/api/v1/${projectId}/pipelines`, data)
    return response.data
  },

  /**
   * Delete a pipeline.
   */
  deletePipeline: async (projectId: string, pipelineName: string): Promise<void> => {
    await apiClient.delete(`/api/v1/${projectId}/pipelines/${pipelineName}`)
  },

  /**
   * Execute a pipeline.
   */
  executePipeline: async (projectId: string, pipelineName: string): Promise<PipelineExecution> => {
    const response = await apiClient.post(
      `/api/v1/${projectId}/pipelines/${pipelineName}/execute`
    )
    return response.data
  },

  /**
   * Get pipeline execution status.
   */
  getExecutionStatus: async (
    projectId: string,
    pipelineName: string,
    executionId: string
  ): Promise<PipelineExecution> => {
    const response = await apiClient.get(
      `/api/v1/${projectId}/pipelines/${pipelineName}/executions/${executionId}`
    )
    return response.data
  },
}
