/** @type {import('jest').Config} */
module.exports = {
  projects: [
    {
      displayName: 'scripts',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/scripts/**/*.test.ts'],
      moduleFileExtensions: ['ts', 'js'],
      clearMocks: true,
      transform: {
        '^.+\\.ts$': [
          'babel-jest',
          {
            presets: [
              ['@babel/preset-env', { targets: { node: 'current' } }],
              '@babel/preset-typescript',
            ],
          },
        ],
      },
    },
    {
      displayName: 'src',
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
          'babel-jest',
          {
            presets: [
              ['@babel/preset-env', { targets: { node: 'current' } }],
              '@babel/preset-typescript',
            ],
          },
        ],
      },
    },
  ],
};
