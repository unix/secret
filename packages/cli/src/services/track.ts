import { Service } from 'func'

import { CONFIG_KEYS, configs } from '../configs'
import { ApiClient, type TrackSecretResponse } from '../utils/api'
import { loadTrack, type StoredTrack } from '../utils/storage'

export type TrackResult = {
  readonly response: TrackSecretResponse
  readonly track: StoredTrack | null
}

@Service()
export class TrackService {
  async load(trackId: string): Promise<TrackResult> {
    const local = await loadTrack(trackId)
    const endpoints = await configs.get(CONFIG_KEYS.ENDPOINTS)
    const api = new ApiClient({ apiOrigin: endpoints.apiOrigin })

    return {
      track: local,
      response: await api.track(trackId),
    }
  }
}
