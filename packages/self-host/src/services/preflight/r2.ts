import { createHash, createHmac } from 'node:crypto'

import { SelfHostError } from '@/utils/errors'
import { requireEnv } from './env'
import type { PreflightCheck } from './types'
import { wranglerJson } from './wrangler'

type SignedR2Input = {
  readonly accessKeyId: string
  readonly accountId: string
  readonly bucketName: string
  readonly secretAccessKey: string
}

export const r2Preflight: PreflightCheck = {
  label: 'r2',
  run: async context => {
    const env = requireEnv(context)

    await wranglerJson(['r2', 'bucket', 'info', env.R2_BUCKET_NAME, '--json'], env, {
      failure:
        'R2 bucket check failed. Verify your Wrangler session, R2_ACCOUNT_ID, and R2_BUCKET_NAME.',
    })
    await assertR2Credentials({
      accessKeyId: env.R2_ACCESS_KEY_ID,
      accountId: env.R2_ACCOUNT_ID,
      bucketName: env.R2_BUCKET_NAME,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    })
  },
}

async function assertR2Credentials(input: SignedR2Input): Promise<void> {
  const request = signedR2ListRequest(input)
  const response = await fetch(request.url, {
    headers: request.headers,
    method: 'GET',
  })
  if (response.ok) return

  throw new SelfHostError(
    `R2 check failed. Verify R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, and R2_BUCKET_NAME. HTTP ${response.status}: ${await safeText(response)}`,
  )
}

const safeText = async (response: Response): Promise<string> => {
  const text = await response.text()

  return text.slice(0, 500)
}

const signedR2ListRequest = ({
  accessKeyId,
  accountId,
  bucketName,
  secretAccessKey,
}: SignedR2Input): {
  readonly headers: Record<string, string>
  readonly url: string
} => {
  const amzDate = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '')
  const date = amzDate.slice(0, 8)
  const host = `${accountId}.r2.cloudflarestorage.com`
  const canonicalUri = `/${encodeURIComponent(bucketName)}`
  const canonicalQuery = 'list-type=2&max-keys=1'
  const payloadHash = sha256Hex('')
  const headers = {
    host,
    'x-amz-content-sha256': payloadHash,
    'x-amz-date': amzDate,
  }
  const signedHeaders = Object.keys(headers).sort().join(';')
  const canonicalHeaders = Object.keys(headers)
    .sort()
    .map(key => `${key}:${headers[key as keyof typeof headers]}`)
    .join('\n')
  const canonicalRequest = [
    'GET',
    canonicalUri,
    canonicalQuery,
    `${canonicalHeaders}\n`,
    signedHeaders,
    payloadHash,
  ].join('\n')
  const credentialScope = `${date}/auto/s3/aws4_request`
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    sha256Hex(canonicalRequest),
  ].join('\n')
  const signature = hmacHex(
    hmac(
      hmac(hmac(hmac(`AWS4${secretAccessKey}`, date), 'auto'), 's3'),
      'aws4_request',
    ),
    stringToSign,
  )

  return {
    headers: {
      ...headers,
      authorization: `AWS4-HMAC-SHA256 ${[
        `Credential=${accessKeyId}/${credentialScope}`,
        `SignedHeaders=${signedHeaders}`,
        `Signature=${signature}`,
      ].join(', ')}`,
    },
    url: `https://${host}${canonicalUri}?${canonicalQuery}`,
  }
}

const sha256Hex = (value: string): string => {
  return createHash('sha256').update(value).digest('hex')
}

const hmac = (key: string | Buffer, value: string): Buffer => {
  return createHmac('sha256', key).update(value).digest()
}

const hmacHex = (key: Buffer, value: string): string => {
  return createHmac('sha256', key).update(value).digest('hex')
}
