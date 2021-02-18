import { Card, Grid, Link, Text, useTheme } from '@geist-ui/react'
import React from 'react'
import Title from './title'
import Layout from './layout'
import NextLink from 'next/link'

export type EmptyItemProps = {
  title: string
  desc: string
}

const EmptyItem: React.FC<React.PropsWithChildren<EmptyItemProps>> = ({
  title,
  desc,
  children,
}) => {
  return (
    <Grid xs={6}>
      <Card>
        <Grid xs={24}>
          <Text span b size={70} className="title">
            {title}
          </Text>
        </Grid>
        <Grid xs={24}>
          <Text span size={13} className="desc">
            {desc}
          </Text>
        </Grid>

        <Card.Footer className="footer">
          <Grid xs={24} justify="space-between">
            {children}
          </Grid>
        </Card.Footer>
      </Card>
    </Grid>
  )
}

const Empty: React.FC<unknown> = () => {
  const theme = useTheme()

  return (
    <Layout>
      <div className="container">
        <Title
          title="Nothing"
          desc="No information was found, you can read about it below."
        />
        <Grid.Container gap={1} justify="center">
          <EmptyItem title="0x" desc="start secret">
            <Text span size={12}>
              <NextLink href="/0x01" passHref>
                <Link color className="redirect">
                  /0x01
                </Link>
              </NextLink>
            </Text>
          </EmptyItem>
          <EmptyItem title="Ho" desc="home page">
            <Text span size={12}>
              <NextLink href="/" passHref>
                <Link color className="redirect">
                  /home
                </Link>
              </NextLink>
            </Text>
          </EmptyItem>
          <EmptyItem title="Cr" desc="create secret">
            <Text span size={12}>
              <NextLink href="/go" passHref>
                <Link color className="redirect">
                  /go
                </Link>
              </NextLink>
            </Text>
          </EmptyItem>
        </Grid.Container>
        <style jsx>{`
          .container :global(.title) {
            font-family: ${theme.font.mono};
            line-height: 1;
            margin-left: -7px;
          }

          .container :global(.desc) {
            text-transform: uppercase;
          }

          .container :global(.redirect) {
            font-family: ${theme.font.mono};
          }

          .container :global(.footer) {
            padding: 2pt 5pt 2pt 10pt;
            min-height: calc(2 * ${theme.layout.gap});
          }
        `}</style>
      </div>
    </Layout>
  )
}

export default Empty
