const path = require('node:path');
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const { withMetroConfig } = require('react-native-monorepo-config');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('metro-config').MetroConfig}
 */
const config = {};

module.exports = withMetroConfig(
  mergeConfig(getDefaultConfig(__dirname), config),
  {
    root: path.resolve(__dirname, '../..'),
    dirname: __dirname,
  },
);
