/**
 * React Query hooks for components.
 */
import { useQuery } from '@tanstack/react-query'
import { componentsApi } from '@/services/componentsApi'
import type { ComponentList } from '@/types/project'

/**
 * Hook to fetch all available components.
 */
export const useComponents = (projectId: string) => {
  return useQuery<ComponentList>({
    queryKey: ['projects', projectId, 'components'],
    queryFn: () => componentsApi.listComponents(projectId),
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000, // 5 minutes - components don't change often
  })
}

/**
 * Hook to fetch available embedders.
 */
export const useEmbedders = (projectId: string) => {
  return useQuery<string[]>({
    queryKey: ['projects', projectId, 'components', 'embedders'],
    queryFn: () => componentsApi.listEmbedders(projectId),
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000,
  })
}

/**
 * Hook to fetch available planarizers.
 */
export const usePlanarizers = (projectId: string) => {
  return useQuery<string[]>({
    queryKey: ['projects', projectId, 'components', 'planarizers'],
    queryFn: () => componentsApi.listPlanarizers(projectId),
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000,
  })
}

/**
 * Hook to fetch available clusterers.
 */
export const useClusterers = (projectId: string) => {
  return useQuery<string[]>({
    queryKey: ['projects', projectId, 'components', 'clusterers'],
    queryFn: () => componentsApi.listClusterers(projectId),
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000,
  })
}

/**
 * Hook to fetch available segmenters.
 */
export const useSegmenters = (projectId: string) => {
  return useQuery<string[]>({
    queryKey: ['projects', projectId, 'components', 'segmenters'],
    queryFn: () => componentsApi.listSegmenters(projectId),
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000,
  })
}
