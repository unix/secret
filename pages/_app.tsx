import { CssBaseline, GeistProvider, Text } from '@geist-ui/react'
import { NextPage } from 'next'
import { AppProps } from 'next/app'
import Head from 'next/head'
import React from 'react'
import { SITE } from '@libs/constants'

const Application: NextPage<AppProps<{}>> = ({ Component, pageProps }) => {
  return (
    <>
      <Head>
        <title>{SITE.TITLE}</title>
        <link rel="dns-prefetch" href="//secret.gl" />
        <meta name="google" content="notranslate" />
        <meta name="referrer" content="strict-origin" />
        <meta name="description" content={SITE.DESCRIPTION} />
        <meta property="og:site_name" content={SITE.TITLE} />
        <meta property="og:description" content={SITE.DESCRIPTION} />
        <meta property="og:type" content="website" />
        <meta name="generator" content="witt" />
        <meta name="author" content="witt" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta property="og:title" content={SITE.TITLE} />
        <meta property="og:url" content="secret.gl" />
        <meta property="og:image" content={SITE.OG_IMAGE} />
        <meta property="twitter:image" content={SITE.OG_IMAGE} />
        <meta itemProp="image" property="og:image" content={SITE.OG_IMAGE} />
        <meta
          name="viewport"
          content="initial-scale=1, maximum-scale=5, minimum-scale=1, viewport-fit=cover"
        />
      </Head>
      <GeistProvider>
        <CssBaseline />
        <Component {...pageProps} />
      </GeistProvider>
    </>
  )
}

export default Application
