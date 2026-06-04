import { Args, Command, FuncArgs, Handler } from 'func'
import { RevealService } from '../services/reveal'
import { CliUserError, printExpectedError } from '../utils/expected-error'
import { confirm, loading, printHelp, red, yellow } from '../utils/terminal'

@Command({
  name: 'reveal',
  description: 'reveal text or file secret',
})
export class Reveal {
  constructor(private reveal: RevealService) {}

  @Handler({ flag: 'help', alias: 'h' })
  help() {
    printHelp()
  }

  @Handler()
  async run(@Args() args: FuncArgs) {
    try {
      const input = args.inputs[0]
      if (!input) {
        throw new CliUserError('Usage: secret reveal <url|readId.secret>')
      }

      const openTask = loading('Opening secret...')
      const result = await this.open(input, openTask.stop)
      if (!result) return

      if (result.kind === 'text') {
        openTask.succeed('Secret opened:')
        console.log(result.value)
        return
      }

      openTask.succeed('File information opened.')
      console.log(`File: ${result.manifest.name}`)
      console.log(`Size: ${result.manifest.size} bytes`)
      console.log(`Type: ${result.manifest.type}`)
      const shouldDownload = await confirm('Download and decrypt this file?')
      if (!shouldDownload) {
        console.log(red('Download cancelled.'))
        return
      }

      const downloadTask = loading('Downloading file...')
      const outputPath = await this.download(
        result.download,
        downloadTask.text,
        downloadTask.stop,
      )
      if (!outputPath) return

      downloadTask.succeed(`File saved to ${outputPath}`)
    } catch (error) {
      if (printExpectedError(error)) return

      throw error
    }
  }

  private async open(input: string, onStop: () => void) {
    try {
      return await this.reveal.open(input)
    } catch (error) {
      onStop()
      if (printExpectedError(error)) return null

      throw error
    }
  }

  private async download(
    download: (onStatus?: (status: string) => void) => Promise<string>,
    onStatus: (status: string) => void,
    onStop: () => void,
  ): Promise<string | null> {
    try {
      return await download(onStatus)
    } catch (error) {
      onStop()
      if (printExpectedError(error)) return null

      throw error
    }
  }
}
