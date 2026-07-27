import { SelfHostError } from '../../utils/errors'
import { requireConfig } from './config'
import type { PreflightCheck } from './types'

const assertOrigin = (origin: string, key: string): void => {
  let url: URL
  try {
    url = new URL(origin)
  } catch {
    throw new SelfHostError(`secret.config.json ${key} is not a valid URL.`)
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new SelfHostError(`secret.config.json ${key} must use http or https.`)
  }
  if (url.origin !== origin || url.pathname !== '/' || url.search || url.hash) {
    throw new SelfHostError(
      `secret.config.json ${key} must be an origin, such as https://secret.example.com.`,
    )
  }
}

export const originsPreflight: PreflightCheck = {
  label: 'origins',
  run: async context => {
    const config = requireConfig(context)
    assertOrigin(config.portal.origin, 'portal.origin')
    assertOrigin(config.edge.origin, 'edge.origin')
  },
}
