import { ACCESS_URL, ERRORS } from '../../utils/constants'
import { CipherError } from '../../utils/errors'

type DecodeAccessUrlInput<Fragment> = {
  readonly input: string
  readonly basePath?: string
  readonly decodeFragment: (fragment: string) => Fragment | null
}

export type DecodedAccessUrl<Fragment> = Fragment & {
  readonly readId: string
}

export const normalizeBasePath = (
  basePath: string = ACCESS_URL.DEFAULT_BASE_PATH,
): string => {
  const withLeadingSlash = basePath.startsWith('/') ? basePath : `/${basePath}`
  return withLeadingSlash.replace(/\/+$/, '')
}

export const normalizeOrigin = (origin?: string): string => {
  if (!origin) return ''

  return origin.replace(/\/+$/, '')
}

export const encodeAccessUrl = ({
  readId,
  origin,
  basePath,
  fragment,
}: {
  readonly readId: string
  readonly origin?: string
  readonly basePath?: string
  readonly fragment: string
}): string => {
  const path = `${normalizeBasePath(basePath)}/${encodeURIComponent(readId)}`
  return `${normalizeOrigin(origin)}${path}${fragment}`
}

export const decodeAccessUrl = <Fragment>({
  input,
  basePath,
  decodeFragment,
}: DecodeAccessUrlInput<Fragment>): DecodedAccessUrl<Fragment> | null => {
  const url = parseAbsoluteUrl(input)
  const fragment = decodeFragment(url.hash)
  if (!fragment) return null

  const expectedBasePath = normalizeBasePath(basePath)
  if (!url.pathname.startsWith(`${expectedBasePath}/`)) return null

  const readId = decodeURIComponent(url.pathname.slice(expectedBasePath.length + 1))
  if (!readId) return null

  return {
    ...fragment,
    readId,
  }
}

const hasOrigin = (input: string): boolean => {
  return /^[a-z][a-z\d+\-.]*:\/\//i.test(input)
}

const parseAbsoluteUrl = (input: string): URL => {
  if (!hasOrigin(input)) {
    throw new CipherError(ERRORS.INVALID_URL, 'Access URL must include an origin.')
  }

  try {
    return new URL(input)
  } catch (error) {
    throw new CipherError(ERRORS.INVALID_URL, 'Invalid access URL.', {
      cause: error,
    })
  }
}
