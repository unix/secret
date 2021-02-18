import React from 'react'
import NextLink from 'next/link'
import { Card, Grid, Link, Row, Text, useTheme } from '@geist-ui/react'

export type LinkCardProps = {
  title: string
  desc: string
  link?: string
  linkText?: string
}

const LinkCard: React.FC<LinkCardProps> = ({ title, desc, link, linkText }) => {
  const theme = useTheme()
  return (
    <div className="container">
      <Card>
        <Row>
          <Text span b size={70} className="title">
            {title}
          </Text>
        </Row>
        <Row>
          <Text span size={12} className="desc">
            {desc}
          </Text>
        </Row>

        <Card.Footer className="footer">
          <Grid xs={24} justify="space-between">
            <Text span size={12}>
              <NextLink href={link}>
                <Link color>{linkText}</Link>
              </NextLink>
            </Text>
          </Grid>
        </Card.Footer>
      </Card>
      <style jsx>{`
        .container {
          width: 100%;
        }
        .container :global(.card .content) {
          padding-bottom: ${theme.layout.gapHalf};
        }
        .container :global(.title) {
          font-family: ${theme.font.mono};
          line-height: 1;
          margin-left: -7px;
        }

        .container :global(.desc) {
          text-transform: uppercase;
          padding-top: 4px;
        }

        .container :global(.footer) {
          padding: 2pt 5pt 2pt 10pt;
          min-height: calc(2 * ${theme.layout.gap});
        }
      `}</style>
    </div>
  )
}

export default LinkCard
