import React from 'react'
import { Spacer, Grid, Text, Link, useTheme } from '@geist-ui/react'
import NextLink from 'next/link'

const Footer: React.FC<unknown> = () => {
  const theme = useTheme()
  return (
    <div className="container">
      <Spacer y={5} />
      <Grid.Container className="footer" alignItems="center">
        <Grid xs={24} alignItems="center">
          <NextLink href="/0x01" passHref>
            <Link>
              <Text span size={12} type="secondary" className="label">
                Introduction
              </Text>
            </Link>
          </NextLink>
          <Spacer x={0.5} />
          <NextLink href="/usability" passHref>
            <Link>
              <Text span size={12} type="secondary" className="label">
                Usability
              </Text>
            </Link>
          </NextLink>
          <Spacer x={0.5} />
          <Link target="_blank" href="https://github.com/unix/secret">
            <Text span size={12} type="secondary" className="label">
              GitHub
            </Text>
          </Link>
        </Grid>
      </Grid.Container>
      <style jsx>{`
        .container :global(.footer) {
          height: 40px;
        }

        .container :global(.label) {
          font-family: ${theme.font.mono};
          text-transform: uppercase;
          transform: scale(0.9);
        }
      `}</style>
    </div>
  )
}

export default Footer
