import type { Bindings } from '@/types'
import { R2_UPLOAD_EXPIRES_SECONDS } from '@/utils/config'
import { hex, textEncoder } from '@/utils/encoding'

const fileObjectKey = (secretId: string): string => {
  return `files/${secretId}/data`
}

const subtleHmac = async (key: Uint8Array, data: string): Promise<Uint8Array> => {
  const keyBuffer = new ArrayBuffer(key.byteLength)
  new Uint8Array(keyBuffer).set(key)
  const dataBytes = textEncoder.encode(data)
  const dataBuffer = new ArrayBuffer(dataBytes.byteLength)
  new Uint8Array(dataBuffer).set(dataBytes)
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyBuffer,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, dataBuffer)
  return new Uint8Array(signature)
}

const sha256Hex = async (value: string): Promise<string> => {
  const digest = await crypto.subtle.digest('SHA-256', textEncoder.encode(value))
  return hex(new Uint8Array(digest))
}

const isoDate = (date: Date): string => {
  return date.toISOString().replace(/[:-]|\.\d{3}/g, '')
}

const shortDate = (amzDate: string): string => {
  return amzDate.slice(0, 8)
}

const encodeR2Key = (key: string): string => {
  return key.split('/').map(encodeURIComponent).join('/')
}

const defaultExpiresInSeconds = (): number => {
  return R2_UPLOAD_EXPIRES_SECONDS
}

const presignUrl = async ({
  env,
  method,
  key,
  expiresInSeconds = defaultExpiresInSeconds(),
}: {
  readonly env: Bindings
  readonly method: 'PUT'
  readonly key: string
  readonly expiresInSeconds?: number
}): Promise<string> => {
  const accountId = env.R2_ACCOUNT_ID
  const accessKeyId = env.R2_ACCESS_KEY_ID
  const secretAccessKey = env.R2_SECRET_ACCESS_KEY
  const bucketName = env.R2_BUCKET_NAME
  if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
    throw new Error('R2 presigned URL credentials are not configured.')
  }

  const amzDate = isoDate(new Date())
  const date = shortDate(amzDate)
  const host = `${accountId}.r2.cloudflarestorage.com`
  const credentialScope = `${date}/auto/s3/aws4_request`
  const credential = `${accessKeyId}/${credentialScope}`
  const canonicalUri = `/${bucketName}/${encodeR2Key(key)}`
  const query = new URLSearchParams({
    'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
    'X-Amz-Credential': credential,
    'X-Amz-Date': amzDate,
    'X-Amz-Expires': String(expiresInSeconds),
    'X-Amz-SignedHeaders': 'host',
  })
  const canonicalQuery = query.toString()
  const canonicalRequest = [
    method,
    canonicalUri,
    canonicalQuery,
    `host:${host}`,
    '',
    'host',
    'UNSIGNED-PAYLOAD',
  ].join('\n')
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    await sha256Hex(canonicalRequest),
  ].join('\n')
  const dateKey = await subtleHmac(
    textEncoder.encode(`AWS4${secretAccessKey}`),
    date,
  )
  const regionKey = await subtleHmac(dateKey, 'auto')
  const serviceKey = await subtleHmac(regionKey, 's3')
  const signingKey = await subtleHmac(serviceKey, 'aws4_request')
  query.set('X-Amz-Signature', hex(await subtleHmac(signingKey, stringToSign)))
  return `https://${host}${canonicalUri}?${query.toString()}`
}

export const r2 = {
  fileObjectKey,
  presignUrl,
}
