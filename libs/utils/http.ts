import axios from 'axios'
import { serializeData } from './secret'
import { isDev } from './is'
import { BASE_APIS } from '../constants'

const baseURL = isDev() ? BASE_APIS.DEV : BASE_APIS.PROD

axios.defaults.baseURL = baseURL

const http = axios.create({
  baseURL: baseURL,
  timeout: 1000 * 10,
  headers: {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache',
  },
})

http.interceptors.request.use(async config => {
  if (!config.url.includes('secrets')) return config
  const res = await axios.get('/secrets/status')
  const timestamp = `${new Date(res.headers['date']).getTime()}`
  const data = config.data
  const headers = config.headers
  const serialized = serializeData({ ...data, timestamp }, timestamp)
  config.headers = {
    ...headers,
    timestamp,
    nonce: serialized,
  }
  return config
})

http.interceptors.response.use(value => {
  return value ? value.data : value
})

export default http
