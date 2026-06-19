const { device, element, by } = require('detox');
const { brownfieldE2eTestIds: ids } = require('@callstack/brownfield-example-shared-tests/e2e/e2eTestIds');
const { DETOX_TIMING } = require('@callstack/brownfield-example-shared-tests/e2e/detoxTiming.cjs');
const {
  assertDetoxTextMatches,
  reloadReactNativeIgnoringSync,
  waitForVisibleIgnoringSync,
} = require('@callstack/brownfield-example-shared-tests/e2e/detoxUtils');

const EXPO_HOME_TAB = by.label('Home');
const EXPO_WELCOME_TITLE = by.text(/Welcome to\s+Expo\s+55/);

const detoxLaunchArgs = {
  BrownfieldPreferEmbeddedBundleInDebug: 'YES',
  DetoxE2E: 'YES',
};

async function scrollToEmbeddedRnVanilla() {
  try {
    await element(by.type('UIScrollView')).atIndex(0).scroll(500, 'down');
  } catch {
    await element(by.type('UIScrollView')).atIndex(0).scrollTo('bottom');
  }
}

async function scrollToEmbeddedRnExpo() {
  const scrollView = element(by.type('UIScrollView')).atIndex(0);
  try {
    await scrollView.scroll(500, 'down');
  } catch {
    try {
      await scrollView.scrollTo('bottom');
    } catch {
      await element(EXPO_HOME_TAB).atIndex(0).swipe('up', 'fast', 0.85);
    }
  }
}

async function scrollToNativeShellVanilla() {
  try {
    await element(by.type('UIScrollView')).atIndex(0).scrollTo('top');
  } catch {
    await element(by.id(ids.rnAppHome)).swipe('down', 'fast', 0.85);
  }
}

async function scrollToNativeShellExpo() {
  try {
    await element(by.type('UIScrollView')).atIndex(0).scrollTo('top');
  } catch {
    await element(EXPO_HOME_TAB).atIndex(0).swipe('down', 'fast', 0.85);
  }
}

async function waitForEmbeddedMatcher(matcher, index = 0) {
  try {
    await scrollToEmbeddedRnExpo();
  } catch {
    // Embedded RN may already be on screen.
  }

  try {
    await waitForVisibleIgnoringSync(
      matcher,
      DETOX_TIMING.VISIBILITY_TIMEOUT_MS,
      index
    );
    return;
  } catch {
    // Continue with reload recovery.
  }

  await reloadReactNativeIgnoringSync();

  try {
    await scrollToEmbeddedRnExpo();
  } catch {
    // Continue polling visibility.
  }

  await waitForVisibleIgnoringSync(
    matcher,
    DETOX_TIMING.VISIBILITY_TIMEOUT_MS,
    index
  );
}

async function waitForAppleAppReadyVanilla() {
  const rnHomeMatcher = by.id(ids.rnAppHome);

  try {
    await scrollToEmbeddedRnVanilla();
  } catch {
    // Continue polling visibility.
  }

  try {
    await waitForVisibleIgnoringSync(
      rnHomeMatcher,
      DETOX_TIMING.VISIBILITY_TIMEOUT_MS
    );
    return;
  } catch {
    // Continue with reload recovery.
  }

  await reloadReactNativeIgnoringSync();

  try {
    await scrollToEmbeddedRnVanilla();
  } catch {
    // Continue polling visibility.
  }

  await waitForVisibleIgnoringSync(
    rnHomeMatcher,
    DETOX_TIMING.VISIBILITY_TIMEOUT_MS
  );
}

async function waitForAppleAppReadyExpo() {
  try {
    await waitForEmbeddedMatcher(EXPO_HOME_TAB, 0);
    return;
  } catch {
    // Home tab can be off-screen or slow; welcome title is a reliable fallback.
  }

  await waitForEmbeddedMatcher(EXPO_WELCOME_TITLE);
}

async function openPostMessageTabExpo() {
  await scrollToEmbeddedRnExpo();
  await waitForVisibleIgnoringSync(
    by.label('postMessage API'),
    DETOX_TIMING.VISIBILITY_TIMEOUT_MS,
    0
  );
  await element(by.label('postMessage API')).atIndex(0).tap();
  await waitForVisibleIgnoringSync(
    by.id(ids.sendMessageToNative),
    DETOX_TIMING.VISIBILITY_TIMEOUT_MS
  );
}

async function sendPostMessageToNativeAndWaitForToast(rnMessagePattern) {
  await waitForVisibleIgnoringSync(
    by.id(ids.sendMessageToNative),
    DETOX_TIMING.VISIBILITY_TIMEOUT_MS
  );
  await element(by.id(ids.sendMessageToNative)).tap();
  const bubble = element(by.id(ids.rnPostMessageText)).atIndex(0);
  const deadline = Date.now() + DETOX_TIMING.POST_MESSAGE_BUBBLE_TIMEOUT_MS;
  while (Date.now() < deadline) {
    try {
      await assertDetoxTextMatches(bubble, rnMessagePattern);
      break;
    } catch {
      await new Promise((resolve) =>
        setTimeout(resolve, DETOX_TIMING.POLL_INTERVAL_MS)
      );
    }
  }
  await assertDetoxTextMatches(bubble, rnMessagePattern);
  await waitForVisibleIgnoringSync(
    by.id(ids.appleAppPostMessageToast),
    DETOX_TIMING.TOAST_VISIBILITY_TIMEOUT_MS
  );
}

module.exports = {
  detoxLaunchArgs,
  scrollToEmbeddedRnVanilla,
  scrollToEmbeddedRnExpo,
  scrollToNativeShellVanilla,
  scrollToNativeShellExpo,
  waitForAppleAppReadyVanilla,
  waitForAppleAppReadyExpo,
  openPostMessageTabExpo,
  sendPostMessageToNativeAndWaitForToast,
};
