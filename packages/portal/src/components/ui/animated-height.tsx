import {
  type FC,
  type ReactNode,
  type TransitionEventHandler,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'

import { cn } from '@/lib/utils'

export type AnimatedHeightContainerProps = {
  readonly children: ReactNode
  readonly className?: string
  readonly open?: boolean
}

export const AnimatedHeightContainer: FC<AnimatedHeightContainerProps> = ({
  children,
  className,
  open,
}) => {
  const [shouldRender, setShouldRender] = useState(() => open ?? true)
  const contentRef = useRef<HTMLDivElement>(null)
  const frameRef = useRef<HTMLDivElement>(null)
  const heightRef = useRef<number | null>(open === false ? 0 : null)

  useLayoutEffect(() => {
    if (open === true && !shouldRender) {
      setShouldRender(true)
      return
    }

    const content = contentRef.current
    const frame = frameRef.current
    if (!content || !frame) return
    const nextHeight = open === false ? 0 : content.offsetHeight
    const previousHeight = heightRef.current
    heightRef.current = nextHeight
    if (previousHeight === null || previousHeight === nextHeight) {
      if (open === false && nextHeight === 0) setShouldRender(false)
      return
    }

    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches
    if (prefersReducedMotion) {
      frame.style.height = ''
      frame.style.overflow = ''
      if (open === false) setShouldRender(false)
      return
    }

    const currentHeight = frame.style.height
      ? frame.getBoundingClientRect().height
      : previousHeight

    frame.style.height = `${currentHeight}px`
    frame.style.overflow = 'hidden'
    frame.style.transition = 'none'
    void frame.offsetHeight
    frame.style.transition = ''
    frame.style.height = `${nextHeight}px`
  })

  const handleTransitionEnd: TransitionEventHandler<HTMLDivElement> = event => {
    const frame = frameRef.current
    if (!frame || event.target !== frame || event.propertyName !== 'height') return

    if (open === false) {
      heightRef.current = 0
      setShouldRender(false)
      return
    }

    frame.style.height = ''
    frame.style.overflow = ''
  }

  return (
    <div
      ref={frameRef}
      data-slot="animated-height-container"
      className={cn(
        'overflow-hidden transition-[height] duration-200 ease-out motion-reduce:transition-none',
        className,
      )}
      aria-hidden={open === false ? true : undefined}
      onTransitionEnd={handleTransitionEnd}>
      {shouldRender && <div ref={contentRef}>{children}</div>}
    </div>
  )
}
