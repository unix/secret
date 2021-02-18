import { CommandMajor } from 'func'
import promptSync from 'prompt-sync'
import * as print from '../utils/print'
import * as spinner from '../utils/spinner'
import { toSecrets, preToSecrets, trackedToReaderGroup } from '../../../libs/utils/secret'
import { createSecret } from '../../../libs/utils/apis'

const prompt = promptSync()

@CommandMajor()
export class Major {
  private input: string = ''
  private time: number = 3

  constructor() {
    this.inputText()
  }

  inputText(help: string = '') {
    const helpMessage = print.logColor(help)
    const message = `${print.prefix()} Enter text to encrypt${helpMessage}: `
    const value = prompt(message)
    if (value === null) return print.exit('Nothing has changed.')
    if (!value) return this.inputText('(ctrl + c to exit)')
    if (value.length < 3) return this.inputText('(less than 3 chars)')
    this.input = value
    this.timeSetting()
  }

  timeSetting() {
    const helpMessage = print.logColor('(3-60, default is 3 minutes)')
    const message = `${print.prefix()} Auto destruction time${helpMessage}: `
    const value = prompt(message, '3')
    if (value === null) return print.exit('Nothing has changed.')
    if (value && Number.isNaN(+value)) this.timeSetting()
    this.time = +value < 3 ? 3 : +value > 60 ? 60 : +value
    spinner.start('Serialized text and keys')
    this.go().catch(() => {
      spinner.fail('create failed, please wait and try again.')
      console.log('')
      process.exit(1)
    })
  }

  async go() {
    const preResult = preToSecrets(this.input)
    spinner.start('Encrypt text to create structured data')
    const { cipher, privateKey, nonce } = toSecrets(preResult)
    spinner.start('Create consumable links and policies')
    const result = await createSecret({
      content: cipher,
      count: 1,
      expire: this.time * 1000 * 60,
    })
    const tracked = trackedToReaderGroup(
      {
        nonce: nonce,
        key: privateKey,
      },
      result,
    )
    this.log(tracked.urls[0], tracked.cliUrls[0])
  }

  log(url: string, cli: string) {
    spinner.succeed(true)
    console.log(`  ${print.logColor('Completed, link is ready.')}\n`)
    print.log('Access via browser:')
    console.log(`  ${print.activeColor(url)}`)

    print.log('Access via CLI:')
    console.log(`  ${print.activeColor(cli)}`)
    console.log('')
  }
}
