import { Command, Handler, Value } from 'func'

import { CleanupService } from '../services/cleanup'
import { green, printHelp } from '../utils/terminal'

@Command({
  name: 'cleanup',
  description: 'cleanup local cli files',
})
export class Cleanup {
  @Value({ type: Boolean })
  all?: boolean

  constructor(private cleanup: CleanupService) {}

  @Handler({ flag: 'help', alias: 'h' })
  help() {
    printHelp()
  }

  @Handler()
  async run() {
    const result = await this.cleanup.run({
      all: this.all,
      force: true,
    })

    console.log(green(`Removed ${result.removed} local file(s).`))
  }
}
