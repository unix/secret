import { dirname, join, resolve } from 'node:path'

export const packageRoot = resolve(dirname(__dirname), '..')
export const workspaceRoot = resolve(packageRoot, '..', '..')

export const paths = {
  rootWrangler: join(workspaceRoot, 'node_modules', '.bin', 'wrangler'),
  rootEnv: join(workspaceRoot, '.env'),
  rootEnvExample: join(workspaceRoot, '.env.example'),
  secretConfig: join(workspaceRoot, 'secret.config.json'),
  cliSelfHost: join(workspaceRoot, 'packages', 'cli', 'self-host.ts'),
  edgeDevVars: join(workspaceRoot, 'packages', 'edge', '.dev.vars'),
  edgeR2Cors: join(workspaceRoot, 'packages', 'edge', 'r2-cors.json'),
  edgeSelfHost: join(workspaceRoot, 'packages', 'edge', 'self-host.ts'),
  edgeWrangler: join(workspaceRoot, 'packages', 'edge', 'wrangler.jsonc'),
  portalSelfHost: join(workspaceRoot, 'packages', 'portal', 'self-host.ts'),
  portalWrangler: join(workspaceRoot, 'packages', 'portal', 'wrangler.jsonc'),
}
