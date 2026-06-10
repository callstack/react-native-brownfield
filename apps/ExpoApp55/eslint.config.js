// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const globals = require('globals');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*'],
  },
  // Jest config is executed by Node (CommonJS); teach ESLint Node globals like __dirname.
  {
    files: ['jest.config.js'],
    languageOptions: {
      globals: globals.node,
    },
  },
]);
