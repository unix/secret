import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import { configDir, ensureConfigDir } from '../configs/files'
import { TRACK_FILE_PREFIX } from './constants'

export type StoredTrackLink = {
  readonly readId: string
  readonly value: string
}

export type StoredTrack = {
  readonly kind: 'text' | 'file'
  readonly trackId: string
  readonly trackUrl: string
  readonly createdAt: number
  readonly links: readonly StoredTrackLink[]
}

export const trackFile = (trackId: string): string => {
  return join(configDir(), `${TRACK_FILE_PREFIX}${trackId}`)
}

export const saveTrack = async (track: StoredTrack): Promise<void> => {
  await ensureConfigDir()
  await writeFile(trackFile(track.trackId), `${JSON.stringify(track, null, 2)}\n`, {
    mode: 0o600,
  })
}

export const loadTrack = async (trackId: string): Promise<StoredTrack | null> => {
  try {
    const raw = await readFile(trackFile(trackId), 'utf8')
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return null
    if (!('trackId' in parsed) || parsed.trackId !== trackId) return null
    if (!('links' in parsed) || !Array.isArray(parsed.links)) return null

    return parsed as StoredTrack
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error) {
      if (error.code === 'ENOENT') return null
    }

    throw error
  }
}
