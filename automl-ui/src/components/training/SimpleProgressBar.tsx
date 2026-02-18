interface SimpleProgressBarProps {
  progress: number
  status: string
}

export function SimpleProgressBar({ progress, status }: SimpleProgressBarProps) {
  const getStatusColor = (value: string) => {
    switch (value) {
      case 'completed':
      case 'running':
        return 'bg-domino-accent-purple'
      case 'failed':
        return 'bg-domino-accent-red'
      case 'cancelled':
        return 'bg-gray-500'
      default:
        return 'bg-domino-accent-yellow'
    }
  }

  return (
    <div>
      <div className="flex items-center justify-end text-sm mb-1">
        <span className="font-medium">{progress}%</span>
      </div>
      <div className="h-2 bg-gray-200 overflow-hidden">
        <div
          className={`h-full transition-all duration-300 ${getStatusColor(status)}`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  )
}
