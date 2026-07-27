import { getAddress, isAddressEqual, isHex, verifyMessage } from 'viem'
import { parseSiweMessage } from 'viem/siwe'
import selfHost from '../../../self-host'
import { d1Evm } from '@/storage/d1-evm'
import type { AppContext } from '@/types'
import {
  EVM_CHALLENGE_ID_BYTES,
  EVM_CHALLENGE_NONCE_LENGTH,
  EVM_CHALLENGE_TTL_MS,
  EVM_MAINNET_CHAIN_ID,
} from '@/utils/config'
import { http } from '@/utils/http'
import { randomAlphanumericId, randomId } from '@/utils/ids'

type VerifyEvmInput = {
  readonly challengeId: string
  readonly message: string
  readonly signature: string
}

type ChallengeEvmInput = {
  readonly origin: string
}

const EVM_STATEMENT = 'Open an EVM-gated Secret.'
const UNSUPPORTED_EVM_NETWORK_MESSAGE =
  'This link is not configured for Ethereum mainnet.'

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return value !== null && typeof value === 'object'
}

const isVerifyEvmInput = (value: unknown): value is VerifyEvmInput => {
  if (!isRecord(value)) return false

  return (
    typeof value.challengeId === 'string' &&
    typeof value.message === 'string' &&
    typeof value.signature === 'string'
  )
}

const isChallengeEvmInput = (value: unknown): value is ChallengeEvmInput => {
  if (!isRecord(value)) return false
  return typeof value.origin === 'string'
}

const headerUrl = (value: string | undefined): URL | null => {
  if (!value) return null

  try {
    const url = new URL(value)
    if (url.protocol === 'http:' || url.protocol === 'https:') return url
  } catch {
    return null
  }

  return null
}

const originUrl = (value: string): URL | null => {
  const url = headerUrl(value)
  if (url?.origin !== value) return null
  return url
}

const requestUrl = (c: AppContext): URL => {
  return new URL(c.req.url)
}

const isApiOrigin = (c: AppContext, url: URL): boolean => {
  return (
    url.origin === selfHost.configs.origin || url.origin === requestUrl(c).origin
  )
}

const requestOrigin = (c: AppContext): URL => {
  return (
    headerUrl(c.req.header('Origin')) ??
    headerUrl(c.req.header('Referer')) ??
    requestUrl(c)
  )
}

const nonApiHeaderOrigin = (c: AppContext): URL | null => {
  const origin = headerUrl(c.req.header('Origin'))
  if (origin && !isApiOrigin(c, origin)) return origin
  const referer = headerUrl(c.req.header('Referer'))
  if (referer && !isApiOrigin(c, referer)) return referer
  return null
}

const challengeInput = async (c: AppContext): Promise<unknown> => {
  try {
    return await c.req.json<unknown>()
  } catch {
    return null
  }
}

const challengeOrigin = (
  c: AppContext,
  input: ChallengeEvmInput | null,
): URL | null => {
  const header = nonApiHeaderOrigin(c)
  const client = input ? originUrl(input.origin) : null
  if (input && !client) return null
  if (header && client && header.origin !== client.origin) return null
  return client ?? header ?? requestOrigin(c)
}

const challengeUrl = (
  c: AppContext,
  evmId: string,
  input: ChallengeEvmInput | null,
): URL | null => {
  const url = challengeOrigin(c, input)
  if (!url) return null
  url.hash = ''
  url.search = ''
  url.pathname = `/e/${encodeURIComponent(evmId)}`
  return url
}

const isUnavailableEvmRead = ({
  consumedAt,
  expiresAt,
  timestamp,
}: {
  readonly consumedAt: number | null
  readonly expiresAt: number
  readonly timestamp: number
}): boolean => {
  return consumedAt !== null || expiresAt <= timestamp
}

