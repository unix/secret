import { run } from 'func'
import { AppModule } from './app'
import { ApiClientError } from './utils/api'
import { CliUserError } from './utils/expected-error'
import { yellow } from './utils/terminal'

run(AppModule, {
  argv: process.argv.slice(2),
}).catch(error => {
  if (error instanceof CliUserError || error instanceof ApiClientError) {
    console.log(yellow(error.message))
    return
  }

  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
