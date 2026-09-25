const {
  createIosSimDebugDetoxConfig,
} = require('../brownfield-example-shared-tests/detox-rc-ios-sim-debug.cjs');

/** @type {import('detox').DetoxConfig} */
module.exports = createIosSimDebugDetoxConfig({
  workspace: 'RockApp',
  scheme: 'RockApp',
  appBinaryName: 'RockApp',
});
