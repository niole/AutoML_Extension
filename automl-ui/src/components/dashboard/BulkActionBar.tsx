interface BulkActionBarProps {
  selectedCount: number
  onClearSelection: () => void
  onBulkDelete: () => void
  isDeleting: boolean
}

export function BulkActionBar({ selectedCount, onClearSelection, onBulkDelete, isDeleting }: BulkActionBarProps) {
  if (selectedCount === 0) return null

  return (
    <div className="flex items-center gap-4 px-4 py-2.5 mb-4 bg-domino-bg-tertiary border border-domino-border rounded-sm">
      <span className="text-sm text-domino-text-primary font-medium">
        {selectedCount} {selectedCount === 1 ? 'job' : 'jobs'} selected
      </span>
      <button
        onClick={onClearSelection}
        className="text-sm text-domino-accent-purple hover:underline"
      >
        Clear selection
      </button>
      <div className="ml-auto">
        <button
          onClick={onBulkDelete}
          disabled={isDeleting}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-domino-accent-red hover:bg-domino-accent-red/90 disabled:opacity-50 disabled:cursor-not-allowed rounded-sm transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
          </svg>
          {isDeleting ? 'Deleting...' : `Delete ${selectedCount} ${selectedCount === 1 ? 'job' : 'jobs'}`}
        </button>
      </div>
    </div>
  )
}
