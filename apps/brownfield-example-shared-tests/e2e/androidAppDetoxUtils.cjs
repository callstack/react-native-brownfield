const { device, element, by } = require('detox');
const { brownfieldE2ETestIds: ids } = require('@callstack/brownfield-example-shared-tests/e2e/e2eTestIds');
const {
  assertDetoxTextMatches,
  dismissAndroidSystemOverlays,
  finishAndroidDetoxLaunch,
  pollUntilUiAutomatorContains,
  pollUntilUiAutomatorContainsAny,
  tapUiAutomatorTarget,
  waitForVisible,
  waitForNativeOverlayVisible,
} = require('@callstack/brownfield-example-shared-tests/e2e/detoxUtils');

/** Matches Expo 56 / 57 native shell greeting (`Hello native Android (Expo N)`). */
const EXPO_ANDROID_GREETING_NEEDLES = [
  'Hello native Android (Expo 58)',
  'Hello native Android (Expo 57)',
  'Hello native Android (Expo',
];

/**
 * Real Expo home content only — never tab chrome (`Home` / expoHomeTab), which can
 * render before the Expo home screen has mounted.
 */
const EXPO_ANDROID_RN_CONTENT_NEEDLES = [
  ids.rnAppHome,
  ids.rnAppHomeTitle,
  'Welcome to Expo',
  'Fetch Update',
  'GET STARTED',
  'get started',
  'Try editing',
];

const EXPO_ANDROID_POLL = { keepCurrentActivity: true };

const OPEN_REACT_NATIVE_BUTTON = { needle: 'Open React Native' };

/**
 * Push ReactNativeActivity from the native shell and wait for RN content.
 * Sync stays off while RN mounts — Detox otherwise stalls on "The app seems to be idle".
 * Idempotent: skips the tap when the RN screen is already in front (Expo suite
 * shares one launch across tests).
 */
async function openReactNativeAndroid(readyNeedles, timeoutMs = 120000) {
  await device.disableSynchronization();
  try {
    try {
      await pollUntilUiAutomatorContainsAny(readyNeedles, 1000, EXPO_ANDROID_POLL);
      return;
    } catch {
      // RN screen not open yet.
    }

    await tapUiAutomatorTarget(OPEN_REACT_NATIVE_BUTTON, 30000, { keepCurrentActivity: true });
    await pollUntilUiAutomatorContainsAny(readyNeedles, timeoutMs, EXPO_ANDROID_POLL);
    await dismissAndroidSystemOverlays();
  } finally {
    await device.enableSynchronization();
  }
}

/** Wait for the native shell via adb UIAutomator (no Espresso window-focus gate). */
async function waitForAndroidAppReadyVanilla() {
  await pollUntilUiAutomatorContains('Hello native Android', 60000, {
    keepCurrentActivity: true,
  });
  await finishAndroidDetoxLaunch();
}

async function openReactNativeVanilla() {
  await openReactNativeAndroid([ids.rnAppHome]);
}

/**
 * Tap an RN button that pushes a native activity, then wait for that screen via UIAutomator.
 * Sync stays off: the press queues ripple view commands that never mount once the RN host
 * activity pauses, so Detox would wait forever for the Fabric UI manager to become idle.
 */
async function tapAndWaitForNativeScreen(testID, needle, timeoutMs = 10000) {
  await device.disableSynchronization();
  try {
    await element(by.id(testID)).atIndex(0).tap();
    await waitForNativeOverlayVisible(needle, timeoutMs, 0, { keepCurrentActivity: true });
  } finally {
    await device.enableSynchronization();
  }
}

async function waitForAndroidAppReadyExpo() {
  console.log('[e2e] Waiting for native Expo Android greeting...');
  await pollUntilUiAutomatorContainsAny(
    EXPO_ANDROID_GREETING_NEEDLES,
    90000,
    EXPO_ANDROID_POLL
  );
  await finishAndroidDetoxLaunch();
}

/** Real Expo home content is the gate — tab chrome can render before it. */
async function openReactNativeExpo() {
  console.log('[e2e] Opening the Expo RN screen...');
  await openReactNativeAndroid(EXPO_ANDROID_RN_CONTENT_NEEDLES);
  console.log('[e2e] Expo RN surface ready');
}

async function openPostMessageTabExpo() {
  await openReactNativeExpo();

  // Bottom NativeTabs often fail Espresso's 75% visibility gate while still
  // present in UIAutomator. Prefer adb taps with sync off. Bias toward the
  // icon — geometric center hits the label/gesture zone and does not activate
  // Material bottom nav items.
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
        // Tap landed but did not switch tabs; retry.
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
  waitForAndroidAppReadyVanilla,
  waitForAndroidAppReadyExpo,
  openReactNativeVanilla,
  tapAndWaitForNativeScreen,
  openReactNativeExpo,
  openPostMessageTabExpo,
  tapSendMessageToNativeExpo,
  sendPostMessageToNativeAndWaitForToast,
  EXPO_ANDROID_GREETING_NEEDLES,
  EXPO_ANDROID_RN_CONTENT_NEEDLES,
  // Back-compat alias used by older callers / logs.
  EXPO58_RN_SURFACE_NEEDLES: EXPO_ANDROID_RN_CONTENT_NEEDLES,
};
