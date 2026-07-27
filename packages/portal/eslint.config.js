import config from '@unix/eslint'

export default [
  {
    ignores: [
      '**/.astro/**',
      '**/.wrangler/**',
      '**/dist/**',
      '**/migrations/**',
      '**/*.astro',
      '**/*.sql',
      'prettier.config.cjs',
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
            -4, -1, 0, 1, 2, 4, 5, 6, 10, 20, 34, 60, 64, 80, 100, 300, 400, 429,
            501, 900, 1024, 1500, 1800, 3600, 4001, 86400,
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
