import { Service } from 'func'
import { GeneratorService } from './generator'
import { PreflightService } from './preflight'
import { R2CorsService } from './r2-cors'

@Service()
export class SelfHostService {
  constructor(
    private generator: GeneratorService,
    private preflight: PreflightService,
    private r2Cors: R2CorsService,
  ) {}

  async run(): Promise<{ readonly files: readonly string[] }> {
    const context = await this.preflight.run()
    const files = await this.generator.run(context)
    await this.r2Cors.apply(context)
    return { files }
  }
}
