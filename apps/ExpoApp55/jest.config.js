const path = require('path');

module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^react$': require.resolve('react'),
    '^react/jsx-runtime$': require.resolve('react/jsx-runtime'),
    '^react/jsx-dev-runtime$': require.resolve('react/jsx-dev-runtime'),
    '^@testing-library/react-native$': require.resolve(
      '@testing-library/react-native'
    ),
    // Match before `@/` so `@/global.css` is stubbed (Expo web styling).
    '^.+\\.css$': '<rootDir>/jest/cssMock.js',
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@/assets/(.*)$': '<rootDir>/assets/$1',
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
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|@callstack/brownfield-example-shared-tests|expo|@expo|expo-modules-core)/)',
  ],
};
