const {
  getIosSimulatorDeviceType,
} = require('../brownfield-example-shared-tests/detox-ios-simulator-device.cjs');

// Debug simulator builds normally skip JS bundling and load from Metro. E2E runs without
// a packager, so embed main.jsbundle (tests pass -BrownfieldPreferEmbeddedBundleInDebug).
const detoxIosDebugBuild =
  'FORCE_BUNDLING=1 xcodebuild -workspace ios/RNApp.xcworkspace -scheme RNApp -configuration Debug -sdk iphonesimulator -derivedDataPath ios/build ARCHS=arm64 ONLY_ACTIVE_ARCH=YES';

/** @type {Detox.DetoxConfig} */
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
      binaryPath: 'ios/build/Build/Products/Debug-iphonesimulator/RNApp.app',
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
