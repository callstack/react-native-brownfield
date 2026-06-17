const {
  createAppleAppIosSimDebugDetoxConfig,
} = require('../brownfield-example-shared-tests/detox-rc-appleapp-ios-sim-debug.cjs');

/** @type {import('detox').DetoxConfig} */
module.exports = createAppleAppIosSimDebugDetoxConfig({
  scheme: 'Brownfield Apple App Vanilla',
  configuration: 'Debug Vanilla',
  appBinaryName: 'Brownfield Apple App (RNApp)',
});
