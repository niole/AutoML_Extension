import { useState, useCallback } from 'react'
import api from '../api'
import { useAsyncOperation } from './useAsyncOperation'
import type {
  FeatureImportanceResult,
  ConfusionMatrixResult,
  ROCCurveResult,
  PrecisionRecallResult,
  RegressionDiagnosticsResult,
  LeaderboardResult,
  PredictionResult,
  BatchPredictionResult,
  ModelInfo
} from '../types/diagnostics'

interface UseDiagnosticsResult {
  featureImportance: FeatureImportanceResult | null
  confusionMatrix: ConfusionMatrixResult | null
  rocCurve: ROCCurveResult | null
  precisionRecall: PrecisionRecallResult | null
  regressionDiagnostics: RegressionDiagnosticsResult | null
  leaderboard: LeaderboardResult | null
  modelInfo: ModelInfo | null
  predictions: PredictionResult | null
  loading: boolean
  error: string | null
  // Reset function to clear cached data when switching jobs
  reset: () => void
  // Updated to use job_id instead of model_path
  getFeatureImportance: (jobId: string, modelType?: string) => Promise<FeatureImportanceResult | null>
  getConfusionMatrix: (jobId: string, modelType?: string) => Promise<ConfusionMatrixResult | null>
  getROCCurve: (jobId: string, modelType?: string) => Promise<ROCCurveResult | null>
  getPrecisionRecall: (jobId: string, modelType?: string) => Promise<PrecisionRecallResult | null>
  getRegressionDiagnostics: (jobId: string, modelType?: string) => Promise<RegressionDiagnosticsResult | null>
  getLeaderboard: (jobId: string, modelType?: string) => Promise<LeaderboardResult | null>
  getModelInfo: (modelId: string, modelType: string) => Promise<ModelInfo | null>
  predict: (modelId: string, modelType: string, data: Record<string, unknown>[], returnProbs?: boolean) => Promise<PredictionResult | null>
  batchPredict: (modelId: string, modelType: string, inputFile: string, outputFile: string) => Promise<BatchPredictionResult | null>
}

