const { device, element, by, waitFor } = require('detox');
const { brownfieldE2ETestIds: ids } = require('@callstack/brownfield-example-shared-tests/e2e/e2eTestIds');
const {
  assertDetoxTextMatches,
  dismissAndroidSystemOverlays,
  finishAndroidDetoxLaunch,
  pollUntilUiAutomatorContains,
  pollUntilUiAutomatorContainsAny,
  scrollAndroidNativeShellDown,
  scrollAndroidNativeShellUp,
  tapUiAutomatorTarget,
  waitForVisible,
  waitForNativeOverlayVisible,
} = require('@callstack/brownfield-example-shared-tests/e2e/detoxUtils');

const VANILLA_NATIVE_GREETING = by.text(/Hello native Android/);
const EXPO56_GREETING_NEEDLE = 'Hello native Android (Expo 56)';

/**
 * Real Expo home content only — never tab chrome (`Home` / expoHomeTab).
 * Tab labels stay on-screen while the RN fragment is clipped, which caused false
 * readiness and then UIAutomator timeouts after scrolling to the native greeting.
 */
const EXPO56_RN_CONTENT_NEEDLES = [
  ids.rnAppHome,
  ids.rnAppHomeTitle,
  'Welcome to Expo',
  'Fetch Update',
  'GET STARTED',
  'get started',
  'Try editing',
];

const EXPO_ANDROID_POLL = { keepCurrentActivity: true };

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
 * Bring the embedded Expo surface on-screen. Uses adb swipes (works while the
 * fragment is clipped) and Detox by.id once synchronization is enabled.
 */
async function scrollToEmbeddedRnExpo() {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    try {
      await waitFor(element(by.id(ids.rnAppHome)))
        .toBeVisible()
        .withTimeout(2500);
      await dismissAndroidSystemOverlays();
      return;
    } catch {
      await scrollAndroidNativeShellUp();
      await dismissAndroidSystemOverlays();
    }
  }

  await waitFor(element(by.id(ids.rnAppHome)))
    .toBeVisible()
    .withTimeout(30000);
  await dismissAndroidSystemOverlays();
}

async function scrollToNativeShellExpo() {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    try {
      await waitFor(element(by.id(ids.appleAppGreeting)))
        .toBeVisible()
        .withTimeout(2500);
      await dismissAndroidSystemOverlays();
      return;
    } catch {
      await scrollAndroidNativeShellDown();
      await dismissAndroidSystemOverlays();
    }
  }

  await waitFor(element(by.id(ids.appleAppGreeting)))
    .toBeVisible()
    .withTimeout(15000);
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

/**
 * Sync stays off until Expo home *content* is in the UIAutomator tree.
 * Do not treat tab chrome as readiness — it remains visible while RN is clipped.
 */
async function waitForAndroidAppReadyExpo() {
  console.log('[e2e] Waiting for native Expo Android greeting...');
  await pollUntilUiAutomatorContains(EXPO56_GREETING_NEEDLE, 90000, EXPO_ANDROID_POLL);

  console.log('[e2e] Scrolling until Expo home content is visible...');
  for (let attempt = 0; attempt < 10; attempt += 1) {
    try {
      await pollUntilUiAutomatorContainsAny(EXPO56_RN_CONTENT_NEEDLES, 4000, EXPO_ANDROID_POLL);
      console.log('[e2e] Expo RN surface ready');
      await finishAndroidDetoxLaunch();
      return;
    } catch {
      await scrollAndroidNativeShellUp();
      await dismissAndroidSystemOverlays();
    }
  }

  await pollUntilUiAutomatorContainsAny(EXPO56_RN_CONTENT_NEEDLES, 60000, EXPO_ANDROID_POLL);
  console.log('[e2e] Expo RN surface ready');
  await finishAndroidDetoxLaunch();
}

async function openPostMessageTabExpo() {
  await scrollToEmbeddedRnExpo();
  await dismissAndroidSystemOverlays();

  // Bottom NativeTabs often fail Espresso's 75% visibility gate while still
  // present in UIAutomator. Prefer adb taps with sync off (same pattern as iOS
  // clipped-tab fallback). Bias toward the icon — geometric center hits the
  // label/gesture zone and does not activate Material bottom nav items.
  const tabTap = { needle: 'postMessage API', yRatio: 0.3 };

  await device.disableSynchronization();
  try {
    for (let attempt = 0; attempt < 10; attempt += 1) {
      try {
        await element(by.id(ids.expoPostMessageTab)).tap();
      } catch {
        try {
          await tapUiAutomatorTarget(tabTap, 5000, { keepCurrentActivity: true });
        } catch {
          await scrollAndroidNativeShellUp();
          await dismissAndroidSystemOverlays();
          continue;
        }
      }

      try {
        await pollUntilUiAutomatorContains('Send message to Native', 5000, {
          keepCurrentActivity: true,
        });
        return;
      } catch {
        // Tap landed but did not switch tabs (common when the item is clipped).
        await scrollAndroidNativeShellUp();
        await dismissAndroidSystemOverlays();
      }
    }

    await tapUiAutomatorTarget(tabTap, 30000, { keepCurrentActivity: true });
    await pollUntilUiAutomatorContains('Send message to Native', 30000, {
      keepCurrentActivity: true,
    });
  } finally {
    await device.enableSynchronization();
  }
}

async function tapSendMessageToNativeExpo() {
  try {
    await element(by.id(ids.sendMessageToNative)).tap();
  } catch {
    await device.disableSynchronization();
    try {
      await tapUiAutomatorTarget(
        { needle: 'Send message to Native' },
        30000,
        { keepCurrentActivity: true }
      );
    } finally {
      await device.enableSynchronization();
    }
  }
}

async function sendPostMessageToNativeAndWaitForToast(rnMessagePattern) {
  await waitForVisible(by.id(ids.sendMessageToNative), 30000);
  const toastNeedle =
    rnMessagePattern instanceof RegExp ? rnMessagePattern.source : String(rnMessagePattern);
  // Compose toast tags are not always visible to UIAutomator; match the message text instead.
  const toastWatch = waitForNativeOverlayVisible(toastNeedle, 15000, 0, {
    keepCurrentActivity: true,
  });
  await tapSendMessageToNativeExpo();
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
  tapSendMessageToNativeExpo,
  sendPostMessageToNativeAndWaitForToast,
  EXPO56_GREETING_NEEDLE,
  EXPO56_RN_CONTENT_NEEDLES,
  // Back-compat alias used by older callers / logs.
  EXPO56_RN_SURFACE_NEEDLES: EXPO56_RN_CONTENT_NEEDLES,
};
