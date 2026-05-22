const {
  getIosSimulatorDeviceType,
} = require('../brownfield-example-shared-tests/detox-ios-simulator-device.cjs');

/**
 * Requires a native tree from `expo prebuild` / `expo run:ios` (ios/ + Pods).
 * @type {Detox.DetoxConfig}
 */
module.exports = {
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
      binaryPath:
        'ios/build/Build/Products/Debug-iphonesimulator/ExpoApp54.app',
      build:
        'xcodebuild -workspace ios/ExpoApp54.xcworkspace -scheme ExpoApp54 -configuration Debug -sdk iphonesimulator -derivedDataPath ios/build',
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
