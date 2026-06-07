export type StoredTrackLink = {
  readonly access?: 'evm'
  readonly readId: string
  readonly value: string
}

type StoredTrackLinks = {
  readonly links: readonly StoredTrackLink[]
}

const TRACK_LINKS_STORAGE_PREFIX = 'secret:track-links:'

const storageKey = (trackId: string): string => {
  return `${TRACK_LINKS_STORAGE_PREFIX}${trackId}`
}

const isStoredTrackLink = (value: unknown): value is StoredTrackLink => {
  if (typeof value !== 'object' || value === null) return false

  const access = 'access' in value ? value.access : undefined

  return (
    'readId' in value &&
    'value' in value &&
    (access === undefined || access === 'evm') &&
    typeof value.readId === 'string' &&
    typeof value.value === 'string'
  )
}

const isStoredTrackLinks = (value: unknown): value is StoredTrackLinks => {
  if (typeof value !== 'object' || value === null || !('links' in value)) {
    return false
  }

  return Array.isArray(value.links) && value.links.every(isStoredTrackLink)
}

export const loadTrackLinks = (trackId: string): readonly StoredTrackLink[] => {
  try {
    const item = window.sessionStorage.getItem(storageKey(trackId))
    if (!item) return []

    const value: unknown = JSON.parse(item)
    if (isStoredTrackLinks(value)) return value.links
  } catch {
    return []
  }

  return []
}

export const saveTrackLinks = (
  trackId: string,
  links: readonly StoredTrackLink[],
): void => {
  try {
    window.sessionStorage.setItem(storageKey(trackId), JSON.stringify({ links }))
  } catch {
    return
  }
}
