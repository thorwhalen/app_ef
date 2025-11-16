/**
 * React Query hooks for projects.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { projectsApi } from '@/services/projectsApi'
import type { Project, ProjectCreate, ProjectUpdate, ProjectSummary } from '@/types/project'

/**
 * Hook to fetch all projects.
 */
export const useProjects = (skip = 0, limit = 100) => {
  return useQuery<Project[]>({
    queryKey: ['projects', skip, limit],
    queryFn: () => projectsApi.listProjects(skip, limit),
  })
}

/**
 * Hook to fetch a specific project.
 */
export const useProject = (projectId: string) => {
  return useQuery<Project>({
    queryKey: ['projects', projectId],
    queryFn: () => projectsApi.getProject(projectId),
    enabled: !!projectId,
  })
}

/**
 * Hook to fetch project summary.
 */
export const useProjectSummary = (projectId: string) => {
  return useQuery<ProjectSummary>({
    queryKey: ['projects', projectId, 'summary'],
    queryFn: () => projectsApi.getProjectSummary(projectId),
    enabled: !!projectId,
  })
}

/**
 * Hook to create a new project.
 */
export const useCreateProject = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: ProjectCreate) => projectsApi.createProject(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
    },
  })
}

/**
 * Hook to update a project.
 */
export const useUpdateProject = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ projectId, data }: { projectId: string; data: ProjectUpdate }) =>
      projectsApi.updateProject(projectId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      queryClient.invalidateQueries({ queryKey: ['projects', variables.projectId] })
    },
  })
}

/**
 * Hook to delete a project.
 */
export const useDeleteProject = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (projectId: string) => projectsApi.deleteProject(projectId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
    },
  })
}
