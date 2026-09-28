'use strict';

const { resolveAndroidDetoxDevice } = require('./detox-android-emulator-device.cjs');
const { getDetoxArtifactsConfig } = require('./detox-artifacts-config.cjs');

/**
 * Shared Detox artifacts, minus video.
 *
 * The shared helper enables video for iOS simulators, where Detox records
 * host-side via `simctl io recordVideo`. On Android it would record with
 * `adb shell screenrecord`, writing into the emulator userdata partition —
 * the partition androidapp-road-test already documents as ENOSPC-prone
 * ("Do not set disk-size — a large userdata partition fails when the runner
 * is low on disk after Gradle/NDK builds"). Logcat, screenshots and the
 * UI hierarchy give us what we need without that risk.
 *
 * @returns {import('detox').DetoxArtifactsConfig}
 */
function buildAndroidArtifactsConfig() {
  const shared = getDetoxArtifactsConfig();

  return {
    ...shared,
    plugins: {
      ...shared.plugins,
      video: { enabled: false },
    },
  };
}

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

  const { deviceKey, deviceConfig } = resolveAndroidDetoxDevice();

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
    artifacts: buildAndroidArtifactsConfig(),
    behavior: {
      cleanup: {
        // CI owns emulator lifecycle via android-emulator-runner.
        shutdownDevice: false,
      },
    },
    apps: {
      'android.release': {
        type: 'android.apk',
        binaryPath,
        testBinaryPath,
        build: detoxAndroidReleaseBuild,
        // Expo brownfield cold start can exceed Detox's default launch budget on CI.
        launchTimeout: 300000,
      },
    },
    devices: {
      [deviceKey]: deviceConfig,
    },
    configurations: {
      [detoxConfiguration]: {
        device: deviceKey,
        app: 'android.release',
      },
    },
  };
}

module.exports = { createAndroidAppEmulatorReleaseDetoxConfig };
