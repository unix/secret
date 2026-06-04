import { VALID_EXPIRATIONS, VALID_LINK_COUNTS } from '../limits'

const expirationLabel = (seconds: number): string => {
  if (seconds < 60) return `${seconds} seconds`
  if (seconds % 3600 === 0) {
    return `${seconds / 3600} hour${seconds === 3600 ? '' : 's'}`
  }
  if (seconds % 60 === 0) return `${seconds / 60} minutes`

  return `${seconds} seconds`
}

const readLabel = (count: number): string => {
  return `${count} link${count === 1 ? '' : 's'}`
}

export const expirationOptions = VALID_EXPIRATIONS.map(seconds => ({
  value: String(seconds),
  label: expirationLabel(seconds),
}))

export const readOptions = VALID_LINK_COUNTS.map(count => ({
  value: String(count),
  label: readLabel(count),
}))
