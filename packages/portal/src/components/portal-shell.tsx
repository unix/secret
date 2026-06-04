import { Button } from '@/components/ui/button'

export default function PortalShell() {
  return (
    <section className="mx-auto flex min-h-svh w-full max-w-5xl flex-col justify-center gap-8 px-6 py-16">
      <div className="space-y-4">
        <p className="text-sm font-medium text-muted-foreground">Secret Portal</p>
        <h1 className="max-w-2xl text-4xl font-semibold tracking-normal text-balance">
          Astro shell with React islands and baseUI components.
        </h1>
        <p className="max-w-xl text-sm leading-6 text-muted-foreground">
          This package is ready for mixed rendering: Astro owns the document shell,
          React powers interactive surfaces, and shadcn/baseUI provides the component
          layer.
        </p>
      </div>
      <div>
        <Button>Ready</Button>
      </div>
    </section>
  )
}
