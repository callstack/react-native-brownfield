/** @type {import('jest').Config} */
module.exports = {
  projects: [
    {
      displayName: 'scripts',
      preset: 'ts-jest',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/scripts/**/*.test.ts'],
      moduleFileExtensions: ['ts', 'js'],
      clearMocks: true,
      transform: {
        '^.+\\.ts$': [
          'ts-jest',
          {
            tsconfig: '<rootDir>/scripts/__tests__/tsconfig.json',
          },
        ],
      },
    },
    {
      displayName: 'src',
      preset: 'ts-jest',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/src/**/*.test.ts'],
      moduleFileExtensions: ['ts', 'js'],
      clearMocks: true,
      moduleNameMapper: {
        '^./NativeBrownieModule$':
          '<rootDir>/src/__tests__/__mocks__/NativeBrownieModule.ts',
      },
      transform: {
        '^.+\\.ts$': [
          'ts-jest',
          {
            tsconfig: '<rootDir>/src/__tests__/tsconfig.json',
          },
        ],
      },
    },
  ],
};
