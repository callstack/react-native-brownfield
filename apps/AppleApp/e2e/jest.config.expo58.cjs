const path = require('node:path');
const {
  createDetoxJestConfig,
} = require('../../shared-tests/e2e/createDetoxJestConfig.cjs');
const {
  getAppleAppDetoxVariant,
} = require('../../shared-tests/detox-appleapp-variants.cjs');

const variant = getAppleAppDetoxVariant('expo58');

module.exports = createDetoxJestConfig({
  e2eDir: __dirname,
  testMatch: [
    path.join(__dirname, `../../shared-tests/e2e/${variant.e2eTestFile}`),
  ],
});
