import prettier from 'eslint-plugin-prettier';
import eslintConfigPrettier from 'eslint-config-prettier';
import eslintPluginNodeImport from 'eslint-plugin-node-import';

/**
 * ESLint base configuration shared for other re-usable configs
 * @type {import('eslint').Linter.Config[]}
 */
export default [
  {
    ignores: [
      '**/node_modules/**',
      '**/lib/**',
      '**/dist/**',
      '**/build/**',
      '**/.turbo/**',
      '**/.cxx/**',
      '**/Pods/**',
    ],
  },

  // below: prettier integration
  eslintConfigPrettier,
  {
    plugins: {
      prettier,
    },
    rules: {
      'prettier/prettier': 'error',
    },
  },

  // below: enforce importing of built-in Node.js modules with the 'node:' prefix
  {
    plugins: {
      'node-import': eslintPluginNodeImport,
    },
    rules: {
      'node-import/prefer-node-protocol': 'error',
    },
  },
];
