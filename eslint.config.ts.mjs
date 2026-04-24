import tseslint from 'typescript-eslint';

import baseEslintConfig from './eslint.config.base.mjs';

/**
 * ESLint configuration for JS/TS packages in the monorepo
 * @type {import('eslint').Linter.Config[]}
 */
export default [
  ...baseEslintConfig,

  // below: tseslint integration
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-empty-object-type': [
        'error',
        {
          allowInterfaces: 'always',
        },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
];
