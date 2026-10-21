'use strict';

/**
 * Detox artifacts for failed E2E tests (video, screenshots, logs, UI hierarchy).
 * Written under `<app>/e2e-artifacts/` — upload that folder in CI on failure.
 *
 * @param {string} [rootDir='e2e-artifacts']
 * @returns {import('detox').DetoxArtifactsConfig}
 */
function getDetoxArtifactsConfig(rootDir = 'e2e-artifacts') {
  return {
    rootDir,
    plugins: {
      log: 'failing',
      screenshot: {
        shouldTakeAutomaticSnapshots: true,
        keepOnlyFailedTestsArtifacts: true,
        takeWhen: {
          testStart: false,
          testFailure: true,
          testDone: true,
        },
      },
      video: {
        enabled: true,
        keepOnlyFailedTestsArtifacts: true,
        simulator: {
          // h264 is more reliable on GitHub Actions macOS runners than hevc.
          codec: 'h264',
        },
      },
      uiHierarchy: 'enabled',
    },
  };
}

module.exports = { getDetoxArtifactsConfig };
