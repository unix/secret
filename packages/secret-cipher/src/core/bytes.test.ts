import { describe, expect, it } from 'vitest'

import { CipherError, ERRORS, base64UrlToBytes, bytesToBase64Url } from '../index'
import { bytesToHex, bytesToUtf8, concatBytes, utf8ToBytes } from './bytes'

describe('byte helpers', () => {
  it('round trips base64url without padding', () => {
    const bytes = Uint8Array.from([0, 1, 2, 253, 254, 255])
    const encoded = bytesToBase64Url(bytes)

    expect(encoded).toBe('AAEC_f7_')
    expect([...base64UrlToBytes(encoded)]).toEqual([...bytes])
    expect(encoded).not.toContain('=')
    expect(encoded).not.toContain('+')
    expect(encoded).not.toContain('/')
  })

  it('rejects malformed base64url values', () => {
    expect(() => base64UrlToBytes('abc+')).toThrow(
      expect.objectContaining({
        code: ERRORS.INVALID_BASE64URL,
      }) satisfies Partial<CipherError>,
    )
    expect(() => base64UrlToBytes('a')).toThrow(CipherError)
  })

  it('concatenates and formats byte arrays', () => {
    const bytes = concatBytes(Uint8Array.from([1, 2]), Uint8Array.from([10, 255]))

    expect([...bytes]).toEqual([1, 2, 10, 255])
    expect(bytesToHex(bytes)).toBe('01020aff')
  })

  it('round trips utf8 text', () => {
    const text = 'hello 密文'

    expect(bytesToUtf8(utf8ToBytes(text))).toBe(text)
  })
})
