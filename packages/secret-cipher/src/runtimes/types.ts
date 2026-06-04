export const RUNTIME_NAMES = {
  NODE: 'node',
  WEB: 'web',
  WEB_STANDARDS: 'web-standards',
} as const

export type CipherRuntimeName = (typeof RUNTIME_NAMES)[keyof typeof RUNTIME_NAMES]

export type HkdfInput = {
  readonly key: Uint8Array
  readonly salt: Uint8Array
  readonly info: Uint8Array
  readonly byteLength: number
}

export type AesGcmEncryptInput = {
  readonly key: Uint8Array
  readonly iv: Uint8Array
  readonly plaintext: Uint8Array
  readonly additionalData?: Uint8Array
}

export type AesGcmDecryptInput = {
  readonly key: Uint8Array
  readonly iv: Uint8Array
  readonly ciphertext: Uint8Array
  readonly additionalData?: Uint8Array
}

export type CipherRuntime = {
  readonly name: CipherRuntimeName
  randomBytes(byteLength: number): Uint8Array
  sha256(data: Uint8Array): Promise<Uint8Array>
  hkdfSha256(input: HkdfInput): Promise<Uint8Array>
  aesGcmEncrypt(input: AesGcmEncryptInput): Promise<Uint8Array>
  aesGcmDecrypt(input: AesGcmDecryptInput): Promise<Uint8Array>
}

export type StandardSubtleCrypto = {
  digest(algorithm: string, data: Uint8Array): Promise<ArrayBuffer>
  importKey(
    format: 'raw',
    keyData: Uint8Array,
    algorithm: unknown,
    extractable: boolean,
    keyUsages: readonly string[],
  ): Promise<unknown>
  deriveBits(
    algorithm: unknown,
    baseKey: unknown,
    length: number,
  ): Promise<ArrayBuffer>
  encrypt(algorithm: unknown, key: unknown, data: Uint8Array): Promise<ArrayBuffer>
  decrypt(algorithm: unknown, key: unknown, data: Uint8Array): Promise<ArrayBuffer>
}

export type StandardCrypto = {
  readonly subtle: StandardSubtleCrypto
  getRandomValues<T extends Uint8Array>(array: T): T
}
