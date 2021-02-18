import { Grid, Link, Spacer, Text } from '@geist-ui/react'
import React from 'react'
import NextLink from 'next/link'

export type ShortcutsProps = {
  fixed?: boolean
}

const Shortcuts: React.FC<ShortcutsProps> = ({ fixed }) => {
  return (
    <div className="container">
      <Grid.Container className="shortcuts">
        <Grid xs={24} alignItems="center">
          <Text size={12} type="secondary">
            <NextLink href="/go">
              <Link>介绍</Link>
            </NextLink>
          </Text>
          <Spacer x={0.5} />
          <Text size={12} type="secondary">
            <NextLink href="/go">
              <Link>技术实现</Link>
            </NextLink>
          </Text>
          <Spacer x={0.5} />
          <Text size={12} type="secondary">
            <NextLink href="/go">
              <Link>财产</Link>
            </NextLink>
          </Text>
        </Grid>
      </Grid.Container>
      <style jsx>{`
        .container {
          position: ${fixed ? 'fixed' : 'absolute'};
          width: 100%;
          height: auto;
          bottom: 0;
        }

        .container :global(.shortcuts) {
          height: 100px;
        }
      `}</style>
    </div>
  )
}

export default Shortcuts
