import { run } from 'func'
import { SelfHostError } from './utils/errors'
import { assertSecretProjectRoot } from './utils/project'
import { errorLine } from './utils/terminal'

const main = async (): Promise<void> => {
  await assertSecretProjectRoot()
  const { AppModule } = await import('./app')

  await run(AppModule, {
    argv: process.argv.slice(2),
  })
}

main().catch(error => {
  if (error instanceof SelfHostError) {
    console.error(errorLine(error.code, error.message))
    process.exitCode = 1
    return
  }

  console.error(
    errorLine(
      'UNEXPECTED-ERROR',
      error instanceof Error ? error.message : String(error),
    ),
  )
  process.exitCode = 1
})
