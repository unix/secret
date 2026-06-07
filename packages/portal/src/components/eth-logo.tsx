import { cn } from '@/lib/utils'

type EthLogoProps = {
  readonly className?: string
  readonly label?: string
}

export const EthLogo = ({ className, label }: EthLogoProps) => {
  return (
    <svg
      viewBox="0 0 256 417"
      fill="none"
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cn('size-2.5', className)}>
      <path
        fill="currentColor"
        fillOpacity="0.55"
        d="M127.9 0 125.1 9.5v275.2l2.8 2.8 127.8-75.5L127.9 0Z"
      />
      <path fill="currentColor" d="m127.9 0-127.8 212 127.8 75.5V154.1V0Z" />
      <path
        fill="currentColor"
        fillOpacity="0.55"
        d="m127.9 311.7-1.6 2v98.1l1.6 4.7 128-180.2-128 75.4Z"
      />
      <path fill="currentColor" d="M127.9 416.5V311.7L.1 236.3l127.8 180.2Z" />
      <path
        fill="currentColor"
        fillOpacity="0.25"
        d="m127.9 287.5 127.8-75.5-127.8-57.9v133.4Z"
      />
      <path
        fill="currentColor"
        fillOpacity="0.55"
        d="m.1 212 127.8 75.5V154.1L.1 212Z"
      />
    </svg>
  )
}
