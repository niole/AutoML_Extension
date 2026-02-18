import { useState, useCallback } from 'react'
import api from '../api'
import { useAsyncOperation } from './useAsyncOperation'
import { aggregateAsyncState, orArray, orFalse, orNull } from './asyncHelpers'
import type {
  RegisteredModel,
  ModelVersion,
  RegisterModelResult,
  TransitionStageResult,
  ModelCard,
  ModelStage,
  ModelsByStage
} from '../types/registry'

interface UseRegistryResult {
  registeredModels: RegisteredModel[]
  modelVersions: ModelVersion[]
  modelsByStage: ModelsByStage | null
  modelCard: ModelCard | null
  loading: boolean
  error: string | null
  fetchRegisteredModels: () => Promise<RegisteredModel[]>
  fetchModelVersions: (modelName: string) => Promise<ModelVersion[]>
  registerModel: (
    modelPath: string,
    modelName: string,
    modelType: string,
    description?: string,
    metrics?: Record<string, number>,
    jobId?: string
  ) => Promise<RegisterModelResult | null>
  transitionStage: (
    modelName: string,
    version: string,
    stage: ModelStage,
    archiveExisting?: boolean
  ) => Promise<TransitionStageResult | null>
  updateDescription: (
    modelName: string,
    description: string,
    version?: string
  ) => Promise<boolean>
  deleteModelVersion: (modelName: string, version: string) => Promise<boolean>
  deleteModel: (modelName: string) => Promise<boolean>
  fetchModelCard: (modelName: string, version: string) => Promise<ModelCard | null>
  fetchModelsByStage: (modelName: string) => Promise<ModelsByStage | null>
  downloadModel: (modelName: string, version: string) => Promise<string | null>
}

