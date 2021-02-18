import React from 'react'
import NextLink from 'next/link'
import { Layout, IndexLinks } from '@libs/components'
import { Button, Grid, Link, Text } from '@geist-ui/react'

const Index: React.FC<unknown> = () => {
  return (
    <Layout>
      <div className="home">
        <Grid.Container>
          <Grid xs={24} justify="center" alignItems="center">
            <Text p size={22} className="title">
              SECRET
            </Text>
          </Grid>
          <Grid xs={24} justify="center" alignItems="center">
            <Grid
              xs={24}
              md={17}
              justify="center"
              alignItems="center"
              direction="column"
              className="desc">
              <Text p size={14}>
                Secret will protect you when sharing information, you can use it to send
                text without worrying about hijacked. For more, refer to{' '}
                <Text span i>
                  <NextLink href="/0x01" passHref>
                    <Link>Introduction</Link>
                  </NextLink>
                </Text>
                .
              </Text>
            </Grid>
          </Grid>
          <IndexLinks />
        </Grid.Container>
      </div>
      <Grid.Container>
        <Grid xs={24} justify="center" alignItems="center">
          <NextLink href="/go" passHref>
            <Link>
              <Button type="secondary-light">Start Now</Button>
            </Link>
          </NextLink>
        </Grid>
      </Grid.Container>
      <style jsx>{`
        .home {
          text-align: center;
          height: 450px;
          display: flex;
          justify-content: center;
          flex-direction: column;
          margin-bottom: 40px;
        }
        .home :global(.title) {
          letter-spacing: 1.5px;
        }
        .home :global(.desc) {
          max-width: 470px;
        }
      `}</style>
    </Layout>
  )
}

export default Index
