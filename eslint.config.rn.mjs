import globals from 'globals';
import { fixupConfigRules } from '@eslint/compat';
import { FlatCompat } from '@eslint/eslintrc';

import baseEslintConfig from './eslint.config.base.mjs';

const flatCompat = new FlatCompat();

/**
 * ESLint configuration for React Native packages in the monorepo
 * @type {import('eslint').Linter.Config[]}
 */
export default [
  ...fixupConfigRules(flatCompat.extends('@react-native/eslint-config')),
  ...baseEslintConfig,
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.node,
      },
    },
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
];
