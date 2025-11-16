/**
 * React Query hooks for sources.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { sourcesApi } from '@/services/sourcesApi'
import type { Source, SourceCreate } from '@/types/project'

/**
 * Hook to fetch all source keys for a project.
 */
export const useSources = (projectId: string) => {
  return useQuery<string[]>({
    queryKey: ['projects', projectId, 'sources'],
    queryFn: () => sourcesApi.listSources(projectId),
    enabled: !!projectId,
  })
}

/**
 * Hook to fetch a specific source.
 */
export const useSource = (projectId: string, sourceKey: string) => {
  return useQuery<Source>({
    queryKey: ['projects', projectId, 'sources', sourceKey],
    queryFn: () => sourcesApi.getSource(projectId, sourceKey),
    enabled: !!projectId && !!sourceKey,
  })
}

/**
 * Hook to add a source.
 */
export const useAddSource = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ projectId, data }: { projectId: string; data: SourceCreate }) =>
      sourcesApi.addSource(projectId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['projects', variables.projectId, 'sources'] })
      queryClient.invalidateQueries({ queryKey: ['projects', variables.projectId, 'summary'] })
    },
  })
}

/**
 * Hook to add multiple sources at once.
 */
export const useAddSourcesBulk = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ projectId, sources }: { projectId: string; sources: SourceCreate[] }) =>
      sourcesApi.addSourcesBulk(projectId, sources),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['projects', variables.projectId, 'sources'] })
      queryClient.invalidateQueries({ queryKey: ['projects', variables.projectId, 'summary'] })
    },
  })
}

/**
 * Hook to upload a file as a source.
 */
export const useUploadSource = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ projectId, file }: { projectId: string; file: File }) =>
      sourcesApi.uploadSourceFile(projectId, file),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['projects', variables.projectId, 'sources'] })
      queryClient.invalidateQueries({ queryKey: ['projects', variables.projectId, 'summary'] })
    },
  })
}

/**
 * Hook to delete a source.
 */
export const useDeleteSource = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ projectId, sourceKey }: { projectId: string; sourceKey: string }) =>
      sourcesApi.deleteSource(projectId, sourceKey),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['projects', variables.projectId, 'sources'] })
      queryClient.invalidateQueries({ queryKey: ['projects', variables.projectId, 'summary'] })
    },
  })
}
