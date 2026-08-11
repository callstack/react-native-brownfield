const { element, by } = require('detox');
const { brownfieldE2ETestIds: ids } = require('@callstack/brownfield-example-shared-tests/e2e/e2eTestIds');
const {
  dismissAndroidSystemOverlays,
  finishAndroidDetoxLaunch,
  pollUntilUiAutomatorContains,
  scrollAndroidNativeShellDown,
  scrollAndroidNativeShellUp,
} = require('@callstack/brownfield-example-shared-tests/e2e/detoxUtils');

const VANILLA_NATIVE_GREETING = by.text(/Hello native Android/);

/** Middle-of-screen anchor — avoids status-bar swipes that open the notification shade. */
const NATIVE_SHELL_SCROLL_ANCHOR = VANILLA_NATIVE_GREETING;

async function scrollNativeShell(fingerDirection) {
  const anchor = element(NATIVE_SHELL_SCROLL_ANCHOR);
  try {
    await anchor.swipe(fingerDirection, 'slow', 0.75);
  } catch {
    if (fingerDirection === 'up') {
      await scrollAndroidNativeShellUp();
    } else {
      await scrollAndroidNativeShellDown();
    }
  }
  await dismissAndroidSystemOverlays();
}

async function scrollToEmbeddedRnVanilla() {
  try {
    await scrollNativeShell('up');
  } catch {
    await scrollAndroidNativeShellUp();
  }
}

async function scrollToNativeShellVanilla() {
  await scrollNativeShell('down');
}

/**
 * Wait for embedded RN home via adb UIAutomator (no Espresso window-focus gate).
 * Mirrors iOS vanilla readiness — native greeting is optional; rnAppHome is the gate.
 */
async function waitForAndroidAppReadyVanilla() {
  const pollOptions = { keepCurrentActivity: true };
  await pollUntilUiAutomatorContains('Hello native Android', 60000, pollOptions);

  try {
    await scrollToEmbeddedRnVanilla();
  } catch {
    await scrollAndroidNativeShellUp();
  }

  try {
    await pollUntilUiAutomatorContains(ids.rnAppHome, 120000, pollOptions);
    await finishAndroidDetoxLaunch();
    return;
  } catch {
    // Fall through to a second scroll attempt.
  }

  try {
    await scrollToEmbeddedRnVanilla();
  } catch {
    await scrollAndroidNativeShellUp();
  }

  await pollUntilUiAutomatorContains(ids.rnAppHome, 60000, pollOptions);
  await finishAndroidDetoxLaunch();
}

module.exports = {
  scrollToEmbeddedRnVanilla,
  scrollToNativeShellVanilla,
  waitForAndroidAppReadyVanilla,
};
