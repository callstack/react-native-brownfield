const assert = require('node:assert/strict');
const { device, element, waitFor, expect: detoxExpect } = require('detox');
const { DETOX_TIMING } = require('./detoxTiming.cjs');

const detoxLaunchArgs = {
  BrownfieldPreferEmbeddedBundleInDebug: 'YES',
  DetoxE2E: 'YES',
};

function detoxAttrsText(attrs) {
  if (!attrs || typeof attrs !== 'object') {
    return '';
  }
  const fragment = (o) =>
    [o.text, o.value, o.label, o.hint]
      .filter((x) => x != null && String(x).length > 0)
      .join('');
  if ('elements' in attrs && Array.isArray(attrs.elements)) {
    return attrs.elements.map(fragment).join('').trim();
  }
  return fragment(attrs).trim();
}

async function assertDetoxTextMatches(nativeElement, pattern) {
  const attrs = await nativeElement.getAttributes();
  assert.match(detoxAttrsText(attrs).trim(), pattern);
}

/** Ignore Metro / packager polling so Detox does not wait forever in Debug without a dev server. */
async function configureDetoxForBrownfieldIos() {
  await device.setURLBlacklist([
    'http://localhost:8081.*',
    'http://127.0.0.1:8081.*',
    'http://.*:8081.*',
  ]);
}

/**
 * Launch without waiting for RN Debug idle, then re-enable Detox synchronization for tests.
 *
 * Sync is disabled only via launchArgs — disableSynchronization() before launchApp()
 * fails because Detox is not connected to the app yet.
 */
async function launchBrownfieldAppForDetox({
  newInstance = true,
  enableSync = true,
} = {}) {
  await device.launchApp({
    newInstance,
    launchArgs: {
      ...detoxLaunchArgs,
      detoxEnableSynchronization: 0,
    },
  });
  await configureDetoxForBrownfieldIos();

  if (enableSync) {
    await device.enableSynchronization();
  }
}

async function waitForVisible(matcher, timeoutMs = 20000, index = 0) {
  await waitFor(element(matcher).atIndex(index))
    .toBeVisible()
    .withTimeout(timeoutMs);
}

/**
 * Poll native-only / short-lived UI (toasts, popups, pushed native screens) with sync
 * temporarily off. RN Debug can keep sync busy while a native overlay is already visible.
 */
async function waitForNativeOverlayVisible(
  matcher,
  timeoutMs = 20000,
  index = 0
) {
  await device.disableSynchronization();
  try {
    const deadline = Date.now() + timeoutMs;
    const target = () => element(matcher).atIndex(index);
    while (Date.now() < deadline) {
      try {
        await detoxExpect(target()).toBeVisible();
        return;
      } catch {
        await new Promise((resolve) =>
          setTimeout(resolve, DETOX_TIMING.POLL_INTERVAL_MS)
        );
      }
    }
    await detoxExpect(target()).toBeVisible();
  } finally {
    await device.enableSynchronization();
  }
}

module.exports = {
  detoxLaunchArgs,
  detoxAttrsText,
  assertDetoxTextMatches,
  configureDetoxForBrownfieldIos,
  launchBrownfieldAppForDetox,
  waitForVisible,
  waitForNativeOverlayVisible,
};
