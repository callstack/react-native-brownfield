const path = require('node:path');
const {
  createDetoxJestConfig,
} = require('../../brownfield-example-shared-tests/e2e/createDetoxJestConfig.cjs');
const {
  getAppleAppDetoxVariant,
} = require('../../brownfield-example-shared-tests/detox-appleapp-variants.cjs');

const variant = getAppleAppDetoxVariant('expo55');

module.exports = createDetoxJestConfig({
  e2eDir: __dirname,
  testMatch: [
    path.join(
      __dirname,
      `../../brownfield-example-shared-tests/e2e/${variant.e2eTestFile}`
    ),
  ],
});
