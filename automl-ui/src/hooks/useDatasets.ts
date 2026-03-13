import { useQuery, useMutation } from '@tanstack/react-query'
import { getDatasets, getDataset, getDatasetPreview, getDatasetSchema, getDatasetPreviewFromDataset, getDatasetSchemaFromDataset, uploadFile } from '../api/datasets'

export function useDatasets(projectId?: string) {
  return useQuery({
    queryKey: ['datasets', projectId],
    queryFn: () => getDatasets(projectId),
  })
}

export function useDataset(datasetId: string) {
  return useQuery({
    queryKey: ['dataset', datasetId],
    queryFn: () => getDataset(datasetId),
    enabled: !!datasetId,
  })
}

export function useDatasetPreview(filePath: string, limit: number = 100, offset: number = 0) {
  return useQuery({
    queryKey: ['datasetPreview', filePath, limit, offset],
    queryFn: () => getDatasetPreview(filePath, limit, offset),
    enabled: !!filePath,
  })
}

export function useDatasetSchema(filePath: string) {
  return useQuery({
    queryKey: ['datasetSchema', filePath],
    queryFn: () => getDatasetSchema(filePath),
    enabled: !!filePath,
  })
}

export function useDatasetPreviewFromDataset(datasetId?: string, fileName?: string, rows: number = 100) {
  return useQuery({
    queryKey: ['datasetPreviewById', datasetId, fileName, rows],
    queryFn: () => getDatasetPreviewFromDataset(datasetId!, fileName!, rows),
    enabled: !!datasetId && !!fileName,
  })
}

export function useDatasetSchemaFromDataset(datasetId?: string, fileName?: string) {
  return useQuery({
    queryKey: ['datasetSchemaById', datasetId, fileName],
    queryFn: () => getDatasetSchemaFromDataset(datasetId!, fileName!),
    enabled: !!datasetId && !!fileName,
  })
}

export function useUploadFile() {
  return useMutation({
    mutationFn: (payload: { file: File; projectId?: string }) => uploadFile(payload.file, payload.projectId),
  })
}
