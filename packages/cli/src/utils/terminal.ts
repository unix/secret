import { createInterface } from 'node:readline/promises'
import { stdin as input, stdout as output } from 'node:process'

import type { Options, Spinner } from 'yocto-spinner'

import { VALID_EXPIRATIONS, VALID_LINK_COUNTS } from './constants'

const color = (code: number, value: string): string => {
  return `\u001b[${code}m${value}\u001b[0m`
}

export const dim = (value: string): string => color(2, value)
export const cyan = (value: string): string => color(36, value)
export const green = (value: string): string => color(32, value)
export const red = (value: string): string => color(31, value)
export const yellow = (value: string): string => color(33, value)

type LoadingTask = {
  readonly text: (value: string) => void
  readonly stop: () => void
  readonly succeed: (value: string) => void
}

type YoctoSpinnerModule = {
  readonly default: (options?: Options) => Spinner
}

let spinnerModule: Promise<YoctoSpinnerModule> | null = null

const supportsLoading = (): boolean => {
  return Boolean(output.isTTY && process.env.TERM !== 'dumb' && !process.env.CI)
}

const loadSpinner = (): Promise<YoctoSpinnerModule> => {
  spinnerModule ??= Function(
    'return import("yocto-spinner")',
  )() as Promise<YoctoSpinnerModule>

  return spinnerModule
}

export const loading = (text: string): LoadingTask => {
  let currentText = text
  let finished = false
  let spinner: Spinner | null = null
  if (supportsLoading()) {
    void loadSpinner()
      .then(({ default: yoctoSpinner }) => {
        if (finished) return

        spinner = yoctoSpinner({
          color: 'cyan',
          handleSignals: false,
          stream: output,
          text: currentText,
        }).start()
      })
      .catch(() => undefined)
  }

  return {
    text: value => {
      currentText = value
      if (!spinner) return

      spinner.text = value
    },
    stop: () => {
      finished = true
      if (!spinner?.isSpinning) return

      spinner.stop()
    },
    succeed: value => {
      finished = true
      if (spinner?.isSpinning) {
        spinner.success(value)
        return
      }

      console.log(green(value))
    },
  }
}

export const promptText = async (message: string): Promise<string> => {
  const rl = createInterface({ input, output })
  try {
    return await rl.question(message)
  } finally {
    rl.close()
  }
}

export const confirm = async (message: string): Promise<boolean> => {
  const answer = (await promptText(`${message} (y/N) `)).trim().toLowerCase()

  return answer === 'y' || answer === 'yes'
}

export const printHelp = (): void => {
  console.log('SECRET')
  console.log('')
  console.log('  secret')
  console.log('  secret -f [path]')
  console.log('  secret track <trackId>')
  console.log('  secret reveal <url|readId.secret>')
  console.log('  secret status')
  console.log('  secret config --api api.example.com --portal example.com')
  console.log('  secret cleanup [--all]')
  console.log('  secret -h')
  console.log('')
  console.log('Options:')
  console.log(`  --expiration <sec>   ${VALID_EXPIRATIONS.join(', ')}`)
  console.log(`  --links <count>      ${VALID_LINK_COUNTS.join(', ')}`)
  console.log('  --all                Remove every local file except config')
  console.log('  -f, --file           Encrypt and share a file')
}

export const printJson = (value: unknown): void => {
  console.log(JSON.stringify(value, null, 2))
}
