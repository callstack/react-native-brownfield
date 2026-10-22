const {
  createAndroidAppEmulatorReleaseDetoxConfig,
} = require('../shared-tests/detox-rc-androidapp-emulator-release.cjs');

/** @type {import('detox').DetoxConfig} */
module.exports = createAndroidAppEmulatorReleaseDetoxConfig({
  gradleFlavor: 'vanilla',
});
