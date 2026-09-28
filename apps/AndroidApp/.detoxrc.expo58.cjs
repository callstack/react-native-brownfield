const {
  createAndroidAppEmulatorReleaseDetoxConfig,
} = require('../brownfield-example-shared-tests/detox-rc-androidapp-emulator-release.cjs');

/** @type {import('detox').DetoxConfig} */
module.exports = createAndroidAppEmulatorReleaseDetoxConfig({
  gradleFlavor: 'expo58',
  detoxConfiguration: 'android.emu.release.expo58',
  jestConfigPath: 'e2e/jest.config.expo58.cjs',
});
