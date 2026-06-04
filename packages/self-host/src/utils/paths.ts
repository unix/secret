import { join, resolve } from 'node:path'

type ProjectPaths = {
  readonly cliSelfHost: string
  readonly edgeDevVars: string
  readonly edgePackage: string
  readonly edgeR2Cors: string
  readonly edgeSelfHost: string
  readonly edgeWrangler: string
  readonly portalSelfHost: string
  readonly portalWrangler: string
  readonly rootEnv: string
  readonly rootEnvExample: string
  readonly rootWrangler: string
  readonly secretConfig: string
}

const createPaths = (root: string): ProjectPaths => {
  const edgePackage = join(root, 'packages', 'edge')

  return {
    rootWrangler: join(root, 'node_modules', '.bin', 'wrangler'),
    rootEnv: join(root, '.env'),
    rootEnvExample: join(root, '.env.example'),
    secretConfig: join(root, 'secret.config.json'),
    cliSelfHost: join(root, 'packages', 'cli', 'self-host.ts'),
    edgePackage,
    edgeDevVars: join(edgePackage, '.dev.vars'),
    edgeR2Cors: join(edgePackage, 'r2-cors.json'),
    edgeSelfHost: join(edgePackage, 'self-host.ts'),
    edgeWrangler: join(edgePackage, 'wrangler.jsonc'),
    portalSelfHost: join(root, 'packages', 'portal', 'self-host.ts'),
    portalWrangler: join(root, 'packages', 'portal', 'wrangler.jsonc'),
  }
}

export let projectRoot = resolve(process.cwd())
export let paths = createPaths(projectRoot)

export const configureProjectRoot = (root: string): void => {
  projectRoot = resolve(root)
  paths = createPaths(projectRoot)
}
