import { run } from 'func'
import { AppModule } from './app'
import { ApiClientError } from './utils/api'
import { CliUserError } from './utils/expected-error'
import { errorLine } from './utils/terminal'

run(AppModule, {
  argv: process.argv.slice(2),
}).catch(error => {
  if (error instanceof CliUserError || error instanceof ApiClientError) {
    console.error(errorLine(error.code, error.message))
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
