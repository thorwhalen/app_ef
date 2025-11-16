/**
 * API service for sources.
 */
import apiClient from './api'
import type { Source, SourceCreate } from '@/types/project'

export const sourcesApi = {
  /**
   * List all source keys for a project.
   */
  listSources: async (projectId: string): Promise<string[]> => {
    const response = await apiClient.get(`/api/v1/${projectId}/sources`)
    return response.data
  },

  /**
   * Get a specific source by key.
   */
  getSource: async (projectId: string, sourceKey: string): Promise<Source> => {
    const response = await apiClient.get(`/api/v1/${projectId}/sources/${sourceKey}`)
    return response.data
  },

  /**
   * Add a new source.
   */
  addSource: async (projectId: string, data: SourceCreate): Promise<Source> => {
    const response = await apiClient.post(`/api/v1/${projectId}/sources`, data)
    return response.data
  },

  /**
   * Add multiple sources at once.
   */
  addSourcesBulk: async (projectId: string, sources: SourceCreate[]): Promise<void> => {
    await apiClient.post(`/api/v1/${projectId}/sources/bulk`, { sources })
  },

  /**
   * Delete a source.
   */
  deleteSource: async (projectId: string, sourceKey: string): Promise<void> => {
    await apiClient.delete(`/api/v1/${projectId}/sources/${sourceKey}`)
  },

  /**
   * Upload a file as a source.
   */
  uploadSourceFile: async (projectId: string, file: File): Promise<Source> => {
    const formData = new FormData()
    formData.append('file', file)

    const response = await apiClient.post(
      `/api/v1/${projectId}/sources/upload`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    )
    return response.data
  },
}