export const evmChallenge = async (c: AppContext): Promise<Response> => {
  const evmId = c.req.param('evmId')
  if (!evmId) return http.notFound(c, 'EVM gated link not found.')
  const timestamp = Date.now()
  const read = await d1Evm.findRead(c.env.DB, evmId)
  if (
    !read ||
    isUnavailableEvmRead({
      consumedAt: read.consumed_at,
      expiresAt: read.expires_at,
      timestamp,
    })
  ) {
    return http.notFound(c, 'EVM gated link not found.')
  }

  if (read.chain_id !== EVM_MAINNET_CHAIN_ID)
    return http.badRequest(c, UNSUPPORTED_EVM_NETWORK_MESSAGE)
  const input = await challengeInput(c)
  if (input !== null && !isChallengeEvmInput(input))
    return http.badRequest(c, 'Invalid EVM challenge input.')
  const url = challengeUrl(c, evmId, input)
  if (!url) return http.badRequest(c, 'Invalid EVM challenge origin.')
  const id = randomId(EVM_CHALLENGE_ID_BYTES)
  const nonce = randomAlphanumericId(EVM_CHALLENGE_NONCE_LENGTH)
  const expiresAt = timestamp + EVM_CHALLENGE_TTL_MS
  const uri = url.toString()
  await d1Evm.insertChallenge({
    db: c.env.DB,
    domain: url.host,
    evmId,
    expiresAt,
    id,
    issuedAt: timestamp,
    nonce,
    uri,
  })

  return c.json({
    challengeId: id,
    chainId: read.chain_id,
    domain: url.host,
    expiresAt: new Date(expiresAt).toISOString(),
    issuedAt: new Date(timestamp).toISOString(),
    nonce,
    statement: EVM_STATEMENT,
    uri,
    version: '1',
  })
}

export const evmVerify = async (c: AppContext): Promise<Response> => {
  const evmId = c.req.param('evmId')
  if (!evmId) return http.notFound(c, 'EVM gated link not found.')
  const input = await c.req.json<unknown>()
  if (!isVerifyEvmInput(input) || !isHex(input.signature))
    return http.badRequest(c, 'Invalid EVM verification input.')
  const timestamp = Date.now()
  const read = await d1Evm.findRead(c.env.DB, evmId)
  if (
    !read ||
    isUnavailableEvmRead({
      consumedAt: read.consumed_at,
      expiresAt: read.expires_at,
      timestamp,
    })
  ) {
    return http.notFound(c, 'EVM gated link not found.')
  }

  if (read.chain_id !== EVM_MAINNET_CHAIN_ID)
    return http.badRequest(c, UNSUPPORTED_EVM_NETWORK_MESSAGE)

  const challenge = await d1Evm.findChallenge({
    db: c.env.DB,
    evmId,
    challengeId: input.challengeId,
  })
  if (!challenge || challenge.consumed_at || challenge.expires_at <= timestamp)
    return http.badRequest(c, 'EVM verification failed.')
  const expectedAddress = getAddress(read.address)
  let verified = false
  try {
    const message = parseSiweMessage(input.message)
    if (!message.address) {
      throw new Error('SIWE message is missing an address.')
    }

    const signerAddress = getAddress(message.address)
    const isExpectedMessage =
      isAddressEqual(signerAddress, expectedAddress) &&
      message.chainId === read.chain_id &&
      message.domain === challenge.domain &&
      message.expirationTime instanceof Date &&
      message.expirationTime.getTime() === challenge.expires_at &&
      message.nonce === challenge.nonce &&
      message.statement === EVM_STATEMENT &&
      message.uri === challenge.uri &&
      message.version === '1'
    if (isExpectedMessage) {
      verified = await verifyMessage({
        address: expectedAddress,
        message: input.message,
        signature: input.signature,
      })
    }
  } catch {
    verified = false
  }

  if (!verified) return http.badRequest(c, 'EVM verification failed.')

  const consumed = await d1Evm.consumeChallenge({
    db: c.env.DB,
    evmId,
    challengeId: input.challengeId,
    timestamp,
  })
  if (!consumed)
    return http.conflict(c, 'EVM verification challenge has already been used.')

  return c.json({
    readId: read.read_id,
  })
}
