import { useState, useCallback } from 'react'
import api from '../api'
import { useAsyncOperation } from './useAsyncOperation'
import { aggregateAsyncState, orNull, resetAsyncOperations } from './asyncHelpers'
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

  const operations = [
    featureImportanceOp,
    confusionMatrixOp,
    rocCurveOp,
    precisionRecallOp,
    regressionDiagnosticsOp,
    leaderboardOp,
    modelInfoOp,
    predictOp,
    batchPredictOp,
  ]
  const { loading, error } = aggregateAsyncState(operations)

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
    resetAsyncOperations(operations)
  }, [
    featureImportanceOp,
    confusionMatrixOp,
    rocCurveOp,
    precisionRecallOp,
    regressionDiagnosticsOp,
    leaderboardOp,
    modelInfoOp,
    predictOp,
    batchPredictOp,
    operations,
  ])

  // Wrap execute calls to preserve the original return-type contracts
  const getFeatureImportance = useCallback(async (jobId: string, modelType?: string) => {
    return orNull(featureImportanceOp.execute(jobId, modelType))
  }, [featureImportanceOp.execute])

  const getConfusionMatrix = useCallback(async (jobId: string, modelType?: string) => {
    return orNull(confusionMatrixOp.execute(jobId, modelType))
  }, [confusionMatrixOp.execute])

  const getROCCurve = useCallback(async (jobId: string, modelType?: string) => {
    return orNull(rocCurveOp.execute(jobId, modelType))
  }, [rocCurveOp.execute])

  const getPrecisionRecall = useCallback(async (jobId: string, modelType?: string) => {
    return orNull(precisionRecallOp.execute(jobId, modelType))
  }, [precisionRecallOp.execute])

  const getRegressionDiagnostics = useCallback(async (jobId: string, modelType?: string) => {
    return orNull(regressionDiagnosticsOp.execute(jobId, modelType))
  }, [regressionDiagnosticsOp.execute])

  const getLeaderboard = useCallback(async (jobId: string, modelType?: string) => {
    return orNull(leaderboardOp.execute(jobId, modelType))
  }, [leaderboardOp.execute])

  const getModelInfo = useCallback(async (modelId: string, modelType: string) => {
    return orNull(modelInfoOp.execute(modelId, modelType))
  }, [modelInfoOp.execute])

  const predict = useCallback(async (
    modelId: string,
    modelType: string,
    data: Record<string, unknown>[],
    returnProbs = false
  ) => {
    return orNull(predictOp.execute(modelId, modelType, data, returnProbs))
  }, [predictOp.execute])

  const batchPredict = useCallback(async (
    modelId: string,
    modelType: string,
    inputFile: string,
    outputFile: string
  ) => {
    return orNull(batchPredictOp.execute(modelId, modelType, inputFile, outputFile))
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
