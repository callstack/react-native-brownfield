const path = require('path');
const { createRequire } = require('module');

function createExpoJestConfig({ appRootDir, moduleNameMapper = {} }) {
  const appRequire = createRequire(path.join(appRootDir, 'package.json'));

  return {
    preset: 'jest-expo',
    // Shared source uses the consuming app's dependency versions.
    modulePaths: [path.join(appRootDir, 'node_modules')],
    setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
    moduleNameMapper: {
      '^react$': appRequire.resolve('react'),
      '^react/jsx-runtime$': appRequire.resolve('react/jsx-runtime'),
      '^react/jsx-dev-runtime$': appRequire.resolve('react/jsx-dev-runtime'),
      '^react-native$': appRequire.resolve('react-native'),
      '^@testing-library/react-native$': appRequire.resolve(
        '@testing-library/react-native'
      ),
      ...moduleNameMapper,
      '^@callstack/react-native-brownfield$': path.join(
        appRootDir,
        '../../packages/react-native-brownfield/src/index.ts'
      ),
      '^@callstack/brownfield-navigation$': path.join(
        appRootDir,
        '../../packages/brownfield-navigation/src/index.ts'
      ),
      '^@callstack/brownie$': path.join(
        appRootDir,
        '../../packages/brownie/src/index.ts'
      ),
    },
    transformIgnorePatterns: [
      '/node_modules/(?!(.pnpm|react-native|@react-native|@react-native-community|expo|@expo|@expo-google-fonts|react-navigation|@react-navigation|@sentry/react-native|native-base|@callstack/shared-tests|@callstack/shared-runtime))',
    ],
  };
}

module.exports = {
  createExpoJestConfig,
};
