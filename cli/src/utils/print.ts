import chalk from 'chalk'
import * as spinner from './spinner'

export const logColor = (text: string): string => {
  return chalk.hex('#9a9a9a')(text)
}

export const prefix = (): string => {
  return chalk.cyan('?')
}

export const activeColor = (text: string): string => {
  return chalk.hex('#067df7')(text)
}

export const exit = (text: string, action: string = 'Aborted'): void => {
  const exitAction = chalk.red(`\n> ${action}.`)

  spinner.succeed(true)
  console.log(exitAction)
  console.log(`${logColor('>')} ${logColor(text)}`)
  process.exit(1)
}

export const info = (text: string): void => {
  console.log(chalk.cyan(`> ${text}`))
}

export const warn = (text: string): void => {
  console.log(chalk.yellow(`> ${text}`))
}

export const log = (text: string): void => {
  console.log(logColor(`> ${text}`))
}
