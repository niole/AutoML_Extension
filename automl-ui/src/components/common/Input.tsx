import { InputHTMLAttributes, forwardRef } from 'react'
import clsx from 'clsx'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-[#3F4547] mb-1"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={clsx(
            'w-full h-[32px] px-[11px] bg-white rounded-[4px] text-domino-text-primary placeholder-domino-text-secondary text-sm',
            'border transition-all duration-200',
            'focus:outline-none focus:border-[#3B3BD3] focus:shadow-[0_0_0_2px_rgba(59,59,211,0.1)]',
            'disabled:bg-[#F5F5F5] disabled:text-[#7F8385] disabled:cursor-not-allowed',
            error ? 'border-domino-accent-red' : 'border-domino-border',
            className
          )}
          {...props}
        />
        {error && (
          <p className="mt-1 text-sm text-domino-accent-red">{error}</p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'

export default Input
