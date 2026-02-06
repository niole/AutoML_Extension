import { useState, useMemo, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import {
  MagnifyingGlassIcon,
  Squares2X2Icon,
  TableCellsIcon,
  CubeIcon,
  DocumentTextIcon,
  BoltIcon,
} from '@heroicons/react/24/outline'
import { useJobs, useDeleteJob } from '../hooks/useJobs'
import Spinner from '../components/common/Spinner'
import Dropdown from '../components/common/Dropdown'
import { ConfirmDialog } from '../components/common/ConfirmDialog'
import { Job } from '../types/job'
import { formatDuration, getStatusColor, getStatusIcon } from '../utils/formatters'

type ViewMode = 'table' | 'card'

function getDisplayStatus(job: Job): string {
  if (job.status === 'completed' && job.is_registered) return 'Deployed'
  return job.status
}

function getDuration(job: Job): string {
  if (!['completed', 'failed', 'cancelled'].includes(job.status)) return '—'
  return formatDuration(job.started_at, job.completed_at)
}

function getBestModel(job: Job): string {
  if (!job.leaderboard || job.leaderboard.length === 0) return '—'
  return job.leaderboard[0].model
}

function getBestScore(job: Job): string {
  if (!job.leaderboard || job.leaderboard.length === 0) return '—'
  return job.leaderboard[0].score_val.toFixed(4)
}

function Dashboard() {
  const [viewMode, setViewMode] = useState<ViewMode>('table')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [typeFilter, setTypeFilter] = useState<string>('')
  const [deleteConfirmJob, setDeleteConfirmJob] = useState<Job | null>(null)

  const { data, isLoading, error } = useJobs({ limit: 100 })
  const deleteJobMutation = useDeleteJob()
  const allJobs = data?.jobs || []

  const handleDeleteJob = async (job: Job) => {
    try {
      await deleteJobMutation.mutateAsync(job.id)
      setDeleteConfirmJob(null)
    } catch (err) {
      console.error('Failed to delete job:', err)
    }
  }

  const filteredJobs = useMemo(() => {
    return allJobs.filter((job: Job) => {
      if (search && !job.name.toLowerCase().includes(search.toLowerCase())) return false
      if (statusFilter && job.status !== statusFilter) return false
      if (typeFilter && job.model_type !== typeFilter) return false
      return true
    })
  }, [allJobs, search, statusFilter, typeFilter])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner size="lg" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-domino-accent-red">Failed to load jobs</p>
      </div>
    )
  }

  return (
    <div>
      {/* Page header */}
      <div className="flex items-center justify-between flex-wrap mb-5">
        <div>
          <h1 className="text-2xl font-normal text-domino-text-primary leading-tight">AutoML</h1>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/eda">
            <button className="h-[32px] px-[15px] bg-white text-domino-accent-purple text-sm font-normal rounded-[2px] border border-domino-accent-purple hover:bg-domino-accent-purple/5 transition-all duration-200 inline-flex items-center gap-2">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Explore Data
            </button>
          </Link>
          <Link to="/jobs/new">
            <button className="h-[32px] px-[15px] bg-domino-accent-purple text-white text-sm font-normal rounded-[2px] hover:bg-domino-accent-purple-hover transition-all duration-200 inline-flex items-center">
              New training job
            </button>
          </Link>
        </div>
      </div>

      {/* Toolbar: search, filters, view toggle */}
      <div className="flex items-center gap-4 mb-6">
        {/* Search */}
        <div className="relative">
          <MagnifyingGlassIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-domino-text-muted" />
          <input
            type="text"
            placeholder="Search job name"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-[11px] pr-9 h-[32px] w-[220px] text-sm border border-[#d9d9d9] rounded-[2px] bg-white text-domino-text-primary placeholder-domino-text-muted focus:outline-none focus:border-domino-accent-purple transition-all duration-200"
          />
        </div>

        {/* Status filter */}
        <Dropdown
          value={statusFilter}
          onChange={setStatusFilter}
          placeholder="Filter by status"
          className="w-[160px]"
          options={[
            { value: '', label: 'All statuses' },
            { value: 'running', label: 'Running' },
            { value: 'completed', label: 'Completed' },
            { value: 'failed', label: 'Failed' },
            { value: 'pending', label: 'Pending' },
            { value: 'cancelled', label: 'Cancelled' },
          ]}
        />

        {/* Type filter */}
        <Dropdown
          value={typeFilter}
          onChange={setTypeFilter}
          placeholder="Filter by type"
          className="w-[160px]"
          options={[
            { value: '', label: 'All types' },
            { value: 'tabular', label: 'Tabular' },
            { value: 'timeseries', label: 'Time series' },
            { value: 'multimodal', label: 'Multimodal' },
          ]}
        />

        <div className="flex-1" />

        {/* View toggle */}
        <div className="flex border border-[#d9d9d9] rounded-[2px] overflow-hidden">
          <button
            onClick={() => setViewMode('table')}
            className={`h-[32px] w-[32px] flex items-center justify-center ${viewMode === 'table' ? 'bg-domino-bg-tertiary' : 'bg-white hover:bg-domino-bg-tertiary'}`}
            title="Table view"
          >
            <TableCellsIcon className="h-4 w-4 text-domino-text-secondary" />
          </button>
          <button
            onClick={() => setViewMode('card')}
            className={`h-[32px] w-[32px] flex items-center justify-center border-l border-[#d9d9d9] ${viewMode === 'card' ? 'bg-domino-bg-tertiary' : 'bg-white hover:bg-domino-bg-tertiary'}`}
            title="Card view"
          >
            <Squares2X2Icon className="h-4 w-4 text-domino-text-secondary" />
          </button>
        </div>
      </div>

      {/* Content */}
      {filteredJobs.length === 0 ? (
        <EmptyState hasJobs={allJobs.length > 0} />
      ) : viewMode === 'table' ? (
        <TableView jobs={filteredJobs} onDeleteRequest={setDeleteConfirmJob} />
      ) : (
        <CardView jobs={filteredJobs} onDeleteRequest={setDeleteConfirmJob} />
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmJob && (
        <ConfirmDialog
          isOpen={true}
          onClose={() => setDeleteConfirmJob(null)}
          onConfirm={() => handleDeleteJob(deleteConfirmJob)}
          title="Delete Job"
          message={`Are you sure you want to delete "${deleteConfirmJob.name}"? This action cannot be undone.`}
          confirmLabel={deleteJobMutation.isPending ? 'Deleting...' : 'Delete'}
          variant="danger"
          isLoading={deleteJobMutation.isPending}
        />
      )}

      {/* Pagination info */}
      {filteredJobs.length > 0 && (
        <div className="flex items-center justify-end gap-2 mt-4 text-sm text-domino-text-secondary">
          <span>Showing 1–{filteredJobs.length} out of {filteredJobs.length}</span>
          <button className="h-[32px] w-[32px] flex items-center justify-center border border-[#d9d9d9] rounded-[2px] text-domino-text-muted" disabled>
            &lt;
          </button>
          <button className="h-[32px] w-[32px] flex items-center justify-center border border-domino-accent-purple rounded-[2px] text-domino-accent-purple">
            1
          </button>
          <button className="h-[32px] w-[32px] flex items-center justify-center border border-[#d9d9d9] rounded-[2px] text-domino-text-muted" disabled>
            &gt;
          </button>
        </div>
      )}
    </div>
  )
}

function EmptyState({ hasJobs }: { hasJobs: boolean }) {
  return (
    <div className="bg-white border border-domino-border">
      {/* Table header placeholder */}
      <div className="flex items-center gap-6 px-4 py-3 border-b border-domino-border">
        <span className="text-xs font-normal text-domino-text-secondary uppercase tracking-wide">Name</span>
        <span className="text-xs font-normal text-domino-text-secondary uppercase tracking-wide">Type</span>
        <span className="text-xs font-normal text-domino-text-secondary uppercase tracking-wide">Status</span>
        <span className="text-xs font-normal text-domino-text-secondary uppercase tracking-wide">Best model</span>
        <span className="text-xs font-normal text-domino-text-secondary uppercase tracking-wide">Created</span>
      </div>

      <div className="flex flex-col items-center py-16">
        <div className="w-20 h-20 bg-domino-bg-tertiary flex items-center justify-center mb-6">
          <BoltIcon className="h-10 w-10 text-domino-text-muted" />
        </div>
        <p className="text-domino-text-secondary text-sm mb-6">
          {hasJobs
            ? 'No jobs match your current filters.'
            : 'Train models to manage and track them through a unified interface.'}
        </p>
        <Link to="/jobs/new">
          <button className="h-[32px] px-[15px] bg-domino-accent-purple text-white text-sm font-normal hover:bg-domino-accent-purple-hover transition-all duration-200 inline-flex items-center">
            New training job
          </button>
        </Link>
      </div>
    </div>
  )
}

function TableView({ jobs, onDeleteRequest }: { jobs: Job[]; onDeleteRequest: (job: Job) => void }) {
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null)

  return (
    <div className="bg-white border border-domino-border">
      <table className="w-full">
        <thead>
          <tr className="border-b border-domino-border">
            <th className="px-4 py-3 text-left text-xs font-medium text-domino-text-secondary uppercase tracking-wide">
              <span className="inline-flex items-center gap-1 cursor-pointer hover:text-domino-text-primary">
                Name
                <svg className="w-3 h-3" viewBox="0 0 12 12" fill="currentColor">
                  <path d="M6 2l3 4H3l3-4zM6 10l-3-4h6l-3 4z" />
                </svg>
              </span>
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-domino-text-secondary uppercase tracking-wide">
              Type
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-domino-text-secondary uppercase tracking-wide">
              <span className="inline-flex items-center gap-1 cursor-pointer hover:text-domino-text-primary">
                Status
                <svg className="w-3 h-3" viewBox="0 0 12 12" fill="currentColor">
                  <path d="M6 2l3 4H3l3-4zM6 10l-3-4h6l-3 4z" />
                </svg>
              </span>
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-domino-text-secondary uppercase tracking-wide">
              Best model
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-domino-text-secondary uppercase tracking-wide">
              Score
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-domino-text-secondary uppercase tracking-wide">
              <span className="inline-flex items-center gap-1 cursor-pointer hover:text-domino-text-primary">
                Created
                <svg className="w-3 h-3" viewBox="0 0 12 12" fill="currentColor">
                  <path d="M6 2l3 4H3l3-4zM6 10l-3-4h6l-3 4z" />
                </svg>
              </span>
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-domino-text-secondary uppercase tracking-wide">
              Duration
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-domino-text-secondary uppercase tracking-wide w-16">
            </th>
          </tr>
        </thead>
        <tbody>
          {jobs.map((job) => (
            <tr key={job.id} className="border-b border-domino-border hover:bg-domino-bg-tertiary transition-colors">
              <td className="px-4 py-3">
                <Link
                  to={`/jobs/${job.id}`}
                  className="text-sm font-normal text-domino-accent-purple hover:underline"
                >
                  {job.name}
                </Link>
              </td>
              <td className="px-4 py-3 text-sm text-domino-text-primary capitalize">
                {job.model_type}
              </td>
              <td className="px-4 py-3">
                <span className={`inline-flex items-center gap-1.5 text-sm ${getStatusColor(job.status)}`}>
                  {getStatusIcon(job.status)}
                  <span className="capitalize">{getDisplayStatus(job)}</span>
                </span>
              </td>
              <td className="px-4 py-3 text-sm text-domino-text-primary ">
                {getBestModel(job)}
              </td>
              <td className="px-4 py-3 text-sm text-domino-text-primary ">
                {getBestScore(job)}
              </td>
              <td className="px-4 py-3 text-sm text-domino-text-secondary">
                {format(new Date(job.created_at), 'MM/dd/yyyy h:mm a')}
              </td>
              <td className="px-4 py-3 text-sm text-domino-text-secondary">
                {getDuration(job)}
              </td>
              <td className="px-4 py-3">
                <ActionsDropdown
                  isOpen={openDropdownId === job.id}
                  onToggle={() => setOpenDropdownId(openDropdownId === job.id ? null : job.id)}
                  onClose={() => setOpenDropdownId(null)}
                  onDelete={() => {
                    setOpenDropdownId(null)
                    onDeleteRequest(job)
                  }}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function CardView({ jobs, onDeleteRequest }: { jobs: Job[]; onDeleteRequest: (job: Job) => void }) {
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null)

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      {jobs.map((job) => (
        <div
          key={job.id}
          className="bg-white shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="flex">
            {/* Thumbnail area */}
            <div className="w-[140px] min-h-[140px] bg-gradient-to-br from-domino-accent-purple/20 to-domino-accent-purple/5 flex items-center justify-center flex-shrink-0 self-stretch">
              <CubeIcon className="h-12 w-12 text-domino-accent-purple/60" />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0 p-4 flex flex-col">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs text-domino-text-muted capitalize">{job.model_type}</p>
                  <Link
                    to={`/jobs/${job.id}`}
                    className="text-base font-medium text-domino-accent-purple hover:underline block truncate"
                  >
                    {job.name}
                  </Link>
                </div>
                <span className={`inline-flex items-center gap-1 text-sm whitespace-nowrap ${getStatusColor(job.status)}`}>
                  {getStatusIcon(job.status)}
                  <span className="capitalize">{getDisplayStatus(job)}</span>
                </span>
              </div>

              {job.leaderboard && job.leaderboard.length > 0 && (
                <p className="text-xs text-domino-text-secondary mt-2">
                  Best: {job.leaderboard[0].model} ({job.leaderboard[0].score_val.toFixed(4)})
                </p>
              )}

              {/* Footer actions */}
              <div className="flex items-center gap-4 mt-auto pt-3 border-t border-domino-border/50">
                <Link
                  to={`/jobs/${job.id}`}
                  className="inline-flex items-center gap-1 text-xs text-domino-accent-purple hover:underline"
                >
                  <DocumentTextIcon className="h-3.5 w-3.5" />
                  Model details
                </Link>
                <span className="text-xs text-domino-text-muted">
                  {format(new Date(job.created_at), 'MM/dd/yyyy h:mm a')}
                </span>
                <div className="ml-auto">
                  <ActionsDropdown
                    isOpen={openDropdownId === job.id}
                    onToggle={() => setOpenDropdownId(openDropdownId === job.id ? null : job.id)}
                    onClose={() => setOpenDropdownId(null)}
                    onDelete={() => {
                      setOpenDropdownId(null)
                      onDeleteRequest(job)
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// Actions Dropdown Component
interface ActionsDropdownProps {
  isOpen: boolean
  onToggle: () => void
  onClose: () => void
  onDelete: () => void
}

function ActionsDropdown({ isOpen, onToggle, onClose, onDelete }: ActionsDropdownProps) {
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, onClose])

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={onToggle}
        className="w-6 h-6 flex items-center justify-center text-domino-text-muted hover:text-domino-text-primary rounded transition-colors"
      >
        <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
          <circle cx="8" cy="3" r="1.5" />
          <circle cx="8" cy="8" r="1.5" />
          <circle cx="8" cy="13" r="1.5" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1 w-40 bg-white shadow-lg border border-[#d9d9d9] py-1 z-[100]">
          <button
            onClick={onDelete}
            className="w-full px-4 py-2 text-left text-sm text-domino-accent-red hover:bg-domino-bg-tertiary transition-colors"
          >
            Delete
          </button>
        </div>
      )}
    </div>
  )
}

export default Dashboard
