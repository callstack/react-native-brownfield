const { device, element, by, waitFor, expect: detoxExpect } = require('detox');
const { brownfieldE2ETestIds: ids } = require('@callstack/brownfield-example-shared-tests/e2e/e2eTestIds');
const { DETOX_TIMING } = require('./detoxTiming.cjs');
const {
  assertDetoxTextMatches,
  dismissAndroidSystemOverlays,
  waitForVisible,
  waitForNativeOverlayVisible,
} = require('@callstack/brownfield-example-shared-tests/e2e/detoxUtils');

const VANILLA_NATIVE_GREETING = by.text(/Hello native Android/);

/** Middle-of-screen anchor — avoids status-bar swipes that open the notification shade. */
const NATIVE_SHELL_SCROLL_ANCHOR = VANILLA_NATIVE_GREETING;

async function scrollNativeShell(fingerDirection) {
  await device.disableSynchronization();
  try {
    const anchor = element(NATIVE_SHELL_SCROLL_ANCHOR);
    try {
      await detoxExpect(anchor).toBeVisible();
      await anchor.swipe(fingerDirection, 'slow', 0.75);
    } catch {
      await element(by.type('android.widget.ScrollView')).atIndex(0).scroll(
        400,
        fingerDirection === 'up' ? 'down' : 'up'
      );
    }
  } finally {
    await device.enableSynchronization();
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
  await device.disableSynchronization();
  try {
    const deadline = Date.now() + timeoutMs;
    const rnHome = element(by.id(ids.rnAppHome));
    while (Date.now() < deadline) {
      try {
        await detoxExpect(rnHome).toBeVisible();
        return;
      } catch {
        await dismissAndroidSystemOverlays();
        await new Promise((resolve) =>
          setTimeout(resolve, DETOX_TIMING.POLL_INTERVAL_MS)
        );
      }
    }
    await detoxExpect(rnHome).toBeVisible();
  } finally {
    await device.enableSynchronization();
  }
}

/**
 * Mirror iOS vanilla readiness: scroll to the embedded RN surface and poll for
 * rnAppHome with sync off. Native greeting ids are avoided here because the old
 * 1dp EspressoTagAnchor + duplicate Compose testTag pair failed Detox visibility.
 */
async function waitForAndroidAppReadyVanilla() {
  await dismissAndroidSystemOverlays();
  await waitForNativeOverlayVisible(VANILLA_NATIVE_GREETING, 60000);
  await dismissAndroidSystemOverlays();

  try {
    await scrollToEmbeddedRnVanilla();
  } catch {
    // RN may already be on screen or the native shell is still mounting.
  }

  try {
    await waitForEmbeddedRnHome(120000);
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
}

async function waitForAndroidAppReadyExpo() {
  const homeTab = by.label('Home');
  try {
    await waitForVisible(homeTab, 120000, 0);
  } catch {
    await device.disableSynchronization();
    try {
      await scrollToEmbeddedRnExpo();
      await waitFor(element(homeTab).atIndex(0)).toBeVisible().withTimeout(30000);
    } finally {
      await device.enableSynchronization();
    }
  }
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
