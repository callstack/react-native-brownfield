const {
  createExpoJestConfig,
} = require('@callstack/brownfield-example-shared-tests/jest/expo-config');

module.exports = createExpoJestConfig({
  appRootDir: __dirname,
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
});
