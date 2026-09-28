const assert = require('node:assert/strict');
const test = require('node:test');

const {
  getDetoxArtifactsConfig,
} = require('./detox-artifacts-config.cjs');
const {
  createAndroidAppEmulatorReleaseDetoxConfig,
} = require('./detox-rc-androidapp-emulator-release.cjs');

test('writes artifacts where CI uploads from, matching the iOS convention', () => {
  const config = createAndroidAppEmulatorReleaseDetoxConfig({
    gradleFlavor: 'expo56',
  });

  assert.equal(config.artifacts.rootDir, 'e2e-artifacts');
  assert.equal(config.artifacts.rootDir, getDetoxArtifactsConfig().rootDir);
});

test('captures logcat only for failed tests', () => {
  const config = createAndroidAppEmulatorReleaseDetoxConfig({
    gradleFlavor: 'expo56',
  });

  // Detox shorthand: record the log plugin, keep it only for failing tests.
  assert.equal(config.artifacts.plugins.log, 'failing');
});

test('captures a screenshot when a test finishes failing', () => {
  const config = createAndroidAppEmulatorReleaseDetoxConfig({
    gradleFlavor: 'expo56',
  });

  assert.equal(
    config.artifacts.plugins.screenshot.keepOnlyFailedTestsArtifacts,
    true
  );
  assert.equal(config.artifacts.plugins.screenshot.takeWhen.testDone, true);
});

test('keeps video off on Android', () => {
  const config = createAndroidAppEmulatorReleaseDetoxConfig({
    gradleFlavor: 'expo56',
  });

  // The shared helper enables video for iOS simulators (simctl, host-side).
  // On Android it would be `adb shell screenrecord` writing into the emulator
  // userdata partition — the partition the road-test action already documents
  // as ENOSPC-prone ("Do not set disk-size ... low on disk after Gradle/NDK
  // builds"). Keep it off here; iOS is unaffected.
  assert.equal(config.artifacts.plugins.video.enabled, false);
  assert.equal(getDetoxArtifactsConfig().plugins.video.enabled, true);
});

test('inherits the remaining shared artifact plugins', () => {
  const config = createAndroidAppEmulatorReleaseDetoxConfig({
    gradleFlavor: 'expo56',
  });

  assert.equal(
    config.artifacts.plugins.uiHierarchy,
    getDetoxArtifactsConfig().plugins.uiHierarchy
  );
});

test('keeps the existing app and device wiring intact', () => {
  const config = createAndroidAppEmulatorReleaseDetoxConfig({
    gradleFlavor: 'expo56',
    detoxConfiguration: 'android.emu.release.expo56',
    jestConfigPath: 'e2e/jest.config.expo56.cjs',
  });

  assert.equal(
    config.apps['android.release'].binaryPath,
    'app/build/outputs/apk/expo56/release/app-expo56-release.apk'
  );
  assert.equal(config.apps['android.release'].launchTimeout, 300000);
  assert.equal(config.behavior.cleanup.shutdownDevice, false);
  assert.ok(config.configurations['android.emu.release.expo56']);
});
