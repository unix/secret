import { Tabs } from '@base-ui/react/tabs'
import { cn } from '@/lib/utils'

export type SecretTypeTabValue = 'text' | 'password' | 'file'

type SecretTypeTabItem = {
  readonly label: string
  readonly value: SecretTypeTabValue
}

type SecretTypeTabsProps = {
  readonly className?: string
  readonly onValueChange: (value: SecretTypeTabValue) => void
  readonly value: SecretTypeTabValue
}

const secretTypeTabs: readonly SecretTypeTabItem[] = [
  { value: 'text', label: 'Text' },
  { value: 'password', label: 'Password' },
  { value: 'file', label: 'File' },
]

const isSecretTypeTabValue = (value: unknown): value is SecretTypeTabValue => {
  return secretTypeTabs.some(item => item.value === value)
}

export const SecretTypeTabs = ({
  className,
  onValueChange,
  value,
}: SecretTypeTabsProps) => {
  return (
    <Tabs.Root
      value={value}
      onValueChange={nextValue => {
        if (!isSecretTypeTabValue(nextValue)) return
        onValueChange(nextValue)
      }}
      className={cn('w-full', className)}>
      <Tabs.List
        activateOnFocus
        aria-label="Secret type"
        className="relative isolate grid w-full grid-cols-3 items-center rounded-lg bg-zinc-100/80 p-0.5 shadow-xs">
        <Tabs.Indicator
          renderBeforeHydration
          className="absolute top-(--active-tab-top) left-(--active-tab-left) z-0 h-(--active-tab-height) w-(--active-tab-width) rounded-md bg-white shadow-xs ring-1 ring-zinc-200 transition-[top,left,width,height] duration-200 ease-out"
        />
        {secretTypeTabs.map(item => (
          <Tabs.Tab
            key={item.value}
            value={item.value}
            className="relative z-10 flex h-8 min-w-0 cursor-pointer items-center justify-center rounded-md px-3 text-xs/relaxed font-medium whitespace-nowrap text-zinc-500 transition-colors outline-none select-none hover:text-zinc-700 focus-visible:ring-2 focus-visible:ring-violet-400/30 data-active:text-zinc-950">
            <span className="truncate">{item.label}</span>
          </Tabs.Tab>
        ))}
      </Tabs.List>
    </Tabs.Root>
  )
}
