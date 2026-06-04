// @ts-check

import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'astro/config'

import cloudflare from '@astrojs/cloudflare'
import react from '@astrojs/react'

// https://astro.build/config
export default defineConfig({
  prefetch: {
    defaultStrategy: 'viewport',
  },

  adapter: cloudflare({}),

  session: {
    driver: {
      entrypoint: 'unstorage/drivers/null',
    },
  },

  vite: {
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

  integrations: [react()],
})
