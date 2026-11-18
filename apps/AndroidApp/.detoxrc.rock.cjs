const {
  createAndroidAppEmulatorReleaseDetoxConfig,
} = require('../brownfield-example-shared-tests/detox-rc-androidapp-emulator-release.cjs');

/** @type {import('detox').DetoxConfig} */
module.exports = createAndroidAppEmulatorReleaseDetoxConfig({
  gradleFlavor: 'rock',
  detoxConfiguration: 'android.emu.release.rock',
  jestConfigPath: 'e2e/jest.config.rock.cjs',
});
