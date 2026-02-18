import { useState, useCallback } from 'react'
import api from '../api'
import { useAsyncOperation } from './useAsyncOperation'
import { aggregateAsyncState, orArray, orFalse, orNull } from './asyncHelpers'
import type {
  Deployment,
  DeploymentResponse,
  DeploymentStatusResponse,
  DeploymentLogs,
  QuickDeployRequest,
  DeployFromJobRequest,
  ModelApi,
} from '../types/deployment'

interface UseDeploymentsResult {
  deployments: Deployment[]
  modelApis: ModelApi[]
  loading: boolean
  error: string | null
  fetchDeployments: () => Promise<Deployment[]>
  fetchModelApis: () => Promise<ModelApi[]>
  getDeployment: (deploymentId: string) => Promise<Deployment | null>
  getDeploymentStatus: (deploymentId: string) => Promise<DeploymentStatusResponse | null>
  startDeployment: (deploymentId: string) => Promise<DeploymentResponse | null>
  stopDeployment: (deploymentId: string) => Promise<DeploymentResponse | null>
  deleteDeployment: (deploymentId: string) => Promise<boolean>
  getDeploymentLogs: (deploymentId: string, logType?: string) => Promise<string | null>
  quickDeploy: (request: QuickDeployRequest) => Promise<DeploymentResponse | null>
  deployFromJob: (request: DeployFromJobRequest) => Promise<DeploymentResponse | null>
}

