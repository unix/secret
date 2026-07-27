import { stdout as output } from 'node:process'
import type { Options, Spinner } from 'yocto-spinner'

const color = (code: number, value: string): string => {
  return `\u001b[${code}m${value}\u001b[0m`
}

const backgroundColor = (code: number, value: string): string => {
  return `\u001b[37;${code}m${value}\u001b[0m`
}

export const green = (value: string): string => color(32, value)
export const red = (value: string): string => color(31, value)

export const errorLine = (label: string, message: string): string => {
  return `${backgroundColor(41, `[${label}]`)} ${red(message)}`
}

type LoadingTask = {
  readonly fail: (value: string) => void
  readonly stop: () => void
  readonly succeed: (value: string) => void
  readonly text: (value: string) => void
}

type YoctoSpinnerModule = {
  readonly default: (options?: Options) => Spinner
}

let spinnerModule: Promise<YoctoSpinnerModule> | null = null

const supportsLoading = (): boolean => {
  return Boolean(output.isTTY && process.env.TERM !== 'dumb' && !process.env.CI)
}

const isYoctoSpinnerModule = (value: unknown): value is YoctoSpinnerModule => {
  return (
    value !== null &&
    typeof value === 'object' &&
    'default' in value &&
    typeof value.default === 'function'
  )
}

const importYoctoSpinner = async (): Promise<YoctoSpinnerModule> => {
  const imported: unknown = await Function(
    'specifier',
    'return import(specifier)',
  )('yocto-spinner')
  if (isYoctoSpinnerModule(imported)) return imported
  throw new Error('yocto-spinner module has an unexpected shape.')
}

const loadSpinner = (): Promise<YoctoSpinnerModule> => {
  spinnerModule ??= importYoctoSpinner()
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
    fail: value => {
      finished = true
      if (spinner?.isSpinning) {
        spinner.error(value)
        return
      }

      console.log(errorLine('TASK-FAILED', value))
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
    text: value => {
      currentText = value
      if (!spinner) return
      spinner.text = value
    },
  }
}
