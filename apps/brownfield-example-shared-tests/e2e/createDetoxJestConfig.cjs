'use strict';

const path = require('node:path');
const { DETOX_TIMING } = require('./detoxTiming.cjs');

/**
 * Shared Detox Jest config for brownfield example apps (RNApp, ExpoApp54, ExpoApp55, AppleApp).
 *
 * @param {{ e2eDir: string, testMatch: string[] }} options
 */
function createDetoxJestConfig({ e2eDir, testMatch }) {
  const appRoot = path.join(e2eDir, '..');
  const sharedTestsRoot = path.join(
    e2eDir,
    '../../brownfield-example-shared-tests'
  );

  return {
    maxWorkers: 1,
    rootDir: appRoot,
    roots: [appRoot, sharedTestsRoot],
    // Shared E2E files live under brownfield-example-shared-tests; resolve host-app deps (detox) from here.
    modulePaths: [path.join(appRoot, 'node_modules')],
    testTimeout: DETOX_TIMING.TEST_TIMEOUT_MS,
    verbose: true,
    reporters: ['detox/runners/jest/reporter'],
    globalSetup: 'detox/runners/jest/globalSetup',
    globalTeardown: 'detox/runners/jest/globalTeardown',
    testEnvironment: 'detox/runners/jest/testEnvironment',
    testMatch,
  };
}

module.exports = { createDetoxJestConfig };
