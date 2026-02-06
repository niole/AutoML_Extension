import { useRef, useEffect } from 'react'
import { StopIcon, CloudArrowUpIcon } from '@heroicons/react/24/outline'
import type { Job } from '../../types/job'

interface JobHeaderProps {
  job: Job | undefined
  currentStatus: string
  cancelIsPending: boolean
  showRegisterDropdown: boolean
  showActionsDropdown: boolean
  onCancel: () => void
  onToggleRegisterDropdown: () => void
  onCloseRegisterDropdown: () => void
  onOpenRegisterDialog: () => void
  onToggleActionsDropdown: () => void
  onCloseActionsDropdown: () => void
  onOpenDeleteConfirm: () => void
}

export function JobHeader({
  job,
  currentStatus,
  cancelIsPending,
  showRegisterDropdown,
  showActionsDropdown,
  onCancel,
  onToggleRegisterDropdown,
  onCloseRegisterDropdown,
  onOpenRegisterDialog,
  onToggleActionsDropdown,
  onCloseActionsDropdown,
  onOpenDeleteConfirm,
}: JobHeaderProps) {
  const registerDropdownRef = useRef<HTMLDivElement>(null)
  const actionsDropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (registerDropdownRef.current && !registerDropdownRef.current.contains(event.target as Node)) {
        onCloseRegisterDropdown()
      }
      if (actionsDropdownRef.current && !actionsDropdownRef.current.contains(event.target as Node)) {
        onCloseActionsDropdown()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [onCloseRegisterDropdown, onCloseActionsDropdown])

  return (
    <div className="flex items-center justify-between flex-wrap mb-5">
      <div>
        <h1 className="text-2xl font-normal text-domino-text-primary leading-tight">
          {job ? `Run: ${job.name}` : 'Training in Progress'}
        </h1>
      </div>
      <div className="flex items-center gap-3">
        {['pending', 'running'].includes(currentStatus) && (
          <button
            onClick={onCancel}
            disabled={cancelIsPending}
            className="h-[32px] px-[15px] text-sm font-normal border border-transparent rounded-[2px] text-white bg-domino-accent-red hover:bg-domino-accent-red/90 transition-all duration-200 inline-flex items-center"
          >
            <StopIcon className="h-4 w-4 inline mr-1" />
            Cancel
          </button>
        )}
        {currentStatus === 'completed' && job?.model_path && (
          <div className="relative" ref={registerDropdownRef}>
            <button
              onClick={onToggleRegisterDropdown}
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
                  onClick={onOpenRegisterDialog}
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
            onClick={onToggleActionsDropdown}
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
                onClick={onOpenDeleteConfirm}
                className="w-full px-4 py-2 text-left text-sm text-domino-accent-red hover:bg-domino-bg-tertiary transition-colors"
              >
                Delete
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
