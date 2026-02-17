import { useState, useMemo } from 'react'
import { useJobs, useDeleteJob } from '../hooks/useJobs'
import Spinner from '../components/common/Spinner'
import { ConfirmDialog } from '../components/common/ConfirmDialog'
import { Job } from '../types/job'
import { DashboardFilters } from '../components/dashboard/DashboardFilters'
import { EmptyState } from '../components/dashboard/EmptyState'
import { JobTableView } from '../components/dashboard/JobTableView'
import { JobCardView } from '../components/dashboard/JobCardView'
import { StorageCleanupDialog } from '../components/dashboard/StorageCleanupDialog'

type ViewMode = 'table' | 'card'

function Dashboard() {
  const [viewMode, setViewMode] = useState<ViewMode>('table')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [typeFilter, setTypeFilter] = useState<string>('')
  const [deleteConfirmJob, setDeleteConfirmJob] = useState<Job | null>(null)
  const [storageCleanupOpen, setStorageCleanupOpen] = useState(false)

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
      <DashboardFilters
        search={search}
        onSearchChange={setSearch}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        typeFilter={typeFilter}
        onTypeFilterChange={setTypeFilter}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onStorageCleanupClick={() => setStorageCleanupOpen(true)}
      />

      {/* Content */}
      {filteredJobs.length === 0 ? (
        <EmptyState hasJobs={allJobs.length > 0} />
      ) : viewMode === 'table' ? (
        <JobTableView jobs={filteredJobs} onDeleteRequest={setDeleteConfirmJob} />
      ) : (
        <JobCardView jobs={filteredJobs} onDeleteRequest={setDeleteConfirmJob} />
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

      <StorageCleanupDialog
        isOpen={storageCleanupOpen}
        onClose={() => setStorageCleanupOpen(false)}
      />
    </div>
  )
}

export default Dashboard
