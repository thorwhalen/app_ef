/**
 * API service for results.
 */
import apiClient from './api'
import type { VisualizationData } from '@/types/project'

export const resultsApi = {
  /**
   * Get all segments.
   */
  getSegments: async (projectId: string): Promise<Record<string, string>> => {
    const response = await apiClient.get(`/api/v1/${projectId}/results/segments`)
    return response.data
  },

  /**
   * Get all embeddings.
   */
  getEmbeddings: async (projectId: string): Promise<Record<string, number[]>> => {
    const response = await apiClient.get(`/api/v1/${projectId}/results/embeddings`)
    return response.data
  },

  /**
   * Get planar (2D/3D) embeddings.
   */
  getPlanarEmbeddings: async (projectId: string): Promise<Record<string, number[]>> => {
    const response = await apiClient.get(`/api/v1/${projectId}/results/planar`)
    return response.data
  },

  /**
   * Get cluster assignments.
   */
  getClusters: async (projectId: string): Promise<Record<string, number>> => {
    const response = await apiClient.get(`/api/v1/${projectId}/results/clusters`)
    return response.data
  },

  /**
   * Get all results.
   */
  getAllResults: async (projectId: string): Promise<any> => {
    const response = await apiClient.get(`/api/v1/${projectId}/results`)
    return response.data
  },

  /**
   * Get visualization data.
   */
  getVisualizationData: async (projectId: string): Promise<VisualizationData> => {
    const response = await apiClient.get(`/api/v1/${projectId}/results/visualization`)
    return response.data
  },
}
