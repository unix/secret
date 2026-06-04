import { base64UrlToBytes, bytesToBase64Url } from '../bytes'
import { resolveCipherRuntime } from '../../runtimes'
import { CIPHER_FORMAT, CRYPTO_BYTES, ERRORS } from '../../utils/constants'
import { CipherError } from '../../utils/errors'

export type CipherPayload = {
  readonly salt: Uint8Array
  readonly iv: Uint8Array
  readonly ciphertext: Uint8Array
}

export const parseCipherPayload = (cipher: string): CipherPayload => {
  const [salt, iv, ciphertext, extra] = cipher.split(CIPHER_FORMAT.SEPARATOR)
  if (!salt || !iv || !ciphertext || typeof extra === 'string') {
    throw new CipherError(
      ERRORS.INVALID_CIPHERTEXT,
      'Ciphertext must use the salt.iv.ciphertext payload format.',
    )
  }

  return {
    salt: base64UrlToBytes(salt),
    iv: base64UrlToBytes(iv),
    ciphertext: base64UrlToBytes(ciphertext),
  }
}

export const encodeCipherPayload = ({
  salt,
  iv,
  ciphertext,
}: CipherPayload): string => {
  return `${bytesToBase64Url(salt)}.${bytesToBase64Url(iv)}.${bytesToBase64Url(
    ciphertext,
  )}`
}

export const deriveKey = async ({
  info,
  salt,
  secret,
  runtime,
}: {
  readonly info: Uint8Array
  readonly salt: Uint8Array
  readonly secret: Uint8Array
  readonly runtime: Awaited<ReturnType<typeof resolveCipherRuntime>>
}): Promise<Uint8Array> => {
  return runtime.hkdfSha256({
    key: secret,
    salt,
    info,
    byteLength: CRYPTO_BYTES.AES_KEY,
  })
}
