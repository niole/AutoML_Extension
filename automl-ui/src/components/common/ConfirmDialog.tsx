import { useEffect } from 'react'
import Button from './Button'

interface ConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'primary'
  isLoading?: boolean
}

function notifyModalOpen() {
  window.parent.postMessage({ type: 'domino-modal-open' }, '*')
}

function notifyModalClose() {
  window.parent.postMessage({ type: 'domino-modal-close' }, '*')
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'primary',
  isLoading = false,
}: ConfirmDialogProps) {
  useEffect(() => {
    if (isOpen) {
      notifyModalOpen()
      return () => {
        notifyModalClose()
      }
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" role="dialog" aria-modal="true" aria-labelledby="confirm-modal-title">
      <div className="bg-white max-w-md w-full mx-4 flex flex-col rounded-sm shadow-lg">
        <div className="flex items-center justify-between px-6 pt-6 pb-4">
          <h3 id="confirm-modal-title" className="text-xl font-semibold text-domino-text-primary">{title}</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-domino-text-muted hover:text-domino-text-primary transition-colors rounded-full hover:bg-domino-bg-tertiary"
            aria-label="Close dialog"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="px-6 pb-4">
          <p className="text-sm text-domino-text-secondary">{message}</p>
        </div>
        <div className="flex justify-end items-center gap-4 px-6 py-4 border-t border-domino-border">
          <button onClick={onClose} className="text-sm font-medium text-domino-accent-purple hover:underline">
            {cancelLabel}
          </button>
          <Button variant={variant} onClick={onConfirm} disabled={isLoading}>
            {isLoading ? 'Processing...' : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}
