const unixPrettier = require('@unix/prettier')

module.exports = {
  ...unixPrettier,
  plugins: [
    require.resolve('prettier-plugin-astro'),
    require.resolve('prettier-plugin-tailwindcss'),
  ],
  tailwindStylesheet: './src/styles/global.css',
  tailwindFunctions: ['cn', 'cva'],
  overrides: [
    {
      files: '*.astro',
      options: {
        parser: 'astro',
      },
    },
  ],
}
