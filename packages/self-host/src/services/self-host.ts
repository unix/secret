import { Service } from 'func'

import { GeneratorService } from '@/services/generator'
import { PreflightService } from '@/services/preflight'

@Service()
export class SelfHostService {
  constructor(
    private generator: GeneratorService,
    private preflight: PreflightService,
  ) {}

  async run(): Promise<{ readonly files: readonly string[] }> {
    const context = await this.preflight.run()
    const files = await this.generator.run(context)

    return { files }
  }
}
