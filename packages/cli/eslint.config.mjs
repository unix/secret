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
            -1, 0, 1, 2, 7, 10, 24, 31, 32, 33, 36, 41, 60, 64, 100, 429, 1000, 1024,
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
  {
    files: ['src/utils/terminal.ts'],
    rules: {
      '@typescript-eslint/no-implied-eval': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
    },
  },
]
