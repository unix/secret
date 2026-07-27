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
            -1,
            0,
            1,
            2,
            3,
            4,
            6,
            8,
            10,
            12,
            16,
            18,
            63,
            255,
            1024,
            '8n',
            '255n',
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
    files: ['vite.config.ts'],
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: ['vite.config.ts'],
        },
      },
    },
  },
]
