import { Cancel01Icon, File01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'

import { Button } from '@/components/ui/button'

type FilePreviewProps = {
  readonly file: File
  readonly onRemove: () => void
}

const fileExtension = (file: File): string => {
  const extension = file.name.split('.').pop()
  if (extension && extension !== file.name) return extension.toUpperCase()
  if (file.type) return file.type.split('/')[0]?.toUpperCase() ?? 'FILE'

  return 'FILE'
}

const formatFileSize = (size: number): string => {
  if (size < 1024) return `${size} B`

  const units = ['KB', 'MB', 'GB', 'TB'] as const
  let value = size / 1024
  let unitIndex = 0

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024
    unitIndex += 1
  }

  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[unitIndex]}`
}

const formatFileMeta = (file: File): string => {
  const parts = [fileExtension(file), formatFileSize(file.size)]
  if (file.type) parts.push(file.type)
  if (file.lastModified) parts.push(new Date(file.lastModified).toLocaleDateString())

  return parts.join(' · ')
}

export const FilePreview = ({ file, onRemove }: FilePreviewProps) => {
  return (
    <div className="flex items-center gap-3 rounded-lg bg-zinc-100/80 p-3 shadow-xs ring-1 ring-zinc-200">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-white text-zinc-500">
        <HugeiconsIcon icon={File01Icon} strokeWidth={1.7} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-zinc-950">{file.name}</p>
        <p className="mt-0.5 truncate text-xs leading-5 text-zinc-500">
          {formatFileMeta(file)}
        </p>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="Remove selected file"
        onClick={onRemove}
        className="size-7 shrink-0 text-zinc-500 hover:bg-zinc-200/70 hover:text-zinc-900">
        <HugeiconsIcon icon={Cancel01Icon} strokeWidth={1.7} />
      </Button>
    </div>
  )
}
