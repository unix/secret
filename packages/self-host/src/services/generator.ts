import { Service } from 'func'

import { validateFileRules, writeFileRules } from '@/services/file-rules'
import type { EnvRecord, SelfHostConfig } from '@/types'
import { loading } from '@/utils/terminal'

@Service()
export class GeneratorService {
  async run({
    config,
    env,
  }: {
    readonly config: SelfHostConfig
    readonly env: EnvRecord
  }): Promise<readonly string[]> {
    const secretEnv = { config, env }
    const validateTask = loading('Validating self-host file targets...')
    try {
      await validateFileRules(secretEnv)
      validateTask.succeed('Self-host file targets validated.')
    } catch (error) {
      validateTask.fail('Self-host file target validation failed.')
      throw error
    }

    const writeTask = loading('Generating self-host files...')
    try {
      const files = await writeFileRules(secretEnv, status => {
        writeTask.text(status)
      })
      writeTask.succeed('Self-host files generated.')

      return files
    } catch (error) {
      writeTask.fail('Self-host file generation failed.')
      throw error
    } finally {
      writeTask.stop()
    }
  }
}
