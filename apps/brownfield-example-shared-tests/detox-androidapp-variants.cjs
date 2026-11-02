'use strict';

const path = require('node:path');

/** @typedef {import('detox').DetoxConfig} DetoxConfig */

/**
 * AndroidApp Detox / E2E settings per packaged RN host (RNApp, RockApp, ExpoApp58, ExpoApp57).
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
  },
  rock: {
    rnAppDir: 'RockApp',
    rnMavenPath: 'com/callstack/rnbrownfield/demo/rockapp/brownfieldlib',
    gradleFlavor: 'rock',
    detoxConfiguration: 'android.emu.release.rock',
    detoxRcFile: '.detoxrc.rock.cjs',
    e2eBuildScript: 'e2e:build:android:rock',
    e2eTestScript: 'e2e:test:android:rock',
    e2eTestFile: 'androidAppBrownfield.e2e.js',
    nativeGreetingPattern: /Hello native Android/,
  },
  expo58: {
    rnAppDir: 'ExpoApp58',
    rnMavenPath: 'com/callstack/rnbrownfield/demo/expoapp58/brownfieldlib',
    gradleFlavor: 'expo58',
    detoxConfiguration: 'android.emu.release.expo58',
    detoxRcFile: '.detoxrc.expo58.cjs',
    e2eBuildScript: 'e2e:build:android:expo58',
    e2eTestScript: 'e2e:test:android:expo58',
    e2eTestFile: 'androidAppExpoBrownfield.e2e.js',
    nativeGreetingPattern: /Hello native Android \(Expo 58\)/,
  },
  expo57: {
    rnAppDir: 'ExpoApp57',
    rnMavenPath: 'com/callstack/rnbrownfield/demo/expoapp57/brownfieldlib',
    gradleFlavor: 'expo57',
    detoxConfiguration: 'android.emu.release.expo57',
    detoxRcFile: '.detoxrc.expo57.cjs',
    e2eBuildScript: 'e2e:build:android:expo57',
    e2eTestScript: 'e2e:test:android:expo57',
    e2eTestFile: 'androidAppExpoBrownfield.e2e.js',
    nativeGreetingPattern: /Hello native Android \(Expo 57\)/,
  },
};

/**
 * @param {string} variant AndroidApp road-test variant (`vanilla`, `rock`, `expo58`, `expo57`).
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
