import { useState } from 'react'
import { ViewIcon, ViewOffIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { FilePlaceholder } from './file-placeholder'
import { FilePreview } from './file-preview'
import type { SecretMode } from '@/islands/go/types'

type SecretInputProps = {
  readonly file: File | null
  readonly mode: SecretMode
  readonly onFileChange: (file: File | null) => void
  readonly onValueChange: (value: string) => void
  readonly value: string
}

export const SecretInput = ({
  file,
  mode,
  onFileChange,
  onValueChange,
  value,
}: SecretInputProps) => {
  const [visible, setVisible] = useState(false)

  if (mode === 'text') {
    return (
      <Textarea
        value={value}
        onChange={event => onValueChange(event.target.value)}
        placeholder="Paste the text you want to share"
        aria-label="Create Secret"
        className="min-h-36 resize-y rounded-lg border-zinc-200 bg-white text-sm leading-6 shadow-xs focus-visible:ring-violet-400/20"
      />
    )
  }

  if (mode === 'file') {
    if (file) return <FilePreview file={file} onRemove={() => onFileChange(null)} />
    return <FilePlaceholder onFileChange={onFileChange} />
  }

  return (
    <div className="flex items-center rounded-lg border border-zinc-200 bg-white shadow-xs focus-within:border-ring focus-within:ring-2 focus-within:ring-violet-400/20">
      <Input
        key="password"
        value={value}
        onChange={event => onValueChange(event.target.value)}
        type={visible ? 'text' : 'password'}
        placeholder="Enter a password or secret phrase"
        aria-label="Shared password"
        className="h-11 border-0 bg-transparent text-sm focus-visible:ring-0"
      />
      <Button
        type="button"
        size="icon-sm"
        variant="ghost"
        aria-label={visible ? 'Hide password' : 'Show password'}
        onClick={() => setVisible(current => !current)}
        className="mr-1 text-zinc-500 hover:text-zinc-800">
        <HugeiconsIcon icon={visible ? ViewOffIcon : ViewIcon} strokeWidth={1.7} />
      </Button>
    </div>
  )
}
