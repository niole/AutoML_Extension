import { useState, useCallback } from 'react'
import api from '../api'
import { useAsyncOperation } from './useAsyncOperation'
import type {
  DataProfile,
  TargetSuggestion,
  QuickProfile,
  ColumnProfile,
  MetricsByProblemType,
  PresetsByModelType
} from '../types/profiling'

interface UseProfilingResult {
  profile: DataProfile | null
  quickProfile: QuickProfile | null
  suggestions: TargetSuggestion[]
  columnProfile: ColumnProfile | null
  metrics: MetricsByProblemType | null
  presets: PresetsByModelType | null
  loading: boolean
  error: string | null
  profileFile: (filePath: string, sampleSize?: number) => Promise<DataProfile | null>
  quickProfileFile: (filePath: string) => Promise<QuickProfile | null>
  suggestTarget: (filePath: string) => Promise<TargetSuggestion[]>
  profileColumn: (filePath: string, columnName: string) => Promise<ColumnProfile | null>
  fetchMetrics: () => Promise<MetricsByProblemType | null>
  fetchPresets: () => Promise<PresetsByModelType | null>
}

export function useProfiling(): UseProfilingResult {
  const [profile, setProfile] = useState<DataProfile | null>(null)
  const [quickProfile, setQuickProfile] = useState<QuickProfile | null>(null)
  const [suggestions, setSuggestions] = useState<TargetSuggestion[]>([])
  const [columnProfile, setColumnProfile] = useState<ColumnProfile | null>(null)
  const [metrics, setMetrics] = useState<MetricsByProblemType | null>(null)
  const [presets, setPresets] = useState<PresetsByModelType | null>(null)

  const profileOp = useAsyncOperation(
    async (filePath: string, sampleSize = 10000) => {
      const { data } = await api.post<DataProfile>('profile', {
        file_path: filePath,
        sample_size: sampleSize
      })
      setProfile(data)
      return data
    },
    { errorMessage: 'Failed to profile file' }
  )

  const quickProfileOp = useAsyncOperation(
    async (filePath: string) => {
      const { data } = await api.post<QuickProfile>('profilequick', { file_path: filePath })
      setQuickProfile(data)
      return data
    },
    { errorMessage: 'Failed to quick profile file' }
  )

  const suggestTargetOp = useAsyncOperation(
    async (filePath: string) => {
      const { data } = await api.post<{ suggestions: TargetSuggestion[] }>('suggesttarget', {
        file_path: filePath
      })
      setSuggestions(data.suggestions)
      return data.suggestions
    },
    { errorMessage: 'Failed to suggest target' }
  )

  const profileColumnOp = useAsyncOperation(
    async (filePath: string, columnName: string) => {
      const { data } = await api.post<ColumnProfile>('profilecolumn', {
        file_path: filePath,
        column_name: columnName
      })
      setColumnProfile(data)
      return data
    },
    { errorMessage: 'Failed to profile column' }
  )

  const fetchMetricsOp = useAsyncOperation(
    async () => {
      const { data } = await api.get<MetricsByProblemType>('metrics')
      setMetrics(data)
      return data
    },
    { errorMessage: 'Failed to fetch metrics' }
  )

  const fetchPresetsOp = useAsyncOperation(
    async () => {
      const { data } = await api.get<PresetsByModelType>('presets')
      setPresets(data)
      return data
    },
    { errorMessage: 'Failed to fetch presets' }
  )

  // Derive combined loading/error from all operations
  const loading = profileOp.loading || quickProfileOp.loading || suggestTargetOp.loading ||
    profileColumnOp.loading || fetchMetricsOp.loading || fetchPresetsOp.loading
  const error = profileOp.error ?? quickProfileOp.error ?? suggestTargetOp.error ??
    profileColumnOp.error ?? fetchMetricsOp.error ?? fetchPresetsOp.error ?? null

  // Wrap execute calls to preserve the original return-type contracts
  // (returning null / [] on failure instead of undefined)
  const profileFile = useCallback(async (filePath: string, sampleSize?: number) => {
    const result = await profileOp.execute(filePath, sampleSize ?? 10000)
    return result ?? null
  }, [profileOp.execute])

  const quickProfileFile = useCallback(async (filePath: string) => {
    const result = await quickProfileOp.execute(filePath)
    return result ?? null
  }, [quickProfileOp.execute])

  const suggestTarget = useCallback(async (filePath: string) => {
    const result = await suggestTargetOp.execute(filePath)
    return result ?? []
  }, [suggestTargetOp.execute])

  const profileColumn = useCallback(async (filePath: string, columnName: string) => {
    const result = await profileColumnOp.execute(filePath, columnName)
    return result ?? null
  }, [profileColumnOp.execute])

  const fetchMetrics = useCallback(async () => {
    const result = await fetchMetricsOp.execute()
    return result ?? null
  }, [fetchMetricsOp.execute])

  const fetchPresets = useCallback(async () => {
    const result = await fetchPresetsOp.execute()
    return result ?? null
  }, [fetchPresetsOp.execute])

  return {
    profile,
    quickProfile,
    suggestions,
    columnProfile,
    metrics,
    presets,
    loading,
    error,
    profileFile,
    quickProfileFile,
    suggestTarget,
    profileColumn,
    fetchMetrics,
    fetchPresets,
  }
}
