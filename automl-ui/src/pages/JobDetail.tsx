import { useState, useEffect, useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { StopIcon, CloudArrowUpIcon } from '@heroicons/react/24/outline'
import { useJob, useJobStatus, useJobLogs, useCancelJob, useDeleteJob } from '../hooks/useJobs'
import Badge from '../components/common/Badge'
import { SimpleProgressBar } from '../components/training/TrainingProgressPanel'
import { ModelDiagnosticsPanel } from '../components/diagnostics/ModelDiagnosticsPanel'
import { LearningCurvesPanel } from '../components/diagnostics/LearningCurvesPanel'
import { RegisterModelDialog } from '../components/registry/ModelRegistryPanel'
import { ModelExportPanel } from '../components/export/ModelExportPanel'
import { TimeSeriesForecastPanel } from '../components/timeseries/TimeSeriesForecastPanel'
import { InteractiveLeaderboard } from '../components/leaderboard/InteractiveLeaderboard'
import { ConfirmDialog } from '../components/common/ConfirmDialog'
import { useJobProgress } from '../hooks/useJobProgress'
import type { JobStatus } from '../types/job'
import { formatDuration } from '../utils/formatters'

type DetailTab = 'overview' | 'progress' | 'leaderboard' | 'diagnostics' | 'learning' | 'forecast' | 'export' | 'logs'

function JobDetail() {
  const { jobId } = useParams<{ jobId: string }>()
  const { data: job, isLoading, refetch } = useJob(jobId!)
  const { data: statusData } = useJobStatus(jobId!, !!job && ['pending', 'running'].includes(job.status))
  const { data: logs } = useJobLogs(jobId!, 100)
  const cancelMutation = useCancelJob()

  const isTraining = !!job && ['pending', 'running'].includes(job.status)
  const { polledProgress, progressJobId, simulatedProgress } = useJobProgress(jobId, job, isTraining, refetch)

  const [activeTab, setActiveTab] = useState<DetailTab>('overview')
  const [showRegisterDialog, setShowRegisterDialog] = useState(false)
  const [showRegisterDropdown, setShowRegisterDropdown] = useState(false)
  const [showActionsDropdown, setShowActionsDropdown] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)

  const navigate = useNavigate()
  const deleteJobMutation = useDeleteJob()
  const registerDropdownRef = useRef<HTMLDivElement>(null)
  const actionsDropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (registerDropdownRef.current && !registerDropdownRef.current.contains(event.target as Node)) {
        setShowRegisterDropdown(false)
      }
      if (actionsDropdownRef.current && !actionsDropdownRef.current.contains(event.target as Node)) {
        setShowActionsDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleDeleteJob = async () => {
    try {
      await deleteJobMutation.mutateAsync(job!.id)
      setShowDeleteConfirm(false)
      navigate('/dashboard')
    } catch (err) {
      console.error('Failed to delete job:', err)
    }
  }

  if (!job && !isLoading) {
    return (
      <div className="text-center py-12">
        <p className="text-domino-accent-red">Job not found</p>
        <Link to="/dashboard" className="text-domino-accent-purple hover:underline text-sm">
          Back to AutoML
        </Link>
      </div>
    )
  }

  // Handle loading state - use defaults when job not yet loaded
  const jobStatus = job?.status || 'running'
  const isJobTerminal = ['completed', 'failed', 'cancelled'].includes(jobStatus)
  const validPolledProgress = !isJobTerminal && progressJobId === jobId ? polledProgress : null
  const currentStatus = isJobTerminal ? jobStatus : (validPolledProgress?.status || statusData?.status || jobStatus)
  const rawProgress = validPolledProgress?.progress ?? job?.progress ?? 0

  // Use simulated progress for smooth time-based animation
  // Take the higher of simulated progress or actual backend progress
  const currentProgress = isJobTerminal
    ? (jobStatus === 'completed' ? 100 : rawProgress)
    : Math.max(simulatedProgress, rawProgress)

  const handleCancel = async () => {
    setShowCancelConfirm(true)
  }

  const confirmCancel = async () => {
    if (job) {
      await cancelMutation.mutateAsync(job.id)
    }
    setShowCancelConfirm(false)
  }

  interface TabConfig {
    key: string
    label: string
    showWhenDone?: boolean
    showForTimeseries?: boolean
  }

  const allTabs: TabConfig[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'leaderboard', label: 'Leaderboard', showWhenDone: true },
    { key: 'diagnostics', label: 'Diagnostics', showWhenDone: true },
    { key: 'learning', label: 'Metrics', showWhenDone: true },
    { key: 'forecast', label: 'Forecast', showWhenDone: true, showForTimeseries: true },
    { key: 'export', label: 'Outputs', showWhenDone: true },
    { key: 'logs', label: 'Logs' },
  ]

  const tabs = allTabs.filter((tab) => {
    if (tab.showWhenDone && currentStatus !== 'completed') return false
    if (tab.showForTimeseries && job?.model_type !== 'timeseries') return false
    return true
  })

  return (
    <div>
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm mb-2">
        <Link to="/dashboard" className="text-domino-accent-purple hover:underline">
          AutoML
        </Link>
        <span className="text-domino-text-muted">/</span>
        <span className="text-domino-text-secondary">{job?.name || 'Training Job'}</span>
      </nav>

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap mb-5">
        <div>
          <h1 className="text-2xl font-normal text-domino-text-primary leading-tight">
            {job ? `Run: ${job.name}` : 'Training in Progress'}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          {['pending', 'running'].includes(currentStatus) && (
            <button
              onClick={handleCancel}
              disabled={cancelMutation.isPending}
              className="h-[32px] px-[15px] text-sm font-normal border border-transparent rounded-[2px] text-white bg-domino-accent-red hover:bg-domino-accent-red/90 transition-all duration-200 inline-flex items-center"
            >
              <StopIcon className="h-4 w-4 inline mr-1" />
              Cancel
            </button>
          )}
          {currentStatus === 'completed' && job?.model_path && (
            <div className="relative" ref={registerDropdownRef}>
              <button
                onClick={() => setShowRegisterDropdown(!showRegisterDropdown)}
                className="h-[32px] px-[15px] bg-domino-accent-purple text-white text-sm font-normal rounded-[2px] hover:bg-domino-accent-purple-hover transition-all duration-200 inline-flex items-center gap-1.5"
              >
                Register
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {showRegisterDropdown && (
                <div className="absolute right-0 mt-1 w-48 bg-white shadow-lg border border-gray-200 py-1 z-50">
                  <button
                    onClick={() => {
                      setShowRegisterDropdown(false)
                      setShowRegisterDialog(true)
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-domino-text-primary hover:bg-domino-bg-tertiary flex items-center gap-2 transition-colors"
                  >
                    <CloudArrowUpIcon className="w-4 h-4" />
                    Deploy to Registry
                  </button>
                </div>
              )}
            </div>
          )}
          <div className="relative" ref={actionsDropdownRef}>
            <button
              onClick={() => setShowActionsDropdown(!showActionsDropdown)}
              className="h-[32px] w-[32px] flex items-center justify-center border border-[#d9d9d9] rounded-[2px] text-domino-text-secondary hover:border-domino-accent-purple hover:text-domino-accent-purple transition-all duration-200"
            >
              <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
                <circle cx="8" cy="3" r="1.5" />
                <circle cx="8" cy="8" r="1.5" />
                <circle cx="8" cy="13" r="1.5" />
              </svg>
            </button>
            {showActionsDropdown && (
              <div className="absolute right-0 mt-1 w-40 bg-white shadow-lg border border-gray-200 py-1 z-50">
                <button
                  onClick={() => {
                    setShowActionsDropdown(false)
                    setShowDeleteConfirm(true)
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-domino-accent-red hover:bg-domino-bg-tertiary transition-colors"
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-domino-border mb-6">
        <nav className="flex gap-6">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as DetailTab)}
              className={`pb-3 text-sm border-b-2 -mb-px transition-colors ${
                activeTab === tab.key
                  ? 'border-domino-accent-purple text-domino-accent-purple font-medium'
                  : 'border-transparent text-domino-text-secondary hover:text-domino-text-primary font-normal'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Progress bar for running jobs */}
      {['pending', 'running'].includes(jobStatus) && activeTab === 'overview' && (
        <div className="mb-6">
          <SimpleProgressBar
            progress={currentProgress}
            status={currentStatus}
          />
        </div>
      )}

      {/* Tab content */}
      {activeTab === 'overview' && (
        <div>
          {/* Description */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-domino-text-primary mb-1">Description</h3>
            <p className="text-sm text-domino-text-secondary">
              {job?.description || (isLoading ? 'Loading...' : 'No description available')}
            </p>
          </div>

          {/* Metadata table */}
          <div className="mb-6">
            <table className="w-full">
              <thead>
                <tr className="border-b border-domino-border">
                  <th className="px-4 py-3 text-left text-sm font-medium text-domino-text-primary w-48">Metadata</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-domino-text-primary border-l border-domino-border">Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-domino-border">
                <MetadataRow label="Run ID" value={job?.id || (isLoading ? 'Loading...' : '—')} mono />
                <MetadataRow label="Model type" value={job?.model_type || (isLoading ? 'Loading...' : '—')} capitalize />
                {job?.problem_type && <MetadataRow label="Problem type" value={job.problem_type} capitalize />}
                <MetadataRow label="Target column" value={job?.target_column || (isLoading ? 'Loading...' : '—')} />
                <MetadataRow label="Preset" value={job?.preset?.replace(/_/g, ' ') || (isLoading ? 'Loading...' : '—')} capitalize />
                {job?.eval_metric && <MetadataRow label="Eval metric" value={job.eval_metric} />}
                {job?.time_limit && <MetadataRow label="Time limit" value={`${job.time_limit}s`} />}
                {job?.created_at && (
                  <MetadataRow
                    label="Created"
                    value={format(new Date(job.created_at), 'MMM d, yyyy h:mm a')}
                  />
                )}
                {job?.started_at && (
                  <MetadataRow
                    label="Duration"
                    value={formatDuration(job.started_at, job.completed_at)}
                  />
                )}
                <MetadataRow label="Status">
                  <Badge status={currentStatus as JobStatus} isRegistered={job?.is_registered} />
                </MetadataRow>
                {job?.experiment_name && (
                  <MetadataRow label="Experiment" value={job.experiment_name} />
                )}
                {job?.experiment_run_id && (
                  <MetadataRow label="MLflow run ID" value={job.experiment_run_id} mono />
                )}
              </tbody>
            </table>
          </div>

          {/* Metrics */}
          {job?.metrics && Object.keys(job.metrics).length > 0 && (
            <div className="mb-6">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-domino-border">
                    <th className="px-4 py-3 text-left text-sm font-medium text-domino-text-primary w-48">Metric</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-domino-text-primary border-l border-domino-border">Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-domino-border">
                  {Object.entries(job.metrics).map(([key, value]) => {
                    let displayValue: string
                    if (typeof value === 'number' && !isNaN(value)) {
                      displayValue = value.toFixed(4)
                    } else if (typeof value === 'object' && value !== null) {
                      displayValue = JSON.stringify(value)
                    } else {
                      displayValue = String(value ?? '—')
                    }
                    return (
                      <MetadataRow
                        key={key}
                        label={key.replace(/_/g, ' ')}
                        value={displayValue}
                        mono
                        capitalize
                      />
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Error */}
          {job?.error_message && (
            <div className="border border-domino-accent-red/30 bg-domino-accent-red/5 rounded p-4 mt-6">
              <p className="text-sm font-medium text-domino-accent-red mb-1">Error</p>
              <pre className="text-sm text-domino-accent-red  whitespace-pre-wrap">
                {job.error_message}
              </pre>
            </div>
          )}
        </div>
      )}

      {activeTab === 'leaderboard' && currentStatus === 'completed' && job && (
        <InteractiveLeaderboard leaderboard={job.leaderboard || []} />
      )}

      {activeTab === 'diagnostics' && currentStatus === 'completed' && job && (
        <ModelDiagnosticsPanel job={job} />
      )}

      {activeTab === 'learning' && currentStatus === 'completed' && job && (
        <LearningCurvesPanel jobId={job.id} modelType={job.model_type} />
      )}

      {activeTab === 'export' && currentStatus === 'completed' && job && (
        <ModelExportPanel jobId={job.id} jobName={job.name} projectName={job.project_name} modelType={job.model_type} problemType={job.problem_type} />
      )}

      {activeTab === 'forecast' && currentStatus === 'completed' && job?.model_type === 'timeseries' && (
        <TimeSeriesForecastPanel job={job} />
      )}

      {activeTab === 'logs' && (
        <div className="border border-domino-border rounded overflow-hidden">
          <div className="bg-domino-bg-secondary px-4 py-2.5 border-b border-domino-border">
            <h3 className="text-sm font-medium text-domino-text-primary">Training logs</h3>
          </div>
          <div className="p-4">
            {logs && logs.length > 0 ? (
              <div className="bg-domino-bg-tertiary rounded p-4 max-h-[500px] overflow-auto  text-xs leading-relaxed">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className={`py-0.5 ${
                      log.level === 'ERROR' ? 'text-domino-accent-red' :
                      log.level === 'WARNING' ? 'text-domino-accent-yellow' :
                      'text-domino-text-primary'
                    }`}
                  >
                    <span className="text-domino-text-muted">
                      [{format(new Date(log.timestamp), 'HH:mm:ss')}]
                    </span>{' '}
                    <span className="text-domino-text-secondary">[{log.level}]</span>{' '}
                    {log.message}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-domino-text-muted text-sm text-center py-8">
                No logs available yet
              </p>
            )}
          </div>
        </div>
      )}

      {/* Register Model Dialog */}
      {showRegisterDialog && job?.model_path && (
        <RegisterModelDialog
          jobId={job.id}
          modelPath={job.model_path}
          onClose={() => setShowRegisterDialog(false)}
          onSuccess={() => setShowRegisterDialog(false)}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && job && (
        <ConfirmDialog
          isOpen={true}
          onClose={() => setShowDeleteConfirm(false)}
          onConfirm={handleDeleteJob}
          title="Delete Job"
          message={`Are you sure you want to delete "${job.name}"? This action cannot be undone.`}
          confirmLabel={deleteJobMutation.isPending ? 'Deleting...' : 'Delete'}
          variant="danger"
          isLoading={deleteJobMutation.isPending}
        />
      )}

      {/* Cancel Confirmation Modal */}
      {showCancelConfirm && job && (
        <ConfirmDialog
          isOpen={true}
          onClose={() => setShowCancelConfirm(false)}
          onConfirm={confirmCancel}
          title="Cancel Job"
          message={`Are you sure you want to cancel "${job.name}"? The job will be stopped and any progress will be lost.`}
          confirmLabel={cancelMutation.isPending ? 'Cancelling...' : 'Cancel Job'}
          cancelLabel="Keep Running"
          variant="danger"
          isLoading={cancelMutation.isPending}
        />
      )}
    </div>
  )
}

function MetadataRow({
  label,
  value,
  mono,
  capitalize: cap,
  children,
}: {
  label: string
  value?: string
  mono?: boolean
  capitalize?: boolean
  children?: React.ReactNode
}) {
  return (
    <tr className="hover:bg-domino-bg-secondary transition-colors">
      <td className={`px-4 py-3 text-sm text-domino-text-secondary ${cap ? 'capitalize' : ''}`}>
        {label}
      </td>
      <td className={`px-4 py-3 text-sm text-domino-text-primary border-l border-domino-border ${mono ? '' : ''} ${cap ? 'capitalize' : ''}`}>
        {children || value || '—'}
      </td>
    </tr>
  )
}

export default JobDetail
