import ora, { Ora } from 'ora'

type G = NodeJS.Global & {
  spinner: Ora,
}
declare let global: G

export const start = (text: string) => {
  if (!global.spinner) {
    global.spinner = ora(text).start()
  } else {
    global.spinner.text = text
  }
}

export const succeed = (clear: boolean = false) => {
  if (!global.spinner) return
  if (clear) {
    global.spinner.stop()
    global.spinner.clear()
  } else {
    global.spinner.succeed()
  }
  global.spinner = null
}

export const fail = (text?: string) => {
  if (global.spinner) {
    global.spinner.fail()
    console.log('')
  }
  if (text) {
    console.log(`Error: ${text}`)
    process.exit(1)
  }
}
