'use client'

import { ButtonHTMLAttributes, forwardRef } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  fullWidth?: boolean
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, fullWidth, className = '', children, disabled, ...props }, ref) => {
    const base =
      'inline-flex items-center justify-center font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed'

    const variants = {
      primary:
        'bg-[#22c55e] text-white hover:bg-[#16a34a] focus:ring-[#22c55e] shadow-sm',
      secondary:
        'bg-[#f0fdf4] text-[#16a34a] hover:bg-[#dcfce7] focus:ring-[#22c55e]',
      outline:
        'border border-[#22c55e] text-[#22c55e] hover:bg-[#f0fdf4] focus:ring-[#22c55e] bg-transparent',
      ghost:
        'text-gray-600 hover:bg-gray-100 focus:ring-gray-300 bg-transparent',
      danger:
        'bg-red-500 text-white hover:bg-red-600 focus:ring-red-500',
    }

    const sizes = {
      sm: 'px-3 py-1.5 text-xs rounded-xl gap-1.5',
      md: 'px-4 py-2.5 text-sm rounded-2xl gap-2',
      lg: 'px-6 py-3.5 text-base rounded-2xl gap-2',
    }

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`${base} ${variants[variant]} ${sizes[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
        {...props}
      >
        {loading && (
          <svg
            className="animate-spin h-4 w-4"
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
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
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
