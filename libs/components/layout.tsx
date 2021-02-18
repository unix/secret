import React from 'react'
import { Card, Page, Spacer } from '@geist-ui/react'
import Header from './header'

const Layout: React.FC<React.PropsWithChildren<unknown>> = ({ children }) => {
  return (
    <div className="layout">
      <Header />
      <Page size="small" className="main">
        <Page.Header />
        <Page.Content className="page">
          <Card type="lite" className="inner">
            {children}
          </Card>
        </Page.Content>
      </Page>
      <style jsx>{`
        .layout {
          min-height: 100%;
          width: 100%;
        }
        .layout :global(.inner) {
          max-width: 750px;
          margin: 0 auto;
          padding-bottom: 0;
        }
        .layout :global(.inner > .content) {
          padding-bottom: 0;
        }
        .layout :global(.main) {
          min-height: 100%;
        }
        .layout :global(.page) {
          padding-top: 0;
          padding-bottom: 0;
        }
      `}</style>
    </div>
  )
}

export default Layout
