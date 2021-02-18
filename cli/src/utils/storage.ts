import * as os from 'os'
import * as path from 'path'
import * as fs from 'fs'
import * as fse from 'fs-extra'
const home = path.join(os.homedir(), '.secret')
const storage_file = path.join(home, 'storage.json')

const initHome = () => {
  try {
    fse.ensureDirSync(home)
    fse.ensureFileSync(storage_file)
  } catch (e) {
    const key = `${home}+${process.platform}+permission+denied`
    console.log`directory '${home}' does not have write permission.`
    console.log`https://stackoverflow.com/search?q=${key}`
  }
}

class BaseIO {
  findAll(): object {
    let json = {}
    try {
      json = JSON.parse(fs.readFileSync(storage_file, 'utf-8'))
    } catch (e) {
      json = {}
    }
    return json
  }

  saveDict(dict: object): object {
    const json = Object.assign({}, this.findAll(), dict)
    fse.outputJsonSync(storage_file, json)
    return json
  }
}

class Storage extends BaseIO {
  constructor() {
    super()
    initHome()
  }

  save(key: string | number, value: any = null): object {
    if (!key) return {}
    const keyVal = { [key]: value }
    const next = Object.assign({}, this.findAll(), keyVal)
    this.saveDict(next)
    return keyVal
  }

  find(key: string | number): null | any {
    if (!key) return null
    const json = this.findAll()
    return json[key] || null
  }

  clear(): void {
    this.saveDict({})
  }
}

const storage = new Storage()

export default storage
