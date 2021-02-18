import React, { useMemo, useState } from 'react'
import { Empty, Footer, Layout, Rendering, Title } from '@libs/components'
import { useRouter } from 'next/router'
import { apis, secret } from '@libs/utils'
import { SecretURLRecord } from '@libs/utils/secret'
import { useAsync } from '@libs/hooks'
import { Card, Divider, Dot, Spacer, Text, useToasts } from '@geist-ui/react'
import Head from 'next/head'

const Show: React.FC<unknown> = () => {
  const { asPath } = useRouter()
  const [, setToast] = useToasts()
  const [rendering, setRendering] = useState<boolean>(true)
  const [state, setState] = useState<string | null>(null)
  const result = useMemo<SecretURLRecord | null>(() => {
    const path = asPath.replace(/^\/s\//, '')
    return secret.decodeURL(path)
  }, [asPath])

  useAsync(
    async isMounted => {
      const { readId, key, nonce } = result
      const data = await apis.getSecret(readId)
      const content = secret.toOrigin({
        cipher: data.content,
        privateKey: key,
        nonce: nonce,
      })
      if (!isMounted()) return
      setState(content)
      setRendering(false)
    },
    [result],
    () => {
      setRendering(false)
      setToast({ text: 'No useful information could be found', type: 'warning' })
    },
  )

  if (rendering) return <Rendering />
  if (!state && !rendering) return <Empty />

  return (
    <Layout>
      <Head>
        <meta name="robots" content="noindex" />
      </Head>
      <Title
        title="Your Secret"
        desc="It's your secret, and they will only show it this once."
      />
      <pre style={{ whiteSpace: 'break-spaces' }}>{state}</pre>
      <Spacer y={4} />
      <Card type="secondary" width="100%">
        <Card.Content>
          <Dot type="warning" />
          <Text span b type="warning">
            Tips
          </Text>
        </Card.Content>
        <Divider y={0} />
        <Card.Content>
          <Text span size={14}>
            <li>You don't have to worry about attacks or hijacking.</li>
          </Text>
          <Text span size={14}>
            <li>
              This is the last time to show, and refreshing will also lose this reading
              opportunity.
            </li>
          </Text>
          <Text span size={14}>
            <li>
              Using the clipboard to paste message contents may risk exposing secrets.
            </li>
          </Text>
        </Card.Content>
      </Card>
      <Footer />
    </Layout>
  )
}

export default Show
