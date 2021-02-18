export const isBrowser = () => {
  return typeof window !== 'undefined'
}

export const isDev = () => {
  if (!isBrowser()) return false
  if (typeof process !== 'undefined') {
    return process.env.NODE_ENV !== 'production'
  }
  return /localhost|127\.|192\./.test(window.location.href)
}

export const isSafeOrigin = (origin: string) => {
  return /secret\.gl|localhost|127\.|192\./.test(origin)
}
