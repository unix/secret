import {
  decodeFileAccessFragment,
  decodeFileAccessUrl,
  decodeTextAccessFragment,
  decodeTextAccessUrl,
  encodeFileAccessUrl,
  encodeTextAccessUrl,
} from 'secret-cipher'

import { CliUserError } from './expected-error'

const CLI_REVEAL_ID_PATTERN = /^([A-Za-z0-9_-]+)\.([A-Za-z0-9_-]+)$/
const ABSOLUTE_URL_PATTERN = /^[a-z][a-z\d+\-.]*:\/\//i

export type DecodedAccess = {
  readonly readId: string
  readonly secret: string
}

export class InvalidRevealInputError extends CliUserError {
  constructor() {
    super('Reveal id must be a full access URL, readId.secret, or readId#secret.')
    this.name = 'InvalidRevealInputError'
  }
}

export const textLinks = (
  readIds: readonly string[],
  secret: string,
  origin: string,
): readonly { readonly readId: string; readonly value: string }[] => {
  return readIds.map(readId => ({
    readId,
    value: encodeTextAccessUrl({
      origin,
      readId,
      secret,
    }),
  }))
}

export const fileLinks = (
  readIds: readonly string[],
  secret: string,
  origin: string,
): readonly { readonly readId: string; readonly value: string }[] => {
  return readIds.map(readId => ({
    readId,
    value: encodeFileAccessUrl({
      origin,
      readId,
      secret,
    }),
  }))
}

export const trackUrl = (trackId: string, origin: string): string => {
  return `${origin.replace(/\/+$/, '')}/track/${encodeURIComponent(trackId)}`
}

export const revealId = ({
  readId,
  secret,
}: {
  readonly readId: string
  readonly secret: string
}): string => {
  return `${readId}.${secret}`
}

const decodeCliAccessInput = (
  input: string,
  decodeFragment: (fragment: string) => { readonly secret: string } | null,
): { readonly readId: string; readonly secret: string } | null => {
  const shorthand = CLI_REVEAL_ID_PATTERN.exec(input)
  if (shorthand) {
    const fragment = decodeFragment(shorthand[2])
    if (!fragment) return null

    return {
      readId: shorthand[1],
      secret: fragment.secret,
    }
  }

  const fragmentIndex = input.indexOf('#')
  if (fragmentIndex <= 0) return null
  const readId = input.slice(0, fragmentIndex)
  const fragment = decodeFragment(input.slice(fragmentIndex))
  if (!fragment) return null

  return {
    readId,
    secret: fragment.secret,
  }
}

export const decodeAccess = (input: string): DecodedAccess => {
  const isUrl = ABSOLUTE_URL_PATTERN.test(input)
  const text = isUrl
    ? decodeTextAccessUrl(input)
    : decodeCliAccessInput(input, decodeTextAccessFragment)
  if (text) {
    return {
      readId: text.readId,
      secret: text.secret,
    }
  }

  const file = isUrl
    ? decodeFileAccessUrl(input)
    : decodeCliAccessInput(input, decodeFileAccessFragment)
  if (file) {
    return {
      readId: file.readId,
      secret: file.secret,
    }
  }

  throw new InvalidRevealInputError()
}
