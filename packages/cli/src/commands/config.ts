import { Command, Handler, Value } from 'func'
import { CONFIG_KEYS, configs } from '../configs'
import { CliUserError, printExpectedError } from '../utils/expected-error'
import { green, printHelp, printJson } from '../utils/terminal'

@Command({
  name: 'config',
  description: 'set cli config',
})
export class Config {
  @Value({ type: String })
  api?: string

  @Value({ type: String })
  portal?: string

  @Handler({ flag: 'help', alias: 'h' })
  help() {
    printHelp()
  }

  @Handler()
  async run() {
    try {
      if (!this.api && !this.portal) {
        throw new CliUserError('Usage: secret config --api <host> --portal <host>')
      }

      if (this.api) {
        await configs.put(CONFIG_KEYS.ENDPOINTS_API, this.api)
      }
      if (this.portal) {
        await configs.put(CONFIG_KEYS.ENDPOINTS_PORTAL, this.portal)
      }

      console.log(green(`Saved config to ${configs.file()}`))
      printJson(await configs.get(CONFIG_KEYS.ENDPOINTS))
    } catch (error) {
      if (printExpectedError(error)) return

      throw error
    }
  }
}
