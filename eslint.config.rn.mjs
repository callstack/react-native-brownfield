import globals from 'globals';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';

import baseEslintConfig from './eslint.config.base.mjs';

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
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    plugins: {
      react: reactPlugin,
      'react-hooks': reactHooksPlugin,
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
      ...reactHooksPlugin.configs.recommended.rules,
    },
  },
];
