type ApiErrorBody = {
  readonly error?: unknown
}

export type TextSecretResponse = {
  readonly readIds: readonly string[]
  readonly trackId: string
  readonly expiresAt: number
}

export type FileInitResponse = {
  readonly secretId: string
  readonly uploadToken: string
  readonly uploadUrl: string
}

export type FileCompleteResponse = {
  readonly readIds: readonly string[]
  readonly trackId: string
  readonly expiresAt: number
}

export type TrackSecretResponse = {
  readonly kind: 'text' | 'file'
  readonly status: 'pending' | 'ready' | 'destroyed' | 'expired'
  readonly createdAt: number
  readonly completedAt: number | null
  readonly expiresAt: number
  readonly destroyedAt: number | null
  readonly readLimit: number
  readonly remainingReads: number
  readonly reads: readonly {
    readonly readId: string
    readonly consumedAt: number | null
  }[]
}

export type SecretResponse =
  | {
      readonly kind: 'text'
      readonly cipher: string
      readonly expiresAt: number
    }
  | {
      readonly kind: 'file'
      readonly manifest: {
        readonly salt: string
        readonly iv: string
        readonly cipher: string
        readonly chunkSize: number
        readonly chunkCount: number
        readonly encryptedSize: number
      }
      readonly expiresAt: number
    }

export type TransferProgress = {
  readonly loaded: number
  readonly percent: number | null
  readonly total: number | null
}

type ApiClientOptions = {
  readonly apiOrigin: string
}

type ProgressHandler = (progress: TransferProgress) => void

type UploadRequestInit = RequestInit & {
  readonly duplex: 'half'
}

type ByteStreamReadResult =
  | {
      readonly done: false
      readonly value: Uint8Array
    }
  | {
      readonly done: true
      readonly value?: undefined
    }

const TRANSFER_CHUNK_BYTES = 64 * 1024
const RATE_LIMIT_MESSAGE =
  'Requests are coming in too quickly. Please wait a minute and try again.'

const isByteStreamReadResult = (value: unknown): value is ByteStreamReadResult => {
  if (typeof value !== 'object' || value === null || !('done' in value)) return false
  if (value.done === true) return true
  return (
    value.done === false && 'value' in value && value.value instanceof Uint8Array
  )
}

export class ApiClientError extends Error {
  readonly code = 'API-REQUEST-FAILED'
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiClientError'
    this.status = status
  }
}

export class ApiClient {
  private static async ErrorMessage(
    response: Response,
    fallback: string,
  ): Promise<string> {
    if (response.status === 429) return RATE_LIMIT_MESSAGE
    const text = await response.text()
    if (!text) return fallback

    try {
      const parsed: unknown = JSON.parse(text)
      if (ApiClient.IsApiErrorBody(parsed) && typeof parsed.error === 'string')
        return parsed.error
    } catch {
      return text
    }

    return text
  }

  private static async Fetch(
    url: string,
    init: RequestInit | undefined,
    fallback: string,
  ): Promise<Response> {
    try {
      return await fetch(url, init)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      const cause = error instanceof Error ? error.cause : undefined
      const causeMessage =
        cause instanceof Error && cause.message !== message
          ? ` ${cause.message}`
          : ''

      throw new Error(
        `${fallback} ${message}${causeMessage} Tried ${url}. Run secret config --api <origin> to use a custom API host.`,
        { cause: error },
      )
    }
  }

  private static UploadBody(
    body: Uint8Array,
    onProgress: ProgressHandler | undefined,
  ): ReadableStream<Uint8Array> {
    let offset = 0
    const total = body.byteLength
    onProgress?.(ApiClient.Progress(0, total))

    return new ReadableStream<Uint8Array>({
      pull(controller) {
        if (offset >= total) {
          controller.close()
          return
        }

        const end = Math.min(offset + TRANSFER_CHUNK_BYTES, total)
        controller.enqueue(body.slice(offset, end))
        offset = end
        onProgress?.(ApiClient.Progress(offset, total))
      },
    })
  }

  private static async DownloadBody(
    response: Response,
    onProgress: ProgressHandler | undefined,
    expectedBytes: number | undefined,
  ): Promise<Uint8Array> {
    const headerBytes = Number(response.headers.get('content-length'))
    const total = ApiClient.TotalBytes(expectedBytes, headerBytes)

    if (!response.body) {
      const body = new Uint8Array(await response.arrayBuffer())
      onProgress?.(ApiClient.Progress(body.byteLength, total))
      return body
    }

    const reader = response.body.getReader()
    const chunks: Uint8Array[] = []
    let loaded = 0
    onProgress?.(ApiClient.Progress(loaded, total))

    for (;;) {
      const result: unknown = await reader.read()
      if (!isByteStreamReadResult(result)) {
        throw new Error('File download returned an invalid stream chunk.')
      }
      if (result.done) break
      chunks.push(result.value)
      loaded += result.value.byteLength
      onProgress?.(ApiClient.Progress(loaded, total))
    }

    return ApiClient.ConcatChunks(chunks, loaded)
  }

  private static Progress(loaded: number, total: number | null): TransferProgress {
    return {
      loaded,
      percent: total && total > 0 ? Math.max(0, Math.min(loaded / total, 1)) : null,
      total,
    }
  }

