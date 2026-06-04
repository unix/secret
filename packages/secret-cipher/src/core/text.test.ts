import { describe, expect, it } from 'vitest'
import {
  CipherError,
  ERRORS,
  RUNTIME_PREFERENCE,
  decodeTextAccessFragment,
  decodeTextAccessUrl,
  encodeTextAccessFragment,
  encodeTextAccessUrl,
  openText,
  resolveCipherRuntime,
  sealText,
  textSecretFromString,
} from '../index'

describe('text cipher', () => {
  it('seals and opens text with the auto runtime', async () => {
    const sealed = await sealText('a short private note')
    const opened = await openText(sealed)

    expect(sealed.cipher).toMatch(/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/)
    expect(sealed.cipher).not.toContain('private')
    expect(sealed.secret).toMatch(/^[A-Za-z0-9_-]+$/)
    expect(opened).toBe('a short private note')
  })

  it('rejects a mismatched secret', async () => {
    const sealed = await sealText('keep this secret')
    const other = await sealText('another secret')

    await expect(
      openText({
        cipher: sealed.cipher,
        secret: other.secret,
      }),
    ).rejects.toMatchObject({
      code: ERRORS.OPERATION_FAILED,
    } satisfies Partial<CipherError>)
  })

  it('encodes the secret in the URL fragment only', async () => {
    const sealed = await sealText('url secret')
    const url = encodeTextAccessUrl({
      origin: 'https://secret.witt.im',
      readId: 'read id/with slash',
      secret: sealed.secret,
    })
    const parsed = new URL(url)
    const decoded = decodeTextAccessUrl(url)

    expect(parsed.pathname).toBe('/s/read%20id%2Fwith%20slash')
    expect(parsed.search).toBe('')
    expect(parsed.hash).toBe(encodeTextAccessFragment(sealed.secret))
    expect(parsed.hash).toBe(`#${sealed.secret}`)
    expect(parsed.pathname).not.toContain(sealed.secret)
    expect(decoded).toEqual({
      readId: 'read id/with slash',
      secret: sealed.secret,
    })
  })

  it('decodes fragments without reading a full URL', async () => {
    const sealed = await sealText('fragment secret')
    const decoded = decodeTextAccessFragment(encodeTextAccessFragment(sealed.secret))

    expect(decoded).toEqual({
      secret: sealed.secret,
    })
  })

  it('returns null for malformed access input', () => {
    expect(decodeTextAccessFragment('#bad')).toBeNull()
    expect(decodeTextAccessUrl('https://secret.witt.im/track/abc#bad')).toBeNull()
    expect(() => textSecretFromString('not-a-valid-secret')).toThrow(CipherError)
  })

  it('rejects access URLs without an origin', () => {
    expect(() => decodeTextAccessUrl('/s/abc#bad')).toThrow(
      expect.objectContaining({
        code: ERRORS.INVALID_URL,
      }),
    )
  })

  it('can select node and web standards runtimes explicitly', async () => {
    await expect(
      resolveCipherRuntime({ preferredRuntime: RUNTIME_PREFERENCE.NODE }),
    ).resolves.toMatchObject({ name: 'node' })
    await expect(
      resolveCipherRuntime({ preferredRuntime: RUNTIME_PREFERENCE.WEB_STANDARDS }),
    ).resolves.toMatchObject({ name: 'web-standards' })
  })
})
