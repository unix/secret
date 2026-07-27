import type { TrackSecretResponse } from './api'
import { revealId } from './links'
import type { StoredTrackLink } from './storage'
import { cyan, dim, green, yellow } from './terminal'

type ReadStatus = TrackSecretResponse['reads'][number]

const statusText = (status: TrackSecretResponse['status']): string => {
  if (status === 'ready') return green('ready')
  if (status === 'pending') return yellow('pending')
  if (status === 'expired') return yellow('expired')
  return yellow('destroyed')
}

const pad = (value: number): string => {
  return String(value).padStart(2, '0')
}

const dateTime = (timestamp: number | null): string => {
  if (!timestamp) return '-'
  const date = new Date(timestamp)
  const year = date.getFullYear()
  const month = pad(date.getMonth() + 1)
  const day = pad(date.getDate())
  const hour = pad(date.getHours())
  const minute = pad(date.getMinutes())
  const second = pad(date.getSeconds())
  return `${year}-${month}-${day} ${hour}:${minute}:${second}`
}

export const printTrackSummary = (
  secret: TrackSecretResponse,
  track: { readonly trackUrl?: string } | null,
): void => {
  const openedReads = secret.reads.filter(read => read.consumedAt !== null).length
  console.log('Summary:')
  if (track?.trackUrl) console.log(`  url: ${track.trackUrl}`)
  console.log(`  status: ${statusText(secret.status)}`)
  console.log(`  type: ${secret.kind}`)
  console.log(
    `  reads: ${openedReads} opened, ${secret.remainingReads} remaining, ${secret.readLimit} total`,
  )
  console.log(`  created: ${dateTime(secret.createdAt)}`)
  console.log(`  completed: ${dateTime(secret.completedAt)}`)
  console.log(`  expires: ${dateTime(secret.expiresAt)}`)
  console.log(`  destroyed: ${dateTime(secret.destroyedAt)}`)
}

const readStatusText = (read: ReadStatus | undefined): string => {
  if (!read) return dim('unknown')
  if (read.consumedAt) return dim('opened')
  return green('unused')
}

const revealIdFromLink = (link: StoredTrackLink): string => {
  const url = new URL(link.value)

  return revealId({
    readId: link.readId,
    secret: url.hash.slice(1),
  })
}

const revealCommand = (link: StoredTrackLink): string => {
  return `secret reveal ${revealIdFromLink(link)}`
}

export const printTrackLinks = (
  links: readonly StoredTrackLink[],
  reads: readonly ReadStatus[] = [],
): void => {
  const readsById = new Map(reads.map(read => [read.readId, read]))
  console.log(`Generated links (${links.length}):`)
  links.forEach((link, index) => {
    const read = readsById.get(link.readId)
    console.log(`  ${index + 1}. status: ${readStatusText(read)}`)
    if (read?.consumedAt) {
      console.log(`     opened: ${dateTime(read.consumedAt)}`)
    }
    console.log(`     url: ${link.value}`)
    console.log(`     cli: ${cyan(revealCommand(link))}`)
  })
}

export const printTrackReads = (reads: readonly ReadStatus[]): void => {
  console.log(`Reads (${reads.length}):`)
  reads.forEach((read, index) => {
    console.log(`  ${index + 1}. status: ${readStatusText(read)}`)
    console.log(`     readId: ${read.readId}`)
    if (read.consumedAt) {
      console.log(`     opened: ${dateTime(read.consumedAt)}`)
    }
  })
  console.log('')
}
