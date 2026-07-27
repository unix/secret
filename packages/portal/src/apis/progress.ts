import type { AxiosProgressEvent } from 'axios'

export type HttpProgress = {
  readonly bytes: number
  readonly estimated: number | null
  readonly loaded: number
  readonly percent: number | null
  readonly rate: number | null
  readonly total: number | null
}

const isFiniteNumber = (value: unknown): value is number => {
  return typeof value === 'number' && Number.isFinite(value)
}

const normalizedPercent = ({
  loaded,
  progress,
  total,
}: {
  readonly loaded: number
  readonly progress: number | undefined
  readonly total: number | null
}): number | null => {
  if (isFiniteNumber(progress)) return Math.max(0, Math.min(progress, 1))
  if (total && total > 0) return Math.max(0, Math.min(loaded / total, 1))
  return null
}

export const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`
  const units = ['KB', 'MB', 'GB']
  let size = bytes / 1024
  let unitIndex = 0

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex += 1
  }

  return `${size.toFixed(size >= 10 ? 1 : 2)} ${units[unitIndex]}`
}

export const httpProgress = ({
  bytes,
  estimated,
  loaded,
  progress,
  rate,
  total,
}: AxiosProgressEvent): HttpProgress => {
  const normalizedTotal = isFiniteNumber(total) && total > 0 ? total : null

  return {
    bytes: isFiniteNumber(bytes) ? bytes : 0,
    estimated: isFiniteNumber(estimated) ? estimated : null,
    loaded,
    percent: normalizedPercent({
      loaded,
      progress,
      total: normalizedTotal,
    }),
    rate: isFiniteNumber(rate) ? rate : null,
    total: normalizedTotal,
  }
}

export const transferStatus = ({
  progress,
  verb,
}: {
  readonly progress: HttpProgress
  readonly verb: string
}): string => {
  const loaded = formatBytes(progress.loaded)
  const total = progress.total ? `/${formatBytes(progress.total)}` : ''
  const speed = progress.rate ? ` at ${formatBytes(progress.rate)}/s` : ''
  if (progress.percent === null) return `${verb} ${loaded}${speed}...`
  return `${verb} ${Math.round(progress.percent * 100)}% (${loaded}${total})${speed}...`
}
