import React, { useState } from 'react'
import { Code, Loading, Row, Spacer, Table, Tag } from '@geist-ui/react'
import { useAsync } from '@libs/hooks'
import { apis } from '@libs/utils'
import { AccountRecord } from 'pages/usability'

const Account = () => {
  const [balance, setBalance] = useState<string>('0')
  const [records, setRecords] = useState<Array<AccountRecord>>([])
  const [loading, setLoading] = useState<boolean>(true)
  useAsync(
    async isMounted => {
      const trans = await apis.getTransactions()
      const balance = await apis.getBalance()
      if (!isMounted()) return
      const records = trans.map<AccountRecord>(item => ({
        event: item.type,
        address: item.address,
        value: (
          <Row justify="center" style={{ width: '100%' }}>
            <Code>{+item.value / 1000000}</Code>
          </Row>
        ),
        date: new Date(item.timestamp).toLocaleDateString(),
      }))
      setBalance(`${+balance / 1000000}`)
      setRecords(records)
      setLoading(false)
    },
    [],
    err => {
      console.log(err)
    },
  )

  if (loading)
    return (
      <div>
        <Loading />
        <Spacer y={5} />
      </div>
    )
  return (
    <div>
      <Tag type="default" invert>
        Current assets: {balance}$
      </Tag>
      <Spacer />
      <Table data={records}>
        <Table.Column prop="event" label="event" />
        <Table.Column prop="address" label="address" />
        <Table.Column prop="date" label="date" />
        <Table.Column prop="value">
          <Code>value ($)</Code>
        </Table.Column>
      </Table>
    </div>
  )
}

export default Account