  private static TotalBytes(
    expectedBytes: number | undefined,
    headerBytes: number,
  ): number | null {
    if (typeof expectedBytes === 'number' && Number.isFinite(expectedBytes)) {
      if (expectedBytes > 0) return expectedBytes
    }

    if (Number.isFinite(headerBytes) && headerBytes > 0) return headerBytes
    return null
  }

  private static ConcatChunks(
    chunks: readonly Uint8Array[],
    length: number,
  ): Uint8Array {
    const output = new Uint8Array(length)
    let offset = 0
    chunks.forEach(chunk => {
      output.set(chunk, offset)
      offset += chunk.byteLength
    })

    return output
  }

  private static async Json<T>(response: Response): Promise<T> {
    // The caller supplies the API response type; runtime error payloads are handled separately.
    const parsed: unknown = JSON.parse(await response.text())
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    return parsed as T
  }

  private static IsApiErrorBody(value: unknown): value is ApiErrorBody {
    return typeof value === 'object' && value !== null && 'error' in value
  }
  private readonly apiOrigin: string

  constructor({ apiOrigin }: ApiClientOptions) {
    this.apiOrigin = apiOrigin.replace(/\/+$/, '')
  }

  async status(): Promise<unknown> {
    return this.requestJson('/status', {
      apiPrefix: false,
      fallback: 'Unable to load status.',
    })
  }

  async createText(input: {
    readonly cipher: string
    readonly plainSize: number
    readonly expiresInSeconds: number
    readonly reads: number
  }): Promise<TextSecretResponse> {
    return this.requestJson('/secrets/text', {
      body: input,
      fallback: 'Unable to create text secret.',
      method: 'POST',
    })
  }

  async initFile(input: {
    readonly chunkCount: number
    readonly chunkSize: number
    readonly encryptedManifest: string
    readonly encryptedSize: number
    readonly expiresInSeconds: number
    readonly manifestIv: string
    readonly plainSize: number
    readonly reads: number
    readonly salt: string
  }): Promise<FileInitResponse> {
    return this.requestJson('/secrets/files/init', {
      body: input,
      fallback: 'Unable to initialize file upload.',
      method: 'POST',
    })
  }

  async uploadFile(
    uploadUrl: string,
    body: Uint8Array,
    onProgress?: ProgressHandler,
  ): Promise<void> {
    const init: UploadRequestInit = {
      body: ApiClient.UploadBody(body, onProgress),
      duplex: 'half',
      headers: {
        'content-length': String(body.byteLength),
      },
      method: 'PUT',
    }
    const response = await ApiClient.Fetch(uploadUrl, init, 'Unable to upload file.')
    if (response.ok) return

    throw new ApiClientError(
      await ApiClient.ErrorMessage(response, 'Unable to upload file.'),
      response.status,
    )
  }

  async completeFile(input: {
    readonly secretId: string
    readonly uploadToken: string
  }): Promise<FileCompleteResponse> {
    return this.requestJson(
      `/secrets/files/${encodeURIComponent(input.secretId)}/complete`,
      {
        body: {
          uploadToken: input.uploadToken,
        },
        fallback: 'Unable to complete file upload.',
        method: 'POST',
      },
    )
  }

  async track(trackId: string): Promise<TrackSecretResponse> {
    return this.requestJson(`/secrets/track/${encodeURIComponent(trackId)}`, {
      fallback: 'Unable to load secret tracking.',
    })
  }

  async read(readId: string): Promise<SecretResponse> {
    return this.requestJson(`/secrets/${encodeURIComponent(readId)}`, {
      fallback: 'Secret is unavailable or already used.',
    })
  }

  async downloadFile(
    readId: string,
    onProgress?: ProgressHandler,
    expectedBytes?: number,
  ): Promise<Uint8Array> {
    const response = await ApiClient.Fetch(
      this.apiUrl(`/secrets/${encodeURIComponent(readId)}/file`),
      undefined,
      'Unable to download encrypted file.',
    )
    if (response.ok)
      return ApiClient.DownloadBody(response, onProgress, expectedBytes)

    throw new ApiClientError(
      await ApiClient.ErrorMessage(response, 'Unable to download encrypted file.'),
      response.status,
    )
  }

  private async requestJson<T>(
    path: string,
    options: {
      readonly apiPrefix?: boolean
      readonly body?: unknown
      readonly fallback: string
      readonly method?: string
    },
  ): Promise<T> {
    const response = await ApiClient.Fetch(
      this.apiUrl(path, options.apiPrefix),
      {
        body: options.body ? JSON.stringify(options.body) : undefined,
        headers: options.body
          ? {
              'content-type': 'application/json',
            }
          : undefined,
        method: options.method ?? 'GET',
      },
      options.fallback,
    )
    if (response.ok) return await ApiClient.Json<T>(response)

    throw new ApiClientError(
      await ApiClient.ErrorMessage(response, options.fallback),
      response.status,
    )
  }

  private apiUrl(path: string, apiPrefix = true): string {
    const prefix = apiPrefix ? '/api' : ''
    return `${this.apiOrigin}${prefix}${path}`
  }
}
