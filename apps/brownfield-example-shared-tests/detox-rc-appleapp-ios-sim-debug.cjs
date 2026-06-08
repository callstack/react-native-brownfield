'use strict';

const { getIosSimulatorDeviceType } = require('./detox-ios-simulator-device.cjs');

/**
 * Detox iOS Simulator debug config for AppleApp (native Xcode project consumer).
 *
 * Unlike RN/Expo host apps, AppleApp links pre-packaged XCFrameworks and has no ios/
 * workspace. Build the matching RN app first (prepareXCFrameworks) before Detox build.
 *
 * @param {{ scheme: string, configuration: string, appBinaryName: string }} options
 * @returns {import('detox').DetoxConfig}
 */
function createAppleAppIosSimDebugDetoxConfig({ scheme, configuration, appBinaryName }) {
  const detoxIosDebugBuild =
    `xcodebuild -project "Brownfield Apple App.xcodeproj"` +
    ` -scheme "${scheme}" -configuration "${configuration}" -sdk iphonesimulator` +
    ` -derivedDataPath build ARCHS=arm64 ONLY_ACTIVE_ARCH=YES CODE_SIGNING_ALLOWED=NO`;

  return {
    testRunner: {
      $0: 'jest',
      args: {
        config: 'e2e/jest.config.cjs',
        _: ['e2e'],
      },
      jest: {
        setupTimeout: 300000,
      },
    },
    apps: {
      'ios.debug': {
        type: 'ios.app',
        binaryPath: `build/Build/Products/${configuration}-iphonesimulator/${appBinaryName}.app`,
        build: detoxIosDebugBuild,
      },
    },
    devices: {
      'ios.sim': {
        type: 'ios.simulator',
        device: {
          type: getIosSimulatorDeviceType(),
        },
      },
    },
    configurations: {
      'ios.sim.debug': {
        device: 'ios.sim',
        app: 'ios.debug',
      },
    },
  };
}

module.exports = { createAppleAppIosSimDebugDetoxConfig };
