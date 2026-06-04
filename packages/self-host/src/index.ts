import { run } from 'func'

import { AppModule } from '@/app'
import { SelfHostError } from '@/utils/errors'

run(AppModule, {
  argv: process.argv.slice(2),
}).catch(error => {
  if (error instanceof SelfHostError) {
    console.log(error.message)
    return
  }

  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
