import { Clock01Icon, Key01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { FieldDescription, FieldTitle } from '@/components/ui/field'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import { expirationOptions, readOptions } from './settings-options'
import type { SecretSettings } from '@/islands/go/types'

type SettingsPanelProps = {
  readonly onExpiresChange: (value: string) => void
  readonly onReadsChange: (value: string) => void
  readonly settings: SecretSettings
}

export const SettingsPanel = ({
  onExpiresChange,
  onReadsChange,
  settings,
}: SettingsPanelProps) => {
  return (
    <div className="grid rounded-lg border border-zinc-200 bg-white shadow-xs divide-y divide-zinc-100">
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <FieldTitle className="text-sm text-zinc-950">Expiration</FieldTitle>
          <FieldDescription className="mt-1 text-zinc-500">
            Choose how long the secret stays available before it disappears.
          </FieldDescription>
        </div>
        <Select
          value={settings.expiresInSeconds}
          onValueChange={value => {
            if (value) onExpiresChange(value)
          }}>
          <SelectTrigger className="w-full border-zinc-200 bg-white sm:w-36">
            <HugeiconsIcon icon={Clock01Icon} strokeWidth={1.7} />
            <SelectValue placeholder="Expiration" />
          </SelectTrigger>
          <SelectContent>
            {expirationOptions.map(option => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <FieldTitle className="text-sm text-zinc-950">Read links</FieldTitle>
          <FieldDescription className="mt-1 text-zinc-500">
            Limit how many one-time links can be opened from this secret.
          </FieldDescription>
        </div>
        <Select
          value={settings.reads}
          onValueChange={value => {
            if (value) onReadsChange(value)
          }}>
          <SelectTrigger className="w-full border-zinc-200 bg-white sm:w-36">
            <HugeiconsIcon icon={Key01Icon} strokeWidth={1.7} />
            <SelectValue placeholder="Read links" />
          </SelectTrigger>
          <SelectContent>
            {readOptions.map(option => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
