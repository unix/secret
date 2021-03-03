import { nanoid } from 'nanoid'
import sha256 from 'crypto-js/sha256'
import Base64 from 'crypto-js/enc-base64'
import aes from 'crypto-js/aes'
import enc from 'crypto-js/enc-base64'
import utf8 from 'crypto-js/enc-utf8'
import storage from './storage'
import {
  CACHE_SPLIT,
  DEFAULT_ORIGIN,
  NONCE_CONTENT_SPLIT,
  NONCE_LENGTH,
  PRIVATE_LENGTH,
  URL_SPLIT,
} from '../constants'
import { isBrowser, isSafeOrigin } from './is'
import { SecretTrackedInfo } from './apis'

export const makeNonce = () => {
  return nanoid(NONCE_LENGTH)
}

export const stringToHash = (key: string, nonce: string) => {
  const privateHex = Base64.parse(key).toString()
  return sha256(nonce + privateHex).toString()
}

export const textToContent = (text: string, nonce: string) => {
  return `${nonce}${NONCE_CONTENT_SPLIT}${text}`
}

export const contentToText = (content: string) => {
  return `${content}`.split(NONCE_CONTENT_SPLIT)[1] || ''
}

export type SecretPreResult = {
  nonce: string
  privateKey: string
  privateHash: string
  content: string
}

export const preToSecrets = (text: string): SecretPreResult => {
  const nonce = makeNonce()
  const privateKey = nanoid(PRIVATE_LENGTH)
  const privateHash = stringToHash(privateKey, nonce)
  const content = textToContent(text, nonce)
  return {
    nonce,
    privateKey,
    privateHash,
    content,
  }
}

export type SecretResult = {
  nonce: string
  privateKey: string
  cipher: string
}

export const toSecrets = ({
  nonce,
  privateKey,
  privateHash,
  content,
}: SecretPreResult): SecretResult => {
  const cipher1 = aes.encrypt(content, privateHash).toString()
  const cipher = aes.encrypt(cipher1, privateKey).toString()
  return {
    nonce,
    privateKey,
    cipher,
  }
}

export const toOrigin = (values: SecretResult): string => {
  const { nonce, privateKey, cipher } = values || {}
  const privateHash = stringToHash(privateKey, nonce)
  const content1 = aes.decrypt(cipher, privateKey).toString(utf8)
  const content = aes.decrypt(content1, privateHash).toString(utf8)
  return contentToText(content)
}

export const serializeData = (
  data: Record<string, unknown> | null = {},
  nonce: string,
): string => {
  const dataString = JSON.stringify(data)
  return stringToHash(dataString, nonce)
}

export type CacheRecord = {
  nonce: string
  key: string
  expire: string | number
}

export const cacheNonce = (record: CacheRecord, trackId: string): void => {
  const { nonce, key, expire } = record
  const limit = +expire + Date.now()

  const str = `${nonce}${CACHE_SPLIT}${key}${CACHE_SPLIT}${limit}`
  const sessionKey = isBrowser()
    ? window.navigator.userAgent
    : 'window.navigator.userAgent'
  const cacheKey = stringToHash(trackId, sessionKey)
  const cacheContent = aes.encrypt(str, sessionKey).toString()
  storage.setItem(cacheKey, cacheContent)
}

export const getCacheNonce = (trackId: string): Omit<CacheRecord, 'expire'> | null => {
  const sessionKey = isBrowser()
    ? window.navigator.userAgent
    : 'window.navigator.userAgent'
  const cacheKey = stringToHash(trackId, sessionKey)
  const content = storage.getItem(cacheKey)
  if (!content) return null

  const cache = aes.decrypt(content, sessionKey).toString(utf8)
  if (!cache || !cache.includes(CACHE_SPLIT)) {
    storage.removeItem(cacheKey)
    return null
  }
  const [nonce, key, limit] = cache.split(CACHE_SPLIT)
  const isAllow = +limit > Date.now()
  if (!isAllow) {
    storage.removeItem(cacheKey)
    return null
  }

  return {
    nonce,
    key,
  }
}

export type SecretURLParams = {
  nonce: string
  key: string
  readId: string
}

export type SecretURLRecord = Record<string, undefined> | SecretURLParams

const encodePath = ({ nonce, key, readId }: SecretURLRecord): string => {
  const path = `${nonce}${URL_SPLIT}${key}${URL_SPLIT}${readId}`
  const iv = enc.parse(DEFAULT_ORIGIN.repeat(3))
  const urlKey = enc.parse(URL_SPLIT.repeat(3))
  const safePath = aes.encrypt(path, urlKey, { iv }).toString()
  return encodeURI(safePath).replace(/\//g, '_')
}

export const encodeURL = ({ nonce, key, readId }: SecretURLRecord): string => {
  const path = encodePath({ nonce, key, readId })
  const origin =
    isBrowser() && isSafeOrigin(window.location.origin)
      ? window.location.origin
      : DEFAULT_ORIGIN
  return `${origin}/s/${path}`
}

export const decodeURL = (input: string): SecretURLRecord | null => {
  const url = input.replace(/_/g, '/')
  const path = decodeURI(url)
  const iv = enc.parse(DEFAULT_ORIGIN.repeat(3))
  const urlKey = enc.parse(URL_SPLIT.repeat(3))
  const str = aes.decrypt(path, urlKey, { iv }).toString(utf8)
  if (!str || !str.includes(URL_SPLIT)) return null
  const [nonce, key, readId] = str.split(URL_SPLIT)
  return {
    nonce,
    key,
    readId,
  }
}

export const encodeCLI = (input: SecretURLRecord): string => {
  return `npx secret ${encodeURI(encodePath(input))}`
}

export type TrackedReaderGroup = {
  urls: string[]
  consumes: string[]
  cliUrls: string[]
  cliConsumes: string[]
}

export const trackedToReaderGroup = (
  id: string | Omit<CacheRecord, 'expire'>,
  result: SecretTrackedInfo,
): TrackedReaderGroup => {
  const caches = typeof id === 'object' ? id : getCacheNonce(id)
  const { read_ids = [], consumed_ids = [] } = result || {}
  const urls = read_ids.map(readId => encodeURL({ ...caches, readId }))
  const cliUrls = read_ids.map(readId => encodeCLI({ ...caches, readId }))
  const consumes = consumed_ids.map(readId => encodeURL({ ...caches, readId }))
  const cliConsumes = consumed_ids.map(readId => encodeCLI({ ...caches, readId }))
  return {
    urls,
    cliUrls,
    consumes,
    cliConsumes,
  }
}
