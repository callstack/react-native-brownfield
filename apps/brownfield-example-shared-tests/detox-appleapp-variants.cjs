'use strict';

const path = require('node:path');

/** @typedef {import('detox').DetoxConfig} DetoxConfig */

/**
 * AppleApp Detox / E2E settings per packaged RN host.
 *
 * @type {Record<string, {
 *   xcframeworkApp: string,
 *   scheme: string,
 *   configuration: string,
 *   appBinaryName: string,
 *   detoxConfiguration: string,
 *   detoxRcFile: string,
 *   e2eBuildScript: string,
 *   e2eTestScript: string,
 *   e2eTestFile: string,
 *   nativeGreetingPattern: RegExp,
 * }>}
 */
const appleAppDetoxVariants = {
  vanilla: {
    xcframeworkApp: 'RNApp',
    scheme: 'Brownfield Apple App Vanilla',
    configuration: 'Debug Vanilla',
    appBinaryName: 'Brownfield Apple App (RNApp)',
    detoxConfiguration: 'ios.sim.debug',
    detoxRcFile: '.detoxrc.cjs',
    e2eBuildScript: 'e2e:build:ios',
    e2eTestScript: 'e2e:test:ios',
    e2eTestFile: 'appleAppBrownfield.e2e.js',
    nativeGreetingPattern: /Hello native iOS Vanilla/,
  },
  expo55: {
    xcframeworkApp: 'ExpoApp55',
    scheme: 'Brownfield Apple App Expo 55',
    configuration: 'Debug Expo',
    appBinaryName: 'Brownfield Apple App (ExpoApp55)',
    detoxConfiguration: 'ios.sim.debug.expo55',
    detoxRcFile: '.detoxrc.expo55.cjs',
    e2eBuildScript: 'e2e:build:ios:expo55',
    e2eTestScript: 'e2e:test:ios:expo55',
    e2eTestFile: 'appleAppExpoBrownfield.e2e.js',
    nativeGreetingPattern: /Hello native iOS Expo/,
  },
  expo56: {
    xcframeworkApp: 'ExpoApp56',
    scheme: 'Brownfield Apple App Expo 56',
    configuration: 'Debug Expo',
    appBinaryName: 'Brownfield Apple App (ExpoApp56)',
    detoxConfiguration: 'ios.sim.debug.expo56',
    detoxRcFile: '.detoxrc.expo56.cjs',
    e2eBuildScript: 'e2e:build:ios:expo56',
    e2eTestScript: 'e2e:test:ios:expo56',
    e2eTestFile: 'appleAppExpoBrownfield.e2e.js',
    nativeGreetingPattern: /Hello native iOS Expo/,
  },
};

/**
 * @param {string} variant AppleApp road-test variant (`vanilla`, `expo55`, `expo56`).
 */
function getAppleAppDetoxVariant(variant) {
  const config = appleAppDetoxVariants[variant];
  if (!config) {
    throw new Error(
      `Unknown AppleApp Detox variant: ${variant}. Expected one of: ${Object.keys(appleAppDetoxVariants).join(', ')}`
    );
  }
  return config;
}

/**
 * @param {string} appleAppRoot Absolute or relative path to apps/AppleApp.
 * @param {ReturnType<typeof getAppleAppDetoxVariant>} variant
 */
function getAppleAppDetoxProductsDir(appleAppRoot, variant) {
  return path.join(
    appleAppRoot,
    'build',
    'Build',
    'Products',
    `${variant.configuration}-iphonesimulator`
  );
}

module.exports = {
  appleAppDetoxVariants,
  getAppleAppDetoxVariant,
  getAppleAppDetoxProductsDir,
};
