const withMDX = require('@next/mdx')({
  extension: /\.(md|mdx)?$/,
  options: {
    rehypePlugins: [require('rehype-join-line')],
  },
})

const nextConfig = {
  target: 'serverless',

  pageExtensions: ['jsx', 'js', 'ts', 'tsx', 'mdx'],

  cssModules: true,

  cssLoaderOptions: {
    importLoaders: 1,
    localIdentName: '[local]___[hash:base64:5]',
  },

  env: {
    VERSION: require('./package.json').version,
  },

  trailingSlash: false,

  reactStrictMode: true,

  async rewrites() {
    return [
      {
        source: '/s/:slug*',
        destination: '/show?q=:slug*',
      },
    ]
  },
}

module.exports = withMDX(nextConfig)
