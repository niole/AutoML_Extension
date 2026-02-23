import { ButtonHTMLAttributes, forwardRef } from 'react'
import clsx from 'clsx'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline' | 'tertiary' | 'link'
  size?: 'sm' | 'md' | 'lg'
  isLoading?: boolean
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading, children, disabled, ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center font-medium whitespace-nowrap text-center transition-all duration-200 select-none rounded-[4px] disabled:cursor-not-allowed'

    const variants = {
      primary: 'bg-[#3B3BD3] text-white hover:bg-[#2E2EA8] active:bg-[#24247D] border border-transparent disabled:bg-[#DBE4E8] disabled:text-[#7F8385]',
      secondary: 'bg-[#EDECFB] text-[#1820A0] hover:bg-[#E2E0F8] border border-[#C9C5F2] disabled:bg-[#F5F5F5] disabled:text-[#7F8385] disabled:border-[#DBE4E8]',
      outline: 'bg-white text-[#3B3BD3] hover:border-[#3B3BD3] border border-[#DBE4E8] disabled:bg-[#F5F5F5] disabled:text-[#7F8385]',
      danger: 'bg-[#C20A29] text-white hover:bg-[#9B0821] active:bg-[#740618] border border-transparent disabled:bg-[#DBE4E8] disabled:text-[#7F8385]',
      ghost: 'text-[#7F8385] hover:text-[#3F4547] hover:bg-[#F5F5F5] border border-transparent disabled:opacity-50',
      tertiary: 'bg-transparent text-[#3B3BD3] hover:bg-[#EDECFB] border border-transparent disabled:text-[#7F8385]',
      link: 'bg-transparent text-[#3B3BD3] hover:underline border border-transparent disabled:text-[#7F8385] p-0 h-auto',
    }

    const sizes = {
      sm: 'h-[24px] px-[10px] text-xs',
      md: 'h-[32px] px-[16px] text-sm',
      lg: 'h-[40px] px-[20px] text-base',
    }

    return (
      <button
        ref={ref}
        className={clsx(baseStyles, variants[variant], variant !== 'link' && sizes[size], className)}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading && (
          <svg
            className="animate-spin -ml-1 mr-2 h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'

export default Button
