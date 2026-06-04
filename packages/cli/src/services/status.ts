import { Service } from 'func'
import { CONFIG_KEYS, configs } from '../configs'
import { ApiClient } from '../utils/api'

@Service()
export class StatusService {
  async check(): Promise<{
    readonly apiOrigin: string
    readonly response: unknown
  }> {
    const endpoints = await configs.get(CONFIG_KEYS.ENDPOINTS)
    const api = new ApiClient({ apiOrigin: endpoints.apiOrigin })

    return {
      apiOrigin: endpoints.apiOrigin,
      response: await api.status(),
    }
  }
}
