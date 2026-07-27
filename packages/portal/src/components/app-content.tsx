import { cn } from '@/lib/utils.ts'
import React from 'react'

export default function AppContent({
  className,
  children,
  ...props
}: React.ComponentProps<'section'>) {
  return (
    <section
      className={cn(
        'mx-auto w-full max-w-3xl px-16 max-md:max-w-full max-md:px-6',
        className,
      )}
      {...props}>
      <div className="mx-auto w-full pb-20">{children}</div>
    </section>
  )
}
