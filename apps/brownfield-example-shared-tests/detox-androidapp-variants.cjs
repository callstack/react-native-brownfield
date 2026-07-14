'use strict';

const path = require('node:path');

/** @typedef {import('detox').DetoxConfig} DetoxConfig */

/**
 * AndroidApp Detox / E2E settings per packaged RN host (RNApp, ExpoApp55, ExpoApp56).
 *
 * Release builds load the JS bundle embedded in the brownfield AAR (no Metro).
 *
 * @type {Record<string, {
 *   rnAppDir: string,
 *   rnMavenPath: string,
 *   gradleFlavor: string,
 *   detoxConfiguration: string,
 *   detoxRcFile: string,
 *   e2eBuildScript: string,
 *   e2eTestScript: string,
 *   e2eTestFile: string,
 *   nativeGreetingPattern: RegExp,
 *   nativeGreetingNeedle: string,
 * }>}
 */
const androidAppDetoxVariants = {
  vanilla: {
    rnAppDir: 'RNApp',
    rnMavenPath: 'com/rnapp/brownfieldlib',
    gradleFlavor: 'vanilla',
    detoxConfiguration: 'android.emu.release',
    detoxRcFile: '.detoxrc.cjs',
    e2eBuildScript: 'e2e:build:android',
    e2eTestScript: 'e2e:test:android',
    e2eTestFile: 'androidAppBrownfield.e2e.js',
    nativeGreetingPattern: /Hello native Android/,
    nativeGreetingNeedle: 'Hello native Android',
  },
  expo55: {
    rnAppDir: 'ExpoApp55',
    rnMavenPath: 'com/callstack/rnbrownfield/demo/expoapp55/brownfieldlib',
    gradleFlavor: 'expo55',
    detoxConfiguration: 'android.emu.release.expo55',
    detoxRcFile: '.detoxrc.expo55.cjs',
    e2eBuildScript: 'e2e:build:android:expo55',
    e2eTestScript: 'e2e:test:android:expo55',
    e2eTestFile: 'androidAppExpoBrownfield.e2e.js',
    nativeGreetingPattern: /Hello native Android \(Expo 55\)/,
    nativeGreetingNeedle: 'Hello native Android (Expo 55)',
  },
  expo56: {
    rnAppDir: 'ExpoApp56',
    rnMavenPath: 'com/callstack/rnbrownfield/demo/expoapp56/brownfieldlib',
    gradleFlavor: 'expo56',
    detoxConfiguration: 'android.emu.release.expo56',
    detoxRcFile: '.detoxrc.expo56.cjs',
    e2eBuildScript: 'e2e:build:android:expo56',
    e2eTestScript: 'e2e:test:android:expo56',
    e2eTestFile: 'androidAppExpoBrownfield.e2e.js',
    nativeGreetingPattern: /Hello native Android \(Expo 56\)/,
    nativeGreetingNeedle: 'Hello native Android (Expo 56)',
  },
};

/**
 * @param {string} variant AndroidApp road-test variant (`vanilla`, `expo55`, `expo56`).
 */
function getAndroidAppDetoxVariant(variant) {
  const config = androidAppDetoxVariants[variant];
  if (!config) {
    throw new Error(
      `Unknown AndroidApp Detox variant: ${variant}. Expected one of: ${Object.keys(androidAppDetoxVariants).join(', ')}`
    );
  }
  return config;
}

/**
 * @param {string} androidAppRoot Absolute or relative path to apps/AndroidApp.
 * @param {ReturnType<typeof getAndroidAppDetoxVariant>} variant
 */
function getAndroidAppReleaseApkPath(androidAppRoot, variant) {
  const flavor = variant.gradleFlavor;
  return path.join(
    androidAppRoot,
    'app',
    'build',
    'outputs',
    'apk',
    flavor,
    'release',
    `app-${flavor}-release.apk`
  );
}

/**
 * @param {string} androidAppRoot
 * @param {ReturnType<typeof getAndroidAppDetoxVariant>} variant
 */
function getAndroidAppReleaseAndroidTestApkPath(androidAppRoot, variant) {
  const flavor = variant.gradleFlavor;
  return path.join(
    androidAppRoot,
    'app',
    'build',
    'outputs',
    'apk',
    'androidTest',
    flavor,
    'release',
    `app-${flavor}-release-androidTest.apk`
  );
}

module.exports = {
  androidAppDetoxVariants,
  getAndroidAppDetoxVariant,
  getAndroidAppReleaseApkPath,
  getAndroidAppReleaseAndroidTestApkPath,
};
