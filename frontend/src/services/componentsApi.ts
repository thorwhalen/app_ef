/**
 * API service for components.
 */
import apiClient from './api'
import type { ComponentList } from '@/types/project'

export const componentsApi = {
  /**
   * List all available components.
   */
  listComponents: async (projectId: string): Promise<ComponentList> => {
    const response = await apiClient.get(`/api/v1/components/${projectId}`)
    return response.data
  },

  /**
   * List available embedders.
   */
  listEmbedders: async (projectId: string): Promise<string[]> => {
    const response = await apiClient.get(`/api/v1/components/${projectId}/embedders`)
    return response.data
  },

  /**
   * List available planarizers.
   */
  listPlanarizers: async (projectId: string): Promise<string[]> => {
    const response = await apiClient.get(`/api/v1/components/${projectId}/planarizers`)
    return response.data
  },

  /**
   * List available clusterers.
   */
  listClusterers: async (projectId: string): Promise<string[]> => {
    const response = await apiClient.get(`/api/v1/components/${projectId}/clusterers`)
    return response.data
  },

  /**
   * List available segmenters.
   */
  listSegmenters: async (projectId: string): Promise<string[]> => {
    const response = await apiClient.get(`/api/v1/components/${projectId}/segmenters`)
    return response.data
  },
}
