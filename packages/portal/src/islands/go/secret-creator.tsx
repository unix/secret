import { ReloadIcon, Shield02Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { SecretTypeTabs } from '@/components/secret-type-tabs'
import { Button } from '@/components/ui/button'
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldSet,
  FieldTitle,
} from '@/components/ui/field'
import AppContent from '@/components/app-content'
import { SecretDescription } from './form/secret-description'
import { SecretInput } from './form/secret-input'
import { useGoSecretState } from './hooks/use-go-secret-state'
import { useSecretSubmit } from './hooks/use-secret-submit'
import { SettingsPanel } from './panels/settings-panel'

export const SecretCreator = () => {
  const secret = useGoSecretState()
  const submit = useSecretSubmit(secret)
  const { actions, disabled, fieldHint, state } = secret
  const submitLabel = state.busy ? state.status || 'Working' : 'Secret It'

  return (
    <AppContent>
      <FieldSet>
        <FieldGroup className="gap-5">
          <SecretDescription />
          <Field>
            <FieldTitle className="sr-only">Secret content</FieldTitle>
            <SecretTypeTabs value={state.mode} onValueChange={actions.setMode} />
            <SecretInput
              mode={state.mode}
              value={state.value}
              file={state.file}
              onValueChange={actions.setValue}
              onFileChange={actions.setFile}
            />
            {fieldHint && <FieldDescription>{fieldHint}</FieldDescription>}
          </Field>
        </FieldGroup>
      </FieldSet>

      <div className="mt-6 border-t border-dashed border-zinc-300 py-6">
        <SettingsPanel
          settings={state.settings}
          onExpiresChange={actions.setExpiresInSeconds}
          onReadsChange={actions.setReads}
        />
      </div>
      <div className="mt-12 flex flex-col items-end gap-3">
        <Button
          type="button"
          size="lg"
          disabled={disabled}
          onClick={submit}
          className="min-w-24 rounded-lg">
          <HugeiconsIcon
            icon={state.busy ? ReloadIcon : Shield02Icon}
            strokeWidth={1.7}
            className={state.busy ? 'animate-spin' : undefined}
          />
          <span className="max-w-48 truncate">{submitLabel}</span>
        </Button>
        {!state.busy && state.status && (
          <p className="text-xs leading-5 text-muted-foreground">{state.status}</p>
        )}
      </div>
    </AppContent>
  )
}
