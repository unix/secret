import { RUNTIME_PREFERENCE } from './utils/constants'
import type { CipherRuntime } from './runtimes/types'

export type { CipherRuntime, CipherRuntimeName } from './runtimes/types'

export type RuntimePreference =
  (typeof RUNTIME_PREFERENCE)[keyof typeof RUNTIME_PREFERENCE]

export type CipherRuntimeOptions = {
  readonly runtime?: CipherRuntime
  readonly preferredRuntime?: RuntimePreference
}

export type {
  DecodedTextAccessFragment,
  DecodedTextAccessUrl,
  EncodeTextAccessUrlInput,
  OpenTextInput,
  SealTextOptions,
  SealTextResult,
  TextAccessFragment,
  TextAccessUrl,
  TextCiphertext,
  TextSecret,
} from './core/text'

export type {
  DecodedFileAccessFragment,
  DecodedFileAccessUrl,
  EncodeFileAccessUrlInput,
  FileAccessFragment,
  FileAccessUrl,
  FileManifest,
  FileSecret,
  OpenFileChunkInput,
  OpenFileManifestInput,
  SealFileChunkInput,
  SealFileManifestInput,
  SealFileManifestResult,
} from './core/file'
