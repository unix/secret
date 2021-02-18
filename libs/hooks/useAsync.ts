import { DependencyList, useEffect } from 'react'

export type AsyncEffectCallbackMounted = () => boolean

export type NativeEffectCallback = (
  isMounted: AsyncEffectCallbackMounted,
) => void | (() => void | undefined)

export type AsyncEffectCallback = (
  isMounted: AsyncEffectCallbackMounted,
) => Promise<void | (() => void | undefined)>

export type CatchCallback = (error: Error) => void

const useAsync = (
  effect: AsyncEffectCallback | NativeEffectCallback,
  deps: DependencyList,
  catchHandler?: CatchCallback,
) => {
  let mounted = true
  const defaultCatchHandler = (error: Error) => {
    console.log(error.message)
    throw error
  }
  const catchFn = catchHandler || defaultCatchHandler

  useEffect(() => {
    Promise.resolve(effect(() => mounted)).catch(catchFn)
    return () => {
      mounted = false
    }
  }, deps)
}

export default useAsync
