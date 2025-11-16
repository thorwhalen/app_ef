/**
 * React Query hooks for pipelines.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { pipelinesApi, PipelineExecution } from '@/services/pipelinesApi'
import type { Pipeline, PipelineCreate } from '@/types/project'

/**
 * Hook to fetch all pipelines for a project.
 */
export const usePipelines = (projectId: string) => {
  return useQuery<string[]>({
    queryKey: ['projects', projectId, 'pipelines'],
    queryFn: () => pipelinesApi.listPipelines(projectId),
    enabled: !!projectId,
  })
}

/**
 * Hook to fetch a specific pipeline.
 */
export const usePipeline = (projectId: string, pipelineName: string) => {
  return useQuery<Pipeline>({
    queryKey: ['projects', projectId, 'pipelines', pipelineName],
    queryFn: () => pipelinesApi.getPipeline(projectId, pipelineName),
    enabled: !!projectId && !!pipelineName,
  })
}

/**
 * Hook to create a pipeline.
 */
export const useCreatePipeline = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ projectId, data }: { projectId: string; data: PipelineCreate }) =>
      pipelinesApi.createPipeline(projectId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['projects', variables.projectId, 'pipelines'] })
      queryClient.invalidateQueries({ queryKey: ['projects', variables.projectId, 'summary'] })
    },
  })
}

/**
 * Hook to delete a pipeline.
 */
export const useDeletePipeline = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ projectId, pipelineName }: { projectId: string; pipelineName: string }) =>
      pipelinesApi.deletePipeline(projectId, pipelineName),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['projects', variables.projectId, 'pipelines'] })
      queryClient.invalidateQueries({ queryKey: ['projects', variables.projectId, 'summary'] })
    },
  })
}

/**
 * Hook to execute a pipeline.
 */
export const useExecutePipeline = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ projectId, pipelineName }: { projectId: string; pipelineName: string }) =>
      pipelinesApi.executePipeline(projectId, pipelineName),
    onSuccess: (_, variables) => {
      // Invalidate results after execution starts
      queryClient.invalidateQueries({ queryKey: ['projects', variables.projectId, 'results'] })
    },
  })
}

/**
 * Hook to get pipeline execution status.
 */
export const useExecutionStatus = (
  projectId: string,
  pipelineName: string,
  executionId: string,
  pollInterval?: number
) => {
  return useQuery<PipelineExecution>({
    queryKey: ['projects', projectId, 'pipelines', pipelineName, 'executions', executionId],
    queryFn: () => pipelinesApi.getExecutionStatus(projectId, pipelineName, executionId),
    enabled: !!projectId && !!pipelineName && !!executionId,
    refetchInterval: (data) => {
      // Stop polling if completed or failed
      if (data?.status === 'completed' || data?.status === 'failed') {
        return false
      }
      return pollInterval || 2000 // Poll every 2 seconds by default
    },
  })
}
