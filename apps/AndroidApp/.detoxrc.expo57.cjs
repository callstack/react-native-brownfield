const {
  createAndroidAppEmulatorReleaseDetoxConfig,
} = require('../brownfield-example-shared-tests/detox-rc-androidapp-emulator-release.cjs');

/** @type {import('detox').DetoxConfig} */
module.exports = createAndroidAppEmulatorReleaseDetoxConfig({
  gradleFlavor: 'expo57',
  detoxConfiguration: 'android.emu.release.expo57',
  jestConfigPath: 'e2e/jest.config.expo57.cjs',
});
