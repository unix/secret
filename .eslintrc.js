module.exports = {
  parser: "@typescript-eslint/parser",
  extends: [
    "eslint-config-ts-lambdas",
    "eslint-config-ts-lambdas/react",
    "prettier",
  ],
  plugins: ["@typescript-eslint"],
  settings: {
    react: {
      pragma: "React",
      version: "detect",
    },
  },
  parserOptions: {
    project: "./tsconfig.json",
    ecmaFeatures: {
      jsx: true,
    },
  },
};
