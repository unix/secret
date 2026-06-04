import { useMemo, useReducer } from 'react'
import { DEFAULT_EXPIRATION_SECONDS, DEFAULT_LINK_COUNT } from '@/islands/go/limits'
import type { SecretMode, SecretSettings } from '@/islands/go/types'

type GoSecretState = {
  readonly busy: boolean
  readonly file: File | null
  readonly mode: SecretMode
  readonly settings: SecretSettings
  readonly status: string
  readonly value: string
}

type GoSecretAction =
  | { readonly type: 'set-mode'; readonly mode: SecretMode }
  | { readonly type: 'set-value'; readonly value: string }
  | { readonly type: 'set-file'; readonly file: File | null }
  | { readonly type: 'set-expires'; readonly expiresInSeconds: string }
  | { readonly type: 'set-reads'; readonly reads: string }
  | { readonly type: 'set-status'; readonly status: string }
  | { readonly type: 'set-busy'; readonly busy: boolean }
  | { readonly type: 'prepare-submit' }

const initialState: GoSecretState = {
  mode: 'text',
  value: '',
  file: null,
  settings: {
    expiresInSeconds: String(DEFAULT_EXPIRATION_SECONDS),
    reads: String(DEFAULT_LINK_COUNT),
  },
  status: '',
  busy: false,
}

const reducer = (state: GoSecretState, action: GoSecretAction): GoSecretState => {
  if (action.type === 'set-mode') {
    return { ...state, mode: action.mode }
  }

  if (action.type === 'set-value') {
    return { ...state, value: action.value }
  }

  if (action.type === 'set-file') {
    return { ...state, file: action.file }
  }

  if (action.type === 'set-expires') {
    return {
      ...state,
      settings: { ...state.settings, expiresInSeconds: action.expiresInSeconds },
    }
  }

  if (action.type === 'set-reads') {
    return { ...state, settings: { ...state.settings, reads: action.reads } }
  }

  if (action.type === 'set-status') {
    return { ...state, status: action.status }
  }

  if (action.type === 'set-busy') {
    return { ...state, busy: action.busy }
  }

  return {
    ...state,
    busy: true,
    status: 'Preparing secret...',
  }
}

export const useGoSecretState = () => {
  const [state, dispatch] = useReducer(reducer, initialState)
  const actions = useMemo(
    () => ({
      prepareSubmit: () => dispatch({ type: 'prepare-submit' }),
      setBusy: (busy: boolean) => dispatch({ type: 'set-busy', busy }),
      setExpiresInSeconds: (expiresInSeconds: string) =>
        dispatch({ type: 'set-expires', expiresInSeconds }),
      setFile: (file: File | null) => dispatch({ type: 'set-file', file }),
      setMode: (mode: SecretMode) => dispatch({ type: 'set-mode', mode }),
      setReads: (reads: string) => dispatch({ type: 'set-reads', reads }),
      setStatus: (status: string) => dispatch({ type: 'set-status', status }),
      setValue: (value: string) => dispatch({ type: 'set-value', value }),
    }),
    [],
  )
  const fieldHint = useMemo(() => {
    if (state.mode === 'file') return 'Files are encrypted locally before upload.'
    if (state.mode === 'password') {
      return 'Passwords use the same short-lived secret flow.'
    }

    return ''
  }, [state.mode])
  const disabled =
    state.busy ||
    (state.mode === 'file' ? state.file === null : state.value.trim().length === 0)

  return {
    disabled,
    fieldHint,
    state,
    actions,
  }
}

export type GoSecretStateApi = ReturnType<typeof useGoSecretState>
