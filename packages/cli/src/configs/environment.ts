export const isLocalRuntime = (): boolean => {
  const entry = process.argv[1] ?? ''

  return entry.endsWith('/packages/cli/src/index.ts')
}

export const isLocalOrigin = (origin: string): boolean => {
  const { hostname } = new URL(origin)

  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '::1' ||
    hostname === '[::1]'
  )
}
