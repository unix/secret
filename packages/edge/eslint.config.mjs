import config from '@unix/eslint'

export default [
  {
    ignores: [
      '**/.astro/**',
      '**/.wrangler/**',
      '**/dist/**',
      '**/migrations/**',
      '**/*.sql',
      'self-host.ts',
    ],
  },
  ...config,
  {
    files: ['**/*.{ts,mts,cts,tsx}'],
    rules: {
      'no-undef': 'off',
      '@typescript-eslint/no-magic-numbers': [
        'error',
        {
          ignore: [
            -40, -1, 0, 1, 2, 4, 5, 7, 8, 10, 16, 24, 60, 100, 204, 256, 300, 400,
            404, 409, 410, 429, 500, 501, 502, 503, 900, 1000, 1024, 1800,
          ],
          ignoreEnums: true,
          ignoreNumericLiteralTypes: true,
          ignoreReadonlyClassProperties: true,
        },
      ],
    },
  },
  {
    files: ['**/*.{test,spec}.{ts,tsx,mts,cts}'],
    rules: {
      '@typescript-eslint/no-magic-numbers': 'off',
    },
  },
]
