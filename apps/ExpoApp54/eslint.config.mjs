import eslintRnConfig from '../../eslint.config.rn.mjs';

/** @type {import('eslint').Linter.Config[]} */
export default [
  ...eslintRnConfig,
  {
    rules: {
      'react/no-unstable-nested-components': 'off',
      'react-native/no-inline-styles': 'off',
      'no-alert': 'off',
    },
  },
];
