/**
 * API service for projects.
 */
import apiClient from './api'
import type { Project, ProjectCreate, ProjectUpdate, ProjectSummary } from '@/types/project'

export const projectsApi = {
  /**
   * List all projects.
   */
  listProjects: async (skip = 0, limit = 100): Promise<Project[]> => {
    const response = await apiClient.get('/api/v1/projects', {
      params: { skip, limit },
    })
    return response.data
  },

  /**
   * Get a specific project by ID.
   */
  getProject: async (projectId: string): Promise<Project> => {
    const response = await apiClient.get(`/api/v1/projects/${projectId}`)
    return response.data
  },

  /**
   * Create a new project.
   */
  createProject: async (data: ProjectCreate): Promise<Project> => {
    const response = await apiClient.post('/api/v1/projects', data)
    return response.data
  },

  /**
   * Update a project.
   */
  updateProject: async (projectId: string, data: ProjectUpdate): Promise<Project> => {
    const response = await apiClient.put(`/api/v1/projects/${projectId}`, data)
    return response.data
  },

  /**
   * Delete a project.
   */
  deleteProject: async (projectId: string): Promise<void> => {
    await apiClient.delete(`/api/v1/projects/${projectId}`)
  },

  /**
   * Get project summary with statistics.
   */
  getProjectSummary: async (projectId: string): Promise<ProjectSummary> => {
    const response = await apiClient.get(`/api/v1/projects/${projectId}/summary`)
    return response.data
  },
}
