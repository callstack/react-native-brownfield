const path = require('node:path');

const appRoot = path.join(__dirname, '..');
const sharedTestsRoot = path.join(
  __dirname,
  '../../brownfield-example-shared-tests'
);

module.exports = {
  maxWorkers: 1,
  rootDir: appRoot,
  roots: [appRoot, sharedTestsRoot],
  // Shared E2E files live under brownfield-example-shared-tests; resolve host-app deps (detox) from here.
  modulePaths: [path.join(appRoot, 'node_modules')],
  testTimeout: 120000,
  verbose: true,
  reporters: ['detox/runners/jest/reporter'],
  globalSetup: 'detox/runners/jest/globalSetup',
  globalTeardown: 'detox/runners/jest/globalTeardown',
  testEnvironment: 'detox/runners/jest/testEnvironment',
  testMatch: [path.join(sharedTestsRoot, 'e2e/rnAppBrownfield.e2e.js')],
};
