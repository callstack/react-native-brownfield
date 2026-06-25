const { element, by } = require('detox');
const { brownfieldE2ETestIds: ids } = require('@callstack/brownfield-example-shared-tests/e2e/e2eTestIds');
const { DETOX_TIMING } = require('./detoxTiming.cjs');
const {
  assertDetoxTextMatches,
  dismissAndroidSystemOverlays,
  ensureAndroidAppWindowFocus,
  finishAndroidDetoxLaunch,
  pollUntilElementAttributes,
  waitForVisible,
  waitForNativeOverlayVisible,
} = require('@callstack/brownfield-example-shared-tests/e2e/detoxUtils');

const VANILLA_NATIVE_GREETING = by.text(/Hello native Android/);

/** Middle-of-screen anchor — avoids status-bar swipes that open the notification shade. */
const NATIVE_SHELL_SCROLL_ANCHOR = VANILLA_NATIVE_GREETING;

async function scrollNativeShell(fingerDirection) {
  const anchor = element(NATIVE_SHELL_SCROLL_ANCHOR);
  try {
    await anchor.swipe(fingerDirection, 'slow', 0.75);
  } catch {
    await element(by.type('android.widget.ScrollView')).atIndex(0).scroll(
      400,
      fingerDirection === 'up' ? 'down' : 'up'
    );
  }
  await dismissAndroidSystemOverlays();
}

async function scrollToEmbeddedRnVanilla() {
  await scrollNativeShell('up');
}

async function scrollToEmbeddedRnExpo() {
  try {
    await element(by.label('Home')).atIndex(0).swipe('up', 'fast', 0.85);
  } catch {
    await scrollToEmbeddedRnVanilla();
  }
  await dismissAndroidSystemOverlays();
}

async function scrollToNativeShellVanilla() {
  await scrollNativeShell('down');
}

async function scrollToNativeShellExpo() {
  try {
    await element(by.label('Home')).atIndex(0).swipe('down', 'fast', 0.85);
  } catch {
    await scrollToNativeShellVanilla();
  }
  await dismissAndroidSystemOverlays();
}

async function waitForEmbeddedRnHome(timeoutMs = DETOX_TIMING.VISIBILITY_TIMEOUT_MS) {
  await pollUntilElementAttributes(by.id(ids.rnAppHome), timeoutMs);
}

/**
 * Wait for the native shell and embedded RN home while Detox sync stays off.
 * Re-enable sync only after both surfaces are present and MainActivity has focus.
 */
async function waitForAndroidAppReadyVanilla() {
  await ensureAndroidAppWindowFocus();
  await pollUntilElementAttributes(VANILLA_NATIVE_GREETING, 60000);

  try {
    await scrollToEmbeddedRnVanilla();
  } catch {
    // RN may already be on screen or the native shell is still mounting.
  }

  try {
    await waitForEmbeddedRnHome(120000);
    await finishAndroidDetoxLaunch();
    return;
  } catch {
    // Fall through to a second scroll attempt.
  }

  try {
    await scrollToEmbeddedRnVanilla();
  } catch {
    // Continue polling visibility.
  }

  await waitForEmbeddedRnHome(60000);
  await finishAndroidDetoxLaunch();
}

async function waitForAndroidAppReadyExpo() {
  const homeTab = by.label('Home');
  try {
    await pollUntilElementAttributes(homeTab, 120000, 0);
  } catch {
    try {
      await scrollToEmbeddedRnExpo();
      await pollUntilElementAttributes(homeTab, 30000, 0);
    } catch {
      await scrollToEmbeddedRnExpo();
      await pollUntilElementAttributes(homeTab, 30000, 0);
    }
  }
  await finishAndroidDetoxLaunch();
}

async function openPostMessageTabExpo() {
  await waitForVisible(by.label('postMessage API'), 30000, 0);
  await element(by.label('postMessage API')).atIndex(0).tap();
  await waitForVisible(by.id(ids.sendMessageToNative), 30000);
}

async function sendPostMessageToNativeAndWaitForToast(rnMessagePattern) {
  await waitForVisible(by.id(ids.sendMessageToNative), 30000);
  await element(by.id(ids.sendMessageToNative)).tap();
  if (rnMessagePattern) {
    const bubble = element(by.id(ids.rnPostMessageText)).atIndex(0);
    const deadline = Date.now() + 15000;
    while (Date.now() < deadline) {
      try {
        await assertDetoxTextMatches(bubble, rnMessagePattern);
        break;
      } catch {
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    }
    await assertDetoxTextMatches(bubble, rnMessagePattern);
  }
  await waitForNativeOverlayVisible(by.id(ids.appleAppPostMessageToast), 10000);
}

module.exports = {
  scrollToEmbeddedRnVanilla,
  scrollToEmbeddedRnExpo,
  scrollToNativeShellVanilla,
  scrollToNativeShellExpo,
  waitForAndroidAppReadyVanilla,
  waitForAndroidAppReadyExpo,
  openPostMessageTabExpo,
  sendPostMessageToNativeAndWaitForToast,
};
