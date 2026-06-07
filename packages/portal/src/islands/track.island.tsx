import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Copy01Icon,
  Link01Icon,
  ReloadIcon,
  Shield02Icon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { trackSecret, type TrackSecretResponse } from '@/apis/secrets'
import { Button } from '@/components/ui/button'
import { EthLogo } from '@/components/eth-logo'
import { Loading } from '@/components/ui/loading'
import { cn } from '@/lib/utils'
import AppContent from '@/components/app-content'
import { loadTrackLinks, type StoredTrackLink } from './track-links'

type TrackSecretIslandProps = {
  readonly trackId?: string
}

const dateTime = (timestamp: number | null): string => {
  if (!timestamp) return '-'

  return new Date(timestamp).toLocaleString()
}

const statusLabel = (status: TrackSecretResponse['status']): string => {
  if (status === 'ready') return 'Ready'
  if (status === 'destroyed') return 'Destroyed'
  if (status === 'expired') return 'Expired'

  return 'Pending'
}

const isEvmAccessUrl = (value: string): boolean => {
  try {
    return new URL(value, 'https://secret.local').pathname.startsWith('/e/')
  } catch {
    return false
  }
}

const isEvmProtectedLink = (
  link: StoredTrackLink | undefined,
  value: string | undefined,
): boolean => {
  if (link?.access === 'evm') return true
  if (!value) return false

  return isEvmAccessUrl(value)
}

const EthereumLogoMark = () => {
  return (
    <span
      title="ETH signature protected"
      className="inline-flex h-5 w-3 shrink-0 items-start pt-[5px] text-zinc-500">
      <EthLogo label="ETH signature protected" />
    </span>
  )
}

const Metric = ({ label, value }: { label: string; value: string }) => {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-xs">
      <p className="text-xs leading-5 font-medium text-zinc-500">{label}</p>
      <p className="mt-2 truncate text-sm leading-6 font-medium text-zinc-950">
        {value}
      </p>
    </div>
  )
}

const ReadLinksPlaceholder = () => {
  return (
    <div className="rounded-md border border-dashed border-zinc-200 bg-white px-4 py-5 shadow-xs">
      <p className="text-sm leading-6 font-medium text-zinc-800">
        Read URLs are unavailable in this browser session.
      </p>
      <p className="mt-1 text-xs leading-5 text-zinc-500">
        Full read URLs are saved only in the session that created the secret. This
        tracking page can refresh read status from the API, but it cannot restore the
        URL secret fragment that stays in the browser hash.
      </p>
    </div>
  )
}

const ReadLinksSessionAlert = () => {
  return (
    <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900">
      <p className="text-xs leading-5 font-medium">Session-only read URLs</p>
      <p className="mt-1 text-xs leading-5 text-amber-800">
        These full read URLs are only available in this browser session. If you close
        this page, they will disappear and cannot be restored from the tracking API.
      </p>
    </div>
  )
}

const ReadRow = ({
  consumedAt,
  link,
  value,
}: {
  readonly consumedAt: number | null
  readonly link?: StoredTrackLink
  readonly value?: string
}) => {
  const [copied, setCopied] = useState(false)
  const consumedLabel = consumedAt ? dateTime(consumedAt) : null
  const consumed = consumedAt !== null
  const isEvmProtected = isEvmProtectedLink(link, value)
  const copyLink = async () => {
    if (!value) return

    try {
      await navigator.clipboard?.writeText(value)
    } catch {
      return
    }

    setCopied(true)
  }

  return (
    <tr className="border-b border-zinc-100 last:border-b-0">
      <td className="px-4 py-3 align-top">
        {value ? (
          <pre className="max-w-full rounded-md bg-zinc-50 px-2.5 py-2 font-mono text-[11px] leading-5 whitespace-pre-wrap text-zinc-800 break-all [overflow-wrap:anywhere]">
            <span className="flex min-w-0 items-start gap-1">
              {isEvmProtected ? <EthereumLogoMark /> : null}
              <code className="min-w-0 flex-1">{value}</code>
            </span>
          </pre>
        ) : (
          <span className="text-xs leading-5 text-zinc-400">Unavailable</span>
        )}
      </td>
      <td className="px-3 py-3 align-middle">
        <span
          title={consumedLabel ?? undefined}
          aria-label={consumedLabel ? `Opened at ${consumedLabel}` : 'Unused'}
          className={cn(
            'inline-flex h-6 items-center justify-center rounded-md border px-2 text-[11px] leading-none font-medium whitespace-nowrap shadow-xs',
            consumed
              ? 'border-zinc-200 bg-zinc-50 text-zinc-600'
              : 'border-emerald-200 bg-emerald-50 text-emerald-700',
          )}>
          {consumed ? 'Opened' : 'Unused'}
        </span>
      </td>
      <td className="px-3 py-3 text-right align-middle">
        {value ? (
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            aria-label="Copy read link"
            onClick={copyLink}
            className="bg-white text-zinc-500 hover:text-zinc-800">
            <HugeiconsIcon
              icon={copied ? Shield02Icon : Copy01Icon}
              strokeWidth={1.7}
            />
          </Button>
        ) : null}
      </td>
    </tr>
  )
}

