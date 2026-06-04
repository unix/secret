import { lstat, readdir, readFile, unlink } from 'node:fs/promises'
import { join } from 'node:path'
import { Service } from 'func'

import { CONFIG_KEYS, configDir, configs } from '../configs'
import {
  CLEANUP_INTERVAL_MS,
  CONFIG_FILE_NAME,
  TRACK_FILE_PREFIX,
  TRACK_RETENTION_MS,
} from '../utils/constants'

export type CleanupResult = {
  readonly removed: number
  readonly skipped: boolean
}

type CleanupOptions = {
  readonly all?: boolean
  readonly force?: boolean
}

type TrackFile = {
  readonly createdAt: number
}

@Service()
export class CleanupService {
  async run(options: CleanupOptions = {}): Promise<CleanupResult> {
    await configs.init()
    if (!options.force && !options.all) {
      const lastRunAt = await configs.get(CONFIG_KEYS.CLEANUP_LAST_RUN_AT)
      if (Date.now() - lastRunAt < CLEANUP_INTERVAL_MS) {
        return {
          removed: 0,
          skipped: true,
        }
      }
    }

    const removed = options.all
      ? await this.removeAll()
      : await this.removeExpiredTracks()
    await configs.put(CONFIG_KEYS.CLEANUP_LAST_RUN_AT, Date.now())

    return {
      removed,
      skipped: false,
    }
  }

  private async entries(): Promise<readonly string[]> {
    try {
      return await readdir(configDir())
    } catch (error) {
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        error.code === 'ENOENT'
      ) {
        return []
      }

      throw error
    }
  }

  private async removeAll(): Promise<number> {
    let removed = 0
    for (const entry of await this.entries()) {
      if (entry === CONFIG_FILE_NAME) continue

      const path = join(configDir(), entry)
      if (!(await lstat(path)).isFile()) continue

      await unlink(path)
      removed += 1
    }

    return removed
  }

  private async removeExpiredTracks(): Promise<number> {
    const expiresBefore = Date.now() - TRACK_RETENTION_MS
    let removed = 0
    for (const entry of await this.entries()) {
      if (!entry.startsWith(TRACK_FILE_PREFIX)) continue

      const track = await this.trackFile(entry)
      if (!track || track.createdAt > expiresBefore) continue

      await unlink(join(configDir(), entry))
      removed += 1
    }

    return removed
  }

  private async trackFile(entry: string): Promise<TrackFile | null> {
    try {
      const parsed: unknown = JSON.parse(
        await readFile(join(configDir(), entry), 'utf8'),
      )
      if (!parsed || typeof parsed !== 'object') return null
      if (!('createdAt' in parsed) || typeof parsed.createdAt !== 'number')
        return null

      return { createdAt: parsed.createdAt }
    } catch {
      return null
    }
  }
}
