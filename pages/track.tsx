import React, { useMemo, useState } from 'react'
import { useRouter } from 'next/router'
import { Grid, useToasts, Card, Spacer, Button } from '@geist-ui/react'
import {
  Empty,
  Footer,
  Layout,
  Rendering,
  Title,
  TrackBoard,
  TrackLinks,
} from '@libs/components'
import { useAsync } from '@libs/hooks'
import { apis, secret } from '@libs/utils'
import { SecretTrackedInfo } from '@libs/utils/apis'
import { TrackedReaderGroup } from '@libs/utils/secret'
import Power from '@geist-ui/react-icons/power'
import Head from 'next/head'

const Track: React.FC<unknown> = () => {
  const [, setToast] = useToasts()
  const { query, reload } = useRouter()
  const [rendering, setRendering] = useState<boolean>(true)
  const [info, setInfo] = useState<SecretTrackedInfo | null>(null)
  const [group, setGroup] = useState<TrackedReaderGroup>()
  const id = useMemo(() => query.q as string, [query.q])
  const readerCount = useMemo(() => info?.read_ids?.length || 0, [info?.read_ids])
  const isDisabled = useMemo(() => {
    if (!info?.expire) return true
    return new Date().getTime() >= new Date(info?.expire).getTime()
  }, [info?.expire])

  useAsync(
    async isMounted => {
      if (!query.q) return
      const result = await apis.getTrackedInfo(id)
      const group = secret.trackedToReaderGroup(id, result)

      if (!isMounted()) return
      setGroup(group)
      setInfo(result)
      setRendering(false)
    },
    [query.q],
    err => {
      setRendering(false)
      setToast({ text: '无法找到有用的信息', type: 'warning' })
    },
  )

  const clickHandler = async () => {
    try {
      await apis.destroySecret(id)
    } catch (err) {}
    setToast({ text: '当前信息已销毁', type: 'success' })
    reload()
  }

  if (rendering) return <Rendering />
  if (!info && !rendering) return <Empty />

  return (
    <Layout>
      <Head>
        <meta name="robots" content="noindex" />
      </Head>
      <Title
        title="Secret Tracked"
        desc="Everything is ready, here are all your available links."
      />
      <TrackBoard
        createdAt={info?.createdAt}
        expire={info?.expire}
        readers={readerCount}
      />
      <Spacer y={2.5} />
      <TrackLinks group={group} />
      <Spacer y={2.5} />

      <Grid.Container>
        <Grid xs={24} justify="flex-end">
          <Button
            icon={<Power />}
            auto
            disabled={!readerCount || isDisabled}
            type="error-light"
            size="small"
            onClick={clickHandler}>
            Destroy
          </Button>
        </Grid>
      </Grid.Container>
      <style jsx>{`
        :global(.inner .keyword) {
          letter-spacing: 0.75px;
          text-transform: uppercase;
          user-select: none;
          opacity: 0.8;
        }
      `}</style>
      <Footer />
    </Layout>
  )
}

export default Track
