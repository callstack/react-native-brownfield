const path = require('node:path');
const {
  createDetoxJestConfig,
} = require('../../brownfield-example-shared-tests/e2e/createDetoxJestConfig.cjs');

module.exports = createDetoxJestConfig({
  e2eDir: __dirname,
  testMatch: [
    path.join(
      __dirname,
      '../../brownfield-example-shared-tests/e2e/appleAppBrownfield.e2e.js'
    ),
  ],
});
