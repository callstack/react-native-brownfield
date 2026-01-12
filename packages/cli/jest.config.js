/** @type {import('jest').Config} */
export default {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/src/brownie/**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js'],
  preset: 'ts-jest/presets/default-esm',
  clearMocks: true,
  moduleNameMapper: {
    '^./NativeBrownieModule$':
      '<rootDir>/src/brownie/__tests__/__mocks__/NativeBrownieModule.ts',
    // required for ESM + ts-jest
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: '<rootDir>/tsconfig.json',
      },
    ],
    '^.+\\.js$': [
      'babel-jest',
      {
        presets: [['@babel/preset-env', { targets: { node: 'current' } }]],
      },
    ],
  },
};
