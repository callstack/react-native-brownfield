import prettier from 'eslint-plugin-prettier';
import eslintConfigPrettier from 'eslint-config-prettier';
import eslintPluginNodeImport from 'eslint-plugin-node-import';

/**
 * ESLint base configuration for JS/TS packages in the monorepo
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
