import { CommandArgsProvider, CommandMissing } from 'func'
import * as print from '../utils/print'
import * as spinner from '../utils/spinner'
import { decodeURL, toOrigin } from '../../../libs/utils/secret'
import { getSecret } from '../../../libs/utils/apis'

@CommandMissing()
export class Missing {
  private input: string = ''

  constructor(private arg: CommandArgsProvider) {
    this.input = arg.inputs[0]
    this.parse().catch(() => {
      spinner.fail('No useful information could be found.')
    })
  }

  async parse() {
    spinner.start('Analysis in progress')
    const result = decodeURL(this.input)
    const { readId, key, nonce } = result
    const data = await getSecret(readId)
    const content = toOrigin({
      cipher: data.content,
      privateKey: key,
      nonce: nonce,
    })
    this.log(content)
  }

  log(content: string) {
    spinner.succeed()
    console.log(
      `  ${print.logColor("Here's your secret, they will only show it this once:")}\n`,
    )
    console.log(`  "${content.trim()}"\n`)
  }
}
