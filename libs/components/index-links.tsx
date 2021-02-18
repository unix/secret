import React from 'react'
import { Code, Grid, Link, Spacer, Text, Tooltip, useTheme } from '@geist-ui/react'
import Github from '@geist-ui/react-icons/github'
import Command from '@geist-ui/react-icons/command'

const IndexLinks: React.FC<unknown> = () => {
  const theme = useTheme()

  return (
    <Grid xs={24} justify="center" alignItems="center">
      <div className="container">
        <Link className="item" target="_blank" href="https://github.com/unix/secret">
          <Github size={12} />
          <Text span size={12}>
            OPEN SOURCE
          </Text>
        </Link>
        <Spacer x={1.5} />

        <Tooltip
          text={
            <>
              Run <Code>npx secret</Code> to start.
            </>
          }
          placement="bottom"
          type="dark">
          <div className="item">
            <Command size={12} />
            <Text span size={12}>
              COMMAND LINE
            </Text>
          </div>
        </Tooltip>
      </div>
      <style jsx>{`
        .container {
          width: 100%;
          display: flex;
          justify-content: center;
          align-items: center;
          font-family: ${theme.font.mono};
          user-select: none;
          opacity: 0.85;
        }
        .container :global(.item) {
          display: inline-flex;
          justify-content: center;
          align-items: center;
          line-height: 1;
          color: ${theme.palette.accents_4};
          transform: scale(0.9);
        }
        .container :global(.item):hover {
          color: ${theme.palette.accents_5};
        }
        .container :global(.item svg) {
          margin-right: 3px;
        }
      `}</style>
    </Grid>
  )
}

export default IndexLinks
