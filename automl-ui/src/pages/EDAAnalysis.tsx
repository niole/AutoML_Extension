import { useCallback, useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useDatasets, useUploadFile, useDatasetPreview } from '../hooks/useDatasets'
import { useProfiling } from '../hooks/useProfiling'
import { useStore } from '../store'
import { Dataset, DatasetFile } from '../types/dataset'
import { generateEDANotebook } from '../utils/notebookGenerator'
import { DataSourceSelector } from '../components/eda/DataSourceSelector'
import { ProfiledDataView } from '../components/eda/ProfiledDataView'

interface TransformConfig {
  column: string
  type: 'fillna' | 'scale' | 'encode' | 'drop' | 'log' | 'clip'
}

function EDAAnalysis() {
  const { data: datasetsData, isLoading: loadingDatasets } = useDatasets()
  const uploadMutation = useUploadFile()
  const addNotification = useStore((state) => state.addNotification)
  const { profile, loading: profilingLoading, error: profilingError, profileFile } = useProfiling()

  const [sourceType, setSourceType] = useState<'upload' | 'dataset'>('dataset')
  const [selectedDataset, setSelectedDataset] = useState<Dataset | null>(null)
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null)
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null)
  const [transforms, setTransforms] = useState<TransformConfig[]>([])
  const [isExporting, setIsExporting] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)

  const datasets = datasetsData?.datasets || []

  const offset = (currentPage - 1) * pageSize
  const { data: preview, isLoading: previewLoading, error: previewError } = useDatasetPreview(
    selectedFilePath || '',
    pageSize,
    offset
  )

  useEffect(() => {
    if (selectedFilePath) {
      profileFile(selectedFilePath)
    }
  }, [selectedFilePath, profileFile])

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return
      const file = acceptedFiles[0]
      try {
        const result = await uploadMutation.mutateAsync(file)
        setSelectedFilePath(result.file_path)
        setSelectedFileName(result.file_name)
      } catch (error) {
        addNotification(
          error instanceof Error ? error.message : 'Upload failed',
          'error'
        )
      }
    },
    [uploadMutation, addNotification]
  )

  const handleSelectDataset = (dataset: Dataset) => {
    setSelectedDataset(selectedDataset?.id === dataset.id ? null : dataset)
  }

  const handleSelectFile = (file: DatasetFile) => {
    setSelectedFilePath(file.path)
    setSelectedFileName(file.name)
    setTransforms([])
  }

  const handleChangeFile = () => {
    setSelectedFilePath(null)
    setSelectedFileName(null)
    setTransforms([])
  }

  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const addTransform = (transform: TransformConfig) => {
    setTransforms(prev => [...prev, transform])
  }

  const removeTransform = (index: number) => {
    setTransforms(prev => prev.filter((_, i) => i !== index))
  }

  const exportNotebook = async () => {
    if (!selectedFilePath || !selectedFileName || !profile) return
    setIsExporting(true)
    try {
      const notebook = generateEDANotebook({ path: selectedFilePath, name: selectedFileName }, profile, transforms)
      const blob = new Blob([JSON.stringify(notebook, null, 2)], { type: 'application/x-ipynb+json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `eda_${selectedFileName.replace(/\.[^.]+$/, '')}.ipynb`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch {
      addNotification('Failed to export notebook', 'error')
    } finally {
      setIsExporting(false)
    }
  }

  // Breadcrumb shared by both views
  const breadcrumb = (
    <nav className="flex items-center gap-2 text-sm">
      <Link to="/dashboard" className="text-domino-accent-purple hover:underline">
        AutoML
      </Link>
      <span className="text-domino-text-muted">/</span>
      <span className="text-domino-text-secondary">Data Exploration</span>
    </nav>
  )

  // If no file selected, show file selection UI
  if (!selectedFilePath) {
    return (
      <div className="space-y-6">
        {breadcrumb}

        <div>
          <h1 className="text-2xl font-normal text-domino-text-primary">Data Exploration</h1>
          <p className="text-sm text-domino-text-secondary mt-1">
            Select a dataset to analyze data quality, distributions, and prepare transformations
          </p>
        </div>

        <DataSourceSelector
          sourceType={sourceType}
          setSourceType={setSourceType}
          datasets={datasets}
          loadingDatasets={loadingDatasets}
          selectedDataset={selectedDataset}
          uploadIsPending={uploadMutation.isPending}
          onDrop={onDrop}
          onSelectDataset={handleSelectDataset}
          onSelectFile={handleSelectFile}
          formatSize={formatSize}
        />
      </div>
    )
  }

  // File is selected - show EDA analysis
  return (
    <div className="space-y-6">
      {breadcrumb}

      <ProfiledDataView
        selectedFilePath={selectedFilePath}
        selectedFileName={selectedFileName!}
        preview={preview}
        previewLoading={previewLoading}
        previewError={previewError}
        profile={profile}
        profilingLoading={profilingLoading}
        profilingError={profilingError}
        transforms={transforms}
        isExporting={isExporting}
        currentPage={currentPage}
        pageSize={pageSize}
        onChangeFile={handleChangeFile}
        onExportNotebook={exportNotebook}
        onAddTransform={addTransform}
        onRemoveTransform={removeTransform}
        onPageChange={setCurrentPage}
        onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1); }}
      />
    </div>
  )
}

export default EDAAnalysis
