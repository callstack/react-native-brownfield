const {
  createAndroidAppEmulatorReleaseDetoxConfig,
} = require('../brownfield-example-shared-tests/detox-rc-androidapp-emulator-release.cjs');

/** @type {import('detox').DetoxConfig} */
module.exports = createAndroidAppEmulatorReleaseDetoxConfig({
  gradleFlavor: 'expo55',
  detoxConfiguration: 'android.emu.release.expo55',
  jestConfigPath: 'e2e/jest.config.expo55.cjs',
});
