const {
  createIosSimDebugDetoxConfig,
} = require('../brownfield-example-shared-tests/detox-rc-ios-sim-debug.cjs');

/**
 * Requires a native tree from `expo prebuild` / `expo run:ios` (ios/ + Pods).
 * @type {import('detox').DetoxConfig}
 */
module.exports = createIosSimDebugDetoxConfig({
  workspace: 'ExpoApp54',
  scheme: 'ExpoApp54',
  appBinaryName: 'ExpoApp54',
});
