import { useId } from 'react'
import { CloudUploadIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'

type FilePlaceholderProps = {
  readonly onFileChange: (file: File | null) => void
}

export const FilePlaceholder = ({ onFileChange }: FilePlaceholderProps) => {
  const inputId = useId()

  return (
    <label
      htmlFor={inputId}
      className="group flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-zinc-300 bg-white p-3 shadow-xs transition-colors focus-within:border-violet-400 focus-within:ring-2 focus-within:ring-violet-400/20 hover:border-violet-400 hover:bg-zinc-50">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-zinc-100 text-zinc-500 transition-colors group-hover:text-zinc-800">
        <HugeiconsIcon icon={CloudUploadIcon} strokeWidth={1.7} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-zinc-800">
          Choose a file
        </span>
        <span className="mt-0.5 block text-xs leading-5 text-zinc-500">
          The selected file stays local until it is encrypted.
        </span>
      </span>
      <span className="shrink-0 rounded-md bg-zinc-950 px-3 py-1.5 text-xs font-medium text-white transition-colors group-hover:bg-zinc-800">
        Browse
      </span>
      <input
        id={inputId}
        type="file"
        aria-label="Shared file"
        onChange={event => onFileChange(event.target.files?.[0] ?? null)}
        className="sr-only"
      />
    </label>
  )
}