export function useDeployments(): UseDeploymentsResult {
  const [deployments, setDeployments] = useState<Deployment[]>([])
  const [modelApis, setModelApis] = useState<ModelApi[]>([])

  const fetchDeploymentsOp = useAsyncOperation(
    async () => {
      const { data } = await api.get<{ success: boolean; data: Deployment[]; error?: string; warning?: string }>('deployments')
      if (!data.success) {
        throw new Error(data.error || data.warning || 'Failed to fetch deployments')
      }
      const deploymentList = data.data || []
      setDeployments(deploymentList)
      return deploymentList
    },
    { errorMessage: 'Failed to fetch deployments' }
  )

  const fetchModelApisOp = useAsyncOperation(
    async () => {
      const { data } = await api.get<{ success: boolean; data: ModelApi[]; error?: string; warning?: string }>('modelapis')
      if (!data.success) {
        throw new Error(data.error || data.warning || 'Failed to fetch model APIs')
      }
      const apiList = data.data || []
      setModelApis(apiList)
      return apiList
    },
    { errorMessage: 'Failed to fetch model APIs' }
  )

  const getDeploymentOp = useAsyncOperation(
    async (deploymentId: string) => {
      const { data } = await api.post<{ success: boolean; data: Deployment }>('deploymentget', {
        deployment_id: deploymentId
      })
      return data.data || null
    },
    { errorMessage: 'Failed to get deployment' }
  )

  const getDeploymentStatusOp = useAsyncOperation(
    async (deploymentId: string) => {
      const { data } = await api.post<DeploymentStatusResponse>('deploymentstatus', {
        deployment_id: deploymentId
      })
      return data
    },
    { errorMessage: 'Failed to get deployment status' }
  )

  const startDeploymentOp = useAsyncOperation(
    async (deploymentId: string, refreshFn: () => Promise<Deployment[]>) => {
      const { data } = await api.post<DeploymentResponse>('deploymentstart', {
        deployment_id: deploymentId
      })
      // Refresh deployments list
      await refreshFn()
      return data
    },
    { errorMessage: 'Failed to start deployment' }
  )

  const stopDeploymentOp = useAsyncOperation(
    async (deploymentId: string, refreshFn: () => Promise<Deployment[]>) => {
      const { data } = await api.post<DeploymentResponse>('deploymentstop', {
        deployment_id: deploymentId
      })
      // Refresh deployments list
      await refreshFn()
      return data
    },
    { errorMessage: 'Failed to stop deployment' }
  )

  const deleteDeploymentOp = useAsyncOperation(
    async (deploymentId: string, refreshFn: () => Promise<Deployment[]>) => {
      await api.post('deploymentdelete', { deployment_id: deploymentId })
      // Refresh deployments list
      await refreshFn()
      return true as const
    },
    { errorMessage: 'Failed to delete deployment' }
  )

  const getDeploymentLogsOp = useAsyncOperation(
    async (deploymentId: string, logType = 'stdout') => {
      const { data } = await api.post<DeploymentLogs>('deploymentlogs', {
        deployment_id: deploymentId,
        log_type: logType
      })
      return data.logs || null
    },
    { errorMessage: 'Failed to get deployment logs' }
  )

  const quickDeployOp = useAsyncOperation(
    async (request: QuickDeployRequest, refreshFn: () => Promise<Deployment[]>) => {
      const { data } = await api.post<DeploymentResponse>('quickdeploy', request)
      // Refresh deployments list
      await refreshFn()
      return data
    },
    { errorMessage: 'Failed to deploy model' }
  )

  const deployFromJobOp = useAsyncOperation(
    async (request: DeployFromJobRequest, refreshFn: () => Promise<Deployment[]>) => {
      const { data } = await api.post<DeploymentResponse>('deployfromjob', request)
      // Best-effort refresh to avoid masking a successful deployment with a list error.
      try {
        await refreshFn()
      } catch (refreshError) {
        console.warn('Deployment succeeded but failed to refresh deployment list:', refreshError)
      }
      return data
    },
    { errorMessage: 'Failed to deploy from job' }
  )

  const { loading, error } = aggregateAsyncState([
    fetchDeploymentsOp,
    fetchModelApisOp,
    getDeploymentOp,
    getDeploymentStatusOp,
    startDeploymentOp,
    stopDeploymentOp,
    deleteDeploymentOp,
    getDeploymentLogsOp,
    quickDeployOp,
    deployFromJobOp,
  ])

  // Wrap execute calls to preserve the original return-type contracts
  const fetchDeployments = useCallback(async () => {
    return orArray(fetchDeploymentsOp.execute())
  }, [fetchDeploymentsOp.execute])

  const fetchModelApis = useCallback(async () => {
    return orArray(fetchModelApisOp.execute())
  }, [fetchModelApisOp.execute])

  const getDeployment = useCallback(async (deploymentId: string) => {
    return orNull(getDeploymentOp.execute(deploymentId))
  }, [getDeploymentOp.execute])

  const getDeploymentStatus = useCallback(async (deploymentId: string) => {
    return orNull(getDeploymentStatusOp.execute(deploymentId))
  }, [getDeploymentStatusOp.execute])

  const startDeployment = useCallback(async (deploymentId: string) => {
    return orNull(startDeploymentOp.execute(deploymentId, fetchDeployments))
  }, [startDeploymentOp.execute, fetchDeployments])

  const stopDeployment = useCallback(async (deploymentId: string) => {
    return orNull(stopDeploymentOp.execute(deploymentId, fetchDeployments))
  }, [stopDeploymentOp.execute, fetchDeployments])

  const deleteDeployment = useCallback(async (deploymentId: string) => {
    return orFalse(deleteDeploymentOp.execute(deploymentId, fetchDeployments))
  }, [deleteDeploymentOp.execute, fetchDeployments])

  const getDeploymentLogs = useCallback(async (deploymentId: string, logType?: string) => {
    return orNull(getDeploymentLogsOp.execute(deploymentId, logType ?? 'stdout'))
  }, [getDeploymentLogsOp.execute])

  const quickDeploy = useCallback(async (request: QuickDeployRequest) => {
    return orNull(quickDeployOp.execute(request, fetchDeployments))
  }, [quickDeployOp.execute, fetchDeployments])

  const deployFromJob = useCallback(async (request: DeployFromJobRequest) => {
    return orNull(deployFromJobOp.execute(request, fetchDeployments))
  }, [deployFromJobOp.execute, fetchDeployments])

  return {
    deployments,
    modelApis,
    loading,
    error,
    fetchDeployments,
    fetchModelApis,
    getDeployment,
    getDeploymentStatus,
    startDeployment,
    stopDeployment,
    deleteDeployment,
    getDeploymentLogs,
    quickDeploy,
    deployFromJob,
  }
}
