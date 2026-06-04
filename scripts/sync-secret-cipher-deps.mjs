import { execFile, spawn } from 'node:child_process'
import { readFile, readdir, writeFile } from 'node:fs/promises'
import { join, relative } from 'node:path'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

const PACKAGE_NAME = 'secret-cipher'
const WORKSPACE_SPECIFIER = 'workspace:*'
const DEPENDENCY_FIELDS = [
  'dependencies',
  'devDependencies',
  'peerDependencies',
  'optionalDependencies',
]

const mode = process.argv[2] ?? 'workspace'

if (!['workspace', 'npm'].includes(mode)) {
  console.error('Usage: node scripts/sync-secret-cipher-deps.mjs <workspace|npm>')
  process.exit(1)
}

const rootDir = new URL('..', import.meta.url)
const packagesDir = new URL('packages/', rootDir)
const rootPath = rootDir.pathname

const readJson = async (path) => JSON.parse(await readFile(path, 'utf8'))

const writeJson = async (path, value) => {
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`)
}

const runPnpmInstall = () =>
  new Promise((resolve, reject) => {
    const child = spawn('pnpm', ['install'], {
      cwd: rootPath,
      stdio: 'inherit',
    })

    child.on('error', reject)
    child.on('exit', (code) => {
      if (code === 0) {
        resolve()
        return
      }

      reject(new Error(`pnpm install exited with code ${code}`))
    })
  })

const latestNpmVersion = async () => {
  const { stdout } = await execFileAsync('npm', ['view', PACKAGE_NAME, 'version'])
  const version = stdout.trim()

  if (!version) {
    throw new Error(`npm did not return a version for ${PACKAGE_NAME}`)
  }

  return version
}

const packageJsonPaths = async () => {
  const entries = await readdir(packagesDir, { withFileTypes: true })

  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(packagesDir.pathname, entry.name, 'package.json'))
}

const syncPackage = async (path, specifier) => {
  const packageJson = await readJson(path)
  let changed = false

  for (const field of DEPENDENCY_FIELDS) {
    const dependencies = packageJson[field]

    if (!dependencies?.[PACKAGE_NAME]) {
      continue
    }

    if (dependencies[PACKAGE_NAME] === specifier) {
      continue
    }

    dependencies[PACKAGE_NAME] = specifier
    changed = true
  }

  if (!changed) {
    return false
  }

  await writeJson(path, packageJson)

  return true
}

const specifier =
  mode === 'workspace'
    ? WORKSPACE_SPECIFIER
    : `^${await latestNpmVersion()}`

const paths = await packageJsonPaths()
const changedPaths = []

for (const path of paths) {
  const changed = await syncPackage(path, specifier)

  if (changed) {
    changedPaths.push(path)
  }
}

if (changedPaths.length === 0) {
  console.log(`All ${PACKAGE_NAME} dependencies already use ${specifier}.`)
} else {
  console.log(`Updated ${changedPaths.length} package(s) to ${PACKAGE_NAME}: ${specifier}`)

  for (const path of changedPaths) {
    console.log(`- ${relative(rootPath, path)}`)
  }
}

console.log('Running pnpm install to refresh resolved links and lockfile...')
await runPnpmInstall()
