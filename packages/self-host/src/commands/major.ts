import { CommandMajor, Handler } from 'func'

import { SelfHostService } from '@/services/self-host'

@CommandMajor()
export class Major {
  constructor(private selfHost: SelfHostService) {}

  @Handler()
  async run(): Promise<void> {
    const result = await this.selfHost.run()

    console.log('Self-host files generated.')
    result.files.forEach(file => {
      console.log(`  ${file}`)
    })
  }
}