export function useDiagnostics(): UseDiagnosticsResult {
  const [featureImportance, setFeatureImportance] = useState<FeatureImportanceResult | null>(null)
  const [confusionMatrix, setConfusionMatrix] = useState<ConfusionMatrixResult | null>(null)
  const [rocCurve, setROCCurve] = useState<ROCCurveResult | null>(null)
  const [precisionRecall, setPrecisionRecall] = useState<PrecisionRecallResult | null>(null)
  const [regressionDiagnostics, setRegressionDiagnostics] = useState<RegressionDiagnosticsResult | null>(null)
  const [leaderboard, setLeaderboard] = useState<LeaderboardResult | null>(null)
  const [modelInfo, setModelInfo] = useState<ModelInfo | null>(null)
  const [predictions, setPredictions] = useState<PredictionResult | null>(null)

  const featureImportanceOp = useAsyncOperation(
    async (jobId: string, modelType?: string) => {
      const { data } = await api.post<FeatureImportanceResult>('featureimportance', {
        job_id: jobId,
        model_type: modelType
      })
      setFeatureImportance(data)
      return data
    },
    { errorMessage: 'Failed to get feature importance' }
  )

  const confusionMatrixOp = useAsyncOperation(
    async (jobId: string, modelType?: string) => {
      const { data } = await api.post<ConfusionMatrixResult>('confusionmatrix', {
        job_id: jobId,
        model_type: modelType
      })
      setConfusionMatrix(data)
      return data
    },
    { errorMessage: 'Failed to get confusion matrix' }
  )

  const rocCurveOp = useAsyncOperation(
    async (jobId: string, modelType?: string) => {
      const { data } = await api.post<ROCCurveResult>('roccurve', {
        job_id: jobId,
        model_type: modelType
      })
      setROCCurve(data)
      return data
    },
    { errorMessage: 'Failed to get ROC curve' }
  )

  const precisionRecallOp = useAsyncOperation(
    async (jobId: string, modelType?: string) => {
      const { data } = await api.post<PrecisionRecallResult>('precisionrecall', {
        job_id: jobId,
        model_type: modelType
      })
      setPrecisionRecall(data)
      return data
    },
    { errorMessage: 'Failed to get precision-recall curve' }
  )

  const regressionDiagnosticsOp = useAsyncOperation(
    async (jobId: string, modelType?: string) => {
      const { data } = await api.post<RegressionDiagnosticsResult>('regressiondiagnostics', {
        job_id: jobId,
        model_type: modelType
      })
      setRegressionDiagnostics(data)
      return data
    },
    { errorMessage: 'Failed to get regression diagnostics' }
  )

  const leaderboardOp = useAsyncOperation(
    async (jobId: string, modelType?: string) => {
      const { data } = await api.post<LeaderboardResult>('leaderboard', {
        job_id: jobId,
        model_type: modelType
      })
      setLeaderboard(data)
      return data
    },
    { errorMessage: 'Failed to get leaderboard' }
  )

  const modelInfoOp = useAsyncOperation(
    async (modelId: string, modelType: string) => {
      const { data } = await api.post<ModelInfo>('modelinfo', {
        model_id: modelId,
        model_type: modelType
      })
      setModelInfo(data)
      return data
    },
    { errorMessage: 'Failed to get model info' }
  )

  const predictOp = useAsyncOperation(
    async (modelId: string, modelType: string, inputData: Record<string, unknown>[], returnProbs = false) => {
      const { data: result } = await api.post<PredictionResult>('predict', {
        model_id: modelId,
        model_type: modelType,
        data: inputData,
        return_probabilities: returnProbs
      })
      setPredictions(result)
      return result
    },
    { errorMessage: 'Failed to make predictions' }
  )

  const batchPredictOp = useAsyncOperation(
    async (modelId: string, modelType: string, inputFile: string, outputFile: string) => {
      const { data } = await api.post<BatchPredictionResult>('predictbatch', {
        model_id: modelId,
        model_type: modelType,
        input_file: inputFile,
        output_file: outputFile
      })
      return data
    },
    { errorMessage: 'Failed to run batch predictions' }
  )

  // Derive combined loading/error from all operations
  const loading = featureImportanceOp.loading || confusionMatrixOp.loading ||
    rocCurveOp.loading || precisionRecallOp.loading || regressionDiagnosticsOp.loading ||
    leaderboardOp.loading || modelInfoOp.loading || predictOp.loading || batchPredictOp.loading
  const error = featureImportanceOp.error ?? confusionMatrixOp.error ??
    rocCurveOp.error ?? precisionRecallOp.error ?? regressionDiagnosticsOp.error ??
    leaderboardOp.error ?? modelInfoOp.error ?? predictOp.error ?? batchPredictOp.error ?? null

  // Reset all cached data - call when switching jobs
  const reset = useCallback(() => {
    setFeatureImportance(null)
    setConfusionMatrix(null)
    setROCCurve(null)
    setPrecisionRecall(null)
    setRegressionDiagnostics(null)
    setLeaderboard(null)
    setModelInfo(null)
    setPredictions(null)
    // Reset errors on all operations
    featureImportanceOp.reset()
    confusionMatrixOp.reset()
    rocCurveOp.reset()
    precisionRecallOp.reset()
    regressionDiagnosticsOp.reset()
    leaderboardOp.reset()
    modelInfoOp.reset()
    predictOp.reset()
    batchPredictOp.reset()
  }, [
    featureImportanceOp, confusionMatrixOp, rocCurveOp, precisionRecallOp,
    regressionDiagnosticsOp, leaderboardOp, modelInfoOp, predictOp, batchPredictOp
  ])

  // Wrap execute calls to preserve the original return-type contracts
  const getFeatureImportance = useCallback(async (jobId: string, modelType?: string) => {
    const result = await featureImportanceOp.execute(jobId, modelType)
    return result ?? null
  }, [featureImportanceOp.execute])

  const getConfusionMatrix = useCallback(async (jobId: string, modelType?: string) => {
    const result = await confusionMatrixOp.execute(jobId, modelType)
    return result ?? null
  }, [confusionMatrixOp.execute])

  const getROCCurve = useCallback(async (jobId: string, modelType?: string) => {
    const result = await rocCurveOp.execute(jobId, modelType)
    return result ?? null
  }, [rocCurveOp.execute])

  const getPrecisionRecall = useCallback(async (jobId: string, modelType?: string) => {
    const result = await precisionRecallOp.execute(jobId, modelType)
    return result ?? null
  }, [precisionRecallOp.execute])

  const getRegressionDiagnostics = useCallback(async (jobId: string, modelType?: string) => {
    const result = await regressionDiagnosticsOp.execute(jobId, modelType)
    return result ?? null
  }, [regressionDiagnosticsOp.execute])

  const getLeaderboard = useCallback(async (jobId: string, modelType?: string) => {
    const result = await leaderboardOp.execute(jobId, modelType)
    return result ?? null
  }, [leaderboardOp.execute])

  const getModelInfo = useCallback(async (modelId: string, modelType: string) => {
    const result = await modelInfoOp.execute(modelId, modelType)
    return result ?? null
  }, [modelInfoOp.execute])

  const predict = useCallback(async (
    modelId: string,
    modelType: string,
    data: Record<string, unknown>[],
    returnProbs = false
  ) => {
    const result = await predictOp.execute(modelId, modelType, data, returnProbs)
    return result ?? null
  }, [predictOp.execute])

  const batchPredict = useCallback(async (
    modelId: string,
    modelType: string,
    inputFile: string,
    outputFile: string
  ) => {
    const result = await batchPredictOp.execute(modelId, modelType, inputFile, outputFile)
    return result ?? null
  }, [batchPredictOp.execute])

  return {
    featureImportance,
    confusionMatrix,
    rocCurve,
    precisionRecall,
    regressionDiagnostics,
    leaderboard,
    modelInfo,
    predictions,
    loading,
    error,
    reset,
    getFeatureImportance,
    getConfusionMatrix,
    getROCCurve,
    getPrecisionRecall,
    getRegressionDiagnostics,
    getLeaderboard,
    getModelInfo,
    predict,
    batchPredict,
  }
}
