import { describe, expect, it } from 'vitest'
import {
  createFileSecret,
  decodeFileAccessUrl,
  defaultFileChunkSizeBytes,
  encodeFileAccessFragment,
  encodeFileAccessUrl,
  openFileChunk,
  openFileManifest,
  sealFileChunk,
  sealFileManifest,
} from '../index'

describe('file cipher', () => {
  it('encodes file access URLs with a short fragment', async () => {
    const secret = await createFileSecret()
    const url = encodeFileAccessUrl({
      origin: 'https://secret.witt.im',
      readId: 'read-id',
      secret,
    })
    const parsed = new URL(url)
    const decoded = decodeFileAccessUrl(url)
    expect(parsed.pathname).toBe('/s/read-id')
    expect(parsed.hash).toBe(encodeFileAccessFragment(secret))
    expect(parsed.hash).toBe(`#${secret}`)
    expect(decoded).toEqual({
      readId: 'read-id',
      secret,
    })
  })

  it('seals and opens file manifests and chunks', async () => {
    const secret = await createFileSecret()
    const manifest = await sealFileManifest({
      secret,
      manifest: {
        name: 'note.txt',
        type: 'text/plain',
        size: 11,
        chunkSize: 8,
        chunkCount: 2,
      },
    })
    const openedManifest = await openFileManifest({
      ...manifest,
      secret,
    })
    const firstChunk = new TextEncoder().encode('hello wo')
    const encrypted = await sealFileChunk({
      chunk: firstChunk,
      chunkIndex: 0,
      chunkCount: 2,
      chunkSize: 8,
      salt: manifest.salt,
      secret,
    })
    const opened = await openFileChunk({
      ciphertext: encrypted,
      chunkIndex: 0,
      chunkCount: 2,
      plaintextLength: firstChunk.byteLength,
      chunkSize: 8,
      salt: manifest.salt,
      secret,
    })

    expect(defaultFileChunkSizeBytes).toBe(8 * 1024 * 1024)
    expect(openedManifest.name).toBe('note.txt')
    expect(new TextDecoder().decode(opened)).toBe('hello wo')
  })
})
