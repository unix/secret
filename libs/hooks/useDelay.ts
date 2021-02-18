import { useEffect } from 'react'

export type DelayHandler = (fn: () => unknown, time?: number) => void

export type DelayReturnType<T extends number> = {
  [K in keyof Record<string, unknown> as `setDelay${T}ms`]: DelayHandler
}

const useDelay = <T extends number>(delay: T): DelayReturnType<T> => {
  const delays = []
  const setDelay: DelayHandler = (fn, time) => {
    const timer = setTimeout(() => {
      fn()
      clearTimeout(timer)
    }, time || delay)
    delays.push(timer)
  }

  useEffect(() => {
    return () => {
      delays.forEach(timer => {
        timer && clearTimeout(timer)
      })
    }
  }, [])

  return {
    [`setDelay${delay}ms`]: setDelay,
  }
}

export default useDelay
