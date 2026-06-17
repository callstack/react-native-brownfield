'use strict';

const { getAndroidEmulatorAvdName } = require('./detox-android-emulator-device.cjs');

/**
 * Detox Android emulator release config for AndroidApp (native Gradle consumer).
 *
 * Unlike RN/Expo host apps, AndroidApp links prebuilt brownfield AARs from Maven Local.
 * Package and publish the matching RN app first, then assemble the flavor release APK.
 *
 * @param {{
 *   gradleFlavor: string,
 *   detoxConfiguration?: string,
 *   jestConfigPath?: string,
 * }} options
 * @returns {import('detox').DetoxConfig}
 */
function createAndroidAppEmulatorReleaseDetoxConfig({
  gradleFlavor,
  detoxConfiguration = 'android.emu.release',
  jestConfigPath = 'e2e/jest.config.cjs',
}) {
  const flavorCapitalized = gradleFlavor.charAt(0).toUpperCase() + gradleFlavor.slice(1);
  const detoxAndroidReleaseBuild =
    `./gradlew assemble${flavorCapitalized}Release` +
    ` assemble${flavorCapitalized}ReleaseAndroidTest -DtestBuildType=release`;

  const binaryPath = `app/build/outputs/apk/${gradleFlavor}/release/app-${gradleFlavor}-release.apk`;
  const testBinaryPath = `app/build/outputs/apk/androidTest/${gradleFlavor}/release/app-${gradleFlavor}-release-androidTest.apk`;

  return {
    testRunner: {
      $0: 'jest',
      args: {
        config: jestConfigPath,
        _: ['e2e'],
      },
      jest: {
        setupTimeout: 300000,
      },
    },
    apps: {
      'android.release': {
        type: 'android.apk',
        binaryPath,
        testBinaryPath,
        build: detoxAndroidReleaseBuild,
      },
    },
    devices: {
      'android.emulator': {
        type: 'android.emulator',
        device: {
          avdName: getAndroidEmulatorAvdName(),
        },
      },
    },
    configurations: {
      [detoxConfiguration]: {
        device: 'android.emulator',
        app: 'android.release',
      },
    },
  };
}

module.exports = { createAndroidAppEmulatorReleaseDetoxConfig };
