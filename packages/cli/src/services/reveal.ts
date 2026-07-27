import { open, writeFile } from 'node:fs/promises'
import { basename, dirname, extname, join } from 'node:path'
import {
  openFileChunk,
  openFileManifest,
  openText as openCipherText,
} from 'secret-cipher'
import { Service } from 'func'
import { CONFIG_KEYS, configs } from '../configs'
import { ApiClient, type SecretResponse, type TransferProgress } from '../utils/api'
import { decodeAccess } from '../utils/links'

export type RevealResult =
  | {
      readonly kind: 'text'
      readonly value: string
    }
  | {
      readonly kind: 'file-preview'
      readonly download: (onStatus?: (status: string) => void) => Promise<string>
      readonly manifest: {
        readonly name: string
        readonly size: number
        readonly type: string
      }
    }

const GCM_TAG_BYTES = 16

type FileSecretResponse = Extract<SecretResponse, { readonly kind: 'file' }>

const percentStatus = (label: string, current: number, total: number): string => {
  return `${label} ${Math.round((current / total) * 100)}%...`
}

const transferStatus = (label: string, progress: TransferProgress): string => {
  if (progress.percent === null) return `${label}...`
  return `${label} ${Math.round(progress.percent * 100)}%...`
}

@Service()
export class RevealService {
  private static ConcatChunks(chunks: readonly Uint8Array[]): Uint8Array {
    const length = chunks.reduce((total, chunk) => total + chunk.byteLength, 0)
    const output = new Uint8Array(length)
    let offset = 0
    chunks.forEach(chunk => {
      output.set(chunk, offset)
      offset += chunk.byteLength
    })

    return output
  }

  private static async AvailablePath(filePath: string): Promise<string> {
    const directory = dirname(filePath)
    const extension = extname(filePath)
    const stem = basename(filePath, extension)
    let candidate = filePath
    let index = 1

    while (await RevealService.Exists(candidate)) {
      candidate = join(directory, `${stem}-${index}${extension}`)
      index += 1
    }

    return candidate
  }

  private static async Exists(filePath: string): Promise<boolean> {
    try {
      const file = await open(filePath, 'r')
      await file.close()
      return true
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error) {
        if (error.code === 'ENOENT') return false
      }

      throw error
    }
  }
  async open(input: string): Promise<RevealResult> {
    const access = decodeAccess(input)
    const endpoints = await configs.get(CONFIG_KEYS.ENDPOINTS)
    const api = new ApiClient({ apiOrigin: endpoints.apiOrigin })
    const response = await api.read(access.readId)
    if (response.kind === 'text') {
      return {
        kind: 'text',
        value: await this.openText({
          cipher: response.cipher,
          secret: access.secret,
        }),
      }
    }

    return this.openFile({
      api,
      readId: access.readId,
      response,
      secret: access.secret,
    })
  }

  private async openText({
    cipher,
    secret,
  }: {
    readonly cipher: string
    readonly secret: string
  }): Promise<string> {
    return openCipherText({
      cipher,
      secret,
    })
  }

  private async openFile({
    api,
    readId,
    response,
    secret,
  }: {
    readonly api: ApiClient
    readonly readId: string
    readonly response: FileSecretResponse
    readonly secret: string
  }): Promise<RevealResult> {
    const manifest = await openFileManifest({
      salt: response.manifest.salt,
      iv: response.manifest.iv,
      cipher: response.manifest.cipher,
      secret,
    })

    return {
      kind: 'file-preview',
      manifest: {
        name: manifest.name,
        size: manifest.size,
        type: manifest.type,
      },
      download: async onStatus => {
        onStatus?.('Downloading file 0%...')
        const encrypted = await api.downloadFile(
          readId,
          progress => {
            onStatus?.(transferStatus('Downloading file', progress))
          },
          response.manifest.encryptedSize,
        )
        const outputPath = await RevealService.AvailablePath(
          join(process.cwd(), manifest.name),
        )
        const decryptedChunks: Uint8Array[] = []
        let offset = 0
        onStatus?.('Decrypting file 0%...')

        for (let chunkIndex = 0; chunkIndex < manifest.chunkCount; chunkIndex += 1) {
          const plaintextLength = Math.max(
            0,
            Math.min(
              manifest.chunkSize,
              manifest.size - chunkIndex * manifest.chunkSize,
            ),
          )
          const encryptedLength = plaintextLength + GCM_TAG_BYTES
          const chunk = encrypted.slice(offset, offset + encryptedLength)
          const decrypted = await openFileChunk({
            ciphertext: chunk,
            chunkIndex,
            chunkCount: manifest.chunkCount,
            plaintextLength,
            chunkSize: manifest.chunkSize,
            salt: response.manifest.salt,
            secret,
          })
          decryptedChunks.push(decrypted)
          offset += encryptedLength
          onStatus?.(
            percentStatus('Decrypting file', chunkIndex + 1, manifest.chunkCount),
          )
        }

        await writeFile(outputPath, RevealService.ConcatChunks(decryptedChunks))
        return outputPath
      },
    }
  }
}
