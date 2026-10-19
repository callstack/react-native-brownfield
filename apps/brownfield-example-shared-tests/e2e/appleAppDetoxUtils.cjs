const { device, element, by, expect: detoxExpect } = require('detox');
const {
  brownfieldE2ETestIds: ids,
} = require('@callstack/brownfield-example-shared-tests/e2e/e2eTestIds');
const { DETOX_TIMING } = require('./detoxTiming.cjs');
const {
  detoxLaunchArgs,
  waitForVisible,
  waitForNativeOverlayVisible,
} = require('@callstack/brownfield-example-shared-tests/e2e/detoxUtils');

const EXPO_HOME_TAB_MATCHERS = [by.id(ids.expoHomeTab), by.label('Home')];
const EXPO_POST_MESSAGE_TAB_MATCHERS = [
  by.id(ids.expoPostMessageTab),
  by.label('postMessage API'),
];
const EXPO_WELCOME_TITLE = by.text(/Welcome to\s+Expo\s+\d+/);

async function isVisible(matcher, index = 0) {
  try {
    await detoxExpect(element(matcher).atIndex(index)).toBeVisible();
    return true;
  } catch {
    return false;
  }
}

async function withExpoTabMatcher(matchers, action) {
  let lastError;
  for (const matcher of matchers) {
    try {
      return await action(matcher);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

async function waitForAnyVisible(matchers, timeoutMs, index = 0) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    for (const matcher of matchers) {
      if (await isVisible(matcher, index)) {
        return matcher;
      }
    }
    await new Promise((resolve) =>
      setTimeout(resolve, DETOX_TIMING.POLL_INTERVAL_MS)
    );
  }

  let lastError;
  for (const matcher of matchers) {
    try {
      await detoxExpect(element(matcher).atIndex(index)).toBeVisible();
      return matcher;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError;
}

async function tapExpoTab(matchers) {
  try {
    await withExpoTabMatcher(matchers, async (matcher) => {
      await waitForVisible(matcher, DETOX_TIMING.VISIBILITY_TIMEOUT_MS, 0);
      await element(matcher).atIndex(0).tap();
    });
    return;
  } catch {
    // Fall back to a direct native tap when the tab exists but does not meet
    // Detox visibility heuristics.
  }

  await device.disableSynchronization();
  try {
    await withExpoTabMatcher(matchers, (matcher) =>
      element(matcher).atIndex(0).tap()
    );
  } finally {
    await device.enableSynchronization();
  }
}

const OPEN_REACT_NATIVE_BUTTON = by.id(ids.appleAppOpenReactNative);

/**
 * Native SwiftUI shell is ready once the "Open React Native" button renders.
 *
 * Leaves synchronization off: the app preloads the JS bundle at launch, and DetoxSync
 * stays busy on "React Native (bundle load)" until RN content appears. With sync on,
 * the app never goes idle on the native shell. `openReactNative` turns sync on once
 * the RN screen is visible.
 */
async function waitForAppleAppReady() {
  await device.disableSynchronization();
  await waitForVisible(OPEN_REACT_NATIVE_BUTTON, DETOX_TIMING.VISIBILITY_TIMEOUT_MS);
}

/**
 * Tap the center of a SwiftUI control with a real (XCUITest) touch.
 *
 * Detox's element `tap()` injects a synthesized touch at the accessibility activation point.
 * SwiftUI's NavigationLink ignores it: Detox reports success, but nothing is pushed.
 * `device.tap` goes through XCUITest, which only accepts whole points in app coordinates.
 */
async function tapSwiftUIControl(matcher) {
  const { frame } = await element(matcher).getAttributes();
  await device.tap({
    x: Math.round(frame.x + frame.width / 2),
    y: Math.round(frame.y + frame.height / 2),
  });
}

const OPEN_REACT_NATIVE_ATTEMPTS = 3;

/**
 * Push RNAppScreen from the native shell and wait until `isReady(timeoutMs)` resolves.
 *
 * On CI the XCUITest tap is sometimes delivered but the NavigationLink does not push, so
 * the tap is retried while the shell is still showing. `totalTimeoutMs` is split across
 * the attempts.
 *
 * Synchronization is only turned back on once RN is visible: DetoxSync keeps the app busy
 * on "React Native (bundle load)" until RN content appears, so enabling it on the shell
 * waits until the Jest test timeout instead of failing.
 */
async function openReactNative(isReady, totalTimeoutMs) {
  const attemptTimeoutMs = Math.round(
    totalTimeoutMs / OPEN_REACT_NATIVE_ATTEMPTS
  );
  await device.disableSynchronization();
  await waitForVisible(
    OPEN_REACT_NATIVE_BUTTON,
    DETOX_TIMING.VISIBILITY_TIMEOUT_MS
  );

  let lastError;
  for (let attempt = 1; attempt <= OPEN_REACT_NATIVE_ATTEMPTS; attempt++) {
    // After a successful push the shell is hidden; keep waiting instead of tapping RN content.
    if (attempt === 1 || (await isVisible(OPEN_REACT_NATIVE_BUTTON))) {
      await tapSwiftUIControl(OPEN_REACT_NATIVE_BUTTON);
    }
    try {
      await isReady(attemptTimeoutMs);
      await device.enableSynchronization();
      return;
    } catch (error) {
      lastError = error;
      console.warn(
        `[AppleApp] React Native screen not visible after attempt ${attempt}/${OPEN_REACT_NATIVE_ATTEMPTS}`
      );
    }
  }
  throw lastError;
}

async function openReactNativeVanilla() {
  await openReactNative(
    (timeoutMs) => waitForVisible(by.id(ids.rnAppHome), timeoutMs),
    DETOX_TIMING.VISIBILITY_TIMEOUT_MS
  );
}

async function openReactNativeExpo() {
  await openReactNative(
    (timeoutMs) =>
      waitForAnyVisible(
        [
          EXPO_HOME_TAB_MATCHERS[0],
          EXPO_HOME_TAB_MATCHERS[1],
          EXPO_WELCOME_TITLE,
        ],
        timeoutMs
      ),
    60_000
  );
}

async function waitForExpoMatcher(matcher, index = 0) {
  await device.disableSynchronization();
  try {
    await waitForVisible(matcher, DETOX_TIMING.VISIBILITY_TIMEOUT_MS, index);
  } finally {
    await device.enableSynchronization();
  }
}

async function openHomeTabExpo() {
  await openReactNativeExpo();
  await tapExpoTab(EXPO_HOME_TAB_MATCHERS);
  await waitForExpoMatcher(EXPO_WELCOME_TITLE);
}

async function openPostMessageTabExpo() {
  await openReactNativeExpo();
  await tapExpoTab(EXPO_POST_MESSAGE_TAB_MATCHERS);
  await waitForVisible(
    by.id(ids.sendMessageToNative),
    DETOX_TIMING.VISIBILITY_TIMEOUT_MS
  );
}

async function sendPostMessageToNativeAndWaitForToast() {
  await waitForVisible(
    by.id(ids.sendMessageToNative),
    DETOX_TIMING.VISIBILITY_TIMEOUT_MS
  );
  // Tap with sync off — Expo can keep Detox busy while native UI is ready.
  await device.disableSynchronization();
  try {
    await element(by.id(ids.sendMessageToNative)).tap();
  } finally {
    await device.enableSynchronization();
  }
  // Assert toast before RN bubble: E2E toast is visible for ~10s and can dismiss
  // while Fabric/accessibility catches up on the message list.
  await waitForNativeOverlayVisible(
    by.id(ids.appleAppPostMessageToast),
    DETOX_TIMING.TOAST_VISIBILITY_TIMEOUT_MS
  );
}

module.exports = {
  detoxLaunchArgs,
  waitForAppleAppReady,
  openReactNativeVanilla,
  openReactNativeExpo,
  openHomeTabExpo,
  openPostMessageTabExpo,
  sendPostMessageToNativeAndWaitForToast,
};