const ReadList = ({
  links,
  reads,
}: {
  readonly links: readonly StoredTrackLink[]
  readonly reads: TrackSecretResponse['reads']
}) => {
  const linksByReadId = useMemo(() => {
    return new Map(links.map(link => [link.readId, link]))
  }, [links])

  return (
    <div className="overflow-hidden rounded-md border border-zinc-200 bg-white shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full table-fixed border-collapse text-left">
          <colgroup>
            <col />
            <col className="w-[5.5rem]" />
            <col className="w-12" />
          </colgroup>
          <thead className="bg-zinc-50">
            <tr className="border-b border-zinc-200">
              <th className="px-4 py-3 text-xs leading-5 font-medium text-zinc-500">
                URL
              </th>
              <th className="px-3 py-3 text-xs leading-5 font-medium text-zinc-500">
                Status
              </th>
              <th className="px-3 py-3 text-right text-xs leading-5 font-medium text-zinc-500">
                <span className="sr-only">Action</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {reads.map((read, index) => {
              const link = linksByReadId.get(read.readId) ?? links[index]

              return (
                <ReadRow
                  key={read.readId}
                  link={link}
                  value={link?.value}
                  consumedAt={read.consumedAt}
                />
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export const TrackSecretIsland = ({ trackId }: TrackSecretIslandProps) => {
  const [links, setLinks] = useState<readonly StoredTrackLink[]>([])
  const [refreshing, setRefreshing] = useState(false)
  const [secret, setSecret] = useState<TrackSecretResponse | null>(null)
  const [status, setStatus] = useState('Loading...')
  const requestIdRef = useRef(0)
  const refreshingRef = useRef(false)

  const loadSecret = useCallback(
    async (mode: 'initial' | 'refresh') => {
      const requestId = requestIdRef.current + 1
      requestIdRef.current = requestId

      if (!trackId) {
        setSecret(null)
        setStatus('Tracking link is missing.')
        return
      }

      setLinks(loadTrackLinks(trackId))
      if (mode === 'initial') setStatus('Loading...')

      try {
        const nextSecret = await trackSecret(trackId)
        if (requestIdRef.current !== requestId) return

        setSecret(nextSecret)
        setStatus('')
      } catch (error) {
        if (requestIdRef.current !== requestId) return

        setStatus(
          error instanceof Error ? error.message : 'Unable to load tracking.',
        )
      }
    },
    [trackId],
  )

  useEffect(() => {
    void loadSecret('initial')

    return () => {
      requestIdRef.current += 1
    }
  }, [loadSecret])

  const refreshSecret = async () => {
    if (refreshingRef.current) return

    refreshingRef.current = true
    setRefreshing(true)
    try {
      await loadSecret('refresh')
    } finally {
      refreshingRef.current = false
      setRefreshing(false)
    }
  }

  const consumedReads = useMemo(() => {
    return secret?.reads.filter(read => read.consumedAt !== null).length ?? 0
  }, [secret])

  const isLoading = status === 'Loading...'

  if (!secret) {
    return (
      <section className="mx-auto w-full px-9 md:px-18">
        <div className="mx-auto w-full pb-20">
          {isLoading ? (
            <Loading />
          ) : (
            <p className="text-xs leading-5 text-muted-foreground">{status}</p>
          )}
        </div>
      </section>
    )
  }

  return (
    <AppContent>
      <div className="grid gap-3 max-md:grid-cols-2 grid-cols-3 w-full">
        <Metric
          label="Remaining"
          value={`${secret.remainingReads}/${secret.readLimit}`}
        />
        <Metric label="Status" value={statusLabel(secret.status)} />
        <Metric label="Creation" value={dateTime(secret.createdAt)} />
        <Metric label="Expiration" value={dateTime(secret.expiresAt)} />
        <Metric label="Opened" value={`${consumedReads}`} />
        <Metric label="Destroyed" value={dateTime(secret.destroyedAt)} />
      </div>

      <div className="mt-10 border-t border-zinc-100 pt-6 w-full">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-sm leading-6 font-medium text-zinc-800">
              <HugeiconsIcon
                icon={Link01Icon}
                strokeWidth={1.7}
                className="size-3.5"
              />
              Read links
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Refresh read links"
            aria-busy={refreshing}
            data-loading={refreshing || undefined}
            onClick={refreshSecret}
            className="bg-white text-zinc-500 hover:text-zinc-800 data-[loading=true]:cursor-wait data-[loading=true]:text-zinc-800">
            <HugeiconsIcon
              icon={ReloadIcon}
              strokeWidth={1.7}
              className={refreshing ? 'animate-spin' : undefined}
            />
          </Button>
        </div>
        {status ? (
          <p className="mt-3 text-xs leading-5 text-destructive">{status}</p>
        ) : null}
        <div className="mt-5">
          {links.length ? (
            <div className="grid gap-3">
              <ReadLinksSessionAlert />
              <ReadList links={links} reads={secret.reads} />
            </div>
          ) : (
            <ReadLinksPlaceholder />
          )}
        </div>
      </div>
    </AppContent>
  )
}
