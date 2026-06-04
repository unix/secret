import type { ComponentProps, ReactNode } from 'react'

import { cn } from '@/lib/utils'

type LoadingProps = ComponentProps<'div'> & {
  readonly children?: ReactNode
  readonly label?: ReactNode
  readonly screenReaderLabel?: string
  readonly showLabel?: boolean
  readonly spinnerClassName?: string
}

function Loading({
  children,
  className,
  label = 'Loading...',
  screenReaderLabel = 'Loading...',
  showLabel = true,
  spinnerClassName,
  ...props
}: LoadingProps) {
  const content = children ?? label

  return (
    <div
      role="status"
      aria-label={showLabel ? undefined : screenReaderLabel}
      data-slot="loading"
      className={cn(
        'flex w-full items-center justify-center gap-2 text-muted-foreground',
        className,
      )}
      {...props}>
      <svg
        aria-hidden="true"
        data-slot="loading-spinner"
        viewBox="0 0 256 256"
        className={cn(
          'size-4 animate-spin select-none motion-reduce:animate-none',
          spinnerClassName,
        )}>
        <line
          x1="128"
          y1="32"
          x2="128"
          y2="64"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="24"
        />
        <line
          x1="195.9"
          y1="60.1"
          x2="173.3"
          y2="82.7"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="24"
        />
        <line
          x1="224"
          y1="128"
          x2="192"
          y2="128"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="24"
        />
        <line
          x1="195.9"
          y1="195.9"
          x2="173.3"
          y2="173.3"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="24"
        />
        <line
          x1="128"
          y1="224"
          x2="128"
          y2="192"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="24"
        />
        <line
          x1="60.1"
          y1="195.9"
          x2="82.7"
          y2="173.3"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="24"
        />
        <line
          x1="32"
          y1="128"
          x2="64"
          y2="128"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="24"
        />
        <line
          x1="60.1"
          y1="60.1"
          x2="82.7"
          y2="82.7"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="24"
        />
      </svg>
      {showLabel && content && (
        <span data-slot="loading-label" className="text-xs/relaxed text-inherit">
          {content}
        </span>
      )}
    </div>
  )
}

export { Loading }
