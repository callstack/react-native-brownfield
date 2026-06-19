'use strict';

const { getIosSimulatorDeviceType } = require('./detox-ios-simulator-device.cjs');
const { getDetoxArtifactsConfig } = require('./detox-artifacts-config.cjs');

/**
 * Shared Detox iOS Simulator debug config for brownfield example apps.
 *
 * Debug simulator builds normally skip JS bundling and load from Metro. E2E runs without
 * a packager, so embed main.jsbundle (tests pass -BrownfieldPreferEmbeddedBundleInDebug).
 *
 * @param {{ workspace: string, scheme: string, appBinaryName: string }} options
 * @returns {import('detox').DetoxConfig}
 */
function createIosSimDebugDetoxConfig({ workspace, scheme, appBinaryName }) {
  const detoxIosDebugBuild =
    `FORCE_BUNDLING=1 xcodebuild -workspace ios/${workspace}.xcworkspace` +
    ` -scheme ${scheme} -configuration Debug -sdk iphonesimulator` +
    ` -derivedDataPath ios/build ARCHS=arm64 ONLY_ACTIVE_ARCH=YES`;

  return {
    artifacts: getDetoxArtifactsConfig(),
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
        binaryPath: `ios/build/Build/Products/Debug-iphonesimulator/${appBinaryName}.app`,
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

module.exports = { createIosSimDebugDetoxConfig };
