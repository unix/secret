// @ts-check

import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'astro/config'

import cloudflare from '@astrojs/cloudflare'
import react from '@astrojs/react'
import { noImageEndpoint } from 'astro-no-image-endpoint/cloudflare'
import viteCacheIsolation from 'astro-vite-cache-isolation'

// https://astro.build/config
export default defineConfig({
  compressHTML: true,
  trailingSlash: 'never',

  build: {
    format: 'file',
  },

  prefetch: {
    defaultStrategy: 'viewport',
  },

  adapter: cloudflare({
    imageService: 'passthrough',
  }),

  session: false,

  vite: {
    ssr: {
      noExternal: [
        '@fontsource-variable/geist',
        '@fontsource-variable/geist-mono',
        '@fontsource-variable/noto-sans-sc',
      ],
    },
    plugins: [/** @type {any} */ (tailwindcss())],
    server: {
      proxy: {
        '/__LOCAL__': {
          target: 'http://localhost:3001',
          secure: false,
          rewrite: path => path.replace('/__LOCAL__', ''),
        },
      },
    },
  },

  integrations: [noImageEndpoint(), react(), viteCacheIsolation()],
})
