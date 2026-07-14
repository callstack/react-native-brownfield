const {
  createAndroidAppEmulatorReleaseDetoxConfig,
} = require('../brownfield-example-shared-tests/detox-rc-androidapp-emulator-release.cjs');

/** @type {import('detox').DetoxConfig} */
module.exports = createAndroidAppEmulatorReleaseDetoxConfig({
  gradleFlavor: 'expo56',
  detoxConfiguration: 'android.emu.release.expo56',
  jestConfigPath: 'e2e/jest.config.expo56.cjs',
});