export function useRegistry(): UseRegistryResult {
  const [registeredModels, setRegisteredModels] = useState<RegisteredModel[]>([])
  const [modelVersions, setModelVersions] = useState<ModelVersion[]>([])
  const [modelsByStage, setModelsByStage] = useState<ModelsByStage | null>(null)
  const [modelCard, setModelCard] = useState<ModelCard | null>(null)

  const fetchRegisteredModelsOp = useAsyncOperation(
    async () => {
      const { data } = await api.get<RegisteredModel[]>('registeredmodels')
      // Filter to only show models deployed from this application (prefixed with automlapp-)
      const filteredModels = data.filter(model => model.name.startsWith('automlapp-'))
      setRegisteredModels(filteredModels)
      return filteredModels
    },
    { errorMessage: 'Failed to fetch registered models' }
  )

  const fetchModelVersionsOp = useAsyncOperation(
    async (modelName: string) => {
      const { data } = await api.post<ModelVersion[]>('modelversions', { model_name: modelName })
      setModelVersions(data)
      return data
    },
    { errorMessage: 'Failed to fetch model versions' }
  )

  const registerModelOp = useAsyncOperation(
    async (
      modelPath: string,
      modelName: string,
      modelType: string,
      description?: string,
      metrics?: Record<string, number>,
      jobId?: string
    ) => {
      const { data } = await api.post<RegisterModelResult>('registermodel', {
        model_path: modelPath,
        model_name: modelName,
        model_type: modelType,
        description,
        metrics,
        job_id: jobId
      })
      return data
    },
    { errorMessage: 'Failed to register model' }
  )

  const transitionStageOp = useAsyncOperation(
    async (
      modelName: string,
      version: string,
      stage: ModelStage,
      archiveExisting = false
    ) => {
      const { data } = await api.post<TransitionStageResult>('transitionstage', {
        model_name: modelName,
        version,
        stage,
        archive_existing: archiveExisting
      })
      return data
    },
    { errorMessage: 'Failed to transition model stage' }
  )

  const updateDescriptionOp = useAsyncOperation(
    async (
      modelName: string,
      description: string,
      version?: string
    ) => {
      await api.post('updatedescription', {
        model_name: modelName,
        description,
        version
      })
      return true as const
    },
    { errorMessage: 'Failed to update description' }
  )

  const deleteModelVersionOp = useAsyncOperation(
    async (modelName: string, version: string) => {
      await api.post('deleteversion', {
        model_name: modelName,
        version
      })
      return true as const
    },
    { errorMessage: 'Failed to delete model version' }
  )

  const deleteModelOp = useAsyncOperation(
    async (modelName: string) => {
      await api.post('deletemodel', { model_name: modelName })
      return true as const
    },
    { errorMessage: 'Failed to delete model' }
  )

  const fetchModelCardOp = useAsyncOperation(
    async (modelName: string, version: string) => {
      const { data } = await api.post<ModelCard>('modelcard', {
        model_name: modelName,
        version,
        job_info: {},
        metrics: {}
      })
      setModelCard(data)
      return data
    },
    { errorMessage: 'Failed to fetch model card' }
  )

  const downloadModelOp = useAsyncOperation(
    async (modelName: string, version: string) => {
      const { data } = await api.post<{ local_path: string }>('downloadmodel', {
        model_name: modelName,
        version
      })
      return data.local_path
    },
    { errorMessage: 'Failed to download model' }
  )

  const { loading, error } = aggregateAsyncState([
    fetchRegisteredModelsOp,
    fetchModelVersionsOp,
    registerModelOp,
    transitionStageOp,
    updateDescriptionOp,
    deleteModelVersionOp,
    deleteModelOp,
    fetchModelCardOp,
    downloadModelOp,
  ])

  // Wrap execute calls to preserve the original return-type contracts
  const fetchRegisteredModels = useCallback(async () => {
    return orArray(fetchRegisteredModelsOp.execute())
  }, [fetchRegisteredModelsOp.execute])

  const fetchModelVersions = useCallback(async (modelName: string) => {
    return orArray(fetchModelVersionsOp.execute(modelName))
  }, [fetchModelVersionsOp.execute])

  const registerModel = useCallback(async (
    modelPath: string,
    modelName: string,
    modelType: string,
    description?: string,
    metrics?: Record<string, number>,
    jobId?: string
  ) => {
    return orNull(registerModelOp.execute(modelPath, modelName, modelType, description, metrics, jobId))
  }, [registerModelOp.execute])

  const transitionStage = useCallback(async (
    modelName: string,
    version: string,
    stage: ModelStage,
    archiveExisting?: boolean
  ) => {
    return orNull(transitionStageOp.execute(modelName, version, stage, archiveExisting ?? false))
  }, [transitionStageOp.execute])

  const updateDescription = useCallback(async (
    modelName: string,
    description: string,
    version?: string
  ) => {
    return orFalse(updateDescriptionOp.execute(modelName, description, version))
  }, [updateDescriptionOp.execute])

  const deleteModelVersion = useCallback(async (modelName: string, version: string) => {
    return orFalse(deleteModelVersionOp.execute(modelName, version))
  }, [deleteModelVersionOp.execute])

  const deleteModel = useCallback(async (modelName: string) => {
    return orFalse(deleteModelOp.execute(modelName))
  }, [deleteModelOp.execute])

  const fetchModelCard = useCallback(async (modelName: string, version: string) => {
    return orNull(fetchModelCardOp.execute(modelName, version))
  }, [fetchModelCardOp.execute])

  // fetchModelsByStage is a composite operation that calls fetchModelVersions internally
  const fetchModelsByStage = useCallback(async (modelName: string) => {
    try {
      const versions = await fetchModelVersions(modelName)
      const byStage: ModelsByStage = {
        model_name: modelName,
        stages: {
          None: [],
          Staging: [],
          Production: [],
          Archived: []
        }
      }

      versions.forEach(v => {
        const stage = v.stage as ModelStage
        if (byStage.stages[stage]) {
          byStage.stages[stage].push(v)
        }
      })

      setModelsByStage(byStage)
      return byStage
    } catch {
      return null
    }
  }, [fetchModelVersions])

  const downloadModel = useCallback(async (modelName: string, version: string) => {
    return orNull(downloadModelOp.execute(modelName, version))
  }, [downloadModelOp.execute])

  return {
    registeredModels,
    modelVersions,
    modelsByStage,
    modelCard,
    loading,
    error,
    fetchRegisteredModels,
    fetchModelVersions,
    registerModel,
    transitionStage,
    updateDescription,
    deleteModelVersion,
    deleteModel,
    fetchModelCard,
    fetchModelsByStage,
    downloadModel,
  }
}
