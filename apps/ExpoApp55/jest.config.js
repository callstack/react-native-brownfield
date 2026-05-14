const {
  createExpoJestConfig,
} = require('@callstack/brownfield-example-shared-tests/jest/expo-config');

module.exports = createExpoJestConfig({
  appRootDir: __dirname,
  moduleNameMapper: {
    // Match before `@/` so `@/global.css` is stubbed (Expo web styling).
    '^.+\\.css$': '<rootDir>/jest/cssMock.js',
    '^@/assets/(.*)$': '<rootDir>/assets/$1',
    '^@/(.*)$': '<rootDir>/src/$1',
  },
});
