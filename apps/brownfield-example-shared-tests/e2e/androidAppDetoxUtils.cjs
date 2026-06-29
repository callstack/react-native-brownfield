const { element, by } = require('detox');
const { brownfieldE2ETestIds: ids } = require('@callstack/brownfield-example-shared-tests/e2e/e2eTestIds');
const { DETOX_TIMING } = require('./detoxTiming.cjs');
const {
  assertDetoxTextMatches,
  dismissAndroidSystemOverlays,
  finishAndroidDetoxLaunch,
  pollUntilUiAutomatorContains,
  scrollAndroidNativeShellDown,
  scrollAndroidNativeShellUp,
  tapUiAutomatorTarget,
  pollUntilUiAutomatorResourceId,
  waitForVisible,
  waitForNativeOverlayVisible,
} = require('@callstack/brownfield-example-shared-tests/e2e/detoxUtils');

const VANILLA_NATIVE_GREETING = by.text(/Hello native Android/);
const EXPO55_GREETING_NEEDLE = 'Android (Expo 55)';
/** Home tab hero title — reliably present in UIAutomator once the RN surface is scrolled in. */
const EXPO55_RN_SURFACE_NEEDLE = 'Welcome to Expo 55';

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

async function scrollToEmbeddedRnExpo() {
  try {
    const homeTab = element(by.label('Home')).atIndex(0);
    await homeTab.swipe('up', 'slow', 0.75);
    await homeTab.swipe('up', 'slow', 0.5);
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
    await element(by.id(ids.appleAppGreeting)).swipe('down', 'slow', 0.75);
  } catch {
    try {
      await element(by.label('Home')).atIndex(0).swipe('down', 'fast', 0.85);
    } catch {
      await scrollToNativeShellVanilla();
    }
  }
  await dismissAndroidSystemOverlays();
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

async function waitForAndroidAppReadyExpo() {
  const pollOptions = { keepCurrentActivity: true };
  console.log('[e2e] Waiting for Expo RN surface (Home tab or welcome title)...');

  try {
    await scrollToEmbeddedRnExpo();
  } catch {
    // RN surface may already be partially visible.
  }

  try {
    await pollUntilUiAutomatorContains('Home', 90000, pollOptions);
  } catch {
    try {
      await pollUntilUiAutomatorContains(EXPO55_RN_SURFACE_NEEDLE, 90000, pollOptions);
    } catch {
      await scrollToEmbeddedRnExpo();
      await pollUntilUiAutomatorContains(EXPO55_RN_SURFACE_NEEDLE, 60000, pollOptions);
    }
  }

  console.log('[e2e] Expo RN surface ready');
  await finishAndroidDetoxLaunch();
}

async function openPostMessageTabExpo() {
  await scrollToEmbeddedRnExpo();
  await dismissAndroidSystemOverlays();
  await tapUiAutomatorTarget({ needle: 'postMessage API' }, 30000, {
    keepCurrentActivity: true,
  });
  await pollUntilUiAutomatorResourceId(ids.sendMessageToNative, 30000, {
    keepCurrentActivity: true,
  });
}

async function sendPostMessageToNativeAndWaitForToast(rnMessagePattern) {
  await waitForVisible(by.id(ids.sendMessageToNative), 30000);
  const toastNeedle =
    rnMessagePattern instanceof RegExp ? rnMessagePattern.source : String(rnMessagePattern);
  // Compose toast tags are not always visible to UIAutomator; match the message text instead.
  const toastWatch = waitForNativeOverlayVisible(toastNeedle, 15000, 0, {
    keepCurrentActivity: true,
  });
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
  await toastWatch;
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
  EXPO55_GREETING_NEEDLE,
  EXPO55_RN_SURFACE_NEEDLE,
};
