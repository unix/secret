import http from './http'
import { TRON_ADDRESS, TRON_USDT } from '../constants'
import { resolveSrv } from 'dns'

export type SecretApiType = {
  content: string
  expire: number | string
  count: number | string
}

export type SecretApiResult = {
  guard_id: string
  read_ids: string[]
  consumed_ids: string[]
  createdAt: string
  expire: string
}

export const createSecret = async (secret: SecretApiType): Promise<SecretApiResult> => {
  return await http.post('/secrets', secret)
}

export type SecretTrackedInfo = {
  read_ids: string[]
  consumed_ids: string[]
  expire: string
  createdAt: string
}

export const getTrackedInfo = async (id: string): Promise<SecretTrackedInfo> => {
  return await http.get(`/secrets/guards/${id}`)
}

export type SecretReaderInfo = {
  content: string
}

export const getSecret = async (id: string): Promise<SecretReaderInfo> => {
  return await http.get(`/secrets/readers/${id}`)
}

export const destroySecret = async (id: string) => {
  return await http.delete(`/secrets/guards/${id}`)
}

export type TRXResult = {
  block_timestamp: number
  from: string
  to: string
  token_info: {
    address: string
    decimals: number
    symbol: string
  }
  transaction_id: string
  type: 'Transfer'
  value: string
}

export type TRXTransactions = {
  address: string
  type: 'send' | 'receive'
  value: string
  timestamp: number
}

export const getTransactions = async (): Promise<Array<TRXTransactions>> => {
  const query = 'only_confirmed=1&limit=12&order_by=block_timestamp,asc'
  const { data } = await http.get<void, { data: Array<TRXResult> }>(
    `https://api.trongrid.io/v1/accounts/${TRON_ADDRESS}/transactions/trc20?${query}`,
  )
  return data
    .filter(item => item.token_info.symbol === 'USDT')
    .map(item => {
      const isSend = item.from === TRON_ADDRESS
      return {
        type: isSend ? 'send' : 'receive',
        address: isSend ? item.to : item.from,
        value: item.value,
        timestamp: item.block_timestamp,
      }
    })
}

export type TRXAccount = {
  trc20: Array<Record<string, string>>
}

export const getBalance = async (): Promise<string> => {
  const { data } = await http.get<void, { data: Array<TRXAccount> }>(
    `https://api.trongrid.io/v1/accounts/${TRON_ADDRESS}`,
  )
  let balance = '0'
  data[0].trc20.forEach(item => {
    if (item[TRON_USDT] !== undefined) {
      balance = item[TRON_USDT]
    }
  })
  return balance
}
