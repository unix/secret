import React, { useEffect, useMemo, useState } from 'react'
import { Capacity, Grid, Row, Text } from '@geist-ui/react'

export type TrackBoardProps = {
  readers: number
  createdAt: string
  expire: string
}

const toLocale = (time: string) => {
  return new Date(time).toLocaleTimeString()
}

export type TrackBoardItemProps = {
  title: string
  type?: 'secondary' | 'success' | 'error' | 'warning' | 'default'
  desc?: string | number
}

export const TrackBoardItem: React.FC<React.PropsWithChildren<TrackBoardItemProps>> = ({
  title,
  desc,
  type = 'secondary',
  children,
}) => {
  const Content = ({ children }) => (
    <div className="content">
      {children}
      <style jsx>{`
        .content {
          height: 34px;
          width: 100%;
          overflow: hidden;
          display: inline-flex;
          justify-content: center;
          align-items: center;
        }
      `}</style>
    </div>
  )
  return (
    <Grid xs={12} sm={6} direction="column" alignItems="center">
      <Content>
        <Text span type={type} size={12}>
          {title}
        </Text>
      </Content>
      <Content>
        {desc !== undefined && (
          <Text i span size={13}>
            {desc}
          </Text>
        )}
        {children}
      </Content>
    </Grid>
  )
}

const TrackBoard: React.FC<TrackBoardProps> = ({ readers, createdAt, expire }) => {
  const [update, setUpdate] = useState<number>(0)
  const remainder = useMemo(() => {
    const all = new Date(expire).getTime() - new Date(createdAt).getTime()
    const current = new Date().getTime() - new Date(createdAt).getTime()
    const value = current / all
    return value > 1 ? 100 : value * 100
  }, [createdAt, expire, update])
  const isExpired = useMemo(() => remainder >= 100, [remainder])

  useEffect(() => {
    const timer = setInterval(() => {
      setUpdate(last => last + 1)
    }, 1000)
    return () => {
      clearInterval(timer)
    }
  }, [])

  return (
    <Grid.Container gap={1} justify="center" alignItems="center">
      <TrackBoardItem title="Currently" desc={readers} />
      <TrackBoardItem title="Creation" desc={toLocale(createdAt)} />
      <TrackBoardItem
        type={isExpired ? 'error' : 'secondary'}
        title={isExpired ? 'Expiration (expired)' : 'Expiration'}
        desc={toLocale(expire)}
      />
      <TrackBoardItem title="Auto Destruction">
        <Capacity value={remainder} />
      </TrackBoardItem>
    </Grid.Container>
  )
}

export default TrackBoard
