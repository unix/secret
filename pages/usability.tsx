import { Layout, Title, Account, Footer } from '@libs/components'
import React, { useState } from 'react'
import { Code, Link, Spacer, Text } from '@geist-ui/react'
import { TRON_ADDRESS } from '@libs/constants'

export type AccountRecord = {
  event: string
  address: string
  value: JSX.Element
  date: string
}

const Usability: React.FC<unknown> = () => {
  return (
    <Layout>
      <Title title="Usability of Secret" desc="Operation status and donation record." />
      <Text>
        Secret is an open source project and has no commercial activities, I added some
        start-up capital to it and expect it to run for 1 year. If you feel this project
        is helpful to you, you can make a donation.
      </Text>
      <Spacer y={3} />
      <Text h2 size={12}>
        Cost
      </Text>
      <Text>
        Secret is hosted on <Code>digitalocean</Code> and costs about{' '}
        <Text span i>
          $10
        </Text>{' '}
        per month, which includes the server, database, etc.
      </Text>
      <Spacer y={3} />
      <Text h2 size={12}>
        Donation
      </Text>
      <Text>
        I use account{' '}
        <Link target="_blank" href="https://tron.network/usdt">
          <Text i span>
            USDT TRC20 (TRON)
          </Text>
        </Link>{' '}
        as the address for receiving donations, and all transactions are publicly
        accessible. The last few account transactions will be displayed here by default,
        and if you are interested, you can check the details in the blockchain browser.
      </Text>
      <Text>
        In order to ensure the proper use of donated funds, the use of each expenditure
        will be recorded on the blockchain in the form of <Code>memo</Code>.
      </Text>
      <Text>
        The USDT TRC20 transfer fees are low and almost negligible, and you can make a
        transfer donation to <Code>{TRON_ADDRESS}</Code>.
      </Text>
      <Spacer y={3} />
      <Text h2 size={12}>
        Records
      </Text>
      <Account />
      <Spacer y={3} />
      <Footer />
    </Layout>
  )
}

export default Usability
