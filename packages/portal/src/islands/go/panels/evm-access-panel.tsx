import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Cancel01Icon, ReloadIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { getAddress } from 'viem'
import { normalize } from 'viem/ens'
import { resolveEnsName, verifyEvmAddressStatus } from '@/apis/secrets'
import { EthLogo } from '@/components/eth-logo'
import { AnimatedHeightContainer } from '@/components/ui/animated-height'
import { Button } from '@/components/ui/button'
import {
  Field,
  FieldDescription,
  FieldError,
  FieldTitle,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import {
  evmAccessHistory,
  type EvmAccessHistoryMatch,
} from '@/services/evm-access-history'
import type { EvmAccessRequirement } from '@/islands/go/types'

type EvmAccessPanelProps = {
  readonly access: EvmAccessRequirement | null
  readonly onAccessChange: (access: EvmAccessRequirement | null) => void
}

const MAINNET_CHAIN_ID = 1
const UNSUPPORTED_EVM_ACCOUNT_MESSAGE =
  'Contract addresses and smart wallets are not supported yet.'

type VerificationStage = 'idle' | 'verifying-ens' | 'checking-address'

type EnsState =
  | {
      readonly status: 'idle'
    }
  | {
      readonly address: `0x${string}`
      readonly input: string
      readonly name: string
      readonly status: 'resolved'
    }
  | {
      readonly error: string
      readonly input: string
      readonly status: 'invalid'
    }

const buttonLabel = (stage: VerificationStage): string => {
  if (stage === 'verifying-ens') return 'Verifying ENS'
  if (stage === 'checking-address') return 'Checking Address'

  return 'Confirm'
}

const shortAddress = (address: string): string => {
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

const normalizedAddress = (value: string): `0x${string}` | null => {
  try {
    return getAddress(value.trim())
  } catch {
    return null
  }
}

const isEnsCandidate = (value: string): boolean => {
  return normalizedEnsName(value) !== null
}

const normalizedEnsName = (value: string): string | null => {
  const trimmed = value.trim()
  if (!trimmed.includes('.') || normalizedAddress(trimmed)) return null

  try {
    return normalize(trimmed)
  } catch {
    return null
  }
}

const addressError = (value: string, ensState: EnsState): string | null => {
  const trimmed = value.trim()
  if (!trimmed) return null
  if (isEnsCandidate(trimmed)) {
    if (ensState.status === 'invalid' && ensState.input === trimmed) {
      return ensState.error
    }

    return null
  }
  if (!normalizedAddress(trimmed))
    return 'Enter a valid Ethereum address or ENS name.'

  return null
}

const accessLabel = (access: EvmAccessRequirement): string => {
  if (typeof access.ens === 'string') return access.ens
  if (access.address) return shortAddress(access.address)

  return 'ETH'
}

const historyMatchDescription = (match: EvmAccessHistoryMatch): string | null => {
  if (match.kind === 'ens') return match.address
  if (match.relatedEns) return match.relatedEns

  return null
}

export const EvmAccessPanel = ({ access, onAccessChange }: EvmAccessPanelProps) => {
  const confirmButtonFrameRef = useRef<HTMLSpanElement>(null)
  const [open, setOpen] = useState(false)
  const [verificationStage, setVerificationStage] =
    useState<VerificationStage>('idle')
  const [confirmButtonWidth, setConfirmButtonWidth] = useState<number | null>(null)
  const [historyMatches, setHistoryMatches] = useState<
    readonly EvmAccessHistoryMatch[]
  >([])
  const [statusError, setStatusError] = useState<string | null>(null)
  const [ensState, setEnsState] = useState<EnsState>({ status: 'idle' })
  const [value, setValue] = useState(access?.ens ?? access?.address ?? '')

  useEffect(() => {
    if (!open) return

    setEnsState({ status: 'idle' })
    setStatusError(null)
    setVerificationStage('idle')
    setValue(access?.ens ?? access?.address ?? '')
  }, [access?.address, access?.ens, open])

  useEffect(() => {
    setStatusError(null)
    setEnsState(current => {
      if (current.status === 'idle' || current.input === value.trim()) return current

      return { status: 'idle' }
    })
  }, [value])

  useEffect(() => {
    const hasCompleteInput =
      normalizedAddress(value) !== null || normalizedEnsName(value) !== null
    if (!open || verificationStage !== 'idle' || hasCompleteInput) {
      setHistoryMatches([])
      return
    }

    let cancelled = false
    evmAccessHistory
      .matches(value)
      .then(matches => {
        if (cancelled) return

        setHistoryMatches(matches)
      })
      .catch(() => {
        if (cancelled) return

        setHistoryMatches([])
      })

    return () => {
      cancelled = true
    }
  }, [open, value, verificationStage])

  useLayoutEffect(() => {
    const button = confirmButtonFrameRef.current?.firstElementChild
    if (!(button instanceof HTMLElement)) return

    const width = Math.ceil(button.getBoundingClientRect().width)
    setConfirmButtonWidth(current => {
      if (current === width) return current

      return width
    })
  }, [open, verificationStage])

  const error = useMemo(() => addressError(value, ensState), [ensState, value])
  const address = useMemo(() => normalizedAddress(value), [value])
  const ensName = useMemo(() => normalizedEnsName(value), [value])
  const trimmedValue = value.trim()
  const isCurrentEnsResolved =
    ensState.status === 'resolved' && ensState.input === trimmedValue
  const isLoading = verificationStage !== 'idle'
  const isPossibleEns = ensName !== null
  const fieldError = error ?? statusError
  const canConfirm = !fieldError && (address !== null || isPossibleEns) && !isLoading

  const confirm = async () => {
    if (address) {
      setVerificationStage('checking-address')
      setStatusError(null)
      try {
        await verifyEvmAddressStatus(address)
      } catch (error) {
        setStatusError(
          error instanceof Error ? error.message : UNSUPPORTED_EVM_ACCOUNT_MESSAGE,
        )
        return
      } finally {
        setVerificationStage('idle')
      }

      await evmAccessHistory.saveAddress(address).catch(() => undefined)
      onAccessChange({
        address,
        chainId: MAINNET_CHAIN_ID,
        type: 'evm',
      })
      setOpen(false)
      return
    }

    if (!ensName) return

    setVerificationStage('verifying-ens')
    setStatusError(null)
    setEnsState({ status: 'idle' })

    const result = await resolveEnsName(ensName).catch(error => {
      setEnsState({
        error:
          error instanceof Error ? error.message : 'Unable to resolve ENS name.',
        input: trimmedValue,
        status: 'invalid',
      })
      setVerificationStage('idle')

      return null
    })
    if (!result) return
    if (result.status !== 'resolved' || !result.address) {
      setEnsState({
        error: result.error ?? 'ENS name does not resolve to an address.',
        input: trimmedValue,
        status: 'invalid',
      })
      setVerificationStage('idle')
      return
    }

    setEnsState({
      address: result.address,
      input: trimmedValue,
      name: result.name,
      status: 'resolved',
    })
    setVerificationStage('checking-address')
    try {
      await verifyEvmAddressStatus(result.address)
    } catch (error) {
      setStatusError(
        error instanceof Error ? error.message : UNSUPPORTED_EVM_ACCOUNT_MESSAGE,
      )
      setVerificationStage('idle')
      return
    }

    await evmAccessHistory
      .saveEns({
        address: result.address,
        ens: result.name,
      })
      .catch(() => undefined)
    await evmAccessHistory.saveAddress(result.address).catch(() => undefined)
    onAccessChange({
      chainId: MAINNET_CHAIN_ID,
      ens: result.name,
      resolvedAddress: result.address,
      type: 'evm',
    })
    setVerificationStage('idle')
    setOpen(false)
  }

  const selectHistoryMatch = (match: EvmAccessHistoryMatch): void => {
    if (isLoading) return

    setValue(match.value)
  }

  const removeHistoryMatch = async (match: EvmAccessHistoryMatch): Promise<void> => {
    await evmAccessHistory.remove(match).catch(() => undefined)
    setHistoryMatches(matches => matches.filter(item => item.key !== match.key))
  }

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-xs">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <FieldTitle className="text-sm text-zinc-950">ETH verification</FieldTitle>
          <FieldDescription className="mt-1 text-zinc-500">
            Require the recipient to verify a specific wallet before receiving a read
            link.
          </FieldDescription>
        </div>
        {access ? (
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              title="Only Ethereum mainnet verification is supported."
              className="inline-flex h-7 items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 text-xs font-medium text-emerald-700">
              <EthLogo className="size-3" />
              ETH added · {accessLabel(access)}
            </button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Remove ETH verification"
              onClick={() => onAccessChange(null)}
              className="border-zinc-200 bg-white text-zinc-500 hover:bg-zinc-50 hover:text-zinc-950">
              <HugeiconsIcon icon={Cancel01Icon} strokeWidth={1.7} />
            </Button>
          </div>
        ) : (
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(true)}
            className="shrink-0 border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 hover:text-zinc-950">
            <EthLogo className="size-3" />
            Add ETH verification
          </Button>
        )}
      </div>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="evm-access-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4">
          <div className="w-full max-w-md rounded-lg border border-zinc-200 bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h2
                  id="evm-access-title"
                  className="text-sm font-medium text-zinc-950">
                  ETH verification
                </h2>
                <p className="mt-1 text-xs leading-5 text-zinc-500">
                  The recipient must sign a mainnet SIWE message before a read link
                  is issued.{' '}
                  <a
                    href="/intro#eth-signature-verification"
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium text-zinc-700 underline underline-offset-2 hover:text-zinc-950">
                    Learn more.
                  </a>
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Close ETH verification dialog"
                disabled={isLoading}
                onClick={() => setOpen(false)}
                className="text-zinc-500 hover:text-zinc-950">
                <HugeiconsIcon icon={Cancel01Icon} strokeWidth={1.7} />
              </Button>
            </div>

            <div className="mt-5 space-y-4">
              <Field>
                <FieldTitle>Wallet address or ENS</FieldTitle>
                <div className="relative">
                  <Input
                    value={value}
                    onChange={event => setValue(event.currentTarget.value)}
                    placeholder="0x... or name.eth"
                    aria-invalid={!!fieldError}
                    disabled={isLoading}
                    className="h-9 border-zinc-200 bg-white font-mono text-sm"
                  />
                  {historyMatches.length > 0 && (
                    <div className="absolute top-full right-0 left-0 z-10 mt-1 overflow-hidden rounded-lg border border-zinc-200 bg-white p-1 shadow-lg">
                      {historyMatches.map(match => {
                        const description = historyMatchDescription(match)

                        return (
                          <div
                            key={match.key}
                            className="group flex w-full items-start gap-2 rounded-md px-2 py-1.5 hover:bg-zinc-50">
                            <button
                              type="button"
                              onPointerDown={event => {
                                event.preventDefault()
                                selectHistoryMatch(match)
                              }}
                              onClick={() => selectHistoryMatch(match)}
                              className="min-w-0 flex-1 text-left">
                              <span className="block truncate font-mono text-xs leading-5 text-zinc-950">
                                {match.value}
                              </span>
                              {description && (
                                <span className="block truncate font-mono text-[0.6875rem] leading-4 text-zinc-500">
                                  {description}
                                </span>
                              )}
                            </button>
                            <button
                              type="button"
                              aria-label={`Delete ${match.value} from history`}
                              title="Delete"
                              onPointerDown={event => {
                                event.preventDefault()
                                event.stopPropagation()
                              }}
                              onClick={event => {
                                event.preventDefault()
                                event.stopPropagation()
                                void removeHistoryMatch(match)
                              }}
                              className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-sm text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700">
                              <HugeiconsIcon
                                icon={Cancel01Icon}
                                strokeWidth={1.7}
                                className="size-3"
                              />
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
                <div className="h-10 overflow-hidden">
                  {!fieldError && !isCurrentEnsResolved && (
                    <FieldDescription>
                      Enter an Ethereum address or ENS name. ENS is resolved by the
                      server before it can be confirmed.
                    </FieldDescription>
                  )}
                  <AnimatedHeightContainer
                    open={!!fieldError || isCurrentEnsResolved}>
                    {fieldError ? (
                      <FieldError>{fieldError}</FieldError>
                    ) : isCurrentEnsResolved ? (
                      <FieldDescription className="break-all font-mono text-zinc-400">
                        Resolves to {ensState.address}
                      </FieldDescription>
                    ) : null}
                  </AnimatedHeightContainer>
                </div>
              </Field>

              <div
                title="Only Ethereum mainnet verification is supported."
                className={cn(
                  'flex items-center justify-between rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-600',
                )}>
                <span>Chain</span>
                <span className="font-medium text-zinc-950">Ethereum mainnet</span>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={isLoading}
                onClick={() => setOpen(false)}
                className="border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 hover:text-zinc-950">
                Cancel
              </Button>
              <span
                ref={confirmButtonFrameRef}
                className="inline-flex overflow-hidden rounded-md transition-[width] duration-200 ease-out"
                style={
                  confirmButtonWidth === null
                    ? undefined
                    : { width: confirmButtonWidth }
                }>
                <Button type="button" disabled={!canConfirm} onClick={confirm}>
                  {isLoading && (
                    <HugeiconsIcon
                      icon={ReloadIcon}
                      strokeWidth={1.7}
                      className="animate-spin"
                    />
                  )}
                  {buttonLabel(verificationStage)}
                </Button>
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
