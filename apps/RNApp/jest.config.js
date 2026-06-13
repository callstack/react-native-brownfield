const path = require('node:path');

module.exports = {
  preset: '@react-native/jest-preset',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^react$': require.resolve('react'),
    '^react/jsx-runtime$': require.resolve('react/jsx-runtime'),
    '^react/jsx-dev-runtime$': require.resolve('react/jsx-dev-runtime'),
    '^@testing-library/react-native$':
      require.resolve('@testing-library/react-native'),
    '^@callstack/react-native-brownfield$': path.join(
      __dirname,
      '../../packages/react-native-brownfield/src/index.ts'
    ),
    '^@callstack/brownfield-navigation$': path.join(
      __dirname,
      '../../packages/brownfield-navigation/src/index.ts'
    ),
    '^@callstack/brownie$': path.join(
      __dirname,
      '../../packages/brownie/src/index.ts'
    ),
  },
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|@callstack/brownfield-example-shared|@callstack/brownfield-example-shared-tests|@react-navigation|react-native-screens|react-native-safe-area-context)/)',
  ],
};
