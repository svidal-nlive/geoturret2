/* eslint-env node */
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
  plugins: ['@typescript-eslint', 'schema-version'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended'
  ],
  env: { es2022: true, browser: false, node: true },
  ignorePatterns: ['dist', 'node_modules'],
  rules: {
    'no-console': 'off',
    'schema-version/no-hardcoded': 'error'
  },
  settings: {},
  // Custom plugin resolution
  resolvePluginsRelativeTo: __dirname,
};
