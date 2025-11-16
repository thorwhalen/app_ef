/**
 * React Query hooks for results.
 */
import { useQuery } from '@tanstack/react-query'
import { resultsApi } from '@/services/resultsApi'
import type { VisualizationData } from '@/types/project'

/**
 * Hook to fetch segments.
 */
export const useSegments = (projectId: string) => {
  return useQuery<Record<string, string>>({
    queryKey: ['projects', projectId, 'results', 'segments'],
    queryFn: () => resultsApi.getSegments(projectId),
    enabled: !!projectId,
  })
}

/**
 * Hook to fetch embeddings.
 */
export const useEmbeddings = (projectId: string) => {
  return useQuery<Record<string, number[]>>({
    queryKey: ['projects', projectId, 'results', 'embeddings'],
    queryFn: () => resultsApi.getEmbeddings(projectId),
    enabled: !!projectId,
  })
}

/**
 * Hook to fetch planar embeddings.
 */
export const usePlanarEmbeddings = (projectId: string) => {
  return useQuery<Record<string, number[]>>({
    queryKey: ['projects', projectId, 'results', 'planar'],
    queryFn: () => resultsApi.getPlanarEmbeddings(projectId),
    enabled: !!projectId,
  })
}

/**
 * Hook to fetch clusters.
 */
export const useClusters = (projectId: string) => {
  return useQuery<Record<string, number>>({
    queryKey: ['projects', projectId, 'results', 'clusters'],
    queryFn: () => resultsApi.getClusters(projectId),
    enabled: !!projectId,
  })
}

/**
 * Hook to fetch all results.
 */
export const useAllResults = (projectId: string) => {
  return useQuery({
    queryKey: ['projects', projectId, 'results'],
    queryFn: () => resultsApi.getAllResults(projectId),
    enabled: !!projectId,
  })
}

/**
 * Hook to fetch visualization data.
 */
export const useVisualizationData = (projectId: string) => {
  return useQuery<VisualizationData>({
    queryKey: ['projects', projectId, 'results', 'visualization'],
    queryFn: () => resultsApi.getVisualizationData(projectId),
    enabled: !!projectId,
  })
}
