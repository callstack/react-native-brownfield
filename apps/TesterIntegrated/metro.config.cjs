const path = require('node:path');
const { getDefaultConfig } = require('@react-native/metro-config'); // Import from `@expo/metro-config` if using Expo CLI
const { withMetroConfig } = require('react-native-monorepo-config');

module.exports = withMetroConfig(
  getDefaultConfig(__dirname), // Metro config to extend
  {
    root: path.resolve(__dirname, '../..'), // Path to the monorepo root
    dirname: __dirname, // Path to the current directory
  }
);
