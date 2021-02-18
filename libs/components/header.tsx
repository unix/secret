import React from 'react'
import NextLink from 'next/link'
import { Avatar, Link, Text, Grid, useTheme } from '@geist-ui/react'

const Header: React.FC<unknown> = () => {
  const theme = useTheme()

  return (
    <div className="container">
      <Grid.Container className="header">
        <Grid xs={1} />
        <Grid xs={11} alignItems="center">
          <NextLink href="/" passHref>
            <Link>
              <Avatar draggable={false} isSquare src="/images/logo.png" />
            </Link>
          </NextLink>
        </Grid>
        <Grid xs={11} alignItems="center" justify="flex-end">
          <Text size={12} className="nav-item" type="secondary">
            <NextLink href="/go" passHref>
              <Link>CREATE</Link>
            </NextLink>
          </Text>
        </Grid>
        <Grid xs={1} />
      </Grid.Container>
      <style jsx>{`
        .container {
          width: 100%;
          height: 120px;
        }
        .container :global(.header) {
          height: 120px;
        }
        .container :global(.item) {
          height: 120px;
        }
        .container :global(.nav-item) {
          position: relative;
          line-height: 1;
          letter-spacing: 0.5px;
          transition: color ease-in-out 200ms;
        }
        .container :global(.nav-item):hover {
          color: ${theme.palette.successLight};
        }
        .container :global(.nav-item):before {
          position: absolute;
          content: '';
          left: -10px;
          top: 50%;
          transform: translateY(-50%);
          width: 4px;
          height: 60%;
          z-index: 1;
          transition: background-color ease-in-out 200ms;
          background-color: ${theme.palette.secondary};
        }
        .container :global(.nav-item):hover::before {
          background-color: ${theme.palette.successLight};
        }
      `}</style>
    </div>
  )
}

export default Header
