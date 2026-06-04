import { base64UrlToBytes, bytesToBase64Url } from '../bytes'
import { resolveCipherRuntime } from '../../runtimes'
import { ERRORS, SECRET_BYTES } from '../../utils/constants'
import { CipherError } from '../../utils/errors'

import type { CipherRuntimeOptions } from '../../types'

export const parseSecret = (value: string): Uint8Array => {
  const bytes = base64UrlToBytes(value)
  if (bytes.byteLength === SECRET_BYTES.ACCESS) return bytes

  throw new CipherError(ERRORS.INVALID_KEY, `Expected ${SECRET_BYTES.ACCESS} bytes.`)
}

export const secretFromString = <Secret extends string>(value: string): Secret => {
  parseSecret(value)
  return value as Secret
}

export const createSecret = async <Secret extends string>(
  options: CipherRuntimeOptions = {},
): Promise<Secret> => {
  const runtime = await resolveCipherRuntime(options)
  return bytesToBase64Url(runtime.randomBytes(SECRET_BYTES.ACCESS)) as Secret
}
