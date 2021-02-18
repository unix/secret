import React, { useMemo } from 'react'
import { Grid, Snippet, Spacer, Tabs, Text } from '@geist-ui/react'
import { TrackedReaderGroup } from '@libs/utils/secret'

export type TrackLinksProps = {
  group: TrackedReaderGroup
}

const ExpiredTips = () => (
  <ul>
    <Text type="error" size={12}>
      <li>This secret is no longer valid.</li>
    </Text>
    <Text type="error" size={12}>
      <li>
        Available to 0 means that no one can view the secret anymore, even if you are the
        creator.
      </li>
    </Text>
  </ul>
)

const UnreadTips = () => (
  <ul>
    <Text type="secondary" size={12}>
      <li>The information can only be read once per link.</li>
    </Text>
    <Text type="secondary" size={12}>
      <li>
        Even if you (the creator) need to see the source, you have to consume a link.
      </li>
    </Text>
  </ul>
)

const TrackLinks: React.FC<TrackLinksProps> = ({ group = {} }) => {
  const { urls = [], cliUrls = [], consumes = [], cliConsumes = [] } = group
  const isExpired = useMemo(() => urls.length === 0, [urls.length])
  const isUnread = useMemo(() => consumes.length === 0, [consumes.length])
  return (
    <Tabs initialValue="web" hideDivider>
      <Tabs.Item label="Web" value="web">
        <Text p b size={14} type={isExpired ? 'error' : 'success'}>
          Available ({urls.length})
        </Text>
        {isExpired && <ExpiredTips />}
        <Grid.Container gap={1}>
          {urls.map((url, key) => (
            <Grid xs={24} key={key}>
              <Snippet symbol="" width="100%" text={url} type="success" />
            </Grid>
          ))}
        </Grid.Container>
        <Spacer y={1.5} />
        <Text p b size={14} type="secondary">
          Consumed ({consumes.length})
        </Text>
        {isUnread && <UnreadTips />}
        <Grid.Container gap={1}>
          {consumes.map((url, key) => (
            <Grid xs={24} key={key}>
              <Snippet symbol="" width="100%" text={url} type="secondary" />
            </Grid>
          ))}
        </Grid.Container>
      </Tabs.Item>

      <Tabs.Item label="CLI" value="cli">
        <Text p b size={14} type={isExpired ? 'error' : 'success'}>
          Available ({urls.length})
        </Text>
        {isExpired && <ExpiredTips />}
        <Grid.Container gap={1}>
          {cliUrls.map((url, key) => (
            <Grid xs={24} key={key}>
              <Snippet width="100%" text={url} type="dark" />
            </Grid>
          ))}
        </Grid.Container>
        <Spacer y={1.5} />
        <Text p b size={14} type="secondary">
          Consumed ({consumes.length})
        </Text>
        {isUnread && <UnreadTips />}
        <Grid.Container gap={1}>
          {cliConsumes.map((url, key) => (
            <Grid xs={24} key={key}>
              <Snippet symbol="" width="100%" text={url} type="lite" />
            </Grid>
          ))}
        </Grid.Container>
      </Tabs.Item>
    </Tabs>
  )
}

export default TrackLinks
