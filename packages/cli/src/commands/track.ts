import { Args, Command, FuncArgs, Handler } from 'func'
import { TrackService } from '../services/track'
import { CliUserError, printExpectedError } from '../utils/expected-error'
import { printHelp, yellow } from '../utils/terminal'
import {
  printTrackLinks,
  printTrackReads,
  printTrackSummary,
} from '../utils/track-output'

@Command({
  name: 'track',
  description: 'show secret tracking',
})
export class Track {
  constructor(private track: TrackService) {}

  @Handler({ flag: 'help', alias: 'h' })
  help() {
    printHelp()
  }

  @Handler()
  async run(@Args() args: FuncArgs) {
    try {
      const trackId = args.inputs[0]
      if (!trackId) throw new CliUserError('Usage: secret track <trackId>')
      const result = await this.track.load(trackId)
      printTrackSummary(result.response, result.track)
      console.log('')
      if (result.track?.links.length) {
        printTrackLinks(result.track.links, result.response.reads)
        return
      }

      printTrackReads(result.response.reads)
      console.log(yellow('No local read links were found for this track id.'))
    } catch (error) {
      if (printExpectedError(error)) return
      throw error
    }
  }
}
