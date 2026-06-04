import { Command, Handler } from 'func'
import { StatusService } from '../services/status'
import { green, printHelp, printJson } from '../utils/terminal'

@Command({
  name: 'status',
  description: 'check api status',
})
export class Status {
  constructor(private status: StatusService) {}

  @Handler({ flag: 'help', alias: 'h' })
  help() {
    printHelp()
  }

  @Handler()
  async run() {
    const result = await this.status.check()
    console.log(green(`Status OK from ${result.apiOrigin}`))
    printJson(result.response)
  }
}
