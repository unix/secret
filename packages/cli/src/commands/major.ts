import { Args, CommandMajor, Flag, FuncArgs, Handler, Value } from 'func'
import { CleanupService } from '../services/cleanup'
import { CreatedSecret, CreateSecretService } from '../services/create-secret'
import { DEFAULT_EXPIRATION_SECONDS, DEFAULT_LINK_COUNT } from '../utils/constants'
import { printExpectedError } from '../utils/expected-error'
import {
  cyan,
  dim,
  errorLine,
  loading,
  printHelp,
  promptText,
  yellow,
} from '../utils/terminal'
import { printTrackLinks } from '../utils/track-output'
import { expirationSeconds, linkCount } from '../utils/validators'

@CommandMajor()
export class Major {
  private static PrintCreated(secret: CreatedSecret): void {
    console.log('Track:')
    console.log(`  url: ${secret.trackUrl}`)
    console.log(`  cli: ${cyan(Major.TrackCommand(secret))}`)
    console.log('  usage: Check and track the generated link status.')
    console.log('')
    printTrackLinks(secret.links)
  }

  private static TrackCommand(secret: CreatedSecret): string {
    return `secret track ${secret.trackId}`
  }

  private static PrintFilePathHelp(): void {
    console.error(errorLine('MISSING-FILE-PATH', 'File upload needs a file path.'))
    console.log(`Example: ${dim('secret -f ./notes.txt')}`)
  }

  @Value({ type: Number })
  expiration: number = DEFAULT_EXPIRATION_SECONDS

  @Value({ type: Number })
  links: number = DEFAULT_LINK_COUNT

  @Flag({ name: 'file', alias: 'f' })
  file: boolean = false

  constructor(
    private cleanup: CleanupService,
    private createSecret: CreateSecretService,
  ) {}

  @Handler({ flag: 'help', alias: 'h' })
  help() {
    printHelp()
  }

  @Handler()
  async run(@Args() args: FuncArgs) {
    try {
      const expiresInSeconds = expirationSeconds(this.expiration)
      const reads = linkCount(this.links)

      if (this.file) {
        const filePath = args.inputs.at(0)
        if (!filePath?.trim()) {
          Major.PrintFilePathHelp()
          return
        }

        const task = loading('Encrypting file...')
        try {
          const secret = await this.createSecret.create({
            expiresInSeconds,
            filePath,
            onStatus: task.text,
            reads,
          })
          task.succeed('Secret created.')
          console.log('')
          Major.PrintCreated(secret)
        } catch (error) {
          task.stop()
          throw error
        }
        return
      }

      const value = await promptText('Secret: ')
      const task = loading('Encrypting text...')
      try {
        const secret = await this.createSecret.create({
          expiresInSeconds,
          onStatus: task.text,
          reads,
          value,
        })
        task.succeed('Secret created.')
        console.log('')
        Major.PrintCreated(secret)
      } catch (error) {
        task.stop()
        throw error
      }
    } catch (error) {
      if (printExpectedError(error)) return
      throw error
    } finally {
      await this.cleanupLocalFiles()
    }
  }

  private async cleanupLocalFiles(): Promise<void> {
    try {
      await this.cleanup.run()
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.log(yellow(`Local cleanup skipped. ${message}`))
    }
  }
}
