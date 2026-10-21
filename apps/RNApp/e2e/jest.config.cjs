const path = require('node:path');
const {
  createDetoxJestConfig,
} = require('../../shared-tests/e2e/createDetoxJestConfig.cjs');

module.exports = createDetoxJestConfig({
  e2eDir: __dirname,
  testMatch: [
    path.join(__dirname, '../../shared-tests/e2e/rnAppBrownfield.e2e.js'),
  ],
});
