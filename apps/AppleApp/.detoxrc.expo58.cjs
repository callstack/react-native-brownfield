const {
  createAppleAppIosSimDebugDetoxConfig,
} = require('../brownfield-example-shared-tests/detox-rc-appleapp-ios-sim-debug.cjs');
const {
  getAppleAppDetoxVariant,
} = require('../brownfield-example-shared-tests/detox-appleapp-variants.cjs');

const variant = getAppleAppDetoxVariant('expo58');

/** @type {import('detox').DetoxConfig} */
module.exports = createAppleAppIosSimDebugDetoxConfig({
  scheme: variant.scheme,
  configuration: variant.configuration,
  appBinaryName: variant.appBinaryName,
  detoxConfiguration: variant.detoxConfiguration,
  jestConfigPath: 'e2e/jest.config.expo58.cjs',
});
