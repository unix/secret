import { isBrowser } from './is'
let storageHeap: Record<string, string> = {}

export interface CompatibleStorageInterface {
  getItem: (key: string) => string
  setItem: (key: string, value: string) => void
  removeItem: (key: string) => void
  clear: () => void
}

const storageOfSimulation: CompatibleStorageInterface = {
  getItem: key => {
    if (isBrowser()) return window.localStorage.getItem(key)
    return storageHeap[key]
  },
  setItem: (key, value) => {
    if (isBrowser()) return window.localStorage.setItem(key, value)
    storageHeap[key] = value
  },
  removeItem: key => {
    if (isBrowser()) return window.localStorage.removeItem(key)
    delete storageHeap[key]
  },
  clear: () => {
    storageHeap = {}
  },
}

const getStorageAPI = (): CompatibleStorageInterface => {
  if (!isBrowser()) return storageOfSimulation
  try {
    const testVlue = Math.floor(Math.pow(36, 10) * Math.random()).toString(36)
    window.localStorage.setItem(testVlue, testVlue)
    window.localStorage.removeItem(testVlue)
    return window.localStorage
  } catch (err) {
    return storageOfSimulation
  }
}

const storage = getStorageAPI()

export default storage
