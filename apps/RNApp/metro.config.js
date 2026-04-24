const path = require('node:path');
const { getDefaultConfig } = require('@react-native/metro-config');
const { withMetroConfig } = require('react-native-monorepo-config');

module.exports = withMetroConfig(getDefaultConfig(__dirname), {
  root: path.resolve(__dirname, '../..'),
  dirname: __dirname,
});
